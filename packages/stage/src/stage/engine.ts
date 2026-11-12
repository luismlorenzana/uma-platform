// The stage's engine (Q4): three.js, loaded on demand with this module (N1). It draws the test room's stand-in blocks and
// a stand-in Uma, follows her with the orthographic camera, keeps her on whole device pixels, and paces its frames for
// battery saver. Q5's builder replaces the room; Q6 brings the real sprites.
import {
  Color, DirectionalLight, Fog, Group, HemisphereLight, Mesh, MeshBasicMaterial, NearestFilter, OrthographicCamera, PointLight, Scene,
  SRGBColorSpace, Vector3, WebGLRenderer,
} from 'three'
import { SpriteActor, type ActorSource } from '../sprites/actor.js'
import { facingOf, type Facing } from '../sprites/facing.js'
import { standInSet } from '../sprites/standInSet.js'
import { tintAt, type TintLight } from '../sprites/tint.js'
import { FOLLOW_GAP, Trail } from '../sprites/trail.js'
import type { Grid, KitAtlas, RoomDesign, Tile, TownDesign } from '../formats/index.js'
import { CAMERA_PITCH, cameraOffset, deviceSize, follow, frustum, snapToGrid, TEXELS_PER_UNIT } from './camera.js'
import { FpsRecorder, FramePacer, SAVER_FPS } from './frames.js'
import { STILL, type Move } from './input.js'
import { buildWorld } from '../world/build.js'
import { TEST_ROOM, TEST_ROOM_LOOP, TEST_TOWN, TEST_TOWN_LOOP } from '../world/designs.js'
import { Effects } from '../world/effects.js'
import { roomGeometry, townGeometry, type LightSource } from '../world/geometry.js'
import { standInKit, type KitKind, type LoadedKit } from '../world/kits.js'
import { autoMove, DASH_SPEED, heightAt, walk, walkWorld, WALK_SPEED, type Spot, type WalkWorld } from '../world/walk.js'

export type SceneName = 'room' | 'town' | 'dungeon'
/**
 * A dungeon floor as the stage draws it: the room format's cells, heights and spots, its number (1–5) and where the party
 * arrives. A game's own floors (uma-quest's generated ones) fit it as they are.
 */
export interface StageFloor extends Pick<RoomDesign, 'cells' | 'heights' | 'spots'> { floor: number; start: Tile }
/** What the test room's dungeon scene walks: a game's fixed test dungeon, five floors (uma-quest Q10). */
export interface StageDungeon { floors: readonly StageFloor[] }
export interface EngineOptions {
  saver: boolean
  onFirstFrame?: () => void
  /** The test room's dungeon, made on first use; without it the dungeon scene shows the test room. */
  testDungeon?: () => StageDungeon
}
/** Live lights at once: the four nearest the party (Q5). */
export const LIVE_LIGHTS = 4

interface World { name: SceneName; group: Group; walk: WalkWorld; lights: LightSource[]; loop: readonly Spot[]; start: Spot }

/** A foe standing visible on a run's floor (DN9): the mini-boss or the boss, on its spot. */
export interface FieldFoe { kind: 'miniboss' | 'boss'; x: number; z: number; source: ActorSource }
/** A townsperson (Q12): who she is, her set, and where she stands or the route she walks. */
export interface TownFolk { outfitId: number; source: ActorSource; stand?: Tile; route?: readonly Tile[] }
/** How fast townsfolk stroll, in tiles a second, and how long they pause at each point of their route. */
const FOLK_SPEED = 1.2
const FOLK_PAUSE = 1.2
/** Where a bubble sits over a traveler's feet, in world units (format.md §7.4). */
const HEAD_Y = 2.15
interface Body { actor: SpriteActor; x: number; z: number; facing: Facing; moving: boolean }
interface Folk extends Body { outfitId: number; route: Spot[]; leg: number; pause: number; home: Spot | null }
/** What the leader did this frame, for the run's rules (Q11). */
export interface StepInfo { at: Spot; moved: number; dash: boolean; dt: number }

export interface EngineDebug {
  scene: SceneName
  /** The test dungeon's floor, in the dungeon scene. */
  floor: number | null
  /** The party's outfit ids, leader first (the stand-ins are 9002xx). */
  party: number[]
  action: string
  lights: number
  effects: boolean
  leader: Spot & { y: number }
  drawCalls: number
  triangles: number
  saver: boolean
  device: { width: number; height: number; ratio: number }
  fps: number
}

