// The look stage (LK1, LR8): the opt-in look path beside `StageEngine` and `BandStage`. One canvas, a perspective camera in
// a camera family with a slight sway, a key light with silhouette shadows and a cool sky light, height fog, the post
// stack (ambient occlusion, depth of field, bloom, a per-scene grade), the kit on one pixel grid, device tiers, and a
// frame recorder for the phone test. A scene (town.ts, tavern.ts) brings its objects, light, grade and cameras.
import {
  ACESFilmicToneMapping, CanvasTexture, Color, DirectionalLight, FogExp2, HemisphereLight, PCFShadowMap, PerspectiveCamera, Scene, SRGBColorSpace, Vector2, Vector3,
  WebGLRenderer, type Material, type Mesh, type Texture,
} from 'three'
import type { LookAssets, LookPackIndex } from './assets.js'
import { installHeightFog, RIM } from './atmos.js'
import { FrameRecorder, gpuEstimate, type GpuEstimate } from './bench.js'
import type { CastSpot, LookSprite } from './figures.js'
import { LookKit, PIXEL_DEFAULTS, type PixelSettings } from './kit.js'
import { Post, POST_DEFAULTS, type PostSettings } from './post.js'
import { orbit, type CameraName, type LookScene, type SceneLight } from './scene.js'
import { buildTavern } from './tavern.js'
import { buildSquare } from './town.js'

export type LookSceneId = 'square' | 'tavern'
export const LOOK_SCENES: Record<LookSceneId, string> = { square: 'Town square, day', tavern: 'Tavern, night' }

/** The device tiers (LR7): what each keeps. The phone test runs each. */
export const TIERS = {
  high: { label: 'High', renderScale: 1.5, ao: true, dof: true, bloom: true, shadowMap: 2048, petals: true, embers: true },
  medium: { label: 'Medium', renderScale: 1, ao: false, dof: true, bloom: true, shadowMap: 1024, petals: true, embers: true },
  saver: { label: 'Saver', renderScale: 0.75, ao: false, dof: false, bloom: false, shadowMap: 1024, petals: false, embers: false },
} as const
export type TierName = keyof typeof TIERS

export interface LookLife { fog: boolean; petals: boolean; embers: boolean; shafts: boolean; sway: boolean; shadows: boolean; renderScale: number; shadowMap: number }

export interface LookStageOptions {
  readonly canvas: HTMLCanvasElement
  readonly assets: LookAssets
  /** Our sets as they are (null, P160's default) or through the pixel pass at this many texels tall. */
  readonly spritePixels?: number | null
  /** The device's pixel ratio; the tiers cap it. */
  readonly devicePixelRatio?: number
}

export class LookStage {
  readonly renderer: WebGLRenderer
  readonly scene = new Scene()
  readonly camera = new PerspectiveCamera(24, 1, 1, 400)
  readonly key = new DirectionalLight('#ffffff', 1)
  readonly hemi = new HemisphereLight('#ffffff', '#000000', 1)
  readonly post: Post
  readonly pixel: PixelSettings = { ...PIXEL_DEFAULTS }
  readonly look: PostSettings = { ...POST_DEFAULTS }
  readonly life: LookLife = { fog: true, petals: true, embers: true, shafts: true, sway: true, shadows: true, renderScale: 1.5, shadowMap: 2048 }
  readonly view = { elevation: 27, azimuth: 0, distance: 38 }
  readonly target = new Vector3()
  readonly recorder = new FrameRecorder()
  current: LookScene | null = null
  sceneId: LookSceneId = 'square'
  cameraName: CameraName = 'front'
  tier: TierName = 'high'
  /** Called with each frame's time in milliseconds, before it updates. */
  onFrame: ((ms: number) => void) | null = null
  /** When false, the camera stays where a caller put it (free orbit). */
  presetCamera = true
  private index: LookPackIndex | null = null
  private kit: LookKit | null = null
  private readonly sprites = new Map<number, Promise<LookSprite | null>>()
  private readonly base = new Vector3()
  private raf = 0
  private last = 0
  private elapsed = 0
  private readonly dpr: number

  constructor(private readonly options: LookStageOptions) {
    installHeightFog()
    this.dpr = options.devicePixelRatio ?? globalThis.devicePixelRatio ?? 1
    this.renderer = new WebGLRenderer({ canvas: options.canvas, antialias: true, powerPreference: 'high-performance' })
    this.renderer.outputColorSpace = SRGBColorSpace
    this.renderer.toneMapping = ACESFilmicToneMapping
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = PCFShadowMap
    // Count every pass's draws in a frame, not only the last pass's.
    this.renderer.info.autoReset = false
    this.key.castShadow = true
    this.key.shadow.bias = -0.0004
    this.key.shadow.normalBias = 0.03
    this.scene.add(this.key, this.key.target, this.hemi)
    this.post = new Post(this.renderer, this.scene, this.camera)
    this.useTier('high')
  }

