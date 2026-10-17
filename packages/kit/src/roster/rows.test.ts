import { syntheticMasterData } from '@luismlorenzana/uma-data/testing'
import { describe, expect, it } from 'vitest'
import { outfitRowBase } from './rows.js'

const display = (text: { global: string | null; en: string | null; ja: string }): string =>
  text.global ?? text.en ?? text.ja

describe('outfitRowBase', () => {
  it('projects neutral master fields and outfit-keyed art', () => {
    const data = syntheticMasterData()
    const outfit = data.outfits[0]!
    const character = data.characters.find((entry) => entry.id === outfit.characterId)!
    const base = outfitRowBase(outfit, character)

    expect(base).toEqual({
      id: String(outfit.id),
      name: display(character.name),
      title: display(outfit.title).replace(/^\[(.*)\]$/, '$1').trim() || null,
      rarity: outfit.rarity,
      releasedAt: outfit.release.jp,
      aptitudes: outfit.aptitudes,
      art: {
        icon: String(outfit.id),
        bust: String(outfit.id),
        face: String(outfit.id),
        chibi: `${outfit.id}-a`,
      },
    })
  })

  it('keeps the row usable while a character lookup is missing', () => {
    const outfit = syntheticMasterData().outfits[0]!
    expect(outfitRowBase(outfit)).toMatchObject({ id: String(outfit.id), name: '' })
  })
})
