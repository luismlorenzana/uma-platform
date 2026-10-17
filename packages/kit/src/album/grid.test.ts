import { describe, expect, it } from 'vitest'
import { gridRows, orderPickerRows, togglePickerSelection } from './grid.js'

describe('album grid helpers', () => {
  it('chunks exact, partial and invalid column counts without dropping an item', () => {
    expect(gridRows([1, 2, 3, 4, 5, 6], 5)).toEqual([[1, 2, 3, 4, 5], [6]])
    expect(gridRows([1, 2, 3], 2.8)).toEqual([[1, 2], [3]])
    expect(gridRows([1, 2], 0)).toEqual([[1], [2]])
    expect(gridRows([], 5)).toEqual([])
  })

  it('keeps disabled picker rows after enabled rows while preserving the requested order', () => {
    const rows = [
      { id: 'low', level: 1, reason: null },
      { id: 'disabled-high', level: 9, reason: 'Busy' },
      { id: 'high', level: 8, reason: null },
      { id: 'disabled-low', level: 2, reason: 'Away' },
    ]
    expect(orderPickerRows(rows, (left, right) => right.level - left.level, (row) => row.reason).map((row) => row.id))
      .toEqual(['high', 'low', 'disabled-high', 'disabled-low'])
  })

  it('toggles selection and never exceeds the multi-select cap', () => {
    expect(togglePickerSelection([], 'a', 2)).toEqual(['a'])
    expect(togglePickerSelection(['a'], 'b', 2)).toEqual(['a', 'b'])
    expect(togglePickerSelection(['a', 'b'], 'c', 2)).toEqual(['a', 'b'])
    expect(togglePickerSelection(['a', 'b'], 'a', 2)).toEqual(['b'])
    expect(togglePickerSelection([], 'a', 0)).toEqual(['a'])
  })
})
