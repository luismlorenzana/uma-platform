// The look's optional layer (Q5, HD4): tilt-shift (the far and near bands blur, the middle stays sharp) and a soft bloom,
// through three.js's EffectComposer. Off under battery saver (DN27): the engine then draws straight to the screen.
// ST5 (uma-cyberpunk's CY7): both are tunable, at construction and live; a game that passes nothing draws as on 0.4.0.
import type { Camera, Scene, WebGLRenderer } from 'three'
import { Vector2 } from 'three'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'
import { HorizontalTiltShiftShader } from 'three/examples/jsm/shaders/HorizontalTiltShiftShader.js'
import { VerticalTiltShiftShader } from 'three/examples/jsm/shaders/VerticalTiltShiftShader.js'

/** How strong the blur grows away from the middle, and the bloom's strength, radius and threshold: the defaults. */
export const TILT_SHIFT = { strength: 1.6, focus: 0.5 } as const
export const BLOOM = { strength: 0.35, radius: 0.4, threshold: 0.86 } as const

/** The bloom (ST5): `threshold` is the luminance (linear, 0–1) a texel must pass to glow; saturated neon needs ~0.45. */
export interface BloomOptions { strength?: number; radius?: number; threshold?: number }
/** The tilt-shift (ST5): `strength` is the blur at the edges, `focus` the sharp band's place (0 bottom, 1 top). */
export interface TiltShiftOptions { strength?: number; focus?: number }
/** Each value falls back to the current one (at first, `BLOOM` and `TILT_SHIFT`); `tiltShift: false` turns its passes off. */
export interface EffectsOptions { bloom?: BloomOptions; tiltShift?: TiltShiftOptions | false }
export interface EffectsSettings {
  bloom: { strength: number; radius: number; threshold: number }
  tiltShift: { strength: number; focus: number } | false
}

/** The given values, without the undefined ones. */
const given = <T extends object>(o: T): Partial<T> => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) as Partial<T>

export class Effects {
  private readonly composer: EffectComposer
  private readonly bloom: UnrealBloomPass
  private readonly hBlur: ShaderPass
  private readonly vBlur: ShaderPass
  private now: EffectsSettings = { bloom: { ...BLOOM }, tiltShift: { ...TILT_SHIFT } }
  /** The tilt-shift's values while it's off, for when it comes back. */
  private lastTilt: { strength: number; focus: number } = { ...TILT_SHIFT }
  private size = { width: 1, height: 1 }

  constructor(renderer: WebGLRenderer, scene: Scene, camera: Camera, options: EffectsOptions = {}) {
    this.composer = new EffectComposer(renderer)
    this.composer.addPass(new RenderPass(scene, camera))
    this.bloom = new UnrealBloomPass(new Vector2(1, 1), BLOOM.strength, BLOOM.radius, BLOOM.threshold)
    this.composer.addPass(this.bloom)
    this.hBlur = new ShaderPass(HorizontalTiltShiftShader)
    this.vBlur = new ShaderPass(VerticalTiltShiftShader)
    this.hBlur.uniforms.r!.value = TILT_SHIFT.focus
    this.vBlur.uniforms.r!.value = TILT_SHIFT.focus
    this.composer.addPass(this.hBlur)
    this.composer.addPass(this.vBlur)
    this.composer.addPass(new OutputPass())
    if (options.bloom || options.tiltShift !== undefined) this.set(options)
  }

  /** The values in use now. */
  get settings(): EffectsSettings {
    const t = this.now.tiltShift
    return { bloom: { ...this.now.bloom }, tiltShift: t ? { ...t } : false }
  }

  /**
   * Changes the look live (ST5): a cut-in's flash, a menu dimming the board. Only the values given change; a tilt-shift
   * turned off with `false` comes back on with any object (`{}` for its last values, or the defaults).
   */
  set(options: EffectsOptions): void {
    if (options.bloom) this.now.bloom = { ...this.now.bloom, ...given(options.bloom) }
    if (options.tiltShift === false) this.now.tiltShift = false
    else if (options.tiltShift) this.now.tiltShift = { ...(this.now.tiltShift || this.lastTilt), ...given(options.tiltShift) }
    if (this.now.tiltShift) this.lastTilt = this.now.tiltShift
    this.apply()
  }

  private apply(): void {
    const { bloom, tiltShift } = this.now
    this.bloom.strength = bloom.strength
    this.bloom.radius = bloom.radius
    this.bloom.threshold = bloom.threshold
    this.hBlur.enabled = this.vBlur.enabled = tiltShift !== false
    if (!tiltShift) return
    this.hBlur.uniforms.r!.value = tiltShift.focus
    this.vBlur.uniforms.r!.value = tiltShift.focus
    this.hBlur.uniforms.h!.value = tiltShift.strength / this.size.width
    this.vBlur.uniforms.v!.value = tiltShift.strength / this.size.height
  }

  setSize(cssWidth: number, cssHeight: number, ratio: number): void {
    this.composer.setPixelRatio(ratio)
    this.composer.setSize(cssWidth, cssHeight)
    this.bloom.resolution.set(cssWidth * ratio, cssHeight * ratio)
    this.size = { width: cssWidth * ratio, height: cssHeight * ratio }
    const t = this.now.tiltShift || this.lastTilt
    this.hBlur.uniforms.h!.value = t.strength / this.size.width
    this.vBlur.uniforms.v!.value = t.strength / this.size.height
  }

  render(): void { this.composer.render() }

  dispose(): void { this.composer.dispose() }
}
