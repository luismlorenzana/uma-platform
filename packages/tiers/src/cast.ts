// Uma Cyberpunk's enemy casting (P193): every Uma in the ten batches fights one of five factions, with one Boss from the
// boss boards' SS and three Sub-bosses from their S, every franchise together. An enemy is cast once in the whole game:
// once she fills a slot, no other slot offers her. The factions start as Faction 1 to 5 and the owner names them; each
// Uma's faction is given in ranking order, one after another (1, 2, 3, 4, 5, 1, …), and can be changed on her card. The
// file is private (`ranker/casts/cyberpunk.json` in the app's bucket, never git), and the plan carries the cast by tier and
// by faction, for the story and the art.
import { BOSS_BOARDS, boardOf, isUmaTier, ordered, UMA_TIERS, type BoardId, type BoardStates, type Franchise, type TierCatalog, type UmaTier } from './model.js'
import type { RankedIdentity } from './plan.js'

export const CAST_GAMES = ['cyberpunk'] as const
export type CastGame = typeof CAST_GAMES[number]
export const isCastGame = (value: unknown): value is CastGame => CAST_GAMES.includes(value as CastGame)
/** Three Sub-boss slots an Uma, beside her one Boss slot. */
export const SUB_BOSS_SLOTS = 3
/** A slot: her Boss, or one of her Sub-bosses (0, 1, 2). */
export type CastSlot = 'boss' | number
/** Which tier of the boss boards fills a slot (P193): SS for the Boss, S for a Sub-boss. */
export const slotTier = (slot: CastSlot): 'SS' | 'S' => (slot === 'boss' ? 'SS' : 'S')

export interface CastFaction {
  id: string
  /** The owner's name for it; "Faction 1" to "Faction 5" until named. */
  title: string
  /** Its colour on the page, `#rrggbb`. */
  color: string
}
export interface CastEntry {
  /** Her identity: a character id, or `s<outfitId>` for a sister (P131). */
  uma: string
  faction: string
  /** An enemy unit id, or null while the slot is open. */
  boss: string | null
  /** Always three, each a unit id or null. */
  subBosses: (string | null)[]
}
export interface EnemyCast {
  schemaVersion: 1
  kind: 'enemy-cast'
  game: CastGame
  revision: number
  updatedAt: string | null
  /** In their order: the sequence the Umas are given them in. */
  factions: CastFaction[]
  /** One entry an Uma; an Uma who leaves the batches keeps hers (her picks stay cast) until it's cleared. */
  umas: CastEntry[]
}

/** The five factions to start (P193): neutral, for the owner to name. Uma Cyberpunk's story follows them later. */
export const DEFAULT_FACTIONS: readonly CastFaction[] = [
  { id: 'f1', title: 'Faction 1', color: '#d9485f' },
  { id: 'f2', title: 'Faction 2', color: '#e0912b' },
  { id: 'f3', title: 'Faction 3', color: '#3e9b5f' },
  { id: 'f4', title: 'Faction 4', color: '#3a7bd5' },
  { id: 'f5', title: 'Faction 5', color: '#8e5cc9' },
]
export const emptyCast = (game: CastGame): EnemyCast => ({
  schemaVersion: 1, kind: 'enemy-cast', game, revision: 0, updatedAt: null, factions: DEFAULT_FACTIONS.map((f) => ({ ...f })), umas: [],
})

const object = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)
const umaPattern = /^s?[1-9][0-9]{0,8}$/
const unitPattern = /^[a-z0-9][a-z0-9-]{0,99}$/
const factionPattern = /^[a-z0-9][a-z0-9-]{0,39}$/
const colorPattern = /^#[0-9a-fA-F]{6}$/

