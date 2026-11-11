// The tier boards (P113), moved online as the Uma Ranker (P127, P131). Two scales: Playable Umas ranks each outfit on ten
// straight tiers, T1 to T10, one art batch each (P131); every other board keeps SS, S, A, B, F, with SSS on Uma NPCs
// (P122, P124). Boards hand their leftovers down. Shared by the API and the pages, so nothing here imports Node.

// ---- Scales ----

export const TIERS = [
  { id: 'SSS', label: 'Headliners', description: 'The very top: author before the first cast.' },
  { id: 'SS', label: 'First cast', description: 'Author first.' },
  { id: 'S', label: 'Next wave', description: 'Right after the first cast.' },
  { id: 'A', label: 'Later wave', description: 'The last of this cast.' },
  { id: 'B', label: 'Alternative', description: 'Leaves this cast; a good alternative.' },
  { id: 'F', label: 'On file', description: 'Leaves this cast; unlikely.' },
] as const
export type Tier = typeof TIERS[number]['id']
const TIER_IDS: readonly string[] = TIERS.map((t) => t.id)
export const isTier = (value: unknown): value is Tier => typeof value === 'string' && TIER_IDS.includes(value)
/** On the lettered boards SSS (Uma NPCs only), SS, S and A are the cast; B, F and unranked flow to the board below. */
export const CAST_TIERS: readonly Tier[] = ['SSS', 'SS', 'S', 'A']
/** The old boards' five tiers on the lettered scale (P113): SS stays, A1 is S, A2 is A, B and F stay. */
export const LEGACY_TIER: Readonly<Record<string, Tier>> = { SS: 'SS', A1: 'S', A2: 'A', B: 'B', F: 'F' }

/** Playable Umas' ten tiers (P131): each one an art batch, authored in order. */
export const UMA_TIERS = [
  { id: 'T1', label: 'Tier 1', description: 'Art batch 1: authored first.' },
  { id: 'T2', label: 'Tier 2', description: 'Art batch 2.' },
  { id: 'T3', label: 'Tier 3', description: 'Art batch 3.' },
  { id: 'T4', label: 'Tier 4', description: 'Art batch 4.' },
  { id: 'T5', label: 'Tier 5', description: 'Art batch 5.' },
  { id: 'T6', label: 'Tier 6', description: 'Art batch 6.' },
  { id: 'T7', label: 'Tier 7', description: 'Art batch 7.' },
  { id: 'T8', label: 'Tier 8', description: 'Art batch 8.' },
  { id: 'T9', label: 'Tier 9', description: 'Art batch 9.' },
  { id: 'T10', label: 'Tier 10', description: 'Art batch 10: authored last.' },
] as const
export type UmaTier = typeof UMA_TIERS[number]['id']
const UMA_TIER_IDS: readonly string[] = UMA_TIERS.map((t) => t.id)
export const isUmaTier = (value: unknown): value is UmaTier => typeof value === 'string' && UMA_TIER_IDS.includes(value)
/** An Uma tier's batch number, 1 to 10. */
export const batchOf = (tier: UmaTier): number => UMA_TIER_IDS.indexOf(tier) + 1
/** Playable Umas' F (P133): outfits the owner won't use. Not a batch and not the cast; its row starts collapsed. */
export const UMA_F = { id: 'F', label: 'Not used', description: 'Outfits you won’t use: in no batch.' } as const
export type AnyTier = Tier | UmaTier
export interface TierInfo { readonly id: AnyTier; readonly label: string; readonly description: string }

// ---- Boards ----

