// The Studio's tier boards (P113): one five-tier scale for every cast, boards that hand their leftovers down, and the
// plan the later tools read. Shared by the server and the pages, so nothing here imports Node.

export const TIERS = [
  { id: 'SS', label: 'First cast', description: 'Author first.' },
  { id: 'S', label: 'Next wave', description: 'Right after the first cast.' },
  { id: 'A', label: 'Later wave', description: 'The last of this cast.' },
  { id: 'B', label: 'Alternative', description: 'Leaves this cast; a good alternative.' },
  { id: 'F', label: 'On file', description: 'Leaves this cast; unlikely.' },
] as const
export type Tier = typeof TIERS[number]['id']
const TIER_IDS: readonly string[] = TIERS.map((t) => t.id)
export const isTier = (value: unknown): value is Tier => typeof value === 'string' && TIER_IDS.includes(value)
/** SS, S and A are a board's cast. B, F and unranked leave it and flow to the board below. */
export const inCast = (tier: Tier | null | undefined): boolean => tier === 'SS' || tier === 'S' || tier === 'A'
/** The old boards' five tiers on the new scale (P113): SS stays, A1 is S, A2 is A, B and F stay. */
export const LEGACY_TIER: Readonly<Record<string, Tier>> = { SS: 'SS', A1: 'S', A2: 'A', B: 'B', F: 'F' }

export type BoardId = 'umas' | 'npcs' | 'azurlane-bosses' | 'genshin-bosses' | 'wuwa-bosses' | 'hsr-bosses' | 'zzz-bosses' | 'key-enemies' | 'regular-enemies'
export type BoardGroup = 'umas' | 'bosses' | 'enemies'
export interface Board {
  readonly id: BoardId
  readonly kind: 'uma' | 'enemy'
  readonly group: BoardGroup
  readonly title: string
  readonly short: string
  /** One line on the tile and under the title. */
  readonly blurb: string
  /** Who is on the board, in words. */
  readonly pool: string
  /** The boards whose B, F and unranked join this one. */
  readonly from: readonly BoardId[]
  /** Where this board's B, F and unranked go. */
  readonly next: BoardId | null
}
export const BOARDS: readonly Board[] = [
  { id: 'umas', kind: 'uma', group: 'umas', title: 'Playable Umas', short: 'Playable', from: [], next: 'npcs',
    blurb: 'Who gets a career. SS, S and A are the playable cast, and each career fights at least three bosses.',
    pool: 'Every Uma character with an outfit, ranked once for all her outfits.' },
  { id: 'npcs', kind: 'uma', group: 'umas', title: 'Uma NPCs', short: 'NPCs', from: ['umas'], next: null,
    blurb: 'The townsfolk, rivals and familiar faces around the cast.',
    pool: 'Every Uma outside Playable’s SS, S and A.' },
  { id: 'azurlane-bosses', kind: 'enemy', group: 'bosses', title: 'Azur Lane bosses', short: 'Azur Lane', from: [], next: 'key-enemies',
    blurb: 'The bosses already sorted on the old enemy board, on the new scale.',
    pool: 'The Azur Lane units marked Boss. Add or remove one from its card.' },
  { id: 'genshin-bosses', kind: 'enemy', group: 'bosses', title: 'Genshin Impact bosses', short: 'Genshin', from: [], next: 'key-enemies',
    blurb: 'New to the roster: female characters, imported locally.',
    pool: 'Every Genshin Impact character in the local import (female characters to start).' },
  { id: 'wuwa-bosses', kind: 'enemy', group: 'bosses', title: 'Wuthering Waves bosses', short: 'WuWa', from: [], next: 'key-enemies',
    blurb: 'New to the roster: female resonators, imported locally.',
    pool: 'Every Wuthering Waves character in the local import (female resonators to start).' },
  { id: 'hsr-bosses', kind: 'enemy', group: 'bosses', title: 'Honkai: Star Rail bosses', short: 'HSR', from: [], next: 'key-enemies',
    blurb: 'New to the roster: female characters, imported locally.',
    pool: 'Every Honkai: Star Rail character in the local import (female characters to start).' },
  { id: 'zzz-bosses', kind: 'enemy', group: 'bosses', title: 'Zenless Zone Zero bosses', short: 'ZZZ', from: [], next: 'key-enemies',
    blurb: 'New to the roster: female agents, imported locally.',
    pool: 'Every Zenless Zone Zero agent in the local import (female agents to start).' },
  { id: 'key-enemies', kind: 'enemy', group: 'enemies', title: 'Key enemies', short: 'Key', from: ['azurlane-bosses', 'genshin-bosses', 'wuwa-bosses', 'hsr-bosses', 'zzz-bosses'], next: 'regular-enemies',
    blurb: 'They escort the bosses and lead the regular groups.',
    pool: 'Every other Azur Lane unit, plus each boss board’s B, F and unranked.' },
  { id: 'regular-enemies', kind: 'enemy', group: 'enemies', title: 'Regular enemies', short: 'Regular', from: ['key-enemies'], next: null,
    blurb: 'Two or three make a random fight.',
    pool: 'Every NIKKE unit, plus Key enemies’ B, F and unranked.' },
]
export const BOARD_IDS = BOARDS.map((b) => b.id)
export const boardOf = (id: string): Board | undefined => BOARDS.find((b) => b.id === id)
export const BOSS_BOARDS: readonly BoardId[] = ['azurlane-bosses', 'genshin-bosses', 'wuwa-bosses', 'hsr-bosses', 'zzz-bosses']

