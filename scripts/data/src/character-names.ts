// How master data finds a character from the name an author wrote (P205): by the same key Uma Character Art matches with
// (apps/api art.service.ts), so punctuation, case and accents never hide her. A splash scene signed "Curren Bouquetd’or"
// (a curly apostrophe) is master data's "Curren Bouquetd'or", as it already is on her Character Art page.

/** A name reduced to its letters and digits, lowercased, accents dropped. */
export const nameKey = (name: string): string => name.normalize('NFKD').toLowerCase().replace(/[^a-z0-9]+/g, '')

interface Named<Id> { id: Id; name: { global?: string | null; en?: string | null; ja?: string | null } }

/** Each character by every name master data has for her (global, English, Japanese); a name two share stays the first's. */
export function characterLookup<Id>(characters: readonly Named<Id>[]): (name: string) => Id | null {
  const ids = new Map<string, Id>()
  for (const c of characters) {
    for (const name of [c.name.global, c.name.en, c.name.ja]) {
      const key = name ? nameKey(name) : ''
      if (key && !ids.has(key)) ids.set(key, c.id)
    }
  }
  return (name) => ids.get(nameKey(name)) ?? null
}