const RIGHT = new Vector3(1, 0, 0)
const UP = new Vector3(0, Math.cos(CAMERA_PITCH), -Math.sin(CAMERA_PITCH))
const FORWARD = new Vector3(0, -Math.sin(CAMERA_PITCH), -Math.cos(CAMERA_PITCH))

export class StageEngine {
  private readonly renderer: WebGLRenderer
  private readonly scene = new Scene()
  private readonly camera = new OrthographicCamera(-1, 1, 1, -1, 0.1, 100)
  private readonly party: SpriteActor[] = []
  private trail = new Trail({ x: 0, z: 0 })
  private spots: { x: number; z: number; facing: Facing; moving: boolean }[] = []
  private readonly pacer: FramePacer
  private recorder = new FpsRecorder()
  private device = { width: 1, height: 1, ratio: 1 }
  private world!: World
  private dungeon: StageDungeon | null = null
  private floor = 1
  private readonly kits = new Map<KitKind, LoadedKit>()
  private openedShown: ReadonlySet<string> = new Set()
  private readonly live: PointLight[] = []
  private effects: Effects | null = null
  private cssSize = { width: 1, height: 1 }
  private clock = 0
  private at: Spot = { x: 0, z: 0 }
  private look = { x: 0, y: 0, z: 0 }
  private move: Move = STILL
  private dash = false
  private auto = false
  private autoTarget = 0
  private saver: boolean
  private raf = 0
  private last = 0
  private firstFrame: (() => void) | null
  private recent: number[] = []
  private foes: { kind: FieldFoe['kind']; x: number; z: number; actor: SpriteActor }[] = []
  private floorShown: StageFloor | null = null
  private onStep: ((info: StepInfo) => void) | null = null
  private path: Spot[] | null = null
  private pathIndex = 0
  private onPathEnd: (() => void) | null = null
  private folk: Folk[] = []
  private partyIds: number[] = []
  private sceneMode = false
  private walks = new Map<SpriteActor, { to: Spot; done: () => void }>()
  private emotes = new Map<SpriteActor, { left: number; done: () => void }>()
  private camPan: { from: Spot & { y: number }; to: (Spot & { y: number }) | null; t: number; ms: number; done: () => void } | null = null
  private camHold: (Spot & { y: number }) | null = null

  private readonly makeTestDungeon: (() => StageDungeon) | null

