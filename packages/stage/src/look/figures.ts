// Our Uma sprite sets in the look slice (LK1, P160): lit, shadow-casting standees that play an action's loop. Upright like
// uma-stage's sprites and stretched by 1/cos of the camera's pitch to each (uma-stage's `spriteStretch`), so a camera
// looking down doesn't squash them; a warm rim from the key's side (atmos.ts) and a contact shadow at the feet.
import type { SpriteSet } from '@luismlorenzana/uma-data'
import { CanvasTexture, Color, DoubleSide, Mesh, MeshDepthMaterial, MeshStandardMaterial, NearestFilter, PlaneGeometry, RGBADepthPacking, SRGBColorSpace, type Camera } from 'three'
import { rimmed } from './atmos.js'
import { pixelSprite, silhouetteNormals } from './pixel.js'

/** A set and its decoded pages. */
export interface LookSprite { readonly set: SpriteSet; readonly pages: readonly CanvasImageSource[] }
/** Where one stands: an outfit, a spot on the floor, an action (idle by default). */
export interface CastSpot { readonly outfitId: number; readonly x: number; readonly z: number; readonly action?: string }

/** A figure's height in metres; the sets' characters stand about 210 texels tall in their cells. */
export const FIGURE_HEIGHT = 1.9
const CHARACTER_TEXELS = 210

interface FrameTex { map: CanvasTexture; normal: CanvasTexture; ms: number }
interface FigureState { frames: FrameTex[]; frame: number; clock: number; depth: MeshDepthMaterial }

/** The contact shadow's texture, shared. */
let blobTex: CanvasTexture | null = null
function blob(): CanvasTexture {
  if (blobTex) return blobTex
  const c = document.createElement('canvas')
  c.width = c.height = 32
  const g = c.getContext('2d')!, rg = g.createRadialGradient(16, 16, 2, 16, 16, 16)
  rg.addColorStop(0, 'rgba(0,0,0,0.55)'); rg.addColorStop(1, 'rgba(0,0,0,0)')
  g.fillStyle = rg; g.fillRect(0, 0, 32, 32)
  return (blobTex = new CanvasTexture(c))
}

/** A figure from a set, standing at a spot. `pixelTexels` passes her frames through the pixel pass at that height. */
export function lookFigure(sprite: LookSprite, spot: CastSpot, pixelTexels: number | null): Mesh {
  const { set, pages } = sprite
  const action = set.actions[spot.action ?? 'idle'] ?? set.actions.idle ?? Object.values(set.actions)[0]
  if (!action) throw new Error(`Sprite set ${set.outfitId} has no actions`)
  const frames: FrameTex[] = action.frames.map((f) => {
    const cell = document.createElement('canvas')
    cell.width = cell.height = set.cell
    const page = pages[f.page]
    if (page) cell.getContext('2d')!.drawImage(page, f.x, f.y, f.w, f.h, f.dx, f.dy, f.w, f.h)
    const art = pixelTexels ? pixelSprite(cell, Math.round(set.cell * (pixelTexels / CHARACTER_TEXELS)), 24) : cell
    const map = new CanvasTexture(art)
    map.colorSpace = SRGBColorSpace
    map.magFilter = map.minFilter = NearestFilter
    map.generateMipmaps = false
    const normal = new CanvasTexture(silhouetteNormals(art, pixelTexels ? 2 : 6))
    normal.magFilter = normal.minFilter = NearestFilter
    normal.generateMipmaps = false
    return { map, normal, ms: f.ms && f.ms > 0 ? f.ms : 200 }
  })
  const size = set.cell * (FIGURE_HEIGHT / CHARACTER_TEXELS)
  const first = frames[0]!
  const mat = new MeshStandardMaterial({ map: first.map, normalMap: first.normal, alphaTest: 0.5, roughness: 0.85, side: DoubleSide,
    // A staged key (Octopath's spotlight): a little of their own colour lifts them off the ground.
    emissive: new Color('#ffffff'), emissiveMap: first.map, emissiveIntensity: 0.14 })
  rimmed(mat)
  // Pivot at the feet, so the stretch grows her upward from the floor.
  const geo = new PlaneGeometry(size, size)
  geo.translate(0, size / 2 - size * ((set.cell - set.foot.y) / set.cell), 0)
  const mesh = new Mesh(geo, mat)
  const depth = new MeshDepthMaterial({ depthPacking: RGBADepthPacking, map: first.map, alphaTest: 0.5 })
  mesh.customDepthMaterial = depth
  mesh.castShadow = true
  mesh.position.set(spot.x, 0, spot.z)
  mesh.userData = { figure: { frames, frame: 0, clock: (spot.x * 997 + spot.z * 131) % 400, depth } satisfies FigureState }
  const contact = new Mesh(new PlaneGeometry(0.9, 0.5), new MeshStandardMaterial({ map: blob(), transparent: true, depthWrite: false, color: '#000000', roughness: 1 }))
  contact.rotation.x = -Math.PI / 2
  contact.position.y = 0.03
  mesh.add(contact)
  return mesh
}

/** Per frame: she faces the camera, stretched by 1/cos of its pitch to her, and her action steps on. */
export function stepFigure(f: Mesh, camera: Camera, dt: number): void {
  const dx = camera.position.x - f.position.x, dz = camera.position.z - f.position.z
  f.rotation.y = Math.atan2(dx, dz)
  const pitch = Math.atan2(camera.position.y - f.position.y - 1, Math.hypot(dx, dz))
  f.scale.y = 1 / Math.max(0.5, Math.cos(pitch))
  const u = f.userData.figure as FigureState
  u.clock += dt * 1000
  const cur = u.frames[u.frame]!
  if (u.clock < cur.ms) return
  u.clock -= cur.ms
  u.frame = (u.frame + 1) % u.frames.length
  const next = u.frames[u.frame]!, m = f.material as MeshStandardMaterial
  m.map = next.map; m.emissiveMap = next.map; m.normalMap = next.normal
  u.depth.map = next.map
}

export function disposeFigure(f: Mesh): void {
  const u = f.userData.figure as FigureState
  for (const fr of u.frames) { fr.map.dispose(); fr.normal.dispose() }
  u.depth.dispose()
  ;(f.material as MeshStandardMaterial).dispose()
  f.geometry.dispose()
}
