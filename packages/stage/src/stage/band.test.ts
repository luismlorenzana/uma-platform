// ST2's camera and gesture (uma-farm F57's asks 7 and 8, FR6): a vertical pan that follows the finger, glides on a flick
// and settles with a band at the top of the view; taps told from pans.
import { describe, expect, it } from 'vitest'
import { BAND_FRICTION, BandCamera, TAP_SLOP, TapPan, tilesPerDevicePixel, viewDepthOf } from './band.js'

/** An iPhone 15 Pro upright at 3×: 2556 device px tall, about 35 tiles of ground deep. */
const VIEW = viewDepthOf(852 * 3)
const settle = (c: BandCamera) => { for (let i = 0; i < 600 && c.step(1 / 60); i++); }

describe('the band camera (F57 ask 7, FR6)', () => {
  it('maps device pixels to ground through the pitch: about 73 px a tile deep', () => {
    expect(1 / tilesPerDevicePixel()).toBeCloseTo(73.4, 1)
    expect(VIEW).toBeCloseTo(34.8, 1)
  })

  it('stops with a band at the top of the view, and at the two ends', () => {
    const c = new BandCamera()
    c.setView(64, 20)
    const { min, max } = c.range
    expect(min).toBe(-2 + 10)
    expect(max).toBe(64 + 1 - 10)
    const stops = c.stops()
    expect(stops[0]).toBe(min)
    expect(stops.at(-1)).toBe(max)
    for (const s of stops.slice(1, -1)) expect((s - 10) % 4).toBe(0)
  })

  it('follows the finger one to one, and gives a third past an edge', () => {
    const c = new BandCamera()
    c.setView(64, 20)
    c.goTo(30, true)
    c.drag(2.5)
    expect(c.centre).toBe(c.nearestStop(30) + 2.5)
    c.goTo(c.range.min, true)
    c.drag(-3)
    expect(c.centre).toBeCloseTo(c.range.min - 1)
  })

  it('settles on the nearest stop when let go, and glides further on a flick', () => {
    const c = new BandCamera()
    c.setView(64, 20)
    c.goTo(26, true)
    const start = c.centre
    c.drag(1.2)
    c.release(0)
    settle(c)
    expect(c.settled).toBe(true)
    expect(c.centre).toBe(start)
    c.release(4 * BAND_FRICTION * 2)
    expect(c.settled).toBe(false)
    settle(c)
    expect(c.centre).toBe(start + 8)
    expect(c.stops()).toContain(c.centre)
  })

  it('springs back inside after a drag past the edge', () => {
    const c = new BandCamera()
    c.setView(64, 20)
    c.goTo(c.range.max, true)
    c.drag(6)
    c.release(30)
    settle(c)
    expect(c.centre).toBe(c.range.max)
  })

  it("holds a farm shorter than the view still, in the view's middle", () => {
    const c = new BandCamera()
    c.setView(20, VIEW)
    expect(c.range.min).toBe(c.range.max)
    c.drag(5)
    c.release(40)
    settle(c)
    expect(c.centre).toBe(c.range.min)
  })
})

describe('tap or pan (F57 asks 7, 8)', () => {
  it('is a tap when the finger stays within the slop', () => {
    const g = new TapPan()
    g.down(100, 200, 0)
    expect(g.move(103, 204, 30)).toBeNull()
    expect(g.up(104, 205, 60)).toEqual({ kind: 'tap', x: 104, y: 205 })
  })

  it('pans by the finger once it leaves the slop, from where it went down', () => {
    const g = new TapPan()
    g.down(100, 200, 0)
    expect(g.move(100, 200 + TAP_SLOP + 2, 16)).toBe(TAP_SLOP + 2)
    expect(g.move(100, 230, 32)).toBe(20)
  })

  it('flings at the speed of its last tenth of a second', () => {
    const g = new TapPan()
    g.down(100, 400, 0)
    for (let t = 16; t <= 320; t += 16) g.move(100, 400 - t, t)
    const end = g.up(100, 400 - 336, 336)
    expect(end.kind).toBe('fling')
    expect(end.kind === 'fling' && end.velocity).toBeCloseTo(-1000, -1)
  })
})
