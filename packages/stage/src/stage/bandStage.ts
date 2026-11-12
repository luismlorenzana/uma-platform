// The band stage (uma-platform ST2; uma-farm F57's asks 7–12): a stage the game drives, beside uma-quest's `StageEngine`.
// It draws a farm design from a `farm` kit, pans up and down on the band camera, answers taps with what's under them,
// moves figures (sprites, or standees for outfits with no set) along the paths by grid path-finding, keeps at most 8
// sprite sets live, and takes a live grade per scene. three.js, loaded on demand with the stage; one engine alive at once.
import {
  Color, DirectionalLight, Group, HemisphereLight, LinearMipmapLinearFilter, Mesh, MeshBasicMaterial, MeshLambertMaterial, NearestFilter, OrthographicCamera,
  PointLight, Scene, SRGBColorSpace, Vector3, WebGLRenderer, type Texture,
} from 'three'
import type { FarmDesign, FarmMarker, FarmMarkerKind, Tile } from '../formats/index.js'
import { SpriteActor, type ActorSource } from '../sprites/actor.js'
import { LIVE_SETS, liveSets } from '../sprites/cap.js'
import { facingOf, type Facing } from '../sprites/facing.js'
import { Standee, STANDEE } from '../sprites/standee.js'
import { rgb, tintAt, type TintLight } from '../sprites/tint.js'
import { buildWorld, buildWorldParts } from '../world/build.js'
import { Effects } from '../world/effects.js'
import { farmGeometry, farmProblems, type FarmWorld } from '../world/farm.js'
import type { LoadedKit } from '../world/kits.js'
import { farmStepCost, findPath, pathPoints } from '../world/path.js'
import { DASH_SPEED, WALK_SPEED, type Spot } from '../world/walk.js'
import { BandCamera, TapPan, tilesPerDevicePixel, viewDepthOf } from './band.js'
import { CAMERA_PITCH, cameraOffset, deviceSize, frustum, snapToGrid, spriteStretch, TEXELS_PER_UNIT } from './camera.js'
import {
  coveringOccluders, FADE_DEFAULTS, farmOccluders, figureTarget, fitScale, markerTarget, propPart, stepFade, type FadeOptions, type FadeTarget, type Occluder,
} from './fade.js'
import { FpsRecorder, FramePacer, SAVER_FPS } from './frames.js'
import { DAY_GRADE, mixGrade, type StageGrade } from './grade.js'
import { cardQuad, farmTargets, pickAt, project, type PickHit, type PickTarget, type View } from './pick.js'

/** Someone on the band: a sprite when her set is live, else a standee. */
export interface BandFigure {
  id: string
  tile: Tile
  facing?: Facing
  /** Her sprite set's key (its hash, or her outfit's id); null when none exists, so she's always a standee. */
  set: string | null
  /** Loads her set when the cap lets it go live (the game's cached loader, `loadSpriteSet` through its client). */
  loadSet?: () => Promise<ActorSource | null>
  /** Her face for the standee's card (master data's `outfit-faces`), or null for a plain stand-in. */
  face: CanvasImageSource | null
}
export interface BandStageOptions {
  saver: boolean
  /** Live sprite sets at once (FR13): 8. */
  cap?: number
  /** A band's depth in tiles: 4. */
  band?: number
  /** ST3: `'width'` scales the camera down so the design's width fills a narrower canvas (a 2× phone); never up. */
  fit?: 'none' | 'width'
  /** ST3: buildings and blocking props fade while they cover a figure, a marker of the named kinds or a bubble's anchor. */
  fade?: FadeOptions | boolean
  onFirstFrame?: () => void
}
export interface BandDebug {
  centre: number
  settled: boolean
  figures: { id: string; x: number; z: number; sprite: boolean; moving: boolean }[]
  liveSets: string[]
  grade: StageGrade
  drawCalls: number
  saver: boolean
  device: { width: number; height: number; ratio: number }
  /** The camera's scale (1: one texel a device pixel). */
  scale: number
  /** The parts faded now, by id. */
  faded: string[]
  fps: number
}

