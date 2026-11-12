// A traveler on the stage (Q6): her body frame, her face patch on locked frames, and a soft shadow, drawn from a sprite
// set's page at one texel a device pixel, standing upright and stretched like everything else (Q4). The atlas player
// picks her frame; blinks run in the battle facing (format.md §5); the scene's light tints her (HD10).
import {
  BufferGeometry, CanvasTexture, CircleGeometry, Float32BufferAttribute, Group, Mesh, MeshBasicMaterial, NearestFilter, SRGBColorSpace, Texture,
} from 'three'
import type { SpriteFace, SpriteFrame, SpriteSet } from '@luismlorenzana/uma-data'
import { spriteStretch, TEXELS_PER_UNIT } from '../stage/camera.js'
import { Blinker } from './blink.js'
import { blinksShow, fieldPose, type Facing } from './facing.js'
import { AtlasPlayer, type PlayOptions, type SpriteEvent } from './player.js'

export interface ActorSource { set: SpriteSet; pages: TexImageSource[] }

/** A held item's art (format.md §9): a 128 cell on a texture, pointing image-left at angle 0, held at its grip. */
/** One held item's cell on its page, the grip she holds it by and its scale (format.md §9). */
export interface HeldFrame { x: number; y: number; w: number; h: number; grip: { x: number; y: number }; scale: number }
/** What she holds: a page and a cell, and the cells some actions swap in (a drawn bow while she shoots, Q18). */
export interface HeldArt extends HeldFrame { texture: Texture; pageWidth: number; pageHeight: number; during?: Record<string, HeldFrame> }

let shadowTexture: CanvasTexture | null = null
/** A soft round shadow, shared by every actor and standee. */
export function softShadow(): CanvasTexture {
  if (shadowTexture) return shadowTexture
  const c = document.createElement('canvas')
  c.width = c.height = 64
  const g = c.getContext('2d')!
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32)
  grad.addColorStop(0, 'rgba(0,0,0,0.42)')
  grad.addColorStop(0.6, 'rgba(0,0,0,0.22)')
  grad.addColorStop(1, 'rgba(0,0,0,0)')
  g.fillStyle = grad
  g.fillRect(0, 0, 64, 64)
  shadowTexture = new CanvasTexture(c)
  return shadowTexture
}

function texture(image: TexImageSource): Texture {
  const t = new Texture(image as HTMLImageElement)
  t.magFilter = NearestFilter
  t.minFilter = NearestFilter
  t.generateMipmaps = false
  t.colorSpace = SRGBColorSpace
  t.needsUpdate = true
  return t
}

function quadGeometry(): BufferGeometry {
  const g = new BufferGeometry()
  g.setAttribute('position', new Float32BufferAttribute(new Float32Array(12), 3))
  g.setAttribute('uv', new Float32BufferAttribute(new Float32Array(8), 2))
  g.setIndex([0, 1, 2, 0, 2, 3])
  return g
}

export class SpriteActor {
  readonly group = new Group()
  private readonly body: Mesh<BufferGeometry, MeshBasicMaterial>
  private readonly face: Mesh<BufferGeometry, MeshBasicMaterial>
  private readonly shadow: Mesh
  private readonly item: Mesh<BufferGeometry, MeshBasicMaterial>
  private readonly hand: Mesh<BufferGeometry, MeshBasicMaterial>
  private held: HeldArt | null = null
  private manual = false
  private onEvent: ((e: SpriteEvent) => void) | null = null
  private order = 0
  private source!: ActorSource
  private textures: Texture[] = []
  private player!: AtlasPlayer
  private readonly blinker = new Blinker()
  private facing: Facing = 'back'
  private patch: string | null = null
  private lastPose = ''

  constructor(source: ActorSource) {
    this.body = new Mesh(quadGeometry(), new MeshBasicMaterial({ transparent: true, depthWrite: false }))
    this.face = new Mesh(quadGeometry(), new MeshBasicMaterial({ transparent: true, depthWrite: false }))
    this.shadow = new Mesh(new CircleGeometry(0.5, 20), new MeshBasicMaterial({ map: softShadow(), transparent: true, depthWrite: false }))
    this.shadow.rotation.x = -Math.PI / 2
    this.shadow.renderOrder = -1
    this.item = new Mesh(quadGeometry(), new MeshBasicMaterial({ transparent: true, depthWrite: false }))
    this.hand = new Mesh(quadGeometry(), new MeshBasicMaterial({ transparent: true, depthWrite: false }))
    this.item.visible = this.hand.visible = false
    this.group.add(this.body, this.face, this.item, this.hand)
    this.setSource(source)
  }