export type BoardId = 'umas' | 'npcs' | 'azurlane-bosses' | 'genshin-bosses' | 'wuwa-bosses' | 'hsr-bosses' | 'zzz-bosses' | 'hi3-bosses' | 'pgr-bosses' | 'key-enemies' | 'regular-enemies'
export type BoardGroup = 'umas' | 'bosses' | 'enemies'
export interface Board {
  readonly id: BoardId
  /** `outfit`: Playable Umas, one card an outfit (P131); `uma`: a card a character; `enemy`: a card a unit. */
  readonly kind: 'outfit' | 'uma' | 'enemy'
  readonly group: BoardGroup
  readonly title: string
  readonly short: string
  /** One line on the tile and under the title. */
  readonly blurb: string
  /** Who is on the board, in words. */
  readonly pool: string
  /** The boards whose leftovers join this one. */
  readonly from: readonly BoardId[]
  /** Where this board's leftovers go. */
  readonly next: BoardId | null
  /** An imported boss board: the franchise whose import is its base, minus the ones left out (P121). */
  readonly franchise?: Franchise
}
export const BOARDS: readonly Board[] = [
  { id: 'umas', kind: 'outfit', group: 'umas', title: 'Playable Umas', short: 'Playable', from: [], next: 'npcs',
    blurb: 'Every outfit on ten tiers, one art batch each. Sisters with an outfit of their own rank as themselves.',
    pool: 'Every Uma outfit, each ranked on its own (P131).' },
  { id: 'npcs', kind: 'uma', group: 'umas', title: 'Uma NPCs', short: 'NPCs', from: ['umas'], next: null,
    blurb: 'The townsfolk, rivals and familiar faces around the cast.',
    pool: 'Every Uma none of whose own outfits is ranked on Playable Umas.' },
  { id: 'azurlane-bosses', kind: 'enemy', group: 'bosses', title: 'Azur Lane bosses', short: 'Azur Lane', from: [], next: 'key-enemies',
    blurb: 'The bosses already sorted on the old enemy board, on the new scale.',
    pool: 'The Azur Lane units marked Boss. Add or remove one from its card.' },
  { id: 'genshin-bosses', kind: 'enemy', group: 'bosses', title: 'Genshin Impact bosses', short: 'Genshin', from: [], next: 'key-enemies', franchise: 'genshin',
    blurb: 'Female characters, imported locally.',
    pool: 'Every Genshin Impact character in the import (female characters to start).' },
  { id: 'wuwa-bosses', kind: 'enemy', group: 'bosses', title: 'Wuthering Waves bosses', short: 'WuWa', from: [], next: 'key-enemies', franchise: 'wuwa',
    blurb: 'Female resonators, imported locally.',
    pool: 'Every Wuthering Waves character in the import (female resonators to start).' },
  { id: 'hsr-bosses', kind: 'enemy', group: 'bosses', title: 'Honkai: Star Rail bosses', short: 'HSR', from: [], next: 'key-enemies', franchise: 'hsr',
    blurb: 'Female characters, imported locally.',
    pool: 'Every Honkai: Star Rail character in the import (female characters to start).' },
  { id: 'zzz-bosses', kind: 'enemy', group: 'bosses', title: 'Zenless Zone Zero bosses', short: 'ZZZ', from: [], next: 'key-enemies', franchise: 'zzz',
    blurb: 'Female agents, imported locally.',
    pool: 'Every Zenless Zone Zero agent in the import (female agents to start).' },
  { id: 'hi3-bosses', kind: 'enemy', group: 'bosses', title: 'Honkai Impact 3rd bosses', short: 'HI3', from: [], next: 'key-enemies', franchise: 'hi3',
    blurb: 'Every battlesuit, unfiltered. Leave out the ones that don’t fit.',
    pool: 'Every Honkai Impact 3rd battlesuit in the import, unfiltered, minus the ones left out.' },
  { id: 'pgr-bosses', kind: 'enemy', group: 'bosses', title: 'Punishing: Gray Raven bosses', short: 'PGR', from: [], next: 'key-enemies', franchise: 'pgr',
    blurb: 'Every frame, unfiltered. Leave out the ones that don’t fit.',
    pool: 'Every Punishing: Gray Raven frame in the import, unfiltered, minus the ones left out.' },
  { id: 'key-enemies', kind: 'enemy', group: 'enemies', title: 'Key enemies', short: 'Key', from: ['azurlane-bosses', 'genshin-bosses', 'wuwa-bosses', 'hsr-bosses', 'zzz-bosses', 'hi3-bosses', 'pgr-bosses'], next: 'regular-enemies',
    blurb: 'They escort the bosses and lead the regular groups.',
    pool: 'Every other Azur Lane unit, plus each boss board’s B, F and unranked.' },
  { id: 'regular-enemies', kind: 'enemy', group: 'enemies', title: 'Regular enemies', short: 'Regular', from: ['key-enemies'], next: null,
    blurb: 'Two or three make a random fight.',
    pool: 'Every NIKKE unit, plus Key enemies’ B, F and unranked.' },
]
export const BOARD_IDS = BOARDS.map((b) => b.id)
export const boardOf = (id: string): Board | undefined => BOARDS.find((b) => b.id === id)
export const BOSS_BOARDS: readonly BoardId[] = ['azurlane-bosses', 'genshin-bosses', 'wuwa-bosses', 'hsr-bosses', 'zzz-bosses', 'hi3-bosses', 'pgr-bosses']
/** The imported boss boards, whose units can be left out of every board (P121). */
export const importBoardOf = (franchise: string): Board | undefined => BOARDS.find((b) => b.franchise === franchise)
/** Playable Umas' tiers: the ten batches, then F (P131, P133). */
export const PLAYABLE_TIERS: readonly TierInfo[] = [...UMA_TIERS, UMA_F]
/** A board's tiers, best first: T1–T10 and F on Playable Umas (P131, P133), SSS to F on Uma NPCs (P124), SS to F elsewhere. */
export function tiersOf(board: BoardId): readonly TierInfo[] {
  if (board === 'umas') return PLAYABLE_TIERS
  return boardOf(board)?.kind === 'uma' ? TIERS : TIERS.filter((t) => t.id !== 'SSS')
}
export const tierIdsOf = (board: BoardId): AnyTier[] => tiersOf(board).map((t) => t.id)
export const hasTier = (board: BoardId, tier: unknown): tier is AnyTier => tiersOf(board).some((t) => t.id === tier)
/** In the board's cast: a batch (T1–T10) on Playable Umas, where F is not used; SSS to A elsewhere. */
export function inCast(board: BoardId, tier: AnyTier | null | undefined): boolean {
  if (!tier) return false
  return board === 'umas' ? isUmaTier(tier) : (CAST_TIERS as readonly string[]).includes(tier)
}