// ---- The catalog the boards rank ----

/**
 * The five playstyles: the old outfit board's aptitude buckets (uma-rpg Classes v3 / CV19), each with its calling. An
 * outfit's comes from her best running-style grades; a character's from her lead outfit unless the owner picks (P117).
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
export interface UmaOutfit {
  id: number
  title: string
  original: boolean
  way: Way
  strategy: Strategy
  face: string | null
  portrait: string | null
  /** Its tier on the old outfit board, on the new scale (P113), or null. */
  before: Tier | null
}
export interface UmaCharacter {
  /** The character id, as a string. */
  id: string
  name: string
  face: string | null
  portrait: string | null
  outfits: UmaOutfit[]
  /** Her lead outfit: her best tier on the old outfit board, then her original outfit, then the lowest id. */
  lead: number
}
/** Her lead outfit, by the rule above. */
export function leadOutfit(outfits: readonly UmaOutfit[]): UmaOutfit | undefined {
  const rank = (o: UmaOutfit) => (o.before ? TIER_IDS.indexOf(o.before) : TIER_IDS.length)
  return [...outfits].sort((a, b) => rank(a) - rank(b) || Number(b.original) - Number(a.original) || a.id - b.id)[0]
}
/** A character's playstyle: the owner's pick on the Playable board when it is one of her outfits' playstyles, else her lead outfit's. */
export function playstyleOf(uma: UmaCharacter, states: Pick<BoardStates, 'umas'>): Way {
  const pick = states.umas.entries.find((e) => e.id === uma.id)?.way
  if (pick && uma.outfits.some((o) => o.way === pick)) return pick
  return uma.outfits.find((o) => o.id === uma.lead)?.way ?? uma.outfits[0]?.way ?? 'front'
}
export const waysOf = (uma: UmaCharacter): Way[] => WAYS.map((w) => w.id).filter((w) => uma.outfits.some((o) => o.way === w))
export const FRANCHISES = [
  { id: 'azurlane', label: 'Azur Lane' }, { id: 'genshin', label: 'Genshin Impact' },
  { id: 'wuwa', label: 'Wuthering Waves' }, { id: 'hsr', label: 'Honkai: Star Rail' }, { id: 'zzz', label: 'Zenless Zone Zero' },
  { id: 'nikke', label: 'NIKKE' },
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
  images: { face?: string; art?: string; splash?: string }
  /** Short facts from the source (rarity, element, weapon), for the card. */
  details: string[]
  /** Its role and tier on the old enemy board (P113), or null. */
  before: { role: 'regular' | 'elite' | 'boss'; tier: Tier | null } | null
}
export interface TierCatalog { release: string; umas: UmaCharacter[]; enemies: EnemyUnit[] }

