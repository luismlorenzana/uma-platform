import { describe, expect, it } from 'vitest'
import { bestStyles, bucketOf, emptyRankings, parseRankings, reconcileRankings, STYLES, type Bucket, type Strategy, type Uma } from './model.js'

describe('RPG Classes v3 buckets (CV19)', () => {
  it('covers all 15 nonempty combinations of best running styles', () => {
    const expected: Bucket[] = ['front', 'pace', 'front', 'late', 'front', 'pace-late', 'front', 'late-end', 'front', 'pace-late', 'front', 'late-end', 'front', 'pace-late', 'front']
    for (let mask = 1; mask < 16; mask++) {
      const strategy: Strategy = { front: 'G', pace: 'G', late: 'G', end: 'G' }
      STYLES.forEach((style, index) => { if (mask & (1 << index)) strategy[style] = 'A' })
      expect(bucketOf(strategy), `style mask ${mask}`).toBe(expected[mask - 1])
    }
  })
  it('compares grades rather than treating every A as a best style', () => {
    const strategy: Strategy = { front: 'A', pace: 'B', late: 'S', end: 'A' }
    expect(bestStyles(strategy)).toEqual(['late'])
    expect(bucketOf(strategy)).toBe('late')
    expect(bucketOf({ front: 'G', pace: 'F', late: 'F', end: 'G' })).toBe('pace-late')
  })
})

describe('ranking JSON', () => {
  const row = { outfitId: 70101, characterId: 701, tier: 'SS', bucket: 'front' }
  it('round-trips a file without copying catalog content into it', () => {
    const state = { ...emptyRankings(), rankings: [row] }
    expect(parseRankings(JSON.parse(JSON.stringify(state)) as unknown)).toEqual(state)
  })
  it.each([
    { ...emptyRankings(), schemaVersion: 2 },
    { ...emptyRankings(), revision: -1 },
    { ...emptyRankings(), updatedAt: 'bad' },
    { ...emptyRankings(), rankings: [{ ...row, tier: 'S' }] },
    { ...emptyRankings(), rankings: [{ ...row, bucket: 'magic' }] },
    { ...emptyRankings(), rankings: [{ ...row, outfitId: '../file' }] },
    { ...emptyRankings(), rankings: [row, row] },
  ])('rejects invalid imports', (value) => { expect(() => parseRankings(value)).toThrow() })
  it('updates known buckets from the catalog and keeps unavailable IDs', () => {
    const state = parseRankings({ ...emptyRankings(), rankings: [row, { ...row, outfitId: 70201 }] })
    const uma: Uma = { id: 70101, characterId: 701, name: 'Synthetic Star', title: 'Test Outfit', original: true, bucket: 'late', strategy: { front: 'G', pace: 'G', late: 'A', end: 'G' }, portrait: null, face: null }
    expect(reconcileRankings(state, [uma]).rankings).toEqual([{ ...row, bucket: 'late' }, { ...row, outfitId: 70201 }])
  })
})