/** Where a figure's head is above her feet, in world units (a bubble's anchor): a sprite's, and a standee's card top. */
export const FIGURE_HEAD = 2.15
export const STANDEE_HEAD = ((STANDEE.h + 8) / TEXELS_PER_UNIT) * spriteStretch()
/** A figure's tap card, in texels: wide enough to hit with a thumb. */
const FIGURE_HIT = { w: 112, h: 200 }
/** How often the cap is weighed while figures move, in seconds. */
const CAP_EVERY = 0.5
const LIVE_LIGHTS = 4

interface Live {
  spec: BandFigure
  x: number
  z: number
  facing: Facing
  moving: boolean
  running: boolean
  standee: Standee
  actor: SpriteActor | null
  path: Spot[]
  done: ((arrived: boolean) => void) | null
}

const RIGHT = new Vector3(1, 0, 0)
const UP = new Vector3(0, Math.cos(CAMERA_PITCH), -Math.sin(CAMERA_PITCH))
const FORWARD = new Vector3(0, -Math.sin(CAMERA_PITCH), -Math.cos(CAMERA_PITCH))

export class BandStage {
  private readonly renderer: WebGLRenderer
  private readonly scene = new Scene()
  private readonly camera = new OrthographicCamera(-1, 1, 1, -1, 0.1, 100)
  private readonly sky: HemisphereLight
  private readonly sun: DirectionalLight
  private readonly live: PointLight[] = []
  private readonly band: BandCamera
  private readonly gesture = new TapPan()
  private readonly pacer: FramePacer
  private readonly cap: number
  private recorder = new FpsRecorder()
  private effects: Effects | null = null
  private saver: boolean
  private device = { width: 1, height: 1, ratio: 1 }
  private css = { width: 1, height: 1 }
  private world: { design: FarmDesign; built: FarmWorld; group: Group; targets: PickTarget[]; lookY: number; page: Texture; occluders: Occluder[];
    markers: FadeTarget[]; parts: Map<string, { group: Group; alpha: number; order: number }> } | null = null
  private scale = 1
  private readonly fit: 'none' | 'width'
  private readonly occlusion: Required<FadeOptions> | null
  private fadeMarkers: (m: FarmMarker) => boolean = () => false
  private readonly reducedMotion: MediaQueryList | null
  private readonly figures = new Map<string, Live>()
  private liveSet = new Set<string>()
  private readonly sets = new Map<string, Promise<ActorSource | null>>()
  private capClock = 0
  private capDirty = true
  private grade: StageGrade = DAY_GRADE
  private fade: { from: StageGrade; to: StageGrade; t: number; ms: number } | null = null
  private clock = 0
  private raf = 0
  private last = 0
  private recent: number[] = []
  private firstFrame: (() => void) | null

