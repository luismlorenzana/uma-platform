// The hero scene by day (LK1, P158): a town square laid out from the look bible: a hall at the back with banners and
// braziers, houses around a paved square, a market stall, bunting, a well, trees and flowers at the edges, a foreground
// roof to blur in front, petals and embers in the air, light shafts in the haze, and our Umas standing in it. Built from
// the CC0 modules (P159) on a 2 m grid, with the pieces they lack made in props.ts.
import { CylinderGeometry, DoubleSide, Group, Mesh, MeshStandardMaterial, PlaneGeometry, Vector3, type Camera, type Object3D, type PointLight } from 'three'
import { embers, shafts, stepEmbers, WIND } from './atmos.js'
import { batchStatic } from './batch.js'
import { disposeFigure, lookFigure, stepFigure, type CastSpot, type LookSprite } from './figures.js'
import type { LookKit } from './kit.js'
import {
  banner, box, brazier, breakTiling, bunting, cylinder, drift, pixelGround, pixelTex, PLANKS, SACK, scatter, solid, STAVES, stepDrift, stepFire, STONES, TILES,
} from './props.js'
import type { CameraPreset, LookScene, SceneLight } from './scene.js'
import { CAMERA_LABELS } from './scene.js'

export const STOREY = 3.12
/** The kit's roofs squashed to this share of their height: the references' roofs are gentler (milestone 1's review). */
export const ROOF_PITCH = 0.72
type Side = 'front' | 'back' | 'left' | 'right'

export interface HouseSpec { x: number; z: number; w: number; d: number; storeys: number; ground: 'UnevenBrick' | 'Plaster'; upper: 'Plaster' | 'UnevenBrick'; turn?: number; door?: number; chimney?: boolean }

/** A house on the kit's 2 m grid, its front facing +z before `turn`: walls per storey with windows, shutters and a door,
 * corners, floors, a tiled roof and its gables. */
export function house(kit: LookKit, o: HouseSpec): Group {
  const g = new Group()
  const wall = (s: number, side: Side, i: number, count: number) => {
    const kind = s === 0 ? o.ground : o.upper
    const front = side === 'front'
    if (s === 0 && front && i === (o.door ?? Math.floor(count / 2))) return `Wall_${kind}_Door_Round`
    const window = (i + s) % 2 === 0
    if (kind === 'Plaster' && !window && s > 0) return 'Wall_Plaster_WoodGrid'
    return window || front ? `Wall_${kind}_Window_Wide_Flat` : `Wall_${kind}_Straight`
  }
  const sides: [Side, boolean, number, number, number][] = [
    ['front', true, o.w / 2, o.d / 2, 0], ['back', true, o.w / 2, -o.d / 2, Math.PI], ['left', false, o.d / 2, -o.w / 2, -Math.PI / 2], ['right', false, o.d / 2, o.w / 2, Math.PI / 2],
  ]
  for (let s = 0; s < o.storeys; s++) {
    const y = s * STOREY
    for (const [side, alongX, count, fixed, turn] of sides) {
      for (let i = 0; i < count; i++) {
        const along = -count + 1 + 2 * i
        const [px, pz] = alongX ? [side === 'back' ? -along : along, fixed] : [fixed, side === 'left' ? along : -along]
        const name = wall(s, side, i, count)
        g.add(kit.piece(name, px, y, pz, turn))
        // The kit's walls are frames: the window and the door are pieces of their own, set into them.
        if (name.includes('Window_Wide_Flat')) {
          g.add(kit.piece('Window_Wide_Flat1', px, y, pz, turn))
          if ((i + s + (side === 'front' ? 0 : 1)) % 3 === 0) g.add(kit.piece('WindowShutters_Wide_Flat_Open', px, y, pz, turn))
        }
        if (name.includes('Door_Round')) g.add(kit.piece('Door_1_Round', px - 0.53 * Math.cos(turn), y, pz + 0.53 * Math.sin(turn), turn))
      }
    }
    for (const [cx, cz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]] as const) {
      g.add(kit.piece(s === 0 && o.ground === 'UnevenBrick' ? 'Corner_Exterior_Brick' : 'Corner_Exterior_Wood', (cx * o.w) / 2, y, (cz * o.d) / 2, 0))
    }
  }
  // Floors between storeys and under the roof, so no window shows sky through the house.
  for (let s = 1; s <= o.storeys; s++) for (let fx = -o.w / 2 + 1; fx < o.w / 2; fx += 2) for (let fz = -o.d / 2 + 1; fz < o.d / 2; fz += 2) g.add(kit.piece('Floor_WoodDark', fx, s * STOREY - 0.02, fz))
  const top = o.storeys * STOREY
  const low = (p: Object3D) => { p.scale.y = ROOF_PITCH; return p }
  g.add(low(kit.piece(`Roof_RoundTiles_${o.w}x${o.d}`, 0, top, 0, 0)))
  g.add(low(kit.piece(`Roof_Front_Brick${o.w}`, 0, top, o.d / 2, 0)))
  g.add(low(kit.piece(`Roof_Front_Brick${o.w}`, 0, top, -o.d / 2, Math.PI)))
  if (o.chimney) g.add(kit.piece('Prop_Chimney', o.w / 4, top + 0.8 * ROOF_PITCH, -o.d / 4, 0))
  g.position.set(o.x, 0, o.z)
  g.rotation.y = o.turn ?? 0
  return g
}

