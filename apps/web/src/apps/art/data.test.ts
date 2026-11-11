import type { ArtIndex } from '@luismlorenzana/uma-data'
import { describe, expect, it } from 'vitest'
import { picturesOf, sections, tileOf, umaCount, type AlbumEntry } from './data'

// Invented records only (copied from uma-quest's album/data.test.ts at 6c572e6, then extended).
const img = (path: string) => ({ path, width: 10, height: 10 })
const art = {
  atlases: {},
  images: {
    'outfit-portraits': { 900101: img('art/p.webp') },
    'outfit-faces': { 900101: img('art/f.webp') },
    'outfit-chibis': { '900101-a': img('art/a.webp'), '900101-b': img('art/b.webp') },
    'character-dresses': { '9001-summer': img('art/s.webp') },
    'character-faces': { 9001: img('art/cf.webp') },
  },
} as unknown as ArtIndex
const entry = (outfitId: number, over: Partial<AlbumEntry> = {}): AlbumEntry => ({
  outfitId, characterId: Math.floor(outfitId / 100), name: `Runner ${outfitId}`, title: 'Test', adult: false, sisterOf: null, sister: null, tier: null, order: null, sprite: false, ...over,
})

describe('Character Art (CA1)', () => {
  it('lists every picture master data has for her, in order, and skips what it lacks', () => {
    expect(picturesOf(art, entry(900101)).map((p) => p.label)).toEqual(['Portrait', 'Face', 'Chibi A', 'Chibi B', 'Character face', 'Summer dress'])
    expect(picturesOf(null, entry(900101))).toEqual([])
  })
  it('tiles her face crop, else her portrait', () => {
    expect(tileOf(art, 900101)).toBe('art/f.webp')
    expect(tileOf(art, 900201)).toBeNull()
  })
  it('lays the album out as the Ranker ranks: T1 to T10 by place, then the unranked by name, then F', () => {
    const list = [
      entry(900301, { tier: 'F', order: 4 }), entry(900102, { name: 'B', tier: 'T2', order: 3 }), entry(900201, { name: 'Z' }),
      entry(900101, { name: 'A', tier: 'T1', order: 2 }), entry(900103, { name: 'C', tier: 'T1', order: 1 }), entry(900401, { name: 'Y' }),
    ]
    const layout = sections(list)
    expect(layout.map((s) => s.id)).toEqual(['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'T9', 'T10', 'unranked', 'F'])
    expect(layout[0]!.entries.map((e) => e.outfitId)).toEqual([900103, 900101])
    expect(layout[10]!.entries.map((e) => e.name)).toEqual(['Y', 'Z'])
    expect(layout[11]!.entries.map((e) => e.outfitId)).toEqual([900301])
  })
  it('counts a sister as her own Uma, and two outfits of one Uma once', () => {
    const sister = { relation: 'twin', age: 'an invented age', profile: 'Invented.' }
    expect(umaCount([entry(900101), entry(900102), entry(900103, { sister })])).toBe(2)
  })
})
