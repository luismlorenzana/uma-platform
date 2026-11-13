// ST5 (uma-cyberpunk's CY7): the post layer's bloom and tilt-shift, tunable at construction and live. Headless: the
// composer and its passes build without WebGL; only `render` needs it. With no options it's 0.4.0's layer exactly.
import { OrthographicCamera, Scene, Vector2, type WebGLRenderer } from 'three'
import { describe, expect, it } from 'vitest'
import { BLOOM, Effects, TILT_SHIFT } from './effects.js'

const renderer = { getPixelRatio: () => 1, getSize: (v: Vector2) => v.set(1, 1), setRenderTarget() {}, getRenderTarget: () => null } as unknown as WebGLRenderer
type Pass = { constructor: { name: string }; enabled: boolean; strength?: number; radius?: number; threshold?: number; uniforms?: Record<string, { value: number }> }
function make(options?: ConstructorParameters<typeof Effects>[3]) {
  const fx = new Effects(renderer, new Scene(), new OrthographicCamera(), options)
  fx.setSize(390, 844, 2)
  const passes = (fx as unknown as { composer: { passes: Pass[] } }).composer.passes
  const [, bloom, h, v] = passes as [Pass, Required<Pass>, Required<Pass>, Required<Pass>]
  return { fx, passes, bloom, h, v }
}

describe('the post layer (ST5)', () => {
  it("is 0.4.0's with no options: the same passes, the same bloom, the same tilt-shift", () => {
    const { passes, bloom, h, v, fx } = make()
    expect(passes.map((p) => p.constructor.name)).toEqual(['RenderPass', 'UnrealBloomPass', 'ShaderPass', 'ShaderPass', 'OutputPass'])
    expect(passes.every((p) => p.enabled)).toBe(true)
    expect([bloom.strength, bloom.radius, bloom.threshold]).toEqual([BLOOM.strength, BLOOM.radius, BLOOM.threshold])
    expect([h.uniforms.r!.value, v.uniforms.r!.value]).toEqual([TILT_SHIFT.focus, TILT_SHIFT.focus])
    expect([h.uniforms.h!.value, v.uniforms.v!.value]).toEqual([TILT_SHIFT.strength / 780, TILT_SHIFT.strength / 1688])
    expect(fx.settings).toEqual({ bloom: { ...BLOOM }, tiltShift: { ...TILT_SHIFT } })
  })

  it('takes options, each falling back to the default', () => {
    const { bloom, h, v } = make({ bloom: { threshold: 0.45, strength: 0.6, radius: 0.5 }, tiltShift: { strength: 0.8 } })
    expect([bloom.strength, bloom.radius, bloom.threshold]).toEqual([0.6, 0.5, 0.45])
    expect([h.uniforms.h!.value, v.uniforms.v!.value, h.uniforms.r!.value]).toEqual([0.8 / 780, 0.8 / 1688, TILT_SHIFT.focus])
    const partial = make({ bloom: { threshold: 0.45, strength: undefined } })
    expect([partial.bloom.strength, partial.bloom.radius, partial.bloom.threshold]).toEqual([BLOOM.strength, BLOOM.radius, 0.45])
  })

  it('turns the tilt-shift off with false', () => {
    const { h, v, fx, passes } = make({ tiltShift: false })
    expect([h.enabled, v.enabled]).toEqual([false, false])
    expect(passes.filter((p) => p.enabled).map((p) => p.constructor.name)).toEqual(['RenderPass', 'UnrealBloomPass', 'OutputPass'])
    expect(fx.settings.tiltShift).toBe(false)
  })

  it('changes live, only what it is given, and the tilt-shift comes back with its last values', () => {
    const { fx, bloom, h, v } = make()
    fx.set({ bloom: { strength: 1.2 } })
    expect([bloom.strength, bloom.threshold]).toEqual([1.2, BLOOM.threshold])
    fx.set({ tiltShift: { strength: 0.8, focus: 0.4 } })
    expect([h.uniforms.h!.value, h.uniforms.r!.value, v.uniforms.r!.value]).toEqual([0.8 / 780, 0.4, 0.4])
    fx.set({ tiltShift: false })
    expect(h.enabled).toBe(false)
    fx.setSize(400, 800, 2)
    fx.set({ tiltShift: {} })
    expect([h.enabled, h.uniforms.h!.value, v.uniforms.v!.value, h.uniforms.r!.value]).toEqual([true, 0.8 / 800, 0.8 / 1600, 0.4])
    expect(fx.settings).toEqual({ bloom: { ...BLOOM, strength: 1.2 }, tiltShift: { strength: 0.8, focus: 0.4 } })
  })
})