/** A market stall: posts, a counter, a striped awning and crates of produce. */
function stall(kit: LookKit, x: number, z: number): Group {
  const g = new Group()
  const wood = new MeshStandardMaterial({ map: PLANKS(false), roughness: 0.9 })
  for (const [px, pz] of [[-1.3, -0.7], [1.3, -0.7], [-1.3, 0.7], [1.3, 0.7]] as const) g.add(solid(box(0.14, 2.3, 0.14), wood, px, 1.15, pz))
  g.add(solid(box(2.8, 0.9, 1.2), wood, 0, 0.45, 0))
  const stripes = pixelTex((cx) => { for (let i = 0; i < 16; i++) { cx.fillStyle = i % 4 < 2 ? '#b8282e' : '#efe2c8'; cx.fillRect(i, 0, 1, 4) } }, 16, 4)
  const cloth = new MeshStandardMaterial({ map: stripes, roughness: 0.95, side: DoubleSide })
  const awning = new Mesh(new PlaneGeometry(3.2, 1.9), cloth)
  awning.position.set(0, 2.35, 0)
  awning.rotation.x = -Math.PI / 2 + 0.28
  awning.castShadow = true
  g.add(awning)
  const fruit = ['#c8322a', '#e8a22a', '#7ab83a', '#d84a6a'].map((color) => new MeshStandardMaterial({ color, roughness: 0.6 }))
  const berry = box(0.12, 0.12, 0.12)
  for (let i = 0; i < 3; i++) {
    g.add(kit.piece('Prop_Crate', -0.85 + i * 0.85, 0.9, 0, 0, 0.38))
    for (let k = 0; k < 7; k++) {
      g.add(solid(berry, fruit[(i + k) % fruit.length]!, -0.85 + i * 0.85 + ((k % 3) - 1) * 0.12, 1.32 + Math.floor(k / 3) * 0.06, ((k % 2) - 0.5) * 0.14))
    }
  }
  g.position.set(x, 0, z)
  return g
}