/** Rejects a malformed casting before anything changes: unknown factions, a slot count other than 1 + 3, an enemy twice. */
export function parseCast(value: unknown, game?: CastGame): EnemyCast {
  if (!object(value) || value.schemaVersion !== 1 || value.kind !== 'enemy-cast' || !isCastGame(value.game) || (game && value.game !== game) ||
      !Number.isSafeInteger(value.revision) || Number(value.revision) < 0 ||
      !(value.updatedAt === null || (typeof value.updatedAt === 'string' && Number.isFinite(Date.parse(value.updatedAt)))) ||
      !Array.isArray(value.factions) || value.factions.length < 1 || value.factions.length > 12 || !Array.isArray(value.umas) || value.umas.length > 2000) {
    throw new Error(`Expected an enemy casting JSON file${game ? ` for ${game}` : ''} (schemaVersion 1).`)
  }
  const factionIds = new Set<string>()
  const factions = value.factions.map((f: unknown): CastFaction => {
    if (!object(f) || typeof f.id !== 'string' || !factionPattern.test(f.id) || factionIds.has(f.id) || typeof f.title !== 'string' || !f.title.trim() ||
        f.title.length > 60 || typeof f.color !== 'string' || !colorPattern.test(f.color) || Object.keys(f).some((k) => !['id', 'title', 'color'].includes(k))) {
      throw new Error('Each faction needs a unique id, a name of at most 60 characters and a colour (#rrggbb).')
    }
    factionIds.add(f.id)
    return { id: f.id, title: f.title.trim(), color: f.color.toLowerCase() }
  })
  const umas = new Set<string>(), cast = new Set<string>()
  const entries = value.umas.map((e: unknown): CastEntry => {
    if (!object(e) || typeof e.uma !== 'string' || !umaPattern.test(e.uma) || umas.has(e.uma) || typeof e.faction !== 'string' || !factionIds.has(e.faction) ||
        !(e.boss === null || (typeof e.boss === 'string' && unitPattern.test(e.boss))) || !Array.isArray(e.subBosses) || e.subBosses.length !== SUB_BOSS_SLOTS ||
        !e.subBosses.every((s) => s === null || (typeof s === 'string' && unitPattern.test(s))) || Object.keys(e).some((k) => !['uma', 'faction', 'boss', 'subBosses'].includes(k))) {
      throw new Error(`Each Uma needs a unique id, one of the factions, a Boss (or null) and exactly ${SUB_BOSS_SLOTS} Sub-bosses (or nulls).`)
    }
    umas.add(e.uma)
    for (const unit of [e.boss, ...e.subBosses]) {
      if (unit === null) continue
      if (cast.has(unit as string)) throw new Error(`An enemy is cast once: ${unit as string} fills two slots.`)
      cast.add(unit as string)
    }
    return { uma: e.uma, faction: e.faction, boss: e.boss as string | null, subBosses: [...e.subBosses as (string | null)[]] }
  })
  return { schemaVersion: 1, kind: 'enemy-cast', game: value.game as CastGame, revision: Number(value.revision), updatedAt: value.updatedAt as string | null, factions, umas: entries }
}

/** Every unit cast, with the Uma and slot that hold her. */
export function castUnits(cast: EnemyCast): Map<string, { uma: string; slot: CastSlot }> {
  const used = new Map<string, { uma: string; slot: CastSlot }>()
  for (const e of cast.umas) {
    if (e.boss) used.set(e.boss, { uma: e.uma, slot: 'boss' })
    e.subBosses.forEach((s, i) => { if (s) used.set(s, { uma: e.uma, slot: i }) })
  }
  return used
}

/**
 * Gives every Uma in the batches who has no faction yet the next one in sequence: the nth Uma in ranking order (from 0)
 * gets faction n mod 5 (P193). An Uma who has one keeps it. Returns the same cast when nobody is new.
 */
export function withFactions(cast: EnemyCast, batch: readonly { id: string }[]): EnemyCast {
  const have = new Set(cast.umas.map((e) => e.uma))
  if (!cast.factions.length || batch.every((i) => have.has(i.id))) return cast
  const added = batch.flatMap((i, n): CastEntry[] => (have.has(i.id) ? [] : [{ uma: i.id, faction: cast.factions[n % cast.factions.length]!.id, boss: null, subBosses: Array<string | null>(SUB_BOSS_SLOTS).fill(null) }]))
  return { ...cast, umas: [...cast.umas, ...added] }
}

/** Fills or clears a slot. Refuses (returns the same cast) an enemy already in any slot, or an Uma with no entry. */
export function setSlot(cast: EnemyCast, uma: string, slot: CastSlot, unit: string | null): EnemyCast {
  const entry = cast.umas.find((e) => e.uma === uma)
  if (!entry || (slot !== 'boss' && !(Number.isInteger(slot) && slot >= 0 && slot < SUB_BOSS_SLOTS))) return cast
  const current = slot === 'boss' ? entry.boss : entry.subBosses[slot]!
  if (current === unit || (unit !== null && castUnits(cast).has(unit))) return cast
  const next: CastEntry = slot === 'boss' ? { ...entry, boss: unit } : { ...entry, subBosses: entry.subBosses.map((s, i) => (i === slot ? unit : s)) }
  return { ...cast, umas: cast.umas.map((e) => (e.uma === uma ? next : e)) }
}
/** Moves an Uma to another faction; her picks go with her. */
export function setFaction(cast: EnemyCast, uma: string, faction: string): EnemyCast {
  const entry = cast.umas.find((e) => e.uma === uma)
  if (!entry || entry.faction === faction || !cast.factions.some((f) => f.id === faction)) return cast
  return { ...cast, umas: cast.umas.map((e) => (e.uma === uma ? { ...e, faction } : e)) }
}
/** Names a faction (the owner's words, at most 60 characters). */
export function renameFaction(cast: EnemyCast, faction: string, title: string): EnemyCast {
  const name = title.trim().slice(0, 60)
  if (!name || !cast.factions.some((f) => f.id === faction && f.title !== name)) return cast
  return { ...cast, factions: cast.factions.map((f) => (f.id === faction ? { ...f, title: name } : f)) }
}
/** Takes an Uma's entry off the casting, freeing her picks: for an Uma who left the batches. */
export function dropUma(cast: EnemyCast, uma: string): EnemyCast {
  return cast.umas.some((e) => e.uma === uma) ? { ...cast, umas: cast.umas.filter((e) => e.uma !== uma) } : cast
}

