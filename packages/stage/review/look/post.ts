// The post layer for the look slice (the look bible's rules 6 and 7): ambient occlusion, depth of field by depth,
// bloom, tone mapping, then a grade (saturation, contrast, warm light over cool shadow, a vignette). three.js r187's
// EffectComposer passes, so it runs on WebGL 2 today.
import { Vector2, type PerspectiveCamera, type Scene, type WebGLRenderer } from 'three'
import { BokehPass } from 'three/examples/jsm/postprocessing/BokehPass.js'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { GTAOPass } from 'three/examples/jsm/postprocessing/GTAOPass.js'
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'

const GradeShader = {
  uniforms: {
    tDiffuse: { value: null },
    saturation: { value: 1.12 },
    contrast: { value: 1.08 },
    split: { value: 0.6 },
    warm: { value: [1.0, 0.86, 0.66] },
    cool: { value: [0.62, 0.74, 0.96] },
    vignette: { value: 0.42 },
  },
  vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: `
    uniform sampler2D tDiffuse; uniform float saturation, contrast, split, vignette; uniform vec3 warm, cool; varying vec2 vUv;
    void main() {
      vec4 c = texture2D(tDiffuse, vUv);
      vec3 col = c.rgb;
      float l = dot(col, vec3(0.2126, 0.7152, 0.0722));
      col = mix(vec3(l), col, saturation);
      col = (col - 0.5) * contrast + 0.5;
      // Warm light, cool shadow: tint the highlights warm and the shadows cool, by the pixel's lightness.
      vec3 tint = mix(cool, warm, smoothstep(0.15, 0.75, l));
      col = mix(col, col * tint * 1.15, split * 0.5);
      vec2 d = (vUv - 0.5) * vec2(1.0, 0.85);
      col *= 1.0 - vignette * smoothstep(0.18, 0.62, length(d));
      gl_FragColor = vec4(clamp(col, 0.0, 1.0), c.a);
    }`,
}

export interface PostSettings { ao: boolean; dof: boolean; focus: number; aperture: number; maxblur: number; bloom: boolean; bloomStrength: number; bloomRadius: number; bloomThreshold: number; grade: boolean; vignette: number; saturation: number; contrast: number; split: number }
// Tuned against the references with the look measures (LK1, 2026-11-13): 7 of 9 in range, focus band and warm-over-cool high.
export const POST_DEFAULTS: PostSettings = { ao: true, dof: true, focus: 48, aperture: 0.0008, maxblur: 0.005, bloom: true, bloomStrength: 0.5, bloomRadius: 0.55, bloomThreshold: 0.78,
  grade: true, vignette: 0.42, saturation: 1.14, contrast: 1.3, split: 0.2 }

export class Post {
  readonly composer: EffectComposer
  private readonly ao: GTAOPass
  private readonly bokeh: BokehPass
  private readonly bloom: UnrealBloomPass
  private readonly grade: ShaderPass
  constructor(renderer: WebGLRenderer, scene: Scene, camera: PerspectiveCamera) {
    this.composer = new EffectComposer(renderer)
    this.composer.addPass(new RenderPass(scene, camera))
    this.ao = new GTAOPass(scene, camera, 1, 1)
    this.ao.updateGtaoMaterial({ radius: 0.6, distanceExponent: 1.4, thickness: 1.2, scale: 1.1 })
    this.composer.addPass(this.ao)
    this.bokeh = new BokehPass(scene, camera, { focus: POST_DEFAULTS.focus, aperture: POST_DEFAULTS.aperture, maxblur: POST_DEFAULTS.maxblur })
    this.composer.addPass(this.bokeh)
    this.bloom = new UnrealBloomPass(new Vector2(1, 1), POST_DEFAULTS.bloomStrength, POST_DEFAULTS.bloomRadius, POST_DEFAULTS.bloomThreshold)
    this.composer.addPass(this.bloom)
    this.composer.addPass(new OutputPass())
    this.grade = new ShaderPass(GradeShader)
    this.composer.addPass(this.grade)
  }
  set(s: PostSettings): void {
    this.ao.enabled = s.ao
    this.bokeh.enabled = s.dof
    const u = this.bokeh.uniforms as Record<string, { value: number }>
    u.focus!.value = s.focus; u.aperture!.value = s.aperture; u.maxblur!.value = s.maxblur
    this.bloom.enabled = s.bloom
    this.bloom.strength = s.bloomStrength; this.bloom.radius = s.bloomRadius; this.bloom.threshold = s.bloomThreshold
    this.grade.enabled = s.grade
    const g = this.grade.uniforms as Record<string, { value: number }>
    g.vignette!.value = s.vignette; g.saturation!.value = s.saturation; g.contrast!.value = s.contrast; g.split!.value = s.split
  }
  setSize(w: number, h: number, ratio: number): void {
    this.composer.setPixelRatio(ratio)
    this.composer.setSize(w, h)
    this.ao.setSize(w * ratio, h * ratio)
  }
  render(): void { this.composer.render() }
}
