import type { ArtIndex } from '@luismlorenzana/uma-data'
import { describe, expect, it } from 'vitest'
import type { AlbumData, AlbumEntry, PortraitPiece, Universe, UniverseLook } from './data'
import { imageCountsOf } from './imageCounts'

// Invented identities and file paths only.
const entry: AlbumEntry = {
  outfitId: 900101, characterId: 9001, name: 'Rider One', title: 'Test', adult: false,
  sisterOf: null, sister: null, tier: null, order: null, sprite: false,
}
const empty: Pick<AlbumData, 'art' | 'cards'> = { art: null, cards: new Map() }
const look = (id: string, over: Partial<UniverseLook> = {}): UniverseLook => ({
  id, character: 'Rider One', characterId: 9001, outfit: id, title: id, path: `${id}.png`,
  bytes: 1, sha256: '0'.repeat(64), width: 1, height: 1, approvedOn: null, publishedAt: null, ...over,
})
const piece = (id: string, kind: PortraitPiece['kind']): PortraitPiece => ({ ...look(id), kind, expression: null })
const world = (id: string, looks: UniverseLook[] = []): Universe => ({
  id, title: id, style: null, revision: null, publishedAt: null, looks,
})

describe('published image counts by game-world', () => {
  it('counts every published image category, portrait piece and profile, with the requested world labels', () => {
    const farm: Universe = {
      ...world('farm-life', [look('outfit'), look('pajamas', { category: 'pajama-outfits' }), look('scene', { kind: 'splash' }), look('sprite', { category: 'character-sprites' })]),
      portraits: { states: 200, approvedOn: null, publishedAt: null, pieces: [piece('crop', 'crop'), piece('happy', 'face')] },
      profiles: { size: 192, release: null, publishedAt: null, pieces: [piece('profile', 'profile')] },
    }
    const cyberpunk = world('cyberpunk', [look('weapon', { category: 'weapons' }), look('combat', { category: 'combat-sprites' })])
    expect(imageCountsOf(empty, [world('high-fantasy', [look('quest')]), cyberpunk, farm], entry)).toEqual([
      { world: 'uma-farm', count: 7 }, { world: 'uma-cyberpunk', count: 2 }, { world: 'uma-quest', count: 1 },
    ])
  })

  it('counts unique base reference files, including the full-body render and available support art', () => {
    const image = (path: string) => ({ path, width: 1, height: 1 })
    const data: Pick<AlbumData, 'art' | 'cards'> = {
      art: { atlases: {}, images: {
        'outfit-portraits': { 900101: image('portrait.webp') },
        'outfit-faces': { 900101: image('portrait.webp') },
        'outfit-renders': { 900101: image('render.webp'), 900201: image('unrelated.webp') },
        'character-faces': { 9001: image('face.webp') },
      } } as unknown as ArtIndex,
      cards: new Map([[9001, [
        { id: 1, title: 'Test One', rarity: 1, type: 'test', art: 'support.webp' },
        { id: 2, title: 'Test Two', rarity: 1, type: 'test', art: 'support.webp' },
        { id: 3, title: 'Test Three', rarity: 1, type: 'test', art: null },
      ]]]),
    }
    expect(imageCountsOf(data, [], entry)).toEqual([{ world: 'base-ref', count: 4 }])
  })

  it('keeps originals, sisters and unrelated identities apart, including portrait-only and profile-only worlds', () => {
    const sister: AlbumEntry = { ...entry, outfitId: 900102, sister: { relation: 'twin', age: 'adult', profile: 'Invented.' } }
    const farm = world('farm-life', [look('original'), look('sister', { outfitId: 900102 }), look('other-sister', { outfitId: 900103 }), look('unknown', { characterId: null })])
    const cyberpunk: Universe = { ...world('cyberpunk'), portraits: {
      states: 50, approvedOn: null, publishedAt: null, pieces: [{ ...piece('crop', 'crop'), outfitId: 900102 }],
    } }
    const quest: Universe = { ...world('high-fantasy'), profiles: {
      size: 192, release: null, publishedAt: null, pieces: [{ ...piece('profile', 'profile'), outfitId: 900102 }],
    } }
    expect(imageCountsOf(empty, [farm, cyberpunk, quest], entry)).toEqual([{ world: 'uma-farm', count: 1 }])
    expect(imageCountsOf(empty, [farm, cyberpunk, quest], sister)).toEqual([
      { world: 'uma-farm', count: 1 }, { world: 'uma-cyberpunk', count: 1 }, { world: 'uma-quest', count: 1 },
    ])
  })

  it('counts a shared duo file once per character participant and excludes the Boss Ally identity', () => {
    const shared = look('shared', { kind: 'splash', category: 'duo-splash', duo: { id: 'pair', members: [
      { castId: 'one', character: 'Rider One', characterId: 9001, role: 'character' },
      { castId: 'two', character: 'Rider Two', characterId: 9002, role: 'character' },
    ] } })
    const farm = world('farm-life', [shared, { ...shared, id: 'duplicate-record' }])
    expect(imageCountsOf(empty, [farm], entry)).toEqual([{ world: 'uma-farm', count: 1 }])
    expect(imageCountsOf(empty, [farm], { ...entry, characterId: 9002, outfitId: 900201 })).toEqual([{ world: 'uma-farm', count: 1 }])
    shared.duo!.members[1]!.role = 'boss-ally'
    expect(imageCountsOf(empty, [world('cyberpunk', [shared])], { ...entry, characterId: 9002, outfitId: 900201 })).toEqual([])
  })

  it('omits empty worlds, handles missing releases and preserves future world IDs', () => {
    expect(imageCountsOf(empty, [], entry)).toEqual([])
    expect(imageCountsOf(empty, [world('farm-life'), world('future-world', [look('new')])], entry)).toEqual([{ world: 'future-world', count: 1 }])
  })
})
