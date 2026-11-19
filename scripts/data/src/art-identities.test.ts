import { describe, expect, it } from 'vitest'
import { syntheticMasterData } from '@luismlorenzana/uma-data/testing'
import { artIdentityLookup, artIdentityOfKey } from './art-identities'

describe('private art identity aliases', () => {
  const data = syntheticMasterData()
  const original = data.characters.find(c => c.id === 9001)!
  const aliases = { identities: { 'invented-sister': { characterId: 9001, outfitId: 900101 } } }
  it('resolves a separate outfit identity and leaves the original name unchanged', () => {
    const lookup = artIdentityLookup(data.characters, data.outfits, aliases)
    expect(lookup('Invented Sister')).toEqual({ characterId: 9001, outfitId: 900101 })
    expect(lookup(original.name.global ?? original.name.en ?? original.name.ja!)).toEqual({ characterId: 9001 })
    expect(lookup('Missing')).toBeNull()
    expect(artIdentityOfKey('9001', data.characters, data.outfits)).toEqual({ characterId: 9001 })
    expect(artIdentityOfKey('outfit:900101', data.characters, data.outfits)).toEqual({ characterId: 9001, outfitId: 900101 })
  })
  it('refuses mismatched outfits, unknown keys and aliases that shadow master names', () => {
    expect(() => artIdentityLookup(data.characters, data.outfits, { identities: { sister: { characterId: 9002, outfitId: 900101 } } })).toThrow(/must belong/)
    const name = original.name.global ?? original.name.en ?? original.name.ja!
    expect(() => artIdentityLookup(data.characters, data.outfits, { identities: { [name]: { characterId: 9001, outfitId: 900101 } } })).toThrow(/shadows/)
    expect(() => artIdentityOfKey('outfit:999999', data.characters, data.outfits)).toThrow(/Unknown/)
  })
})