  /** Swaps her set (the stand-in for the published one), freeing the old pages' textures. */
  setSource(source: ActorSource): void {
    for (const t of this.textures) t.dispose()
    this.source = source
    this.textures = source.pages.map(texture)
    this.player = new AtlasPlayer(source.set)
    this.lastPose = ''
  }

  get outfitId(): number { return this.source.set.outfitId }
  get current(): ActorSource { return this.source }
  get shadowMesh(): Mesh { return this.shadow }
  get action(): string { return this.player.actionName }

  /** Fight mode (Q9): she plays what she's told, facing `facing`, instead of a field pose. */
  setManual(on: boolean, facing: Facing = 'left'): void {
    this.manual = on
    this.facing = facing
    this.lastPose = ''
    if (on) this.player.play(this.source.set.actions.idle ? 'idle' : Object.keys(this.source.set.actions)[0]!)
  }

  hasAction(name: string): boolean { return !!this.source.set.actions[name]?.frames.length }

  /** Plays an action in fight mode; its events come to `onEvent`. False when her set lacks it. */
  act(name: string, options: PlayOptions = {}, onEvent: ((e: SpriteEvent) => void) | null = null): boolean {
    if (!this.hasAction(name)) return false
    this.onEvent = onEvent
    return this.player.play(name, options)
  }

  /** Leaves a held pose (a guard, a charge, lying down). */
  releaseHold(): void { this.player.release() }

  get playing(): { action: string; done: boolean; held: boolean } { return { action: this.player.actionName, done: this.player.done, held: this.player.held } }

  /** What she holds in her hand on frames that show one, or nothing. */
  setHeld(art: HeldArt | null): void {
    this.held = art
    if (art && this.item.material.map !== art.texture) { this.item.material.map = art.texture; this.item.material.needsUpdate = true }
  }

  /** A non-blink face patch to show on locked frames (`focus`, `pain` …; Q9), or null. */
  setPatch(name: string | null): void { this.patch = name }

  /** Advances her animation: the pose for her facing and pace, her frame, and her blinks. */
  update(ms: number, facing: Facing, moving: boolean, running: boolean): void {
    if (!this.manual) {
      this.facing = facing
      const pose = fieldPose(this.source.set, facing, moving, running)
      const key = pose.kind === 'play' ? pose.action : `${pose.action}:${pose.frame}`
      if (key !== this.lastPose) {
        if (pose.kind === 'play') this.player.play(pose.action)
        else this.player.show(pose.action, pose.frame)
        this.lastPose = key
      }
    }
    const events = this.player.tick(ms)
    if (this.onEvent) for (const e of events) this.onEvent(e)
    const frame = this.player.frame
    if (!frame) return
    const blink = this.blinker.tick(ms)
    const name = frame.headLocked ? (this.patch ?? (blinksShow(facing, true) ? blink : null)) : null
    this.draw(this.body, frame, frame, 0)
    const patch = name ? this.source.set.faces[name] : undefined
    this.face.visible = !!patch
    if (patch) this.drawFace(patch, frame)
    this.drawHeld(frame)
  }

