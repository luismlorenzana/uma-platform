import { describe, expect, it } from 'vitest'
import { CAMERA_PITCH, cameraOffset, deviceSize, follow, frustum, snapToGrid, SPRITE_QUAD, spriteStretch, TEXELS_PER_UNIT } from './camera.js'

describe('the camera and the pixel grid (HD4, CR3)', () => {
  it('shows 128 device pixels a world unit', () => {
    const f = frustum(2556, 1179) // an iPhone 15 Pro in landscape at DPR 3
    expect((f.right - f.left) * TEXELS_PER_UNIT).toBe(2556)
    expect((f.top - f.bottom) * TEXELS_PER_UNIT).toBe(1179)
  })
  it('sizes the drawing buffer in whole device pixels, at most DPR 3', () => {
    expect(deviceSize(852, 393, 3)).toEqual({ width: 2556, height: 1179, ratio: 3 })
    expect(deviceSize(800, 400, 4).ratio).toBe(3)
    expect(deviceSize(800, 400, 0.5).ratio).toBe(1)
  })
  it('snaps to pixel edges, also when the buffer has an odd size', () => {
    const odd = frustum(1179, 1179)
    const snapped = snapToGrid(0.123, odd.left)
    expect(Number.isInteger(Math.round((snapped - odd.left) * TEXELS_PER_UNIT * 1e9) / 1e9)).toBe(true)
    expect(Math.abs(snapped - 0.123)).toBeLessThanOrEqual(0.5 / TEXELS_PER_UNIT)
    expect(snapToGrid(1, frustum(2556, 1179).left)).toBe(1)
  })
  it('stretches an upright sprite so the 35° tilt draws one texel a device row', () => {
    expect(SPRITE_QUAD.height * spriteStretch() * Math.cos(CAMERA_PITCH) * TEXELS_PER_UNIT).toBeCloseTo(256, 9)
    expect(SPRITE_QUAD).toEqual({ width: 2, height: 2, footFromBottom: 0.125 })
  })
  it('sits up and back along a 35° view', () => {
    const o = cameraOffset(CAMERA_PITCH, 10)
    expect(Math.atan2(o.y, o.z) * (180 / Math.PI)).toBeCloseTo(35, 9)
  })
  it('eases toward its target and arrives', () => {
    expect(follow(0, 10, 1 / 60)).toBeGreaterThan(0)
    expect(follow(0, 10, 1 / 60)).toBeLessThan(10)
    let x = 0
    for (let i = 0; i < 300; i++) x = follow(x, 10, 1 / 60)
    expect(x).toBe(10)
  })
})