// ---- A board's saved state ----

export interface TierEntry {
  id: string
  tier: Tier | null
  note: string
  /** Playable Umas only: her playstyle, when the owner picks one of her outfits' other playstyles (P117). */
  way?: Way
}
export interface BoardState {
  schemaVersion: 1
  kind: 'tier-board'
  board: BoardId
  revision: number
  updatedAt: string | null
  /** Array order is the order within each tier. */
  entries: TierEntry[]
  /** Azur Lane bosses only: who is on the board. */
  members?: string[]
}
export type BoardStates = Record<BoardId, BoardState>
export const emptyBoard = (board: BoardId): BoardState => ({
  schemaVersion: 1, kind: 'tier-board', board, revision: 0, updatedAt: null, entries: [], ...(board === 'azurlane-bosses' ? { members: [] } : {}),
})
const object = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)
const idPattern = /^[A-Za-z0-9][A-Za-z0-9-]{0,99}$/

/** Rejects a malformed board before anything changes. */
export function parseBoard(value: unknown, board?: BoardId): BoardState {
  if (!object(value) || value.schemaVersion !== 1 || value.kind !== 'tier-board' || !boardOf(String(value.board)) ||
      (board && value.board !== board) || !Number.isSafeInteger(value.revision) || Number(value.revision) < 0 ||
      !(value.updatedAt === null || (typeof value.updatedAt === 'string' && Number.isFinite(Date.parse(value.updatedAt)))) ||
      !Array.isArray(value.entries) || value.entries.length > 20_000) throw new Error(`Expected a tier board JSON file${board ? ` for ${board}` : ''} (schemaVersion 1).`)
  const id = value.board as BoardId, seen = new Set<string>()
  const entries = value.entries.map((e: unknown): TierEntry => {
    if (!object(e) || typeof e.id !== 'string' || !idPattern.test(e.id) || seen.has(e.id) || !(e.tier === null || isTier(e.tier)) ||
        typeof e.note !== 'string' || e.note.length > 4000 || (e.way !== undefined && (value.board !== 'umas' || !isWay(e.way)))) {
      throw new Error('Each entry needs a unique id, a tier (or null) and a note of at most 4,000 characters; only Playable Umas entries carry a playstyle.')
    }
    seen.add(e.id)
    return { id: e.id, tier: e.tier, note: e.note, ...(e.way !== undefined ? { way: e.way as Way } : {}) }
  })
  const state: BoardState = { schemaVersion: 1, kind: 'tier-board', board: id, revision: Number(value.revision), updatedAt: value.updatedAt as string | null, entries }
  if (id === 'azurlane-bosses') {
    if (!Array.isArray(value.members) || !value.members.every((m) => typeof m === 'string' && idPattern.test(m)) || new Set(value.members).size !== value.members.length) {
      throw new Error('The Azur Lane bosses board needs a list of unique member ids.')
    }
    state.members = [...value.members as string[]]
  }
  return state
}

// ---- Pools: who is on each board ----

export interface PoolMember {
  id: string
  /** The board above that left it here, and the tier it has there; null for the board's own base. */
  via: BoardId | null
  viaTier: Tier | null
}
export type Pools = Record<BoardId, PoolMember[]>
export const tierMap = (state: BoardState): Map<string, Tier | null> => new Map(state.entries.map((e) => [e.id, e.tier]))

