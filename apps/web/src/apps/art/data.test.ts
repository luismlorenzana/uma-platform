import type { ArtIndex } from '@luismlorenzana/uma-data'
import { describe, expect, it } from 'vitest'
import { lookCounts, looksOf, picturesOf, renderOf, sections, tileOf, umaCount, type AlbumEntry, type Universe, type UniverseLook } from './data'

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
    'outfit-renders': { 900101: { path: 'art/r.webp', width: 768, height: 1024 } },
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
  it('finds her full-body render on its own, apart from the grid (P137)', () => {
    expect(renderOf(art, 900101)).toEqual({ label: 'Full body', path: 'art/r.webp', width: 768, height: 1024 })
    expect(renderOf(art, 900201)).toBeNull()
    expect(renderOf(null, 900101)).toBeNull()
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

describe('the universe looks (CA4)', () => {
  // Invented looks of invented riders; never a picture.
  const look = (id: string, character: string, characterId: number | null): UniverseLook => ({
    id, character, characterId, outfit: id, title: id, path: `universes/u/images/${id}.0123456789abcdef.png`, bytes: 10, sha256: '0'.repeat(64), width: 64, height: 96, approvedOn: null, publishedAt: null,
  })
  const universe = (id: string, looks: UniverseLook[]): Universe => ({ id, title: id, style: null, revision: 1, publishedAt: null, looks })
  const sky = universe('sky-city', [look('a-street', 'Rider One', 9001), look('b-street', 'Rider Two', 9002), look('a-pilot', 'Rider One', 9001), look('c-street', 'Stranger', null)])
  const road = universe('old-road', [look('b-villager', 'Rider Two', 9002)])

  it('finds a character’s looks in every universe that has one of hers, in the index’s order', () => {
    expect(looksOf([sky, road], 9001).map((g) => [g.universe.id, g.looks.map((l) => l.id)])).toEqual([['sky-city', ['a-street', 'a-pilot']]])
    expect(looksOf([sky, road], 9002).map((g) => g.universe.id)).toEqual(['sky-city', 'old-road'])
    expect(looksOf([sky, road], 9003)).toEqual([])
  })
  it('counts each character’s looks across the universes for her tiles, leaving out a look no character matches', () => {
    expect([...lookCounts([sky, road])]).toEqual([[9001, 2], [9002, 2]])
    expect(lookCounts([]).size).toBe(0)
  })
})
