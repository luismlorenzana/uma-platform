import type { Aptitudes, Character, LocalText, Outfit } from '@luismlorenzana/uma-data'

export interface OutfitArtKeys {
  icon: string
  bust: string
  face: string
  chibi: string
}

/** The neutral master-data fields both games project into their own album rows. */
export interface OutfitRowBase {
  id: string
  name: string
  title: string | null
  rarity: number
  releasedAt: string
  aptitudes: Aptitudes
  art: OutfitArtKeys
}

/** Global English first, then translated English, then Japanese. */
function displayText(text: LocalText | null | undefined): string {
  return text?.global ?? text?.en ?? text?.ja ?? ''
}

function titleText(text: LocalText): string | null {
  const title = displayText(text).replace(/^\[(.*)\]$/, '$1').trim()
  return title.length > 0 ? title : null
}

/** Projects one neutral master outfit into the fields shared by every album implementation. */
export function outfitRowBase(outfit: Outfit, character?: Character): OutfitRowBase {
  const id = String(outfit.id)
  return {
    id,
    name: displayText(character?.name),
    title: titleText(outfit.title),
    rarity: outfit.rarity,
    releasedAt: outfit.release.jp,
    aptitudes: outfit.aptitudes,
    art: { icon: id, bust: id, face: id, chibi: `${id}-a` },
  }
}