// ---- The catalog the boards rank ----

/**
 * The five playstyles: the old outfit board's aptitude buckets (uma-rpg Classes v3 / CV19), each with its calling, from
 * an outfit's best running-style grades.
 */
export const WAYS = [
  { id: 'front', label: 'Warrior', bucket: 'Front / Front + Pace', short: 'Front', rule: 'Front among the best styles wins every tie.' },
  { id: 'pace', label: 'Spellblade', bucket: 'Pure Pace', short: 'Pace', rule: 'Pace is the only style at the highest grade.' },
  { id: 'pace-late', label: 'Mage', bucket: 'Pace + Late', short: 'Pace + Late', rule: 'Pace tied with Late or End, with no Front.' },
  { id: 'late', label: 'Healer', bucket: 'Pure Late', short: 'Late', rule: 'Late is the only style at the highest grade.' },
  { id: 'late-end', label: 'Summoner', bucket: 'Late + End', short: 'Late + End', rule: 'End alone or tied with Late, with no Front or Pace.' },
] as const
export type Way = typeof WAYS[number]['id']
export const isWay = (value: unknown): value is Way => WAYS.some((w) => w.id === value)
export const STYLES = ['front', 'pace', 'late', 'end'] as const
export type Strategy = Record<typeof STYLES[number], string>
const GRADES = ['S', 'A', 'B', 'C', 'D', 'E', 'F', 'G']
/** Every running style tied for her highest grade: the ones that decide her playstyle. */
export function bestStyles(strategy: Strategy): (typeof STYLES[number])[] {
  const top = Math.min(...STYLES.map((s) => GRADES.indexOf(strategy[s])))
  return STYLES.filter((s) => GRADES.indexOf(strategy[s]) === top)
}
/** An outfit's playstyle from her grades (uma-rpg Classes v3 §5 / CV19). */
export function wayOf(strategy: Strategy): Way {
  const best = bestStyles(strategy)
  if (best.includes('front')) return 'front'
  if (best.includes('pace')) return best.length === 1 ? 'pace' : 'pace-late'
  return best.includes('end') ? 'late-end' : 'late'
}
export interface UmaOutfit {
  id: number
  title: string
  original: boolean
  way: Way
  strategy: Strategy
  /** Release paths of her art (`art/…`), or null. */
  face: string | null
  portrait: string | null
  /** Her tier on the old outfit board (2026-11-06), on the lettered scale, or null: a hint only. */
  before: Tier | null
}
export interface UmaCharacter {
  /** The character id, as a string. */
  id: string
  name: string
  face: string | null
  portrait: string | null
  outfits: UmaOutfit[]
  /** Her tier on the per-character board before outfits were split again (P131), or null: a hint only. */
  before: Tier | null
}
/** Her lead outfit, the default when she has no pick: her best old outfit tier, then her original outfit, then the lowest id. */
export function leadOutfit(outfits: readonly UmaOutfit[]): UmaOutfit | undefined {
  const rank = (o: UmaOutfit) => (o.before ? TIER_IDS.indexOf(o.before) : TIER_IDS.length)
  return [...outfits].sort((a, b) => rank(a) - rank(b) || Number(b.original) - Number(a.original) || a.id - b.id)[0]
}
export const FRANCHISES = [
  { id: 'azurlane', label: 'Azur Lane' }, { id: 'genshin', label: 'Genshin Impact' },
  { id: 'wuwa', label: 'Wuthering Waves' }, { id: 'hsr', label: 'Honkai: Star Rail' }, { id: 'zzz', label: 'Zenless Zone Zero' },
  { id: 'hi3', label: 'Honkai Impact 3rd' }, { id: 'pgr', label: 'Punishing: Gray Raven' }, { id: 'nikke', label: 'NIKKE' },
] as const
export type Franchise = typeof FRANCHISES[number]['id']
export const CATEGORIES = [
  { id: 'regular', label: 'Regular' }, { id: 'key', label: 'Key enemy' }, { id: 'subboss', label: 'Sub-boss' },
  { id: 'boss', label: 'Boss' }, { id: 'playable', label: 'Playable character' }, { id: 'other', label: 'Other' },
] as const
export type Category = typeof CATEGORIES[number]['id']
export interface EnemyUnit {
  id: string
  name: string
  franchise: Franchise
  /** Its category in its own game. */
  category: Category
  studyAvailable: boolean
  /** Pack paths of its art (`assets/enemies/…`). */
  images: { face?: string; art?: string; splash?: string }
  /** Short facts from the source (rarity, element, weapon), for the card. */
  details: string[]
  /** Its role and tier on the old enemy board (P113), or null. */
  before: { role: 'regular' | 'elite' | 'boss'; tier: Tier | null } | null
}
export interface TierCatalog { release: string; umas: UmaCharacter[]; enemies: EnemyUnit[] }
/** Every outfit by id, with her character. */
export function outfitIndex(catalog: TierCatalog): Map<number, { uma: UmaCharacter; outfit: UmaOutfit }> {
  return new Map(catalog.umas.flatMap((uma) => uma.outfits.map((outfit) => [outfit.id, { uma, outfit }] as const)))
}

