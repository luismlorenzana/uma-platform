import { id } from './parse.js'

/** An outfit-specific art identity retains its real master-data character. */
export interface CharacterArtIdentity { characterId: number; outfitId?: number }

/** Numeric keys retain the original art; outfit keys can coexist with it. */
export function characterArtKey(characterId: number, outfitId?: number): string {
  id(characterId, 'characterId')
  return outfitId === undefined ? String(characterId) : `outfit:${id(outfitId, 'outfitId')}`
}
