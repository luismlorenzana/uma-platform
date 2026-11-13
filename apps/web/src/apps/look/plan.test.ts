import { describe, expect, it } from 'vitest'
import { meets, minutesLabel, PHONE_TEST, testPlan } from './plan'

describe('the phone test plan', () => {
  it('runs High for ten minutes, then Medium and Saver for three', () => {
    expect(testPlan(null)).toEqual(PHONE_TEST)
    expect(minutesLabel(PHONE_TEST)).toBe('16.1 minutes')
  })
  it('scales from High for a quick look, never below five seconds a step', () => {
    expect(testPlan(1)).toEqual([{ tier: 'high', seconds: 60 }, { tier: 'medium', seconds: 18 }, { tier: 'saver', seconds: 18 }])
    expect(testPlan(0.05).every((s) => s.seconds >= 5)).toBe(true)
  })
  it('holds a tier to 30 fps sustained and the memory budget', () => {
    expect(meets({ sustained30: 0.97, gpuMB: 180 })).toBe(true)
    expect(meets({ sustained30: 0.9, gpuMB: 180 })).toBe(false)
    expect(meets({ sustained30: 0.99, gpuMB: 420 })).toBe(false)
  })
})