  /** Loads a scene (the kit and cast once) and shows it. */
  async load(id: LookSceneId): Promise<void> {
    const { assets } = this.options
    this.index ??= await assets.index()
    this.kit ??= await LookKit.parse(await assets.kit(this.index.kit.path))
    const spots: CastSpot[] = (this.index.cast[id] ?? []).map(([outfitId, x, z, action]) => (action ? { outfitId, x, z, action } : { outfitId, x, z }))
    const loaded = await Promise.all(spots.map(async (spot) => ({ spot, sprite: await this.sprite(spot.outfitId) })))
    const cast = loaded.filter((c): c is { spot: CastSpot; sprite: LookSprite } => !!c.sprite)
    const spritePixels = this.options.spritePixels ?? null
    const next = id === 'tavern' ? buildTavern(this.kit, cast, spritePixels) : buildSquare(this.kit, cast, spritePixels)
    if (this.current) { this.scene.remove(this.current.root); this.current.dispose() }
    this.current = next
    this.sceneId = id
    this.scene.add(next.root)
    this.light(next.light)
    this.useCamera(this.cameraName)
    this.apply()
    // One update, so figures face the camera before the first frame.
    next.update(this.elapsed, 0.016, this.camera)
  }

  private sprite(outfitId: number): Promise<LookSprite | null> {
    let p = this.sprites.get(outfitId)
    if (!p) { p = this.options.assets.sprite(outfitId).catch(() => null); this.sprites.set(outfitId, p) }
    return p
  }

  /** A scene's light and grade over the defaults. */
  private light(l: SceneLight): void {
    this.key.color.set(l.key.colour)
    this.key.intensity = l.key.intensity
    this.key.position.set(...l.key.from)
    this.key.target.position.set(...l.key.to)
    Object.assign(this.key.shadow.camera, { left: -l.key.box, right: l.key.box, top: l.key.box, bottom: -l.key.box, near: 1, far: 120 })
    this.key.shadow.camera.updateProjectionMatrix()
    this.hemi.color.set(l.hemi.sky)
    this.hemi.groundColor.set(l.hemi.ground)
    this.hemi.intensity = l.hemi.intensity
    this.renderer.toneMappingExposure = l.exposure
    Object.assign(this.look, POST_DEFAULTS, l.post, tierPost(TIERS[this.tier]))
    RIM.strength.value = l.rim.strength
    RIM.dir.value = [...l.rim.dir]
    RIM.colour.value.set(l.rim.colour)
    ;(this.scene.background as Texture | null)?.dispose?.()
    this.scene.background = l.sky.length > 1 ? skyTexture(l.sky) : new Color(l.sky[0] ?? '#000000')
  }

  useCamera(name: CameraName): void {
    this.cameraName = name
    const c = this.current?.cameras[name]
    if (!c) return
    this.target.set(...c.target)
    Object.assign(this.view, { elevation: c.elevation, azimuth: c.azimuth, distance: c.distance })
    this.camera.fov = c.fov
    this.camera.updateProjectionMatrix()
    this.look.focus = c.distance
    this.presetCamera = true
    this.placeCamera()
  }

  placeCamera(): void {
    this.base.set(...orbit([this.target.x, this.target.y, this.target.z], this.view))
    this.camera.position.copy(this.base)
    this.camera.lookAt(this.target)
  }

  useTier(name: TierName): void {
    this.tier = name
    const t = TIERS[name]
    Object.assign(this.look, tierPost(t))
    Object.assign(this.life, { renderScale: t.renderScale, petals: t.petals, embers: t.embers, shadowMap: t.shadowMap })
  }

  /** Every setting onto the scene: the pixel grid, the post stack, the life layers, shadows and size. */
  apply(): void {
    this.kit?.applyPixels(this.pixel)
    this.post.set(this.look)
    const l = this.current?.light
    this.scene.fog = this.life.fog && l?.fog ? new FogExp2(new Color(l.fog.colour), l.fog.density) : null
    this.renderer.shadowMap.enabled = this.life.shadows
    this.key.castShadow = this.life.shadows
    const layers = this.current?.layers
    if (layers?.petals) layers.petals.visible = this.life.petals
    if (layers?.embers) layers.embers.visible = this.life.embers
    if (layers?.shafts) layers.shafts.visible = this.life.shafts
    if (this.key.shadow.mapSize.x !== this.life.shadowMap) { this.key.shadow.mapSize.set(this.life.shadowMap, this.life.shadowMap); this.key.shadow.map?.dispose(); this.key.shadow.map = null }
    if (!this.life.sway && this.presetCamera) this.placeCamera()
    this.resize()
  }