/** Barrels, sacks, a well, benches and lamp posts. */
function dressing(): Mesh[] {
  const out: Mesh[] = []
  const staves = new MeshStandardMaterial({ map: STAVES(), roughness: 0.85 }), sack = new MeshStandardMaterial({ map: SACK(), roughness: 1 })
  const wood = new MeshStandardMaterial({ map: PLANKS(false), roughness: 0.9 }), iron = new MeshStandardMaterial({ color: '#25231f', roughness: 0.5, metalness: 0.5 })
  for (const [x, z] of [[-6.6, -2.4], [-7.2, -1.7], [6.6, -5.3], [7.1, -4.6], [-1.6, -6.7]] as const) out.push(solid(cylinder(0.32, 0.27, 0.8), staves, x, 0.4, z))
  for (const [x, z] of [[-3.3, -3.7], [-3.0, -4.1], [4.6, 0.4]] as const) out.push(solid(cylinder(0.22, 0.28, 0.5, 7), sack, x, 0.25, z))
  // A well: a fieldstone ring, water, posts and a little tiled roof.
  const stone = new MeshStandardMaterial({ map: STONES(), roughness: 0.95, side: DoubleSide })
  stone.map!.repeat.set(4, 1)
  out.push(solid(new CylinderGeometry(0.8, 0.85, 0.75, 14, 1, true), stone, -1.8, 0.37, -1.6))
  out.push(solid(cylinder(0.62, 0.62, 0.05, 14), new MeshStandardMaterial({ color: '#2a4a5a', roughness: 0.15, metalness: 0.2 }), -1.8, 0.62, -1.6))
  for (const dx of [-0.7, 0.7]) out.push(solid(box(0.1, 1.9, 0.1), wood, -1.8 + dx, 0.95, -1.6))
  const tiles = new MeshStandardMaterial({ map: TILES(), roughness: 0.85 })
  tiles.map!.repeat.set(3, 2)
  const roof = solid(cylinder(0, 1.05, 0.6, 4), tiles, -1.8, 2.15, -1.6, Math.PI / 4)
  out.push(roof)
  for (const [x, z, r] of [[-5.6, 4.6, 0], [5.4, -6.2, 0], [7.4, 0.4, Math.PI / 2]] as const) {
    out.push(solid(box(1.8, 0.1, 0.5), wood, x, 0.48, z, r))
    for (const dx of [-0.75, 0.75]) out.push(solid(box(0.1, 0.48, 0.45), wood, x + Math.cos(r) * dx, 0.24, z - Math.sin(r) * dx, r))
  }
  for (const [x, z] of [[-7.4, -5.6], [7.4, -5.6], [-7.4, 5.4], [7.4, 5.4]] as const) {
    out.push(solid(cylinder(0.06, 0.08, 3.2, 6), iron, x, 1.6, z))
    // By day the lanterns are unlit glass, a little warm.
    const lantern = solid(box(0.32, 0.42, 0.32), new MeshStandardMaterial({ color: '#ffd27a', emissive: '#ffb84a', emissiveIntensity: 0.25 }), x, 3.25, z)
    lantern.castShadow = false
    out.push(lantern)
  }
  return out
}

const DAY: SceneLight = {
  // The sun from the upper left, as ref-01: shadows fall to the right.
  key: { colour: '#ffe6c4', intensity: 4.6, from: [-26, 30, -4], to: [0, 0, -2], box: 32 },
  // A cool sky light, so shadows go cool under the warm sun (the look bible's rule 4).
  hemi: { sky: '#9fb8f0', ground: '#34403a', intensity: 1.05 },
  fog: { colour: '#b8c8d0', density: 0.0045 },
  sky: ['#5f88c4', '#a9c4e0', '#dfe6da'],
  exposure: 1,
  post: {},
  rim: { strength: 0.75, dir: [-0.62, 0.78], colour: '#ffd9a0' },
}

const CAMERAS: Record<'front' | 'tactics' | 'high', CameraPreset> = {
  front: { label: CAMERA_LABELS.front, target: [0, 1.4, -2.5], elevation: 27, azimuth: 0, distance: 38, fov: 24 },
  tactics: { label: CAMERA_LABELS.tactics, target: [0, 1, -2], elevation: 40, azimuth: 45, distance: 50, fov: 20 },
  high: { label: CAMERA_LABELS.high, target: [0, 2.4, -5.5], elevation: 36, azimuth: 0, distance: 49, fov: 22 },
}