  /** Her held item at the frame's grip and angle, before or behind her, with her fist drawn again over the handle. */
  private drawHeld(frame: SpriteFrame): void {
    const base = this.held, swap = base?.during?.[this.player.actionName]
    const art = base && swap ? { ...base, ...swap } : base, grip = frame.grip
    const show = !!art && !!grip && frame.hold !== 'none'
    this.item.visible = show
    this.hand.visible = show && frame.hold === 'front' && !!frame.handOcclusion
    if (!show || !art || !grip) return
    const foot = this.source.set.foot, k = 1 / TEXELS_PER_UNIT, st = spriteStretch()
    // Angle 0 points image-left; 90 up, 180 back, 270 down (format.md §6): turn by −angle in y-up space.
    const phi = (-grip.angle * Math.PI) / 180, c = Math.cos(phi), sn = Math.sin(phi)
    const corner = (u: number, v: number): [number, number] => {
      const ox = (u - art.grip.x) * art.scale, oy = -(v - art.grip.y) * art.scale
      const rx = ox * c - oy * sn, ry = ox * sn + oy * c
      return [(grip.x - foot.x + rx) * k, (foot.y - grip.y + ry) * k * st]
    }
    const pts = [corner(0, art.h), corner(art.w, art.h), corner(art.w, 0), corner(0, 0)]
    const z = frame.hold === 'front' ? 0.003 : -0.003
    const pos = this.item.geometry.getAttribute('position') as Float32BufferAttribute
    pos.set(pts.flatMap(([x, y]) => [x, y, z]))
    pos.needsUpdate = true
    this.item.geometry.computeBoundingSphere()
    const u0 = art.x / art.pageWidth, u1 = (art.x + art.w) / art.pageWidth, v1 = 1 - art.y / art.pageHeight, v0 = 1 - (art.y + art.h) / art.pageHeight
    const uv = this.item.geometry.getAttribute('uv') as Float32BufferAttribute
    uv.set([u0, v0, u1, v0, u1, v1, u0, v1])
    uv.needsUpdate = true
    this.item.renderOrder = this.order + (frame.hold === 'front' ? 0.5 : -0.25)
    if (this.hand.visible && frame.handOcclusion) {
      // The hand crop (format.md §4, layer 6): her own pixels in the box, from the frame's page rectangle.
      const box = frame.handOcclusion
      this.uv(this.hand, { page: frame.page, x: frame.x + (box.x - frame.dx), y: frame.y + (box.y - frame.dy), w: box.w, h: box.h })
      this.place(this.hand, box.x, box.y, box.w, box.h, 0.004)
      this.hand.renderOrder = this.order + 0.75
    }
  }

  private uv(mesh: Mesh<BufferGeometry, MeshBasicMaterial>, rect: { page: number; x: number; y: number; w: number; h: number }): void {
    const page = this.source.set.pages[rect.page]!
    const u0 = rect.x / page.width, u1 = (rect.x + rect.w) / page.width
    const v1 = 1 - rect.y / page.height, v0 = 1 - (rect.y + rect.h) / page.height
    const uv = mesh.geometry.getAttribute('uv') as Float32BufferAttribute
    uv.set([u0, v0, u1, v0, u1, v1, u0, v1])
    uv.needsUpdate = true
    const map = this.textures[rect.page] ?? null
    if (mesh.material.map !== map) { mesh.material.map = map; mesh.material.needsUpdate = true }
  }

  /** Places a rectangle drawn at (cx, cy) in the 256 cell, relative to her foot, in world units. */
  private place(mesh: Mesh<BufferGeometry, MeshBasicMaterial>, cx: number, cy: number, w: number, h: number, z: number): void {
    const foot = this.source.set.foot, k = 1 / TEXELS_PER_UNIT, s = spriteStretch()
    const x0 = (cx - foot.x) * k, x1 = (cx + w - foot.x) * k
    const y1 = (foot.y - cy) * k * s, y0 = (foot.y - cy - h) * k * s
    const pos = mesh.geometry.getAttribute('position') as Float32BufferAttribute
    pos.set([x0, y0, z, x1, y0, z, x1, y1, z, x0, y1, z])
    pos.needsUpdate = true
    mesh.geometry.computeBoundingSphere()
  }

  private draw(mesh: Mesh<BufferGeometry, MeshBasicMaterial>, rect: SpriteFrame, frame: SpriteFrame, z: number): void {
    this.uv(mesh, rect)
    this.place(mesh, frame.dx, frame.dy, rect.w, rect.h, z)
  }

  private drawFace(face: SpriteFace, frame: SpriteFrame): void {
    this.uv(this.face, face)
    const off = frame.headOffset ?? { x: 0, y: 0 }
    this.place(this.face, face.place.x + face.dx + off.x, face.place.y + face.dy + off.y, face.w, face.h, 0.002)
  }

  /** Her foot in the world (already on the pixel grid), her draw order, and her tint. */
  stand(x: number, y: number, z: number, order: number, tint: [number, number, number]): void {
    this.group.position.set(x, y, z)
    this.order = order
    this.body.renderOrder = order
    this.face.renderOrder = order + 0.25
    for (const m of [this.body, this.face, this.item, this.hand]) m.material.color.setRGB(tint[0], tint[1], tint[2])
    const width = (this.player.frame?.bounds.width ?? 96) / TEXELS_PER_UNIT
    this.shadow.position.set(x, y + 0.01, z)
    this.shadow.scale.set(width * 0.9, width * 0.45, 1)
  }

  dispose(): void {
    for (const t of this.textures) t.dispose()
    for (const m of [this.body, this.face, this.item, this.hand]) { m.geometry.dispose(); m.material.dispose() }
    this.shadow.geometry.dispose()
    ;(this.shadow.material as MeshBasicMaterial).dispose()
  }
}