  constructor(private readonly canvas: HTMLCanvasElement, options: EngineOptions) {
    this.makeTestDungeon = options.testDungeon ?? null
    this.saver = options.saver
    this.pacer = new FramePacer(options.saver ? SAVER_FPS : null)
    this.firstFrame = options.onFirstFrame ?? null
    // No antialiasing: the stage is pixel art at one texel a device pixel, and it's cheaper (DN27).
    this.renderer = new WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: 'default' })
    this.renderer.outputColorSpace = SRGBColorSpace
    // Count a frame's draw calls across every pass (the effects draw several).
    this.renderer.info.autoReset = false
    this.scene.add(new HemisphereLight(0xdfe8ff, 0x3a3226, 1.5))
    // The key light from the top front-left, as the sprites and kits are lit (format.md §10).
    const sun = new DirectionalLight(0xfff1d6, 1.3)
    sun.position.set(-4, 8, 6)
    this.scene.add(sun)
    for (let i = 0; i < LIVE_LIGHTS; i++) { const l = new PointLight(0xffffff, 0, 6, 2); this.live.push(l); this.scene.add(l) }
    // The party (Q6): five stand-ins until the published sets arrive (setParty).
    for (let i = 0; i < 5; i++) {
      const actor = new SpriteActor(standInSet(i))
      this.party.push(actor)
      this.scene.add(actor.group, actor.shadowMesh)
    }
    this.load('room')
  }

  /** A kind's kit: the one given by `setKit` (Q37: the forest's art), else the stand-in drawn once (Q5). */
  private kitFor(kind: KitKind): LoadedKit {
    const cached = this.kits.get(kind)
    if (cached) return cached
    const made = standInKit(kind)
    this.kits.set(kind, made)
    return made
  }

  /** Builds with a loaded kit from now on (Q37), rebuilding the scene shown if it's of that kind, the party where she stands. */
  setKit(kind: KitKind, loaded: LoadedKit): void {
    this.kits.set(kind, loaded)
    if (!this.world || (kind === 'town') !== (this.world.name === 'town')) return
    if (this.world.name === 'dungeon' && this.floorShown) { this.dropWorld(); this.buildFloor(this.floorShown, this.openedShown); return }
    if (this.world.name === 'room' || this.world.name === 'dungeon') this.load(this.world.name)
  }

  /** Builds a scene from its design and kit, and puts the leader at its start. */
  load(name: SceneName): void {
    this.dropWorld()
    this.clearFoes()
    this.clearFolk()
    this.floorShown = null
    const { kit, page } = this.kitFor(name === 'town' ? 'town' : 'biome')
    if (name === 'dungeon') this.dungeon ??= this.makeTestDungeon?.() ?? null
    if (name === 'dungeon' && !this.dungeon) name = 'room'
    const floor = this.dungeon?.floors[this.floor - 1]
    const design = name === 'room' ? TEST_ROOM : name === 'town' ? TEST_TOWN : floor!
    const geo = name === 'town' ? townGeometry(TEST_TOWN, kit) : roomGeometry(name === 'room' ? TEST_ROOM : floor!, kit)
    const group = buildWorld(geo, kit, [page])
    this.scene.add(group)
    const entrance = TEST_ROOM.spots.find((s) => s.kind === 'entrance')!, spawn = TEST_TOWN.markers.find((m) => m.kind === 'spawn')!
    const at = name === 'room' ? entrance : name === 'town' ? spawn : floor!.start
    const start = { x: at.x + 0.5, z: at.z + 0.5 }
    this.world = { name, group, walk: walkWorld(design, geo.blocked), lights: geo.lights,
      loop: name === 'room' ? TEST_ROOM_LOOP : name === 'town' ? TEST_TOWN_LOOP : [], start }
    const fog = name === 'town' ? '#232a38' : '#16241f'
    this.scene.background = new Color(fog)
    this.scene.fog = new Fog(fog, 34, 52)
    this.placeParty(start)
  }

  private dropWorld(): void {
    if (!this.world) return
    this.scene.remove(this.world.group)
    this.world.group.traverse((o) => { const m = o as Mesh; m.geometry?.dispose(); (m.material as MeshBasicMaterial | undefined)?.dispose?.() })
  }

  private placeParty(start: Spot): void {
    this.at = { ...start }
    this.look = { x: start.x, y: heightAt(this.world.walk, start.x, start.z), z: start.z }
    this.trail = new Trail(start, this.party.length - 1)
    this.spots = this.party.map((_, i) => ({ ...this.trail.at(i * FOLLOW_GAP), facing: 'back' as Facing, moving: false }))
    this.autoTarget = 0
    this.path = null
  }

  private clearFoes(): void {
    for (const f of this.foes) { this.scene.remove(f.actor.group, f.actor.shadowMesh); f.actor.dispose() }
    this.foes = []
  }

  /** A run's floor (Q11): built from the biome kit with its opened chests open and its visible foes standing, the party
   * arriving on `at`. */
  loadFloor(floor: StageFloor, at: Tile, opened: ReadonlySet<string>, foes: readonly FieldFoe[]): void {
    this.dropWorld()
    this.clearFoes()
    this.clearFolk()
    this.floorShown = floor
    this.floor = floor.floor
    this.openedShown = opened
    this.buildFloor(floor, opened)
    for (const f of foes) {
      const actor = new SpriteActor(f.source)
      actor.setManual(true, 'right')
      this.scene.add(actor.group, actor.shadowMesh)
      this.foes.push({ kind: f.kind, x: f.x + 0.5, z: f.z + 0.5, actor })
    }
    this.placeParty({ x: at.x + 0.5, z: at.z + 0.5 })
  }

  /** A town (Q12): built from the town kit, its townsfolk standing or strolling their routes, the party arriving on `at`. */
  loadTown(design: TownDesign, at: Tile, folk: readonly TownFolk[]): void {
    this.dropWorld()
    this.clearFoes()
    this.clearFolk()
    this.floorShown = null
    const { kit, page } = this.kitFor('town')
    const geo = townGeometry(design, kit)
    const group = buildWorld(geo, kit, [page])
    this.scene.add(group)
    const start = { x: at.x + 0.5, z: at.z + 0.5 }
    this.world = { name: 'town', group, walk: walkWorld(design, geo.blocked), lights: geo.lights, loop: [], start }
    this.scene.background = new Color('#232a38')
    this.scene.fog = new Fog('#232a38', 34, 52)
    for (const f of folk) {
      const actor = new SpriteActor(f.source)
      this.scene.add(actor.group, actor.shadowMesh)
      const route = (f.route ?? []).map((t) => ({ x: t.x + 0.5, z: t.z + 0.5 }))
      const home = f.stand ? { x: f.stand.x + 0.5, z: f.stand.z + 0.5 } : null
      const first = home ?? route[0] ?? start
      this.folk.push({ outfitId: f.outfitId, actor, x: first.x, z: first.z, facing: 'front', moving: false, route, leg: route.length > 1 ? 1 : 0, pause: 0, home })
    }
    this.placeParty(start)
  }

  /** A townsperson's set arrived: she swaps her stand-in for it. */
  setFolkSource(outfitId: number, source: ActorSource): void {
    for (const f of this.folk) if (f.outfitId === outfitId) f.actor.setSource(source)
  }

  private clearFolk(): void {
    for (const f of this.folk) { this.scene.remove(f.actor.group, f.actor.shadowMesh); f.actor.dispose() }
    this.folk = []
  }

  /** The townsperson nearest the leader within `reach` tiles, by outfit id. */
  folkNear(reach: number): number | null {
    let best: Folk | null = null, bestD = reach
    for (const f of this.folk) { const d = Math.hypot(f.x - this.at.x, f.z - this.at.z); if (d <= bestD) { best = f; bestD = d } }
    return best?.outfitId ?? null
  }

  /** The party's outfit ids in field order, leader first, whatever sets have loaded: how scenes find each one. */
  setPartyOrder(ids: readonly number[]): void { this.partyIds = [...ids] }

  // --- Scenes (Q12, CM17): everyone a puppet the scene runner moves --------------------------------------------------

  /** Starts a scene: the party stops following, and townsfolk stop strolling, until `endScene`. */
  beginScene(): void {
    this.sceneMode = true
    this.path = null
    this.move = STILL
    this.dash = false
  }

  /** Ends a scene: the leader leads from where she stands, the others falling in behind; the camera follows her again. */
  endScene(): void {
    this.sceneMode = false
    this.camPan = null
    this.camHold = null
    for (const [, w] of this.walks) w.done()
    for (const [actor, e] of this.emotes) { actor.releaseHold(); actor.setManual(false); e.done() }
    this.walks.clear()
    this.emotes.clear()
    const lead = this.spots[0]!
    this.at = { x: lead.x, z: lead.z }
    const last = this.spots.at(-1)!
    this.trail = new Trail({ x: last.x, z: last.z }, 0)
    for (let i = this.spots.length - 2; i >= 0; i--) this.trail.push(this.spots[i]!)
  }
  get inScene(): boolean { return this.sceneMode }

  private bodyOf(outfitId: number): Body | null {
    const i = this.partyIds.indexOf(outfitId)
    if (i >= 0 && this.party[i]) return Object.assign(this.spots[i]!, { actor: this.party[i]! }) as unknown as Body
    return this.folk.find((f) => f.outfitId === outfitId) ?? null
  }

  /** Puts someone on a tile, facing a way. */
  placeActor(outfitId: number, at: Tile, facing?: Facing): void {
    const b = this.bodyOf(outfitId)
    if (!b) return
    b.x = at.x + 0.5
    b.z = at.z + 0.5
    if (facing) b.facing = facing
    if (this.partyIds[0] === outfitId) this.at = { x: b.x, z: b.z }
  }

  faceActor(outfitId: number, facing: Facing): void {
    const b = this.bodyOf(outfitId)
    if (b) b.facing = facing
  }

  /** Walks someone in a straight line to a tile's middle; resolves when she's there. */
  walkActor(outfitId: number, to: Tile): Promise<void> {
    const b = this.bodyOf(outfitId)
    if (!b) return Promise.resolve()
    return new Promise((done) => this.walks.set(b.actor, { to: { x: to.x + 0.5, z: to.z + 0.5 }, done }))
  }

  /** Plays an emote facing the camera (format.md §7.4); resolves when it has played (a loop twice, a hold a moment).
   * False at once when her set has no such action (a stand-in). */
  emoteActor(outfitId: number, name: string): Promise<boolean> {
    const b = this.bodyOf(outfitId)
    if (!b || !b.actor.hasAction(name)) return Promise.resolve(false)
    const action = b.actor.current.set.actions[name]!
    const once = action.frames.reduce((ms, f) => ms + (f.ms ?? 200), 0)
    const left = action.loop ? Math.max(1000, once * 2) : once + (action.events.hold ? 600 : 150)
    b.facing = 'front'
    b.actor.setManual(true, 'front')
    b.actor.act(name)
    return new Promise((done) => this.emotes.set(b.actor, { left, done: () => done(true) }))
  }

  /** A camera beat: pans to a tile and holds there, or back to the leader with `null`; `ms` 0 cuts. */
  cameraTo(to: Tile | null, ms: number): Promise<void> {
    const at = to ? { x: to.x + 0.5, z: to.z + 0.5 } : this.at
    const target = { ...at, y: heightAt(this.world.walk, at.x, at.z) }
    return new Promise((done) => { this.camPan = { from: { ...this.look }, to: to ? target : null, t: 0, ms: Math.max(1, ms), done } })
  }

  /** Where someone's head is on the screen, in CSS pixels, for her bubble; null when she isn't here. */
  headOf(outfitId: number): { x: number; y: number } | null {
    const b = this.bodyOf(outfitId)
    if (!b) return null
    const p = new Vector3(b.x, heightAt(this.world.walk, b.x, b.z) + HEAD_Y, b.z).project(this.camera)
    return { x: ((p.x + 1) / 2) * this.cssSize.width, y: ((1 - p.y) / 2) * this.cssSize.height }
  }

  /** Rebuilds the floor shown with these chests open, the party staying where she stands. */
  openChests(opened: ReadonlySet<string>): void {
    if (!this.floorShown) return
    this.openedShown = opened
    this.dropWorld()
    this.buildFloor(this.floorShown, opened)
  }

  private buildFloor(floor: StageFloor, opened: ReadonlySet<string>): void {
    const { kit, page } = this.kitFor('biome')
    const geo = roomGeometry(floor, kit, opened)
    const group = buildWorld(geo, kit, [page])
    this.scene.add(group)
    const start = { x: floor.start.x + 0.5, z: floor.start.z + 0.5 }
    this.world = { name: 'dungeon', group, walk: walkWorld(floor, geo.blocked), lights: geo.lights, loop: [], start }
    this.scene.background = new Color('#16241f')
    this.scene.fog = new Fog('#16241f', 34, 52)
  }

  /** A visible foe beaten: gone from the floor (DN9). */
  removeFoe(kind: FieldFoe['kind']): void {
    for (const f of this.foes.filter((x) => x.kind === kind)) { this.scene.remove(f.actor.group, f.actor.shadowMesh); f.actor.dispose() }
    this.foes = this.foes.filter((x) => x.kind !== kind)
  }

  /** Called every frame with what the leader did (the run's danger meter, rooms and pieces). */
  setOnStep(fn: ((info: StepInfo) => void) | null): void { this.onStep = fn }

  /** Auto-explore's walk (DN26): tile to tile through `path`'s middles while nothing else moves her; `onEnd` when she
   * reaches its last. Null stops it. */
  setPath(path: readonly Tile[] | null, onEnd: (() => void) | null = null): void {
    this.path = path ? path.map((t) => ({ x: t.x + 0.5, z: t.z + 0.5 })) : null
    this.pathIndex = 0
    this.onPathEnd = onEnd
  }
  get walking(): boolean { return this.path !== null }

  /** Where the leader stands. */
  get leader(): Spot { return { ...this.at } }
  /** The grid she walks, with blocking pieces closed. */
  get walkGrid(): Grid { return this.world.walk.grid }

  get sceneName(): SceneName { return this.world.name }

  /** The renderer, lent to the fight stage while the field is stopped (Q9). */
  get webgl(): WebGLRenderer { return this.renderer }
  /** The party's sets in party order, for a fight (the stand-ins where a set hasn't loaded). */
  partySources(): ActorSource[] { return this.party.map((a) => a.current) }
  /** The sets of these outfits, by the field order `setPartyOrder` gave (a fight's own order, Q12). */
  partySourcesFor(ids: readonly number[]): ActorSource[] {
    return ids.map((id, i) => this.party[this.partyIds.indexOf(id)]?.current ?? this.party[i]!.current)
  }

  /** The test dungeon's floor shown (1–5), and the next one, round again after the fifth. */
  get floorNumber(): number { return this.floor }
  nextFloor(): void {
    this.floor = this.floor % 5 + 1
    if (this.world.name === 'dungeon') this.load('dungeon')
  }

  /** Puts the published sets on the party, leader first (Q6); a missing one keeps its stand-in. */
  setParty(sources: readonly (ActorSource | null)[]): void {
    sources.forEach((source, i) => { if (source && this.party[i]) this.party[i]!.setSource(source) })
  }

  resize(cssWidth: number, cssHeight: number, dpr: number): void {
    this.device = deviceSize(cssWidth, cssHeight, dpr)
    this.renderer.setPixelRatio(this.device.ratio)
    this.renderer.setSize(cssWidth, cssHeight, false)
    const f = frustum(this.device.width, this.device.height)
    Object.assign(this.camera, f)
    this.camera.updateProjectionMatrix()
    this.cssSize = { width: cssWidth, height: cssHeight }
    this.effects?.setSize(cssWidth, cssHeight, this.device.ratio)
  }

  setMove(move: Move): void { this.move = move }
  setDash(dash: boolean): void { this.dash = dash }
  setAuto(auto: boolean): void { this.auto = auto }
  /** Battery saver (DN27): 30 fps and no tilt-shift or bloom. */
  setSaver(saver: boolean): void { this.saver = saver; this.pacer.setFps(saver ? SAVER_FPS : null) }
  private effectsOn(): Effects | null {
    if (this.saver) return null
    if (!this.effects) { this.effects = new Effects(this.renderer, this.scene, this.camera); this.effects.setSize(this.cssSize.width, this.cssSize.height, this.device.ratio) }
    return this.effects
  }

  /** Starts a fresh frame record (a measured play) and returns it. */
  beginRecord(): FpsRecorder { this.recorder = new FpsRecorder(); return this.recorder }
  get record(): FpsRecorder { return this.recorder }

  start(): void {
    if (this.raf) return
    this.last = performance.now()
    const tick = (now: number) => {
      this.raf = requestAnimationFrame(tick)
      // A frame's time can come in a hair before the clock read at start: never a negative step.
      const dt = Math.max(0, Math.min(0.1, (now - this.last) / 1000))
      this.last = now
      this.update(dt)
      if (this.pacer.shouldDraw(now)) this.draw(now)
    }
    this.raf = requestAnimationFrame(tick)
  }

  /** Runs one frame by hand, for `?debug` checks where no animation frames run (a hidden preview pane). */
  step(dt = 1 / 30): void {
    this.update(dt)
    this.draw(performance.now())
  }

  /** Stops the loop (the app hidden, or leaving); the frame record skips the gap. */
  stop(): void {
    if (this.raf) cancelAnimationFrame(this.raf)
    this.raf = 0
    this.recorder.pause()
  }

  private update(dt: number): void {
    let move = this.move
    this.clock += dt
    if (this.auto && move === STILL) {
      const step = autoMove(this.world.loop, this.at, this.autoTarget)
      this.autoTarget = step.target
      move = step.move
    }
    for (const f of this.foes) f.actor.update(dt * 1000, 'right', false, false)
    if (this.sceneMode) {
      this.party.forEach((actor, i) => this.stepPuppet(Object.assign(this.spots[i]!, { actor }) as unknown as Body, dt))
      for (const f of this.folk) this.stepPuppet(f, dt)
      const lead = this.spots[0]!
      this.at = { x: lead.x, z: lead.z }
    } else {
      if (this.path && move === STILL) move = this.followPath(dt)
      const was = this.at
      this.at = walk(this.world.walk, this.at, move, dt, this.dash)
      this.trail.push(this.at)
      // Single file (DN24): each follower a gap further back along the leader's path, facing her own way.
      this.party.forEach((actor, i) => {
        const was = this.spots[i]!, now = i === 0 ? this.at : this.trail.at(i * FOLLOW_GAP)
        const dx = now.x - was.x, dz = now.z - was.z, moving = Math.hypot(dx, dz) > 1e-4
        const facing = moving ? facingOf(dx, dz, was.facing) : was.facing
        this.spots[i] = { x: now.x, z: now.z, facing, moving }
        actor.update(dt * 1000, facing, moving, this.dash && moving)
      })
      for (const f of this.folk) this.stepFolk(f, dt)
      const moved = Math.hypot(this.at.x - was.x, this.at.z - was.z)
      this.onStep?.({ at: this.at, moved, dash: this.dash && moved > 0, dt })
    }
    this.moveCamera(dt)
  }

  /** The camera: a scene's pan or hold, else following the leader. */
  private moveCamera(dt: number): void {
    const leader = { x: this.at.x, y: heightAt(this.world.walk, this.at.x, this.at.z), z: this.at.z }
    if (this.camPan) {
      const pan = this.camPan
      pan.t = Math.min(1, pan.t + (dt * 1000) / pan.ms)
      const to = pan.to ?? leader, k = pan.t * pan.t * (3 - 2 * pan.t)
      this.look = { x: pan.from.x + (to.x - pan.from.x) * k, y: pan.from.y + (to.y - pan.from.y) * k, z: pan.from.z + (to.z - pan.from.z) * k }
      if (pan.t >= 1) { this.camPan = null; this.camHold = pan.to; pan.done() }
      return
    }
    if (this.camHold) { this.look = { ...this.camHold }; return }
    this.look = { x: follow(this.look.x, leader.x, dt), y: follow(this.look.y, leader.y, dt), z: follow(this.look.z, leader.z, dt) }
  }

  /** A scene's puppet: her scripted walk, her emote's clock, her pose. */
  private stepPuppet(b: Body, dt: number): void {
    const w = this.walks.get(b.actor)
    if (w) {
      const dx = w.to.x - b.x, dz = w.to.z - b.z, d = Math.hypot(dx, dz), step = WALK_SPEED * dt
      if (d <= Math.max(step, 1e-6)) { b.x = w.to.x; b.z = w.to.z; b.moving = false; this.walks.delete(b.actor); w.done() }
      else { b.x += (dx / d) * step; b.z += (dz / d) * step; b.moving = true; b.facing = facingOf(dx, dz, b.facing) }
    } else b.moving = false
    const e = this.emotes.get(b.actor)
    if (e) {
      e.left -= dt * 1000
      if (e.left <= 0) { this.emotes.delete(b.actor); b.actor.releaseHold(); b.actor.setManual(false); e.done() }
    }
    b.actor.update(dt * 1000, b.facing, b.moving, false)
  }

  /** A townsperson's day: standing at home facing the street, or strolling her route with a pause at each point. */
  private stepFolk(f: Folk, dt: number): void {
    const target = f.home ?? f.route[f.leg]
    if (!target || f.pause > 0) { f.pause = Math.max(0, f.pause - dt); f.moving = false }
    else {
      const dx = target.x - f.x, dz = target.z - f.z, d = Math.hypot(dx, dz), step = FOLK_SPEED * dt
      if (d <= Math.max(step, 1e-6)) {
        f.x = target.x; f.z = target.z; f.moving = false
        if (f.home) f.facing = 'front'
        else { f.leg = (f.leg + 1) % f.route.length; f.pause = FOLK_PAUSE }
      } else { f.x += (dx / d) * step; f.z += (dz / d) * step; f.moving = true; f.facing = facingOf(dx, dz, f.facing) }
    }
    f.actor.update(dt * 1000, f.facing, f.moving, false)
  }

  /** The move toward the path's next middle, slowing to land on it exactly; past the last, the path ends. */
  private followPath(dt: number): Move {
    const path = this.path!
    let p = path[this.pathIndex]
    while (p && Math.hypot(p.x - this.at.x, p.z - this.at.z) < 0.02) p = path[++this.pathIndex]
    if (!p) {
      const end = this.onPathEnd
      this.path = null
      this.onPathEnd = null
      end?.()
      return STILL
    }
    const dx = p.x - this.at.x, dz = p.z - this.at.z, d = Math.hypot(dx, dz)
    const reach = (this.dash ? DASH_SPEED : WALK_SPEED) * dt
    const k = Math.min(1, d / Math.max(reach, 1e-6)) / d
    return { x: dx * k, y: dz * k }
  }

  private draw(now: number): void {
    // The camera moves by whole device pixels along its own axes, so the room never shimmers.
    const o = cameraOffset()
    const eye = new Vector3(this.look.x, this.look.y + o.y, this.look.z + o.z)
    const snapped = RIGHT.clone().multiplyScalar(snapToGrid(eye.dot(RIGHT), 0)).add(UP.clone().multiplyScalar(snapToGrid(eye.dot(UP), 0)))
      .add(FORWARD.clone().multiplyScalar(eye.dot(FORWARD)))
    this.camera.position.copy(snapped)
    this.camera.quaternion.setFromAxisAngle(RIGHT, -CAMERA_PITCH)
    this.camera.updateMatrixWorld()
    // Each foot on a pixel edge: every texel then lands on one device pixel. Nearer travelers draw later.
    const f = frustum(this.device.width, this.device.height)
    const lights = this.tintLights()
    const base: [number, number, number] = this.world.name === 'room' ? [0.92, 0.94, 0.9] : [1, 1, 1]
    const stand = (actor: SpriteActor, x: number, z: number) => {
      const ground = new Vector3(x, heightAt(this.world.walk, x, z), z)
      const rel = ground.clone().sub(snapped)
      const placed = snapped.clone().add(RIGHT.clone().multiplyScalar(snapToGrid(rel.dot(RIGHT), f.left)))
        .add(UP.clone().multiplyScalar(snapToGrid(rel.dot(UP), f.bottom))).add(FORWARD.clone().multiplyScalar(rel.dot(FORWARD)))
      actor.stand(placed.x, placed.y, placed.z, Math.round(z * 100), tintAt(ground, base, lights))
    }
    this.party.forEach((actor, i) => stand(actor, this.spots[i]!.x, this.spots[i]!.z))
    for (const foe of this.foes) stand(foe.actor, foe.x, foe.z)
    for (const f of this.folk) stand(f.actor, f.x, f.z)
    const foot = new Vector3(this.at.x, heightAt(this.world.walk, this.at.x, this.at.z), this.at.z)
    this.placeLights(foot)
    this.renderer.info.reset()
    const effects = this.effectsOn()
    if (effects) effects.render()
    else this.renderer.render(this.scene, this.camera)
    this.recorder.frame(now)
    this.recent.push(now)
    while (this.recent.length > 0 && now - this.recent[0]! > 1000) this.recent.shift()
    if (this.firstFrame) { this.firstFrame(); this.firstFrame = null }
  }

  /** The live lights as the sprites' tint reads them. */
  private tintLights(): TintLight[] {
    return this.live.filter((l) => l.intensity > 0).map((l) => ({ x: l.position.x, y: l.position.y, z: l.position.z,
      color: [l.color.r, l.color.g, l.color.b], radius: l.distance, strength: l.intensity / 9 }))
  }

  /** The four live lights go to the light sources nearest the party; a torch flickers. */
  private placeLights(foot: Vector3): void {
    const near = [...this.world.lights].sort((a, b) => Math.hypot(a.at.x - foot.x, a.at.z - foot.z) - Math.hypot(b.at.x - foot.x, b.at.z - foot.z))
    this.live.forEach((l, i) => {
      const src = near[i]
      if (!src) { l.intensity = 0; return }
      l.position.set(src.at.x, src.at.y, src.at.z)
      l.color.set(src.color)
      l.distance = src.radius + 2
      const flicker = src.flicker ? 0.88 + 0.12 * Math.sin(this.clock * 13 + i * 7) * Math.sin(this.clock * 7.3 + i) : 1
      l.intensity = 9 * flicker
    })
  }

  get debug(): EngineDebug {
    const info = this.renderer.info.render
    return { scene: this.world.name, floor: this.world.name === 'dungeon' ? this.floor : null, party: this.party.map((a) => a.outfitId), action: this.party[0]?.action ?? '', lights: this.live.filter((l) => l.intensity > 0).length, effects: !this.saver,
      leader: { ...this.at, y: heightAt(this.world.walk, this.at.x, this.at.z) }, drawCalls: info.calls, triangles: info.triangles, saver: this.saver,
      device: { ...this.device }, fps: this.recent.length }
  }

  /** Texels a world unit, for the readout. */
  static readonly texelsPerUnit = TEXELS_PER_UNIT

  dispose(): void {
    this.stop()
    this.effects?.dispose()
    for (const a of this.party) a.dispose()
    this.clearFoes()
    this.clearFolk()
    for (const { page } of this.kits.values()) page.dispose()
    this.scene.traverse((o) => {
      const m = o as Mesh
      m.geometry?.dispose()
      const mat = m.material as MeshBasicMaterial | undefined
      mat?.map?.dispose()
      mat?.dispose?.()
    })
    this.renderer.dispose()
  }
}
