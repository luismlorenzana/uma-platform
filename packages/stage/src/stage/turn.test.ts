import { describe, expect, it } from 'vitest'
import { fromStage, stageLayout, stageTransform, toStage } from './turn.js'

// An iPhone 15 Pro held upright: 393 × 852 pt, the notch's inset on top and the home bar's at the bottom.
const UPRIGHT = stageLayout(393, 852, { top: 59, right: 0, bottom: 34, left: 0 })

describe('the turned stage (NG6, HD3)', () => {
  it('is always landscape, turned on an upright phone', () => {
    expect(UPRIGHT).toMatchObject({ turned: true, width: 852, height: 393 })
    expect(stageLayout(852, 393)).toMatchObject({ turned: false, width: 852, height: 393 })
    expect(stageLayout(500, 500).turned).toBe(false)
  })

  it('never turns the portrait layout (ST2, FR3): the viewport as it is', () => {
    const portrait = stageLayout(393, 852, { top: 59, right: 0, bottom: 34, left: 0 }, 'portrait')
    expect(portrait).toMatchObject({ turned: false, width: 393, height: 852, insets: { top: 59, right: 0, bottom: 34, left: 0 } })
    expect(stageTransform(portrait)).toBe('none')
    expect(toStage(portrait, 120, 600)).toEqual({ x: 120, y: 600 })
    expect(stageLayout(852, 393, undefined, 'portrait').turned).toBe(false)
  })

  it('turns 90° clockwise about the top left, then moves into the viewport', () => {
    expect(stageTransform(UPRIGHT)).toBe('translate(393px, 0px) rotate(90deg)')
    expect(stageTransform(stageLayout(852, 393))).toBe('none')
  })

  it("maps the stage's corners to the viewport's: its top left at the viewport's top right", () => {
    expect(fromStage(UPRIGHT, 0, 0)).toEqual({ x: 393, y: 0 })
    expect(fromStage(UPRIGHT, 852, 0)).toEqual({ x: 393, y: 852 })
    expect(fromStage(UPRIGHT, 0, 393)).toEqual({ x: 0, y: 0 })
    expect(fromStage(UPRIGHT, 852, 393)).toEqual({ x: 0, y: 852 })
  })

  it('maps touches back through the turn, exactly inverting it', () => {
    for (const [x, y] of [[0, 0], [10, 20], [426, 196.5], [851, 392], [300, 5]] as const) {
      const v = fromStage(UPRIGHT, x, y)
      expect(toStage(UPRIGHT, v.x, v.y)).toEqual({ x, y })
    }
    // A thumb near the viewport's bottom left is near the stage's bottom right.
    expect(toStage(UPRIGHT, 20, 800)).toEqual({ x: 800, y: 373 })
  })

  it('turns the safe areas with it: the notch on the left, the home bar on the right', () => {
    expect(UPRIGHT.insets).toEqual({ top: 0, right: 34, bottom: 0, left: 59 })
    expect(stageLayout(852, 393, { top: 0, right: 59, bottom: 21, left: 59 }).insets).toEqual({ top: 0, right: 59, bottom: 21, left: 59 })
  })

  it("leaves an unturned stage's touches as they are", () => {
    const flat = stageLayout(1280, 720)
    expect(toStage(flat, 100, 200)).toEqual({ x: 100, y: 200 })
    expect(fromStage(flat, 100, 200)).toEqual({ x: 100, y: 200 })
  })
})