// ---- A board's saved state ----

export interface TierEntry {
  /** An outfit id on Playable Umas, a character id on Uma NPCs, a unit id elsewhere. */
  id: string
  tier: AnyTier | null
  note: string
}
export interface BoardState {
  /** 2 on Playable Umas (per outfit, T1–T10, P131); 1 on every other board. */
  schemaVersion: 1 | 2
  kind: 'tier-board'
  board: BoardId
  revision: number
  updatedAt: string | null
  /** Array order is the order within each tier. */
  entries: TierEntry[]
  /** Azur Lane bosses only: who is on the board. */
  members?: string[]
  /** Imported boss boards only: units left out of every board (P121). */
  out?: string[]
}
export type BoardStates = Record<BoardId, BoardState>
export const schemaOf = (board: BoardId): 1 | 2 => (board === 'umas' ? 2 : 1)
export const emptyBoard = (board: BoardId): BoardState => ({
  schemaVersion: schemaOf(board), kind: 'tier-board', board, revision: 0, updatedAt: null, entries: [], ...(board === 'azurlane-bosses' ? { members: [] } : {}),
})
const object = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)
const idPattern = /^[A-Za-z0-9][A-Za-z0-9-]{0,99}$/
const outfitIdPattern = /^[1-9][0-9]{0,8}$/

