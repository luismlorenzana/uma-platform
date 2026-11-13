// The look measures (LR12) on synthetic frames: each one reads what it should, so a flat, evenly lit, uniformly sharp
// frame is told apart from a lit, focused one.
import { describe, expect, it } from 'vitest'
import { against, measure, type Rgba } from './measure.js'

const W = 96, H = 96
function image(paint: (x: number, y: number) => [number, number, number]): Rgba {
  const data = new Uint8Array(W * H * 4)
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const [r, g, b] = paint(x, y), i = (y * W + x) * 4; data[i] = r; data[i + 1] = g; data[i + 2] = b; data[i + 3] = 255 }
  return { data, width: W, height: H }
}
const checker = (x: number, y: number): [number, number, number] => ((x + y) % 2 ? [230, 230, 230] : [30, 30, 30])

describe('the look measures', () => {
  it('reads lightness on the CIELAB scale: black 0, white 100, and no contrast in a flat frame', () => {
    expect(measure(image(() => [0, 0, 0])).lightness.mean).toBe(0)
    expect(measure(image(() => [255, 255, 255])).lightness.mean).toBe(100)
    const flat = measure(image(() => [128, 128, 128]))
    expect(flat.lightness).toMatchObject({ std: 0, range: 0 })
    expect(flat.palette).toBe(1)
    expect(flat.chroma.mean).toBeLessThan(1)
  })

  it('counts deep shadow and highlight', () => {
    const half = measure(image((x) => (x < W / 2 ? [10, 10, 10] : [250, 250, 250])))
    expect(half.shadowShare).toBe(0.5)
    expect(half.highlightShare).toBe(0.5)
  })

  it('finds a focus band in the middle, and none when the whole frame is sharp', () => {
    const band = measure(image((x, y) => (y >= H / 3 && y < (2 * H) / 3 ? checker(x, y) : [128, 128, 128])))
    expect(band.focusBand).toBeGreaterThan(5)
    expect(band.blurShare).toBeGreaterThan(0.5)
    const sharp = measure(image(checker))
    expect(sharp.focusBand).toBeCloseTo(1, 1)
    expect(sharp.blurShare).toBe(0)
  })

  it('reads a vignette, and warm light over cool shadow', () => {
    const v = measure(image((x, y) => { const d = Math.hypot(x - W / 2, y - H / 2) / (W / 2); const l = Math.round(220 - 160 * Math.min(1, d)); return [l, l, l] }))
    expect(v.vignette).toBeLessThan(0.7)
    const warm = measure(image((x) => (x < W / 2 ? [40, 50, 90] : [250, 210, 140])))
    expect(warm.warmCool).toBeGreaterThan(40)
    const cold = measure(image((x) => (x < W / 2 ? [90, 60, 30] : [180, 210, 255])))
    expect(cold.warmCool).toBeLessThan(0)
  })

  it('says where a value sits against the references', () => {
    expect(against(0.1, [0.3, 0.5, 0.4])).toEqual({ range: [0.3, 0.5], verdict: 'below' })
    expect(against(0.45, [0.3, 0.5])).toMatchObject({ verdict: 'within' })
    expect(against(0.9, [0.3, 0.5])).toMatchObject({ verdict: 'above' })
  })
})