  constructor(canvas: HTMLCanvasElement, options: BandStageOptions) {
    this.saver = options.saver
    this.cap = options.cap ?? LIVE_SETS
    this.fit = options.fit ?? 'none'
    this.occlusion = options.fade ? { ...FADE_DEFAULTS, ...(options.fade === true ? {} : options.fade) } : null
    const kinds = this.occlusion?.markers ?? []
    this.fadeMarkers = (m) => kinds.includes(m.kind)
    this.reducedMotion = typeof matchMedia === 'function' ? matchMedia('(prefers-reduced-motion: reduce)') : null
    this.band = new BandCamera({ band: options.band })
    this.pacer = new FramePacer(options.saver ? SAVER_FPS : null)
    this.firstFrame = options.onFirstFrame ?? null
    this.renderer = new WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: 'default' })
    this.renderer.outputColorSpace = SRGBColorSpace
    this.renderer.info.autoReset = false
    this.sky = new HemisphereLight(0xffffff, 0xffffff, 1)
    this.sun = new DirectionalLight(0xffffff, 1)
    this.sun.position.set(-4, 8, 6)
    this.scene.add(this.sky, this.sun)
    for (let i = 0; i < LIVE_LIGHTS; i++) { const l = new PointLight(0xffffff, 0, 6, 2); this.live.push(l); this.scene.add(l) }
    this.applyGrade(this.grade)
  }

  // --- The world ---------------------------------------------------------------------------------------------------------

  /** Builds a farm from its design and kit (refused, with what's wrong, when the kit can't build it). Figures stay. */
  setWorld(design: FarmDesign, kit: LoadedKit): FarmWorld {
    const problems = farmProblems(design, kit.kit)
    if (problems.length) throw new Error(`the farm ${design.id} can't be built: ${problems.join('; ')}`)
    this.dropWorld()
    const built = farmGeometry(design, kit.kit)
    // With the fade, each building (with its mounted pieces) and each blocking prop is a part of its own.
    const fade = this.occlusion
    const split = fade ? buildWorldParts(built, kit.kit, [kit.page], (item) => (item.kind === 'face' ? item.face.owner ?? null
      : item.prop.owner ?? (item.prop.blocks ? propPart(item.index) : null))) : null
    const group = split?.shared ?? buildWorld(built, kit.kit, [kit.page])
    this.scene.add(group)
    const occluders = fade ? farmOccluders(built, kit.kit) : []
    const parts = new Map<string, { group: Group; alpha: number; order: number }>()
    for (const [id, part] of split?.parts ?? []) {
      this.scene.add(part)
      parts.set(id, { group: part, alpha: 1, order: Math.round((occluders.find((o) => o.id === id)?.z ?? 0) * 100) })
    }
    const markers = fade ? this.markerTargets(design, built) : []
    // The camera looks at the farm's usual ground level, so it doesn't bob over the pond.
    const counts = new Map<number, number>()
    for (let z = 0; z < built.d; z++) for (let x = 0; x < built.w; x++) { const l = built.grid.level(x, z); counts.set(l, (counts.get(l) ?? 0) + 1) }
    const lookY = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0] - b[0])[0]?.[0] ?? 0
    this.world = { design, built, group, targets: farmTargets(design.markers, built, kit.kit), lookY, page: kit.page, occluders, markers, parts }
    this.applyScale()
    this.band.goTo(this.band.range.min, true)
    for (const f of this.figures.values()) { this.stopWalk(f, false); this.placeAt(f, { x: Math.floor(f.x), z: Math.floor(f.z) }) }
    this.capDirty = true
    return built
  }

  private dropWorld(): void {
    if (!this.world) return
    for (const g of [this.world.group, ...[...this.world.parts.values()].map((p) => p.group)]) {
      this.scene.remove(g)
      g.traverse((o) => { const m = o as Mesh; m.geometry?.dispose(); (m.material as MeshBasicMaterial | undefined)?.dispose?.() })
    }
    this.world = null
  }

  private markerTargets(design: FarmDesign, built: FarmWorld): FadeTarget[] {
    return design.markers.filter((m) => this.fadeMarkers(m)).map((m) => markerTarget(m, built.grid.level(m.x, m.z)))
  }

  /** Which markers the fade keeps in view from now on: some kinds, or any test (only the slots of the sheet that's open). */
  setFadeMarkers(which: readonly FarmMarkerKind[] | ((m: FarmMarker) => boolean)): void {
    this.fadeMarkers = typeof which === 'function' ? which : (m) => which.includes(m.kind)
    if (this.world && this.occlusion) this.world.markers = this.markerTargets(this.world.design, this.world.built)
  }

  /** Fit-to-width (ST3): the camera's scale for the canvas and the design, its frustum, the band's view, and the kit's
   * mipmaps (on only while scaled, so one texel a pixel stays crisp). */
  private applyScale(): void {
    const w = this.world?.built.w ?? 0
    this.scale = this.fit === 'width' && w > 0 ? fitScale(this.device.width, w) : 1
    Object.assign(this.camera, frustum(this.device.width / this.scale, this.device.height / this.scale))
    this.camera.updateProjectionMatrix()
    if (!this.world) return
    this.band.setView(this.world.built.d, viewDepthOf(this.device.height / this.scale))
    const page = this.world.page, mip = this.scale < 1
    if (page.generateMipmaps !== mip) {
      page.generateMipmaps = mip
      page.minFilter = mip ? LinearMipmapLinearFilter : NearestFilter
      page.needsUpdate = true
    }
  }

  resize(cssWidth: number, cssHeight: number, dpr: number): void {
    // A hidden or collapsing page can report no size: keep the last one rather than draw to nothing.
    if (cssWidth < 1 || cssHeight < 1) return
    this.device = deviceSize(cssWidth, cssHeight, dpr)
    this.css = { width: cssWidth, height: cssHeight }
    this.renderer.setPixelRatio(this.device.ratio)
    this.renderer.setSize(cssWidth, cssHeight, false)
    this.applyScale()
    this.effects?.setSize(cssWidth, cssHeight, this.device.ratio)
    this.capDirty = true
  }

  // --- The camera and taps -----------------------------------------------------------------------------------------------

  /** The camera as a tap sees it: the point it looks at, and the stage's size. */
  get view(): View {
    return { look: { x: (this.world?.built.w ?? 0) / 2, y: this.world?.lookY ?? 0, z: this.band.centre }, width: this.css.width, height: this.css.height,
      ratio: this.device.ratio, scale: this.scale }
  }
  /** The band camera (its range, stops and whether it's at rest). */
  get bandCamera(): BandCamera { return this.band }

  /** Moves the camera to show ground row `z` at the middle, settling on a band. */
  scrollTo(z: number, instant = false): void { this.band.goTo(z, instant); this.capDirty = true }

  /** A finger down, in stage CSS px (on the turned layout, `toStage` first). */
  pointerDown(x: number, y: number, t = performance.now()): void { this.gesture.down(x, y, t) }
  pointerMove(x: number, y: number, t = performance.now()): void {
    const dy = this.gesture.move(x, y, t)
    if (dy !== null) this.band.drag((-dy * this.device.ratio * tilesPerDevicePixel()) / this.scale)
  }
  /** The finger lifts: a tap answers with what's under it (nearest first); a pan glides to a band and answers null. */
  pointerUp(x: number, y: number, t = performance.now()): PickHit[] | null {
    const end = this.gesture.up(x, y, t)
    if (end.kind === 'tap') return this.pick(x, y)
    if (end.kind === 'fling') { this.band.release((-end.velocity * this.device.ratio * tilesPerDevicePixel()) / this.scale); this.capDirty = true }
    return null
  }
  pointerCancel(): void { this.gesture.cancel(); this.band.release(0) }

  /** Everything under a stage point, nearest first: figures, props, buildings and markers. */
  pick(x: number, y: number): PickHit[] {
    if (!this.world) return []
    const figures: PickTarget[] = [...this.figures.values()].map((f) => ({ ref: { kind: 'figure', id: f.spec.id },
      quad: cardQuad({ x: f.x, y: this.groundAt(f.x, f.z), z: f.z }, FIGURE_HIT.w, FIGURE_HIT.h), bias: 0.05 }))
    return pickAt(this.view, x, y, [...figures, ...this.world.targets])
  }

  /** A world point on the stage, in CSS px. */
  project(p: { x: number; y: number; z: number }): { x: number; y: number } { const s = project(this.view, p); return { x: s.x, y: s.y } }
  /** Where a figure's head is on the stage (a bubble's anchor), or null. */
  headOf(id: string): { x: number; y: number } | null {
    const f = this.figures.get(id)
    return f ? this.project({ x: f.x, y: this.groundAt(f.x, f.z) + (f.actor ? FIGURE_HEAD : STANDEE_HEAD), z: f.z }) : null
  }

  private groundAt(x: number, z: number): number { return this.world?.built.grid.level(Math.floor(x), Math.floor(z)) ?? 0 }

  // --- Figures -------------------------------------------------------------------------------------------------------------

  /** Adds a figure standing on a tile's middle (a standee until the cap lets her set go live). */
  addFigure(spec: BandFigure): void {
    this.removeFigure(spec.id)
    const standee = new Standee(spec.face)
    this.scene.add(standee.group, standee.shadowMesh)
    const f: Live = { spec, x: spec.tile.x + 0.5, z: spec.tile.z + 0.5, facing: spec.facing ?? 'front', moving: false, running: false, standee, actor: null, path: [], done: null }
    this.figures.set(spec.id, f)
    this.capDirty = true
  }

  removeFigure(id: string): void {
    const f = this.figures.get(id)
    if (!f) return
    this.stopWalk(f, false)
    this.scene.remove(f.standee.group, f.standee.shadowMesh)
    f.standee.dispose()
    this.dropActor(f)
    this.figures.delete(id)
    this.capDirty = true
  }

  /** Puts a figure on a tile at once (the farm's counts never wait on a walk, FR14). */
  placeFigure(id: string, tile: Tile, facing?: Facing): void {
    const f = this.figures.get(id)
    if (!f) return
    this.stopWalk(f, false)
    this.placeAt(f, tile)
    if (facing) f.facing = facing
    this.capDirty = true
  }

  private placeAt(f: Live, tile: Tile): void { f.x = tile.x + 0.5; f.z = tile.z + 0.5; f.moving = false }

  /** Walks (or runs) a figure along the paths to a tile; resolves true on arrival, false with no way or when interrupted. */
  walkTo(id: string, tile: Tile, options: { run?: boolean } = {}): Promise<boolean> {
    const f = this.figures.get(id)
    if (!f || !this.world) return Promise.resolve(false)
    this.stopWalk(f, false)
    const grid = this.world.built.grid
    const tiles = findPath(grid, { x: Math.floor(f.x), z: Math.floor(f.z) }, tile, farmStepCost(grid))
    if (!tiles) return Promise.resolve(false)
    f.path = pathPoints(tiles)
    f.running = options.run ?? false
    return new Promise((resolve) => { f.done = resolve })
  }

  private stopWalk(f: Live, arrived: boolean): void {
    const done = f.done
    f.path = []
    f.done = null
    f.moving = false
    done?.(arrived)
  }

  /** Swaps a figure's set key (a new batch published hers), weighing the cap again. */
  setFigureSet(id: string, set: string | null, loadSet?: BandFigure['loadSet']): void {
    const f = this.figures.get(id)
    if (!f) return
    f.spec = { ...f.spec, set, ...(loadSet ? { loadSet } : {}) }
    this.dropActor(f)
    this.capDirty = true
  }

  private dropActor(f: Live): void {
    if (!f.actor) return
    this.scene.remove(f.actor.group, f.actor.shadowMesh)
    f.actor.dispose()
    f.actor = null
    f.standee.group.visible = f.standee.shadowMesh.visible = true
  }

  /** The cap (FR13): the sets of figures in view, nearest the camera's centre first, at most `cap` live. */
  private weighCap(): void {
    const top = this.band.top, depth = viewDepthOf(this.device.height / this.scale)
    const inView = [...this.figures.values()].filter((f) => f.z >= top - 2 && f.z <= top + depth + 1)
      .map((f) => ({ id: f.spec.id, set: f.spec.set, x: f.x, z: f.z }))
    const next = liveSets(inView, { x: (this.world?.built.w ?? 0) / 2, z: this.band.centre }, this.cap, this.liveSet)
    for (const set of this.liveSet) if (!next.has(set)) this.sets.delete(set)
    this.liveSet = next
    for (const f of this.figures.values()) {
      const set = f.spec.set
      if (!set || !next.has(set)) { this.dropActor(f); continue }
      if (f.actor || !f.spec.loadSet) continue
      let pending = this.sets.get(set)
      if (!pending) { pending = f.spec.loadSet().catch(() => null); this.sets.set(set, pending) }
      void pending.then((source) => {
        // Still hers, still live, still without a sprite: she becomes one.
        if (!source || this.figures.get(f.spec.id) !== f || f.actor || f.spec.set !== set || !this.liveSet.has(set)) return
        f.actor = new SpriteActor(source)
        this.scene.add(f.actor.group, f.actor.shadowMesh)
        f.standee.group.visible = f.standee.shadowMesh.visible = false
      })
    }
  }

  // --- The grade -------------------------------------------------------------------------------------------------------------

  /** The scene's light and colour (a season, the night), at once or over `ms`. */
  setGrade(grade: StageGrade, ms = 0): void {
    if (ms <= 0) { this.fade = null; this.grade = grade; this.applyGrade(grade); return }
    this.fade = { from: this.grade, to: grade, t: 0, ms }
  }
  get currentGrade(): StageGrade { return this.grade }

  private applyGrade(g: StageGrade): void {
    this.sky.color.set(g.sky)
    this.sky.groundColor.set(g.ground)
    this.sky.intensity = g.skyLight
    this.sun.color.set(g.sun)
    this.sun.intensity = g.sunLight
    this.scene.background = new Color(g.background)
  }

  // --- The loop ----------------------------------------------------------------------------------------------------------

  /** Battery saver (DN27): 30 fps and no tilt-shift or bloom. */
  setSaver(saver: boolean): void { this.saver = saver; this.pacer.setFps(saver ? SAVER_FPS : null) }
  private effectsOn(): Effects | null {
    if (this.saver) return null
    if (!this.effects) { this.effects = new Effects(this.renderer, this.scene, this.camera); this.effects.setSize(this.css.width, this.css.height, this.device.ratio) }
    return this.effects
  }

  beginRecord(): FpsRecorder { this.recorder = new FpsRecorder(); return this.recorder }
  get record(): FpsRecorder { return this.recorder }

  start(): void {
    if (this.raf) return
    this.last = performance.now()
    const tick = (now: number) => {
      this.raf = requestAnimationFrame(tick)
      const dt = Math.max(0, Math.min(0.1, (now - this.last) / 1000))
      this.last = now
      this.update(dt)
      if (this.pacer.shouldDraw(now)) this.draw(now)
    }
    this.raf = requestAnimationFrame(tick)
  }

  /** Runs one frame by hand (a hidden preview pane runs no animation frames). */
  step(dt = 1 / 30): void { this.update(dt); this.draw(performance.now()) }

  stop(): void {
    if (this.raf) cancelAnimationFrame(this.raf)
    this.raf = 0
    this.recorder.pause()
  }

  private update(dt: number): void {
    this.clock += dt
    if (this.band.step(dt)) this.capDirty = true
    if (this.fade) {
      const fade = this.fade
      fade.t = Math.min(1, fade.t + (dt * 1000) / fade.ms)
      this.grade = mixGrade(fade.from, fade.to, fade.t)
      this.applyGrade(this.grade)
      if (fade.t >= 1) this.fade = null
    }
    let anyMoving = false
    for (const f of this.figures.values()) {
      const p = f.path[0]
      if (p) {
        const dx = p.x - f.x, dz = p.z - f.z, d = Math.hypot(dx, dz), step = (f.running ? DASH_SPEED : WALK_SPEED) * dt
        if (d <= Math.max(step, 1e-6)) { f.x = p.x; f.z = p.z; f.path.shift() }
        else { f.x += (dx / d) * step; f.z += (dz / d) * step; f.facing = facingOf(dx, dz, f.facing) }
        f.moving = true
        anyMoving = true
        if (!f.path.length) this.stopWalk(f, true)
      }
      const ms = dt * 1000
      f.standee.update(ms, f.facing, f.moving, f.running)
      f.actor?.update(ms, f.facing, f.moving, f.running && f.moving)
    }
    this.capClock += dt
    if (this.capDirty || (anyMoving && this.capClock >= CAP_EVERY)) { this.capClock = 0; this.capDirty = false; this.weighCap() }
    this.stepFades(dt)
  }

  /** The fade (ST3): each part covering a target eases toward the fade's opacity, the rest back to full. */
  private stepFades(dt: number): void {
    const fade = this.occlusion, world = this.world
    if (!fade || !world || !world.parts.size) return
    const targets = [...world.markers, ...[...this.figures.values()].map((f) => {
      const y = this.groundAt(f.x, f.z), head = y + (f.actor ? FIGURE_HEAD : STANDEE_HEAD)
      return figureTarget({ x: f.x, y, z: f.z }, FIGURE_HIT.w, FIGURE_HIT.h, { x: f.x, y: head, z: f.z })
    })]
    const covering = coveringOccluders(world.occluders, targets)
    const instant = this.reducedMotion?.matches ?? false
    for (const [id, part] of world.parts) {
      const goal = covering.has(id) ? fade.opacity : 1
      if (part.alpha === goal) continue
      part.alpha = stepFade(part.alpha, goal, dt, { opacity: fade.opacity, ms: fade.ms, instant })
      const faded = part.alpha < 1
      part.group.traverse((o) => {
        const mesh = o as Mesh
        if (!mesh.isMesh) return
        const m = mesh.material as MeshLambertMaterial
        m.opacity = part.alpha
        m.transparent = faded
        m.depthWrite = !faded
        // The kit's cut-out edge, scaled with the fade so a faded texel isn't cut away.
        m.alphaTest = 0.5 * part.alpha
        // Drawn after what stands behind it, before what stands in front.
        mesh.renderOrder = faded ? part.order : 0
      })
    }
  }

  private draw(now: number): void {
    const look = this.view.look, o = cameraOffset()
    const eye = new Vector3(look.x, look.y + o.y, look.z + o.z)
    const per = TEXELS_PER_UNIT * this.scale
    const snapped = RIGHT.clone().multiplyScalar(snapToGrid(eye.dot(RIGHT), 0, per)).add(UP.clone().multiplyScalar(snapToGrid(eye.dot(UP), 0, per)))
      .add(FORWARD.clone().multiplyScalar(eye.dot(FORWARD)))
    this.camera.position.copy(snapped)
    this.camera.quaternion.setFromAxisAngle(RIGHT, -CAMERA_PITCH)
    this.camera.updateMatrixWorld()
    this.placeLights(look)
    const f = frustum(this.device.width / this.scale, this.device.height / this.scale), lights = this.tintLights(), base = rgb(this.grade.tint)
    for (const fig of this.figures.values()) {
      const ground = new Vector3(fig.x, this.groundAt(fig.x, fig.z), fig.z), rel = ground.clone().sub(snapped)
      const placed = snapped.clone().add(RIGHT.clone().multiplyScalar(snapToGrid(rel.dot(RIGHT), f.left, per)))
        .add(UP.clone().multiplyScalar(snapToGrid(rel.dot(UP), f.bottom, per))).add(FORWARD.clone().multiplyScalar(rel.dot(FORWARD)))
      const tint = tintAt(ground, base, lights), order = Math.round(fig.z * 100)
      ;(fig.actor ?? fig.standee).stand(placed.x, placed.y, placed.z, order, tint)
    }
    this.renderer.info.reset()
    const effects = this.effectsOn()
    if (effects) effects.render()
    else this.renderer.render(this.scene, this.camera)
    this.recorder.frame(now)
    this.recent.push(now)
    while (this.recent.length > 0 && now - this.recent[0]! > 1000) this.recent.shift()
    if (this.firstFrame) { this.firstFrame(); this.firstFrame = null }
  }

  private tintLights(): TintLight[] {
    return this.live.filter((l) => l.intensity > 0).map((l) => ({ x: l.position.x, y: l.position.y, z: l.position.z,
      color: [l.color.r, l.color.g, l.color.b], radius: l.distance, strength: l.intensity / 9 }))
  }

  /** The four live lights go to the kit's lamps nearest the view's middle, at the grade's strength. */
  private placeLights(at: { x: number; z: number }): void {
    const sources = this.world?.built.lights ?? []
    const near = [...sources].sort((a, b) => Math.hypot(a.at.x - at.x, a.at.z - at.z) - Math.hypot(b.at.x - at.x, b.at.z - at.z))
    this.live.forEach((l, i) => {
      const src = near[i]
      if (!src || this.grade.lamps <= 0) { l.intensity = 0; return }
      l.position.set(src.at.x, src.at.y, src.at.z)
      l.color.set(src.color)
      l.distance = src.radius + 2
      const flicker = src.flicker ? 0.88 + 0.12 * Math.sin(this.clock * 13 + i * 7) * Math.sin(this.clock * 7.3 + i) : 1
      l.intensity = 9 * flicker * this.grade.lamps
    })
  }

  get debug(): BandDebug {
    return {
      centre: this.band.centre, settled: this.band.settled,
      figures: [...this.figures.values()].map((f) => ({ id: f.spec.id, x: f.x, z: f.z, sprite: !!f.actor, moving: f.moving })),
      liveSets: [...this.liveSet], grade: this.grade, drawCalls: this.renderer.info.render.calls, saver: this.saver, device: { ...this.device },
      scale: this.scale, faded: [...(this.world?.parts ?? [])].filter(([, p]) => p.alpha < 1).map(([id]) => id),
      fps: this.recent.length,
    }
  }

  dispose(): void {
    this.stop()
    this.effects?.dispose()
    for (const id of [...this.figures.keys()]) this.removeFigure(id)
    this.dropWorld()
    this.renderer.dispose()
  }
}
