import { describe, expect, it } from 'vitest'
import { characterLookup, nameKey } from './character-names'

const characters = [
  { id: 1134, name: { ja: 'カレンブーケドール', en: "Curren Bouquetd'or", global: null } },
  { id: 1038, name: { ja: 'カレンチャン', en: 'Curren Chan', global: 'Curren Chan' } },
  { id: 1116, name: { ja: 'ジェンティルドンナ', en: 'Gentildonna', global: null } },
]

describe('finding a character by the name an author wrote (P207)', () => {
  it('matches the way Uma Character Art does: punctuation, case and accents aside', () => {
    const idOf = characterLookup(characters)
    expect(idOf('Curren Bouquetd’or')).toBe(1134)
    expect(idOf("Curren Bouquetd'or")).toBe(1134)
    expect(idOf('curren bouquetdor')).toBe(1134)
    expect(idOf('Géntildonna')).toBe(1116)
    expect(idOf('Curren Chan')).toBe(1038)
  })
  it('finds nobody for a name master data doesn’t have, or one with no letters', () => {
    const idOf = characterLookup(characters)
    expect(idOf('Curren')).toBeNull()
    expect(idOf('’')).toBeNull()
    expect(nameKey('Curren Bouquetd’or')).toBe(nameKey("Curren Bouquetd'or"))
  })
  it('keeps a name two characters share with the first', () => {
    const idOf = characterLookup([{ id: 1, name: { en: 'Twin' } }, { id: 2, name: { en: 'twin' } }])
    expect(idOf('TWIN')).toBe(1)
  })
})