/** Every board's members in board order: its base, then the B, F and unranked of the boards above it. */
export function pools(catalog: TierCatalog, states: BoardStates): Pools {
  const al = catalog.enemies.filter((u) => u.franchise === 'azurlane'), members = new Set(states['azurlane-bosses'].members ?? [])
  const base: Record<BoardId, string[]> = {
    umas: catalog.umas.map((u) => u.id),
    npcs: [],
    'azurlane-bosses': al.filter((u) => members.has(u.id)).map((u) => u.id),
    'genshin-bosses': catalog.enemies.filter((u) => u.franchise === 'genshin').map((u) => u.id),
    'wuwa-bosses': catalog.enemies.filter((u) => u.franchise === 'wuwa').map((u) => u.id),
    'hsr-bosses': catalog.enemies.filter((u) => u.franchise === 'hsr').map((u) => u.id),
    'zzz-bosses': catalog.enemies.filter((u) => u.franchise === 'zzz').map((u) => u.id),
    'key-enemies': al.filter((u) => !members.has(u.id)).map((u) => u.id),
    'regular-enemies': catalog.enemies.filter((u) => u.franchise === 'nikke').map((u) => u.id),
  }
  const result = {} as Pools
  for (const board of BOARDS) {
    const seen = new Set<string>(), list: PoolMember[] = []
    for (const id of base[board.id]) if (!seen.has(id)) { seen.add(id); list.push({ id, via: null, viaTier: null }) }
    for (const upstream of board.from) {
      const tiers = tierMap(states[upstream])
      for (const m of result[upstream]) {
        const tier = tiers.get(m.id) ?? null
        if (!inCast(tier) && !seen.has(m.id)) { seen.add(m.id); list.push({ id: m.id, via: upstream, viaTier: tier }) }
      }
    }
    result[board.id] = list
  }
  return result
}

export interface BoardStats { pool: number; ranked: number; unranked: number; cast: number; tiers: Record<Tier, number> }
export function boardStats(pool: readonly PoolMember[], state: BoardState): BoardStats {
  const tiers = tierMap(state), counts = Object.fromEntries(TIERS.map((t) => [t.id, 0])) as Record<Tier, number>
  let ranked = 0
  for (const m of pool) { const t = tiers.get(m.id); if (t) { counts[t]++; ranked++ } }
  return { pool: pool.length, ranked, unranked: pool.length - ranked, cast: counts.SS + counts.S + counts.A, tiers: counts }
}

// ---- Edits, all pure ----

/** The ranked entries in the pool, SS first, array order within a tier. */
export function ordered(state: BoardState, pool: ReadonlySet<string>): TierEntry[] {
  return TIERS.flatMap((t) => state.entries.filter((e) => e.tier === t.id && pool.has(e.id)))
}
const bump = (state: BoardState, entries: TierEntry[], members = state.members): BoardState => ({ ...state, entries, ...(members ? { members } : {}) })