export interface CastCandidate { id: string; board: BoardId; franchise: Franchise; order: number }
/**
 * What a slot can take: each boss board's units at the slot's tier (SS for a Boss, S for a Sub-boss), every franchise,
 * each in its board's authoring order, minus the left-out and minus everyone already cast (P193).
 */
export function castCandidates(catalog: TierCatalog, states: BoardStates, cast: EnemyCast, slot: CastSlot): CastCandidate[] {
  const tier = slotTier(slot), used = castUnits(cast)
  return BOSS_BOARDS.flatMap((board) => {
    const franchise = boardOf(board)!.franchise!, out = new Set(states[board].out ?? [])
    const pool = new Set(catalog.enemies.filter((u) => u.franchise === franchise && !out.has(u.id)).map((u) => u.id))
    return ordered(states[board], pool).filter((e) => e.tier === tier && !used.has(e.id)).map((e, i) => ({ id: e.id, board, franchise, order: i + 1 }))
  })
}
/** Each unit's tier on its own boss board now: how a cast pick is checked against its slot. */
export function bossTiers(catalog: TierCatalog, states: BoardStates): Map<string, string> {
  const franchiseOf = new Map(catalog.enemies.map((u) => [u.id, u.franchise]))
  return new Map(BOSS_BOARDS.flatMap((board) => {
    const franchise = boardOf(board)!.franchise!, out = new Set(states[board].out ?? [])
    return states[board].entries.filter((e) => e.tier && franchiseOf.get(e.id) === franchise && !out.has(e.id)).map((e) => [e.id, e.tier!] as const)
  }))
}

/**
 * The casting as the plan and the page read it (P193): the batches' Umas by tier (in ranking order) and by faction, each
 * with her four slots; every pick says whether it still has its slot's tier on its board (`fits`: a pick re-ranked since
 * doesn't); the Umas outside the batches who still hold picks; and the counts.
 */
export function castPlan(catalog: TierCatalog, states: BoardStates, ranked: readonly RankedIdentity[], stored: EnemyCast) {
  const batch = ranked.filter((i) => isUmaTier(i.tier)), cast = withFactions(stored, batch)
  const entries = new Map(cast.umas.map((e) => [e.uma, e])), units = new Map(catalog.enemies.map((u) => [u.id, u])), tiers = bossTiers(catalog, states)
  const pick = (id: string | null, slot: CastSlot) => {
    if (!id) return null
    const unit = units.get(id), tier = tiers.get(id) ?? null
    return { id, name: unit?.name ?? id, franchise: unit?.franchise ?? null, tier, fits: tier === slotTier(slot) }
  }
  const row = (i: Pick<RankedIdentity, 'id' | 'name' | 'characterId' | 'sister' | 'tier' | 'order' | 'defaultOutfit'>) => {
    const e = entries.get(i.id)!
    return {
      uma: i.id, name: i.name, characterId: Number(i.characterId), sister: i.sister !== null, tier: i.tier, order: i.order, defaultOutfit: i.defaultOutfit,
      faction: e.faction, boss: pick(e.boss, 'boss'), subBosses: e.subBosses.map((s, n) => pick(s, n)),
    }
  }
  const rows = batch.map(row), inBatch = new Set(batch.map((i) => i.id)), byId = new Map(ranked.map((i) => [i.id, i]))
  const filled = (list: typeof rows) => ({ bosses: list.filter((r) => r.boss).length, subBosses: list.reduce((n, r) => n + r.subBosses.filter(Boolean).length, 0) })
  const outside = cast.umas.filter((e) => !inBatch.has(e.uma) && (e.boss || e.subBosses.some(Boolean))).map((e) => {
    const i = byId.get(e.uma)
    return { uma: e.uma, name: i?.name ?? e.uma, tier: i?.tier ?? null, faction: e.faction, boss: pick(e.boss, 'boss'), subBosses: e.subBosses.map((s, n) => pick(s, n)) }
  })
  const done = filled(rows)
  return {
    game: cast.game, revision: cast.revision, updatedAt: cast.updatedAt, slots: { boss: 1, subBosses: SUB_BOSS_SLOTS },
    factions: cast.factions,
    /** Each batch's Umas in ranking order, each with her faction and four slots. */
    tiers: UMA_TIERS.map((t) => ({ tier: t.id as UmaTier, umas: rows.filter((r) => r.tier === t.id) })),
    /** The same Umas by faction, in the factions' order, each faction's Umas in ranking order. */
    byFaction: cast.factions.map((f) => { const list = rows.filter((r) => r.faction === f.id); return { ...f, umas: list, ...filled(list) } }),
    outside,
    counts: {
      umas: rows.length, ...done, openBosses: rows.length - done.bosses, openSubBosses: rows.length * SUB_BOSS_SLOTS - done.subBosses,
      misfits: rows.flatMap((r) => [r.boss, ...r.subBosses]).filter((p) => p && !p.fits).length,
      available: { boss: castCandidates(catalog, states, cast, 'boss').length, subBoss: castCandidates(catalog, states, cast, 0).length },
    },
  }
}
export type CastPlan = ReturnType<typeof castPlan>
