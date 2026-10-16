import { describe, expect, it } from 'vitest'
import { openEscapeLayer } from './escape.js'

describe('openEscapeLayer (0.1.2)', () => {
  it('lets only the sheet opened last answer Escape, and hands back to the one under it', () => {
    const lower = openEscapeLayer()
    const upper = openEscapeLayer()
    expect([lower.isTop(), upper.isTop()]).toEqual([false, true])
    upper.close()
    expect(lower.isTop()).toBe(true)
    lower.close()
  })

  it('keeps the order when a lower sheet closes first', () => {
    const lower = openEscapeLayer()
    const upper = openEscapeLayer()
    lower.close()
    expect(upper.isTop()).toBe(true)
    upper.close()
    upper.close()
    expect(upper.isTop()).toBe(false)
  })
})
