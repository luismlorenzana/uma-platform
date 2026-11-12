import { describe, expect, it } from 'vitest'
import { isStickSide, keyMove, stickKnob, stickMove, STICK_DEAD, STICK_RADIUS } from './input.js'

const O = { x: 100, y: 200 }

describe('the floating stick (DN26)', () => {
  it('does nothing inside its dead zone', () => expect(stickMove(O, { x: 100 + STICK_DEAD, y: 200 })).toEqual({ x: 0, y: 0 }))
  it('reaches full speed at 40 pt and no further', () => {
    expect(stickMove(O, { x: 100 + STICK_RADIUS, y: 200 })).toEqual({ x: 1, y: 0 })
    expect(stickMove(O, { x: 100, y: 200 - 90 })).toEqual({ x: 0, y: -1 })
  })
  it('scales between the dead zone and full reach', () => {
    const half = stickMove(O, { x: 100 + (STICK_DEAD + STICK_RADIUS) / 2, y: 200 })
    expect(half.x).toBeCloseTo(0.5, 9)
  })
  it('keeps the knob within reach', () => {
    expect(stickKnob(O, { x: 100, y: 300 })).toEqual({ x: 100, y: 200 + STICK_RADIUS })
    expect(stickKnob(O, { x: 110, y: 200 })).toEqual({ x: 110, y: 200 })
  })
  it('takes touches on the left half', () => {
    expect(isStickSide(100, 852)).toBe(true)
    expect(isStickSide(500, 852)).toBe(false)
  })
})

describe('the keyboard (SL17)', () => {
  it('moves with WASD or the arrows, diagonals no faster', () => {
    expect(keyMove(new Set(['KeyW']))).toEqual({ x: 0, y: -1 })
    expect(keyMove(new Set(['ArrowRight']))).toEqual({ x: 1, y: 0 })
    const diag = keyMove(new Set(['KeyD', 'KeyS']))
    expect(Math.hypot(diag.x, diag.y)).toBeCloseTo(1, 9)
    expect(keyMove(new Set(['KeyA', 'KeyD']))).toEqual({ x: 0, y: 0 })
    expect(keyMove(new Set())).toEqual({ x: 0, y: 0 })
  })
})
