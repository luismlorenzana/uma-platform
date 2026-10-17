import { describe, expect, it } from 'vitest'
import { byLevel, formatLevel, workOrder, type LevelRow } from './level.js'

const row = (patch: Partial<LevelRow> & Pick<LevelRow, 'id'>): LevelRow => ({
  name: 'Same',
  releasedAt: '2026-01-01',
  level: 20,
  ...patch,
})

describe('the shared level rule', () => {
  it('orders by level, release, name and stable id, with unowned last', () => {
    const mixed = [
      row({ id: '5', level: null, releasedAt: '2030-01-01', name: 'Locked' }),
      row({ id: '4', level: 4, name: 'Low' }),
      row({ id: '3', releasedAt: '2025-01-01', name: 'Older' }),
      row({ id: '2', name: 'Beta' }),
      row({ id: '7', name: 'Alpha' }),
      row({ id: '1', level: null, releasedAt: '2024-01-01', name: 'Other locked' }),
      row({ id: '9', name: 'Alpha' }),
    ]
    expect([...mixed].sort(byLevel).map((entry) => entry.id)).toEqual(['7', '9', '2', '3', '4', '5', '1'])
    expect(byLevel(mixed[0]!, mixed[0]!)).toBe(0)
  })

  it('puts free Umas first, then work level, then the shared level rule', () => {
    const mixed = [
      row({ id: 'busy-high', free: false, workLevel: 99, level: 99 }),
      row({ id: 'free-low', free: true, workLevel: 2, level: 3 }),
      row({ id: 'free-high-b', free: true, workLevel: 8, name: 'Beta' }),
      row({ id: 'free-high-a', free: true, workLevel: 8, name: 'Alpha' }),
      row({ id: 'free-unset', free: true, workLevel: null, level: 50 }),
    ]
    expect([...mixed].sort(workOrder).map((entry) => entry.id)).toEqual([
      'free-high-a',
      'free-high-b',
      'free-low',
      'free-unset',
      'busy-high',
    ])
  })

  it('formats level and tier labels', () => {
    expect(formatLevel(7)).toBe('Lv 7')
    expect(formatLevel(7, 1)).toBe('Lv 7')
    expect(formatLevel(7, 2)).toBe('T2 · Lv 7')
    expect(formatLevel(null, 3)).toBe('—')
  })
})