/** A new tier goes to the end of that tier; the same tier keeps its place. An unranked entry with no note is dropped. */
export function setTier(state: BoardState, id: string, tier: Tier | null): BoardState {
  const current = state.entries.find((e) => e.id === id)
  if ((current?.tier ?? null) === tier) return state
  const rest = state.entries.filter((e) => e.id !== id), note = current?.note ?? '', way = current?.way
  if (tier === null && !note && !way) return bump(state, rest)
  return bump(state, [...rest, { id, tier, note, ...(way ? { way } : {}) }])
}
export function setNote(state: BoardState, id: string, note: string): BoardState {
  const current = state.entries.find((e) => e.id === id)
  if ((current?.note ?? '') === note) return state
  if (!current) return note ? bump(state, [...state.entries, { id, tier: null, note }]) : state
  if (current.tier === null && !note && !current.way) return bump(state, state.entries.filter((e) => e.id !== id))
  return bump(state, state.entries.map((e) => (e.id === id ? { ...e, note } : e)))
}
/** Playable Umas: picks her playstyle; her lead outfit's clears the pick. */
export function setWay(state: BoardState, uma: UmaCharacter, way: Way): BoardState {
  const current = state.entries.find((e) => e.id === uma.id), lead = uma.outfits.find((o) => o.id === uma.lead)?.way
  const pick = way === lead ? undefined : way
  if (current?.way === pick) return state
  const { way: _, ...rest } = current ?? { id: uma.id, tier: null, note: '' }
  const next: TierEntry = { ...rest, ...(pick ? { way: pick } : {}) }
  if (!current) return pick ? bump(state, [...state.entries, next]) : state
  if (next.tier === null && !next.note && !next.way) return bump(state, state.entries.filter((e) => e.id !== uma.id))
  return bump(state, state.entries.map((e) => (e.id === uma.id ? next : e)))
}
/** Puts `id` in `tier` just before `before` (an entry of that tier), or at the tier's end. */
export function place(state: BoardState, id: string, tier: Tier, before: string | null): BoardState {
  if (before === id) return state
  const current = state.entries.find((e) => e.id === id), moved: TierEntry = { id, tier, note: current?.note ?? '', ...(current?.way ? { way: current.way } : {}) }
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
/** Adds an Azur Lane unit to the bosses board, or takes it off (with its tier and note there). */
export function setMember(state: BoardState, id: string, member: boolean): BoardState {
  const members = state.members ?? []
  if (members.includes(id) === member) return state
  return member ? bump(state, state.entries, [...members, id]) : bump(state, state.entries.filter((e) => e.id !== id), members.filter((m) => m !== id))
}

// ---- Careers: how many bosses each playable Uma meets ----

export const MIN_CAREER_BOSSES = 3
export interface CareerTier { tier: Tier; umas: number; bosses: number; bossesPerCareer: number; careersPerBoss: number | null }
/**
 * Each playable Uma's career fights at least three bosses, drawn from the bosses of her own tier first (P116). A tier
 * with more than three bosses an Uma lengthens its careers so every boss is met; one with fewer shares its bosses.
 */
export function careerMath(stats: Record<BoardId, BoardStats>): { tiers: CareerTier[]; umas: number; bosses: number; fights: number } {
  const tiers = (['SS', 'S', 'A'] as const).map((tier): CareerTier => {
    const umas = stats.umas.tiers[tier], bosses = BOSS_BOARDS.reduce((n, b) => n + stats[b].tiers[tier], 0)
    const bossesPerCareer = umas ? Math.max(MIN_CAREER_BOSSES, Math.ceil(bosses / umas)) : 0
    return { tier, umas, bosses, bossesPerCareer, careersPerBoss: bosses ? Math.round((umas * bossesPerCareer / bosses) * 10) / 10 : null }
  })
  return { tiers, umas: tiers.reduce((n, t) => n + t.umas, 0), bosses: tiers.reduce((n, t) => n + t.bosses, 0), fights: tiers.reduce((n, t) => n + t.umas * t.bossesPerCareer, 0) }
}

// ---- The plan the later tools read ----

/** `content/authoring/tiers/plan.json`: every board, in authoring order, with names resolved. Rewritten on every save. */
export function tierPlan(catalog: TierCatalog, states: BoardStates, generatedAt: string) {
  const all = pools(catalog, states), umas = new Map(catalog.umas.map((u) => [u.id, u])), enemies = new Map(catalog.enemies.map((u) => [u.id, u]))
  const stats = Object.fromEntries(BOARDS.map((b) => [b.id, boardStats(all[b.id], states[b.id])])) as Record<BoardId, BoardStats>
  const describe = (id: string) => {
    const uma = umas.get(id)
    if (uma) return { name: uma.name, characterId: Number(uma.id), playstyle: playstyleOf(uma, states), lead: uma.lead, outfits: uma.outfits.map((o) => o.id), ways: waysOf(uma) }
    const unit = enemies.get(id)
    return unit ? { name: unit.name, franchise: unit.franchise, category: unit.category } : { name: id }
  }
  return {
    schemaVersion: 1, kind: 'tier-plan', generatedAt, release: catalog.release, tierOrder: TIERS.map((t) => t.id), cast: ['SS', 'S', 'A'],
    boards: BOARDS.map((b) => {
      const pool = all[b.id], ids = new Set(pool.map((m) => m.id)), via = new Map(pool.map((m) => [m.id, m]))
      const notes = new Map(states[b.id].entries.map((e) => [e.id, e.note]))
      const order = ordered(states[b.id], ids).map((e, i) => ({ order: i + 1, id: e.id, tier: e.tier, note: e.note, via: via.get(e.id)?.via ?? null, ...describe(e.id) }))
      const ranked = new Set(order.map((e) => e.id))
      return {
        id: b.id, title: b.title, pool: b.pool, next: b.next, revision: states[b.id].revision, updatedAt: states[b.id].updatedAt, stats: stats[b.id],
        order, unranked: pool.filter((m) => !ranked.has(m.id)).map((m) => ({ id: m.id, note: notes.get(m.id) ?? '', via: m.via, ...describe(m.id) })),
      }
    }),
    careers: careerMath(stats),
    playstyles: playstyleCounts(catalog, states, all),
  }
}

/** Playable Umas and Uma NPCs, each tier by playstyle (the old outfit board's grid, P117). */
export function playstyleCounts(catalog: TierCatalog, states: BoardStates, all = pools(catalog, states)) {
  const umas = new Map(catalog.umas.map((u) => [u.id, u]))
  return Object.fromEntries((['umas', 'npcs'] as const).map((board) => {
    const tiers = tierMap(states[board]), grid = Object.fromEntries([...TIERS.map((t) => t.id), 'unranked'].map((t) => [t, Object.fromEntries(WAYS.map((w) => [w.id, 0]))])) as Record<Tier | 'unranked', Record<Way, number>>
    for (const m of all[board]) { const u = umas.get(m.id); if (u) grid[tiers.get(m.id) ?? 'unranked'][playstyleOf(u, states)]++ }
    return [board, grid]
  })) as Record<'umas' | 'npcs', Record<Tier | 'unranked', Record<Way, number>>>
}

// ---- Seeding from the old boards (P113) ----

export interface LegacyBoards {
  /** The old outfit board's rows, in its order. */
  outfits: { outfitId: number; characterId: number; tier: string }[]
  /** The old enemy board's rows, in its authoring order. */
  enemies: { enemyId: string; bucket: 'regular' | 'elite' | 'boss'; tier: string | null; note: string }[]
}
/**
 * The first state of every board. A character takes her best outfit's tier; enemies keep their tier and note on the
 * board their old role points to: Azur Lane bosses on theirs, other Azur Lane elites on Key, Azur Lane regulars and every
 * NIKKE unit on Regular (each is unranked on Key, so it is in Regular's pool). NPCs and the new imports start empty.
 */
export function seedBoards(catalog: TierCatalog, legacy: LegacyBoards): BoardStates {
  const states = Object.fromEntries(BOARDS.map((b) => [b.id, emptyBoard(b.id)])) as BoardStates
  const best = new Map<string, { tier: Tier; index: number }>(), known = new Set(catalog.umas.map((u) => u.id))
  legacy.outfits.forEach((row, index) => {
    const tier = LEGACY_TIER[row.tier], id = String(row.characterId), was = best.get(id)
    if (!tier || !known.has(id)) return
    if (!was || TIER_IDS.indexOf(tier) < TIER_IDS.indexOf(was.tier)) best.set(id, { tier, index })
  })
  states.umas.entries = [...best].sort((a, b) => a[1].index - b[1].index).map(([id, v]) => ({ id, tier: v.tier, note: '' }))
  const units = new Map(catalog.enemies.map((u) => [u.id, u]))
  for (const row of legacy.enemies) {
    const unit = units.get(row.enemyId)
    if (!unit) continue
    const tier = row.tier ? LEGACY_TIER[row.tier] ?? null : null
    const board: BoardId = unit.franchise === 'azurlane' ? (row.bucket === 'boss' ? 'azurlane-bosses' : row.bucket === 'elite' ? 'key-enemies' : 'regular-enemies') : 'regular-enemies'
    if (board === 'azurlane-bosses') states[board].members!.push(unit.id)
    if (tier || row.note) states[board].entries.push({ id: unit.id, tier, note: row.note })
  }
  // An Azur Lane boss the old board never saw is still a boss: its game says so.
  for (const unit of catalog.enemies) {
    if (unit.franchise === 'azurlane' && unit.category === 'boss' && !legacy.enemies.some((r) => r.enemyId === unit.id)) states['azurlane-bosses'].members!.push(unit.id)
  }
  return states
}
