// Moving the old boards onto the Ranker (P131): the per-character Playable Umas board becomes the per-outfit board, its
// picks become profiles, and a board that has never been saved starts from the old rosters (P113).
import {
  BOARDS, emptyBoard, isTier, isWay, LEGACY_TIER, UMA_TIERS,
  type BoardId, type BoardState, type BoardStates, type Tier, type TierCatalog, type TierEntry, type Way,
} from './model.js'
import { defaultOutfit, type UmaProfiles } from './profiles.js'
import type { LegacyHints } from './catalog.js'

const object = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)

/** The per-character Playable Umas board before P131 (schema 1): a card a character, SSS to F, with her picks. */
export interface LegacyUmasBoard {
  revision: number
  updatedAt: string | null
  entries: { id: string; tier: Tier | null; note: string; way?: Way; outfit?: number }[]
}
export function parseLegacyUmasBoard(value: unknown): LegacyUmasBoard {
  if (!object(value) || value.schemaVersion !== 1 || value.kind !== 'tier-board' || value.board !== 'umas' || !Number.isSafeInteger(value.revision) || !Array.isArray(value.entries)) {
    throw new Error('Expected the old per-character Playable Umas board (schemaVersion 1).')
  }
  return {
    revision: Number(value.revision), updatedAt: typeof value.updatedAt === 'string' ? value.updatedAt : null,
    entries: value.entries.map((e: unknown) => {
      if (!object(e) || typeof e.id !== 'string' || !(e.tier === null || isTier(e.tier)) || typeof e.note !== 'string' ||
          (e.way !== undefined && !isWay(e.way)) || (e.outfit !== undefined && !Number.isSafeInteger(e.outfit))) throw new Error('Invalid old Playable Umas entry.')
      return { id: e.id, tier: e.tier as Tier | null, note: e.note, ...(e.way !== undefined ? { way: e.way as Way } : {}), ...(e.outfit !== undefined ? { outfit: Number(e.outfit) } : {}) }
    }),
  }
}

/** Her picks (default outfit, P125; playstyle, P117) move to the profiles, which every board reads. */
export function profilesFromLegacy(old: LegacyUmasBoard, profiles: UmaProfiles): UmaProfiles {
  const characters = { ...profiles.characters }
  for (const e of old.entries) {
    if (e.outfit === undefined && e.way === undefined) continue
    characters[e.id] = { ...(e.outfit !== undefined ? { defaultOutfit: e.outfit } : {}), ...(e.way !== undefined ? { way: e.way } : {}), ...characters[e.id] }
  }
  return { ...profiles, characters }
}

/** The old per-character tiers, as the cards' hints, in the old board's order (SSS first). */
export function legacyCharacterTiers(old: LegacyUmasBoard): LegacyHints['characters'] {
  const order: readonly string[] = ['SSS', 'SS', 'S', 'A', 'B', 'F']
  return order.flatMap((t) => old.entries.filter((e) => e.tier === t && /^[1-9][0-9]*$/.test(e.id)).map((e) => ({ characterId: Number(e.id), tier: e.tier as Tier })))
}

/**
 * The first per-outfit board (P131): the old cast (SSS, SS, S and A), in its order, each character as her default outfit,
 * spread evenly over the ten tiers, so every tier starts as a batch of about the same size. Her note moves with her. Her
 * other outfits, the sisters' and the old B and F start unranked (B, F and unranked stay Uma NPCs), each card showing its
 * old tiers as hints.
 */
export function migrateUmasBoard(catalog: TierCatalog, old: LegacyUmasBoard, profiles: UmaProfiles, updatedAt: string): BoardState {
  const umas = new Map(catalog.umas.map((u) => [u.id, u]))
  const cast = (['SSS', 'SS', 'S', 'A'] as const).flatMap((t) => old.entries.filter((e) => e.tier === t && umas.has(e.id)))
  const entries: TierEntry[] = cast.map((e, i) => {
    const outfit = defaultOutfit(umas.get(e.id)!, profiles)!
    return { id: String(outfit.id), tier: UMA_TIERS[Math.floor((i * UMA_TIERS.length) / cast.length)]!.id, note: e.note }
  })
  return { ...emptyBoard('umas'), revision: 1, updatedAt, entries }
}

/**
 * The first state of every board that has never been saved (P113): enemies keep their tier and note on the board their
 * old role points to: Azur Lane bosses on theirs, other Azur Lane elites on Key, Azur Lane regulars and every NIKKE unit
 * on Regular. Playable Umas, Uma NPCs and the imported boards start empty.
 */
export function seedBoards(catalog: TierCatalog, legacy: Pick<LegacyHints, 'enemies'>): BoardStates {
  const states = Object.fromEntries(BOARDS.map((b) => [b.id, emptyBoard(b.id)])) as BoardStates
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