/** Rejects a malformed board before anything changes. */
export function parseBoard(value: unknown, board?: BoardId): BoardState {
  const id = object(value) ? String(value.board) : ''
  if (!object(value) || value.kind !== 'tier-board' || !boardOf(id) || (board && id !== board) ||
      value.schemaVersion !== schemaOf(id as BoardId) || !Number.isSafeInteger(value.revision) || Number(value.revision) < 0 ||
      !(value.updatedAt === null || (typeof value.updatedAt === 'string' && Number.isFinite(Date.parse(value.updatedAt)))) ||
      !Array.isArray(value.entries) || value.entries.length > 20_000) {
    throw new Error(`Expected a tier board JSON file${board ? ` for ${board}` : ''} (schemaVersion ${board ? schemaOf(board) : '1, or 2 for Playable Umas'}).`)
  }
  const boardId = id as BoardId, seen = new Set<string>()
  const entries = value.entries.map((e: unknown): TierEntry => {
    if (!object(e) || typeof e.id !== 'string' || !(boardId === 'umas' ? outfitIdPattern : idPattern).test(e.id) || seen.has(e.id) ||
        !(e.tier === null || hasTier(boardId, e.tier)) || typeof e.note !== 'string' || e.note.length > 4000 ||
        Object.keys(e).some((k) => !['id', 'tier', 'note'].includes(k))) {
      throw new Error(boardId === 'umas'
        ? 'Each Playable Umas entry needs a unique outfit id, a tier from T1 to T10, F or null, and a note of at most 4,000 characters.'
        : 'Each entry needs a unique id, a tier of this board (SSS is for Uma NPCs only) or null, and a note of at most 4,000 characters.')
    }
    seen.add(e.id)
    return { id: e.id, tier: e.tier as AnyTier | null, note: e.note }
  })
  const state: BoardState = { schemaVersion: schemaOf(boardId), kind: 'tier-board', board: boardId, revision: Number(value.revision), updatedAt: value.updatedAt as string | null, entries }
  if (boardId === 'azurlane-bosses') {
    if (!Array.isArray(value.members) || !value.members.every((m) => typeof m === 'string' && idPattern.test(m)) || new Set(value.members).size !== value.members.length) {
      throw new Error('The Azur Lane bosses board needs a list of unique member ids.')
    }
    state.members = [...value.members as string[]]
  }
  if (value.out !== undefined) {
    if (!boardOf(boardId)?.franchise || !Array.isArray(value.out) || !value.out.every((m) => typeof m === 'string' && idPattern.test(m)) || new Set(value.out).size !== value.out.length) {
      throw new Error('Only an imported boss board leaves units out, as a list of unique ids.')
    }
    state.out = [...value.out as string[]]
  }
  return state
}

// ---- Order and counts ----

export const tierMap = (state: BoardState): Map<string, AnyTier | null> => new Map(state.entries.map((e) => [e.id, e.tier]))
/** The ranked entries in the pool, best tier first, array order within a tier. */
export function ordered(state: BoardState, pool: ReadonlySet<string>): TierEntry[] {
  return tierIdsOf(state.board).flatMap((t) => state.entries.filter((e) => e.tier === t && pool.has(e.id)))
}
export interface PoolMember {
  id: string
  /** The board above that left it here, and the tier it has there; null for the board's own base. */
  via: BoardId | null
  viaTier: AnyTier | null
}
export interface BoardStats { pool: number; ranked: number; unranked: number; cast: number; tiers: Record<string, number> }
export function boardStats(pool: readonly PoolMember[], state: BoardState): BoardStats {
  const tiers = tierMap(state), counts = Object.fromEntries(tierIdsOf(state.board).map((t) => [t, 0])) as Record<string, number>
  let ranked = 0, cast = 0
  for (const m of pool) {
    const t = tiers.get(m.id)
    if (t && t in counts) { counts[t]!++; ranked++; if (inCast(state.board, t)) cast++ }
  }
  return { pool: pool.length, ranked, unranked: pool.length - ranked, cast, tiers: counts }
}

// ---- Edits, all pure ----

const bump = (state: BoardState, entries: TierEntry[], members = state.members): BoardState => ({ ...state, entries, ...(members ? { members } : {}) })
/** Units left out of every board, on an imported boss board. */
export const leftOut = (state: BoardState): string[] => state.out ?? []
const blank = (e: TierEntry): boolean => e.tier === null && !e.note

