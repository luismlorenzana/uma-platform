// What a board shows (RK1): every card with its name, line, image and hints, built from the catalog and profiles.
import {
  boardOf, FRANCHISES, identityByOutfit, outfitIndex, ownOutfits, playstyleOf, defaultOutfit, WAYS,
  type BoardId, type Category, type Franchise, type PoolMember, type Tier, type TierCatalog, type UmaProfiles, type Way,
} from '@uma-platform/tiers'

export interface Item {
  id: string
  name: string
  /** The outfit's title, a sister's relation, or an enemy's franchise. */
  line: string
  /** A release path (Umas) or a pack path (enemies). */
  image: string | null
  imageKind: 'release' | 'pack'
  way: Way | null
  franchise: Franchise | null
  category: Category | null
  /** The character id behind an Uma card. */
  characterId: string | null
  /** The Uma a card counts for (a character, or a sister's `s<outfitId>`); null for enemies. */
  identity: string | null
  sister: boolean
  /** Old tiers: the old outfit board, the old character board, or the old enemy board. */
  hints: string[]
  via: PoolMember['via']
  viaTier: PoolMember['viaTier']
}

const wayLabel = (way: Way) => WAYS.find((w) => w.id === way)?.label ?? way
const franchiseLabel = (f: Franchise) => FRANCHISES.find((x) => x.id === f)?.label ?? f
const OLD_OUTFIT: Record<Tier, string> = { SSS: 'SSS', SS: 'SS', S: 'A1', A: 'A2', B: 'B', F: 'F' }

export function items(board: BoardId, pool: readonly PoolMember[], catalog: TierCatalog, profiles: UmaProfiles): Item[] {
  const kind = boardOf(board)?.kind
  if (kind === 'outfit') {
    const outfits = outfitIndex(catalog), identity = identityByOutfit(catalog, profiles)
    return pool.flatMap((m): Item[] => {
      const found = outfits.get(Number(m.id)), who = identity.get(Number(m.id))
      if (!found || !who) return []
      const { uma, outfit } = found
      const hints = [outfit.before ? `Old outfit board: ${OLD_OUTFIT[outfit.before]}` : '', uma.before ? `${uma.name} was ${uma.before} as a character` : ''].filter(Boolean)
      return [{
        id: m.id, name: who.name, line: who.sister ? `${uma.name}’s ${who.sister.relation} · ${outfit.title}` : outfit.title,
        image: outfit.face, imageKind: 'release', way: outfit.way, franchise: null, category: null, characterId: uma.id, identity: who.id, sister: who.sister !== null, hints, via: m.via, viaTier: m.viaTier,
      }]
    })
  }
  if (kind === 'uma') {
    const umas = new Map(catalog.umas.map((u) => [u.id, u]))
    return pool.flatMap((m): Item[] => {
      const uma = umas.get(m.id)
      if (!uma) return []
      const face = defaultOutfit(uma, profiles)?.face ?? uma.face
      return [{
        id: m.id, name: uma.name, line: `${ownOutfits(uma, profiles).length} outfit${ownOutfits(uma, profiles).length === 1 ? '' : 's'} · ${wayLabel(playstyleOf(uma, profiles))}`,
        image: face, imageKind: 'release', way: playstyleOf(uma, profiles), franchise: null, category: null, characterId: uma.id, identity: uma.id, sister: false,
        hints: uma.before ? [`Was ${uma.before} on the old Playable board`] : [], via: m.via, viaTier: m.viaTier,
      }]
    })
  }
  const units = new Map(catalog.enemies.map((u) => [u.id, u]))
  return pool.flatMap((m): Item[] => {
    const u = units.get(m.id)
    if (!u) return []
    const hints = u.before ? [`Old enemy board: ${u.before.role}${u.before.tier ? `, ${u.before.tier}` : ''}`] : []
    return [{
      id: m.id, name: u.name, line: [franchiseLabel(u.franchise), ...u.details.slice(0, 2)].join(' · '), image: u.images.face ?? u.images.art ?? null, imageKind: 'pack',
      way: null, franchise: u.franchise, category: u.category, characterId: null, identity: null, sister: false, hints, via: m.via, viaTier: m.viaTier,
    }]
  })
}

/** Does an item pass the board's filters? */
export function matches(item: Item, query: string, way: Way | 'all'): boolean {
  if (way !== 'all' && item.way !== way) return false
  const q = query.trim().toLowerCase()
  return !q || item.name.toLowerCase().includes(q) || item.line.toLowerCase().includes(q) || item.id.includes(q)
}
/** How many Umas a set of cards holds: an Uma with two outfits counts once. Enemy cards count one each. */
export const umaCount = (cards: readonly Item[]): number => new Set(cards.map((i) => i.identity ?? i.id)).size
export { wayLabel, franchiseLabel }