  /** The 3D frame at the tier's scale of the device's pixels (LR5: the interface stays at full density over it). */
  resize(): void {
    const canvas = this.options.canvas, w = canvas.clientWidth || 1, h = canvas.clientHeight || 1
    const r = Math.min(this.dpr, this.life.renderScale)
    this.renderer.setPixelRatio(r)
    this.renderer.setSize(w, h, false)
    this.camera.aspect = w / h
    this.camera.updateProjectionMatrix()
    this.post.setSize(w, h, r)
  }

  /** One frame's update without the loop (captures). */
  frame(dt = 0.016): void {
    this.elapsed += dt
    this.current?.update(this.elapsed, dt, this.camera)
    // A slight sway (layer 1): a few centimetres on two slow sines, as a held lens.
    if (this.life.sway && this.presetCamera) {
      const t = this.elapsed
      this.camera.position.set(this.base.x + 0.22 * Math.sin(t * 0.23), this.base.y + 0.1 * Math.sin(t * 0.31 + 1), this.base.z)
      this.camera.lookAt(this.target)
    }
  }

  render(): void { this.renderer.info.reset(); this.post.render() }

  start(): void {
    if (this.raf) return
    this.last = performance.now()
    const tick = (now: number) => {
      this.raf = requestAnimationFrame(tick)
      const ms = now - this.last
      this.last = now
      this.onFrame?.(ms)
      this.frame(Math.min(0.05, ms / 1000))
      this.render()
    }
    this.raf = requestAnimationFrame(tick)
  }

  stop(): void { cancelAnimationFrame(this.raf); this.raf = 0 }

  /** What the stage holds now: draw calls, triangles and a GPU memory estimate (phones report none to a page). */
  stats(): { calls: number; triangles: number; gpu: GpuEstimate; kitBytes: number; loadedBytes: number | null } {
    const textures = new Map<Texture, { width: number; height: number; mipmaps: boolean }>()
    let geometryBytes = 0
    const geometries = new Set<unknown>()
    this.scene.traverse((o) => {
      const m = o as Mesh
      if (!m.geometry) return
      if (!geometries.has(m.geometry)) {
        geometries.add(m.geometry)
        for (const a of Object.values(m.geometry.attributes)) geometryBytes += (a as { array: ArrayLike<number> & { byteLength: number } }).array.byteLength
        if (m.geometry.index) geometryBytes += m.geometry.index.array.byteLength
      }
      for (const mat of (Array.isArray(m.material) ? m.material : [m.material]) as (Material & Record<string, unknown>)[]) {
        for (const key of ['map', 'normalMap', 'roughnessMap', 'emissiveMap', 'metalnessMap', 'aoMap', 'alphaMap']) {
          const t = mat?.[key] as Texture | null | undefined
          const img = t?.image as { width?: number; height?: number } | undefined
          if (t && img?.width && img.height) textures.set(t, { width: img.width, height: img.height, mipmaps: t.generateMipmaps })
        }
      }
    })
    const size = this.renderer.getDrawingBufferSize(new Vector2())
    const gpu = gpuEstimate({ textures: [...textures.values()], geometryBytes, width: size.x, height: size.y, ao: this.look.ao, dof: this.look.dof, bloom: this.look.bloom, shadowMap: this.life.shadows ? this.life.shadowMap : 0 })
    return { calls: this.renderer.info.render.calls, triangles: this.renderer.info.render.triangles, gpu, kitBytes: this.index?.kit.bytes ?? 0, loadedBytes: this.options.assets.bytes?.() ?? null }
  }

  dispose(): void {
    this.stop()
    this.current?.dispose()
    this.kit?.dispose()
    this.renderer.dispose()
  }
}

function tierPost(t: (typeof TIERS)[TierName]): Pick<PostSettings, 'ao' | 'dof' | 'bloom'> { return { ao: t.ao, dof: t.dof, bloom: t.bloom } }

/** A sky that fades from the first colour at the top to the last at the horizon. */
function skyTexture(stops: readonly string[]): CanvasTexture {
  const c = document.createElement('canvas')
  c.width = 2; c.height = 256
  const g = c.getContext('2d')!, grad = g.createLinearGradient(0, 0, 0, 256)
  stops.forEach((s, i) => grad.addColorStop(i / Math.max(1, stops.length - 1), s))
  g.fillStyle = grad; g.fillRect(0, 0, 2, 256)
  const t = new CanvasTexture(c)
  t.colorSpace = SRGBColorSpace
  return t
}
