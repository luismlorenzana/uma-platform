import { describe, expect, it } from 'vitest'
import { FpsRecorder, FramePacer, SettleWatch } from './frames.js'

describe('battery saver pacing (DN27)', () => {
  it('draws every frame without a cap', () => {
    const p = new FramePacer(null)
    expect([0, 16, 33, 50].map((t) => p.shouldDraw(t))).toEqual([true, true, true, true])
  })
  it('draws about every other 60 Hz frame at 30 fps', () => {
    const p = new FramePacer(30)
    let drawn = 0
    for (let i = 0; i < 600; i++) if (p.shouldDraw(i * (1000 / 60))) drawn++
    expect(drawn).toBeGreaterThanOrEqual(299)
    expect(drawn).toBeLessThanOrEqual(301)
  })
  it('holds 30 fps on a 120 Hz display too', () => {
    const p = new FramePacer(30)
    let drawn = 0
    for (let i = 0; i < 1200; i++) if (p.shouldDraw(i * (1000 / 120))) drawn++
    expect(drawn).toBeGreaterThanOrEqual(299)
    expect(drawn).toBeLessThanOrEqual(301)
  })
})

describe('the frame-rate numbers (R17)', () => {
  it('reports the mean, the 1 % low, the slowest frame and a 10 s series', () => {
    const r = new FpsRecorder()
    let t = 0
    r.frame(t)
    for (let i = 0; i < 1200; i++) { t += i % 100 === 0 ? 50 : 1000 / 60; r.frame(t) }
    const s = r.stats()
    expect(s.frames).toBe(1200)
    expect(s.mean).toBeGreaterThan(55)
    expect(s.mean).toBeLessThan(60)
    expect(s.low1).toBe(20)
    expect(s.min).toBe(20)
    expect(s.series.length).toBe(2)
  })
  it('leaves a pause out of the numbers', () => {
    const r = new FpsRecorder()
    r.frame(0); r.frame(16); r.pause(); r.frame(60_000); r.frame(60_016)
    expect(r.stats()).toMatchObject({ frames: 2, min: 62.5 })
    expect(r.activeMs).toBe(32)
  })
  it('reports zeros with no frames', () => expect(new FpsRecorder().stats()).toEqual({ mean: 0, low1: 0, min: 0, frames: 0, series: [] }))
})

describe('ST4: coming to rest', () => {
  it('answers once, on the first still frame after motion, and again after a wake', () => {
    const w = new SettleWatch()
    expect([false, false].map((b) => w.update(b))).toEqual([true, false])
    expect([true, true, false, false].map((b) => w.update(b))).toEqual([false, false, true, false])
    w.wake()
    expect([false, false].map((b) => w.update(b))).toEqual([true, false])
  })
})
