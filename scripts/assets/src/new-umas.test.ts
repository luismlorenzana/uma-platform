import type { ArtIndex } from '@luismlorenzana/uma-data'
import { syntheticMasterData } from '@luismlorenzana/uma-data/testing'
import { describe, expect, it } from 'vitest'
import { artGaps, describeNews, hasNews, newRecords, wikiPage, type RecordSets } from './new-umas'

const sets = (): RecordSets => {
  const { characters, outfits, supportCards, skills, scenarios } = syntheticMasterData()
  return { characters, outfits, supportCards, skills, scenarios }
}

const emptyAtlas = { frameWidth: 128, frameHeight: 128, pages: [], frames: {} }
const frame = { page: 0, x: 0, y: 0, width: 128, height: 128 }
const image = { path: 'art/x.webp', width: 1, height: 1 }

/** Art for every record of `data`, so a test can take one piece away. */
function fullArt(data: RecordSets): ArtIndex {
  const keyed = <T,>(keys: readonly (string | number)[], value: T) => Object.fromEntries(keys.map((key) => [String(key), value]))
  const outfits = data.outfits.map((outfit) => outfit.id)
  const characters = [...new Set(data.outfits.map((outfit) => outfit.characterId))]
  const atlas = (keys: readonly (string | number)[]) => ({ ...emptyAtlas, frames: keyed(keys, frame) })
  return {
    atlases: {
      'outfit-icons': atlas(outfits),
      'support-card-icons': atlas(data.supportCards.map((card) => card.id)),
      'skill-icons': atlas(data.skills.flatMap((skill) => [skill.iconId, ...(skill.globalIconId === null ? [] : [skill.globalIconId])])),
      'scenario-icons': atlas(data.scenarios.map((scenario) => scenario.id)),
    },
    images: {
      'outfit-portraits': keyed(outfits, image),
      'outfit-busts': keyed(outfits, image),
      'outfit-faces': keyed(outfits, image),
      'outfit-glass': keyed(outfits, image),
      'outfit-glass-order': keyed(outfits, image),
      'outfit-chibis': keyed(outfits.flatMap((id) => [`${id}-a`, `${id}-b`]), image),
      'character-dresses': keyed(characters.flatMap((id) => [`${id}-gym`, `${id}-summer`, `${id}-winter`, `${id}-casual`]), image),
      'character-faces': keyed(characters, image),
      'support-card-art': keyed(data.supportCards.map((card) => card.id), image),
    },
  }
}

describe('newRecords', () => {
  it('finds nothing between the same sets', () => {
    expect(hasNews(newRecords(sets(), sets()))).toBe(false)
  })

  it('names added records and counts changed ones', () => {
    const before = sets()
    const after = sets()
    const outfit = { ...after.outfits[0]!, id: 999901, title: { ja: 'x', en: '[Invented Title]', global: null } }
    after.outfits = [...after.outfits, outfit]
    after.characters = after.characters.map((character, index) => (index === 0 ? { ...character, heightCm: 999 } : character))

    const news = newRecords(before, after)
    expect(hasNews(news)).toBe(true)
    expect(news.outfits.map(({ id }) => id)).toEqual([999901])
    expect(news.changed).toMatchObject({ characters: 1, outfits: 0 })
    expect(describeNews(news, after)).toContain(`New outfits (1):`)
    expect(describeNews(news, after).find((line) => line.includes('999901'))).toContain('Invented Title')
    expect(describeNews(news, after)).toContain('Changed records: characters 1')
  })

  it('says when an outfit has no title in any language', () => {
    const after = sets()
    const outfit = { ...after.outfits[0]!, id: 999902, title: { ja: '', en: null, global: null } }
    after.outfits = [...after.outfits, outfit]
    expect(describeNews(newRecords(sets(), after), after).find((line) => line.includes('999902'))).toContain('no title yet')
  })
})

describe('artGaps', () => {
  it('finds nothing in a complete release', () => {
    const data = sets()
    expect(artGaps(data, fullArt(data))).toEqual({ required: [], optional: [], wikiFiles: [] })
  })

  it('holds a release back for a missing pane map, as for a missing window', () => {
    const data = sets()
    const art = fullArt(data)
    const id = String(data.outfits[0]!.id)
    delete art.images['outfit-glass-order']![id]
    expect(artGaps(data, art).required).toEqual([`outfit-glass-order/${id}`])
  })

  it('holds a release back for a missing window, and only notes a missing chibi', () => {
    const data = sets()
    const art = fullArt(data)
    const id = String(data.outfits[0]!.id)
    delete art.images['outfit-glass']![id]
    delete art.images['outfit-chibis']![`${id}-a`]
    const gaps = artGaps(data, art)
    expect(gaps).toEqual({ required: [`outfit-glass/${id}`], optional: [`outfit-chibis/${id}-a`], wikiFiles: [] })
  })

  it('lists the stands a new character needs saved by hand', () => {
    const data = sets()
    const art = fullArt(data)
    const { characterId } = data.outfits[0]!
    delete art.images['character-dresses']![`${characterId}-summer`]
    const gaps = artGaps(data, art)
    expect(gaps.wikiFiles).toEqual([`Game_Asset_chara_stand_${characterId}_000002.png`])
    expect(wikiPage(gaps.wikiFiles[0]!)).toBe(`https://umamusu.wiki/File:${gaps.wikiFiles[0]}`)
  })
})
