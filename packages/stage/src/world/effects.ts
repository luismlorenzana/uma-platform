// The look's optional layer (Q5, HD4): tilt-shift (the far and near bands blur, the middle stays sharp) and a soft bloom,
// through three.js's EffectComposer. Off under battery saver (DN27): the engine then draws straight to the screen.
import type { Camera, Scene, WebGLRenderer } from 'three'
import { Vector2 } from 'three'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'
import { HorizontalTiltShiftShader } from 'three/examples/jsm/shaders/HorizontalTiltShiftShader.js'
import { VerticalTiltShiftShader } from 'three/examples/jsm/shaders/VerticalTiltShiftShader.js'

/** How strong the blur grows away from the middle, and the bloom's strength, radius and threshold. */
export const TILT_SHIFT = { strength: 1.6, focus: 0.5 } as const
export const BLOOM = { strength: 0.35, radius: 0.4, threshold: 0.86 } as const

export class Effects {
  private readonly composer: EffectComposer
  private readonly bloom: UnrealBloomPass
  private readonly hBlur: ShaderPass
  private readonly vBlur: ShaderPass

  constructor(renderer: WebGLRenderer, scene: Scene, camera: Camera) {
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
  }

  setSize(cssWidth: number, cssHeight: number, ratio: number): void {
    this.composer.setPixelRatio(ratio)
    this.composer.setSize(cssWidth, cssHeight)
    this.bloom.resolution.set(cssWidth * ratio, cssHeight * ratio)
    this.hBlur.uniforms.h!.value = TILT_SHIFT.strength / (cssWidth * ratio)
    this.vBlur.uniforms.v!.value = TILT_SHIFT.strength / (cssHeight * ratio)
  }

  render(): void { this.composer.render() }

  dispose(): void { this.composer.dispose() }
}