/** A new tier goes to the end of that tier; the same tier keeps its place. An unranked entry with no note is dropped. */
export function setTier(state: BoardState, id: string, tier: AnyTier | null): BoardState {
  const current = state.entries.find((e) => e.id === id)
  if ((current?.tier ?? null) === tier) return state
  const rest = state.entries.filter((e) => e.id !== id), next: TierEntry = { id, tier, note: current?.note ?? '' }
  return bump(state, blank(next) ? rest : [...rest, next])
}
export function setNote(state: BoardState, id: string, note: string): BoardState {
  const current = state.entries.find((e) => e.id === id)
  if ((current?.note ?? '') === note) return state
  if (!current) return note ? bump(state, [...state.entries, { id, tier: null, note }]) : state
  const next = { ...current, note }
  return bump(state, blank(next) ? state.entries.filter((e) => e.id !== id) : state.entries.map((e) => (e.id === id ? next : e)))
}
/** Puts `id` in `tier` just before `before` (an entry of that tier), or at the tier's end. */
export function place(state: BoardState, id: string, tier: AnyTier, before: string | null): BoardState {
  if (before === id) return state
  const current = state.entries.find((e) => e.id === id), moved: TierEntry = { id, tier, note: current?.note ?? '' }
  const rest = state.entries.filter((e) => e.id !== id), at = before ? rest.findIndex((e) => e.id === before && e.tier === tier) : -1
  return bump(state, at < 0 ? [...rest, moved] : [...rest.slice(0, at), moved, ...rest.slice(at)])
}
/** Swaps with the next entry of the same tier in the pool, earlier (-1) or later (1). */
export function move(state: BoardState, id: string, direction: -1 | 1, pool: ReadonlySet<string>): BoardState {
  const index = state.entries.findIndex((e) => e.id === id), current = state.entries[index]
  if (!current?.tier) return state
  const peers = state.entries.flatMap((e, i) => (e.tier === current.tier && pool.has(e.id) ? [i] : []))
  const other = peers[peers.indexOf(index) + direction]
  if (other === undefined) return state
  const entries = [...state.entries]
  entries[index] = state.entries[other]!
  entries[other] = current
  return bump(state, entries)
}
/**
 * Moves a ranked entry to the next tier up (-1), at that tier's end, or down (1), at its start: the step just across the
 * boundary (P131). Nothing happens at the top or bottom tier.
 */
export function tierStep(state: BoardState, id: string, direction: -1 | 1, pool: ReadonlySet<string>): BoardState {
  const current = state.entries.find((e) => e.id === id), tiers = tierIdsOf(state.board)
  const at = current?.tier ? tiers.indexOf(current.tier) : -1, target = tiers[at + direction]
  if (at < 0 || !target) return state
  if (direction < 0) return place(state, id, target, null)
  const first = state.entries.find((e) => e.tier === target && pool.has(e.id) && e.id !== id)
  return place(state, id, target, first?.id ?? null)
}
/** One place up (-1) or down (1) in the whole ranking: within her tier, or across into the next tier at its edge (P131). */
export function shift(state: BoardState, id: string, direction: -1 | 1, pool: ReadonlySet<string>): BoardState {
  const moved = move(state, id, direction, pool)
  return moved !== state ? moved : tierStep(state, id, direction, pool)
}
/** Adds an Azur Lane unit to the bosses board, or takes it off (with its tier and note there). */
export function setMember(state: BoardState, id: string, member: boolean): BoardState {
  const members = state.members ?? []
  if (members.includes(id) === member) return state
  return member ? bump(state, state.entries, [...members, id]) : bump(state, state.entries.filter((e) => e.id !== id), members.filter((m) => m !== id))
}
/**
 * An imported boss board: leaves a unit out of every board (it loses its tier and note here), or brings it back unranked
 * (P121). A unit that doesn't fit the roster, such as a male character from an unfiltered import, leaves this way.
 */
export function setOut(state: BoardState, id: string, out: boolean): BoardState {
  const list = leftOut(state)
  if (list.includes(id) === out) return state
  return { ...state, entries: out ? state.entries.filter((e) => e.id !== id) : state.entries, out: out ? [...list, id] : list.filter((m) => m !== id) }
}

// ---- Careers: how many bosses each playable Uma meets ----

export const MIN_CAREER_BOSSES = 3
export interface Careers { careers: number; bosses: number; bossesPerCareer: number; fights: number; careersPerBoss: number | null }
/**
 * Every ranked Uma identity is a career (a sister runs her sister's career, P131), and each fights at least three bosses
 * from the boss boards' cast (P116). Ten tiers no longer pair with the bosses' letters, so the count is one pool: when
 * bosses outnumber three a career, careers lengthen so every boss is met.
 */
export function careerMath(careers: number, bossStats: readonly BoardStats[]): Careers {
  const bosses = bossStats.reduce((n, s) => n + s.cast, 0)
  const bossesPerCareer = careers ? Math.max(MIN_CAREER_BOSSES, Math.ceil(bosses / careers)) : 0
  return { careers, bosses, bossesPerCareer, fights: careers * bossesPerCareer, careersPerBoss: bosses ? Math.round((careers * bossesPerCareer / bosses) * 10) / 10 : null }
}
