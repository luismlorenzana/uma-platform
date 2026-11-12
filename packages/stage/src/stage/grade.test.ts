// ST2's live grade (uma-farm F57's ask 12, KF10): light and colour per scene, blended over time.
import { describe, expect, it } from 'vitest'
import { DAY_GRADE, mixGrade, validGrade, type StageGrade } from './grade.js'

const AUTUMN: StageGrade = { sky: '#ffd9a8', ground: '#4a3020', skyLight: 1.2, sun: '#ffb070', sunLight: 1.5, tint: '#ffe0c0', background: '#3a2a20', lamps: 0.5 }

describe('the live grade (F57 ask 12)', () => {
  it("starts in uma-quest's light", () => {
    expect(DAY_GRADE).toMatchObject({ sky: '#dfe8ff', ground: '#3a3226', skyLight: 1.5, sun: '#fff1d6', sunLight: 1.3, tint: '#ffffff' })
    expect(validGrade(DAY_GRADE)).toBe(true)
  })

  it('blends from one grade to the next', () => {
    expect(mixGrade(DAY_GRADE, AUTUMN, 0)).toEqual(DAY_GRADE)
    expect(mixGrade(DAY_GRADE, AUTUMN, 1)).toEqual(AUTUMN)
    const half = mixGrade(DAY_GRADE, AUTUMN, 0.5)
    expect(half.skyLight).toBeCloseTo(1.35)
    expect(half.lamps).toBeCloseTo(0.75)
    expect(half.tint).toBe('#fff0e0')
    expect(mixGrade(DAY_GRADE, AUTUMN, 2)).toEqual(AUTUMN)
  })

  it('refuses colours not in #rrggbb and lamps beyond full', () => {
    expect(validGrade({ ...AUTUMN, sun: 'orange' })).toBe(false)
    expect(validGrade({ ...AUTUMN, lamps: 1.5 })).toBe(false)
  })
})