/** The town square by day, with its cast. */
export function buildSquare(kit: LookKit, cast: readonly { sprite: LookSprite; spot: CastSpot }[], spritePixels: number | null): LookScene {
  const root = new Group()
  const lights: PointLight[] = []
  // Olive greens from the references (ref-01, ref-04); one large texture repeating only every 48 m (P160).
  const grassTex = pixelGround(['#2e3a17', '#3b4a1e', '#4c5d24', '#5d6f2b', '#70822f', '#86953a', '#9ca64a'], 1024)
  grassTex.repeat.set(72 / 48, 72 / 48)
  const grass = new MeshStandardMaterial({ map: grassTex, roughness: 1 })
  breakTiling(grass)
  const ground = new Mesh(new PlaneGeometry(72, 72), grass)
  ground.rotation.x = -Math.PI / 2
  ground.receiveShadow = true
  root.add(ground)
  for (let x = -7; x <= 7; x += 2) for (let z = -5; z <= 5; z += 2) root.add(kit.piece('Floor_UnevenBrick', x, 0.02, z))
  for (let z = 7; z <= 19; z += 2) for (const x of [-1, 1]) root.add(kit.piece('Floor_UnevenBrick', x, 0.02, z))
  for (let x = -5; x <= 5; x += 2) root.add(kit.piece('Floor_UnevenBrick', x, 0.02, -7))
  // The buildings: a hall at the back, houses either side, and two in front whose roofs cross the frame's foot, blurred.
  const houses: HouseSpec[] = [
    { x: 0, z: -12.5, w: 8, d: 8, storeys: 2, ground: 'UnevenBrick', upper: 'UnevenBrick', chimney: true },
    { x: -11.5, z: -8, w: 6, d: 6, storeys: 2, ground: 'UnevenBrick', upper: 'Plaster', chimney: true },
    { x: 11.5, z: -6, w: 6, d: 8, storeys: 2, ground: 'Plaster', upper: 'Plaster' },
    { x: -12, z: 4, w: 4, d: 6, storeys: 1, ground: 'Plaster', upper: 'Plaster', turn: Math.PI / 2 },
    { x: 12.5, z: 6, w: 4, d: 4, storeys: 1, ground: 'UnevenBrick', upper: 'Plaster', turn: -Math.PI / 2 },
    { x: -6, z: 14.5, w: 6, d: 4, storeys: 1, ground: 'Plaster', upper: 'Plaster', turn: Math.PI },
    { x: 7, z: 15, w: 4, d: 4, storeys: 1, ground: 'UnevenBrick', upper: 'Plaster', turn: Math.PI },
  ]
  for (const h of houses) root.add(house(kit, h))
  const nature: [string, number, number, number, number][] = [
    ['CommonTree_1', -23, -16, 0.4, 1], ['Pine_1', 21, -17, 1.2, 1.1], ['Pine_2', 26, -10, 0.2, 1], ['CommonTree_3', 22, 6, 2.1, 0.9], ['CommonTree_2', -24, 0, 1.0, 1],
    ['Pine_3', -8, -24, 0.5, 1.2], ['Pine_1', 8, -25, 2.2, 1.15], ['CommonTree_4', -20, 14, 0.9, 0.9],
    ['Bush_Common_Flowers', -8.3, 6.6, 0, 0.7], ['Bush_Common_Flowers', 8.4, 6.4, 1.4, 0.7], ['Bush_Common_Flowers', -8.6, -1.5, 2, 0.65], ['Bush_Common_Flowers', 8.7, 1.5, 0.6, 0.65],
    ['Flower_3_Group', -2.6, 6.6, 0, 0.55], ['Flower_4_Group', 2.8, 6.6, 0, 0.55], ['Flower_3_Group', -5.4, -8.6, 0, 0.6], ['Flower_4_Group', 5.2, -8.6, 0, 0.6],
    ['Flower_4_Group', -8.4, 3, 1, 0.55], ['Flower_3_Group', 8.5, -3.4, 2, 0.55], ['Grass_Common_Tall', -9.5, 8.5, 0, 0.7], ['Grass_Common_Tall', 9.6, 9.5, 0, 0.7],
    ['Rock_Medium_1', 16, 11, 0.6, 0.45], ['Bush_Common_Flowers', 9.5, -10.5, 0.3, 0.7], ['Bush_Common_Flowers', -6.2, -10.4, 0.3, 0.6],
  ]
  for (const [n, x, z, t, s] of nature) root.add(kit.piece(n, x, 0, z, t, s))
  // The far tree line behind the square: blurred by depth, it fills the frame's top as in ref-01 and ref-04.
  for (let i = 0; i < 26; i++) {
    const x = -34 + i * 2.7 + Math.sin(i * 7.1) * 1.2, z = -22 - (i % 3) * 3.5 - Math.abs(Math.sin(i * 3.3)) * 3
    root.add(kit.piece(i % 4 === 0 ? 'CommonTree_2' : `Pine_${(i % 5) + 1}`, x, 0, z, i * 0.7, 1.15 + (i % 3) * 0.12))
  }
  root.add(stall(kit, -4.6, -2.2))
  root.add(kit.piece('Prop_Wagon', 5.6, 0, 1.4, -0.5, 0.8))
  for (const [x, z, s] of [[-6.9, -3.4, 0.5], [-6.3, -4, 0.38], [6.8, -4.2, 0.45], [-2.4, -3.6, 0.32]] as const) root.add(kit.piece('Prop_Crate', x, 0, z, 0.3, s))
  root.add(...dressing())
  const lines = [bunting(new Vector3(-7, 5.4, -7.6), new Vector3(7, 5.4, -7.6)), bunting(new Vector3(-7, 4.4, 5.6), new Vector3(7, 4.4, 5.6))]
  root.add(...lines)
  // The hall's ornament: banners either side of its door (at x = 1) and at its corners.
  const banners = [banner(-0.05, 5.95, -8.02, '#8e1f2a', '#e3b440'), banner(2.05, 5.95, -8.02, '#8e1f2a', '#e3b440'),
    banner(-3.95, 5.6, -8.12, '#1f3f8e', '#e3e0d0'), banner(3.95, 5.6, -8.12, '#1f3f8e', '#e3e0d0')]
  root.add(...banners)
  const braziers = [brazier(-1.1, -7.5, lights), brazier(3.1, -7.5, lights)]
  root.add(...braziers)
  const flames: Object3D[] = []
  for (const b of braziers) b.traverse((o) => { if (o.userData.flame) flames.push(o) })
  const fire = embers(braziers.map((b) => new Vector3(b.position.x, 1.7, b.position.z)))
  root.add(fire.points)
  // Light shafts through the haze between the far trees, falling from the sun on the left (ref-03).
  const beams = shafts(new Vector3(...DAY.key.from), [[-14, 9, -21], [-3, 10, -23], [9, 9, -22], [17, 8, -19]])
  root.add(beams)
  const figures = cast.map(({ sprite, spot }) => lookFigure(sprite, spot, spritePixels))
  root.add(...figures)
  root.add(scatter({ w: 60, d: 50 }, (x, z) => (Math.abs(x) < 8.2 && Math.abs(z) < 6.2) || (Math.abs(x) < 2.2 && z > 0 && z < 20) || (Math.abs(x) < 6.4 && z < -7.4 && z > -17)))
  const petals = drift(220, { w: 34, h: 9, d: 26 })
  root.add(petals)
  batchStatic(root)
  return {
    id: 'square', title: 'Town square, day', root, figures, light: DAY, cameras: CAMERAS,
    layers: { petals, embers: fire.points, shafts: beams },
    update(t, dt, camera: Camera) {
      WIND.value = t
      for (const f of figures) stepFigure(f, camera, dt)
      stepFire(lights, flames, t)
      stepEmbers(fire, t, dt)
      stepDrift(petals, t, dt)
      for (const line of lines) for (const m of line.children) m.rotation.x = 0.25 * Math.sin(t * 2.2 + (m.userData.flutter as number) * 0.9)
      for (const b of banners) { const cloth = b.children[1]!, k = cloth.userData.flutter as number; cloth.rotation.x = 0.06 * Math.sin(t * 1.3 + k); cloth.rotation.z = 0.03 * Math.sin(t * 0.9 + 1.7 * k) }
    },
    dispose() { for (const f of figures) disposeFigure(f); disposeTree(root) },
  }
}

/** Frees the scene's own geometries, materials and textures (the kit's are freed with the kit). */
export function disposeTree(root: Object3D): void {
  root.traverse((o) => {
    const m = o as Mesh
    if (!m.isMesh && !(o as { isPoints?: boolean }).isPoints) return
    if (m.userData.figure || m.userData.kit) return
    m.geometry?.dispose()
    for (const mat of (Array.isArray(m.material) ? m.material : [m.material]) as MeshStandardMaterial[]) {
      if (!mat || mat.userData.original) continue
      mat.map?.dispose()
      mat.dispose()
    }
  })
}
