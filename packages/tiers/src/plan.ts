// Who is on each board, and the plan every later tool reads: the Ranker's one output, rewritten on every save
// (`ranker/plan.json`, pulled to `content/authoring/tiers/plan.json`). Character Art follows its identities and batches
// (P131).
import {
  batchOf, BOARDS, BOSS_BOARDS, boardStats, careerMath, inCast, isUmaTier, leftOut, ordered, outfitIndex, PLAYABLE_TIERS, tierIdsOf, tierMap, TIERS, UMA_TIERS, WAYS,
  type AnyTier, type Board, type BoardId, type BoardStates, type BoardStats, type PoolMember, type TierCatalog, type UmaTier, type Way,
} from './model.js'
import { defaultOutfit, identities, identityByOutfit, outfitPick, ownOutfits, playstyleOf, type UmaIdentity, type UmaProfiles } from './profiles.js'

export type Pools = Record<BoardId, PoolMember[]>

/**
 * Every board's members in board order: its base, then the leftovers of the boards above it. Playable Umas is every
 * outfit; a character comes down to Uma NPCs when none of her own outfits is ranked there (a sister's outfit counts for
 * the sister, who has no NPC card).
 */
export function pools(catalog: TierCatalog, states: BoardStates, profiles: UmaProfiles): Pools {
  const al = catalog.enemies.filter((u) => u.franchise === 'azurlane'), members = new Set(states['azurlane-bosses'].members ?? [])
  // An imported board's base is its franchise's import, minus the units left out: those are on no board at all.
  const imported = (b: Board) => { const out = new Set(states[b.id].out ?? []); return catalog.enemies.filter((u) => u.franchise === b.franchise && !out.has(u.id)).map((u) => u.id) }
  const base = Object.fromEntries(BOARDS.map((b) => [b.id, b.franchise ? imported(b) : []])) as Record<BoardId, string[]>
  base.umas = catalog.umas.flatMap((u) => u.outfits.map((o) => String(o.id)))
  base['azurlane-bosses'] = al.filter((u) => members.has(u.id)).map((u) => u.id)
  base['key-enemies'] = al.filter((u) => !members.has(u.id)).map((u) => u.id)
  base['regular-enemies'] = catalog.enemies.filter((u) => u.franchise === 'nikke').map((u) => u.id)
  const result = {} as Pools
  for (const board of BOARDS) {
    const seen = new Set<string>(), list: PoolMember[] = []
    for (const id of base[board.id]) if (!seen.has(id)) { seen.add(id); list.push({ id, via: null, viaTier: null }) }
    for (const upstream of board.from) {
      const tiers = tierMap(states[upstream])
      if (upstream === 'umas') {
        for (const uma of catalog.umas) {
          const ranked = ownOutfits(uma, profiles).some((o) => inCast('umas', tiers.get(String(o.id))))
          if (!ranked && !seen.has(uma.id)) { seen.add(uma.id); list.push({ id: uma.id, via: 'umas', viaTier: null }) }
        }
        continue
      }
      for (const m of result[upstream]) {
        const tier = tiers.get(m.id) ?? null
        if (!inCast(upstream, tier) && !seen.has(m.id)) { seen.add(m.id); list.push({ id: m.id, via: upstream, viaTier: tier }) }
      }
    }
    result[board.id] = list
  }
  return result
}

export function allStats(catalog: TierCatalog, states: BoardStates, profiles: UmaProfiles, all = pools(catalog, states, profiles)): Record<BoardId, BoardStats> {
  return Object.fromEntries(BOARDS.map((b) => [b.id, boardStats(all[b.id], states[b.id])])) as Record<BoardId, BoardStats>
}

/** Each identity's place in the ranking: her best-ranked outfit's tier and position, or unranked. */
export interface RankedIdentity extends UmaIdentity {
  /** Her best outfit's tier on Playable Umas (a batch, or F when every ranked outfit of hers is F), or null. */
  tier: UmaTier | 'F' | null
  /** Her best outfit's position in the whole ranking, 1-based, or null. */
  order: number | null
  /** Her outfits in ranking order, then her unranked ones. */
  ranked: { outfitId: number; tier: UmaTier | 'F' | null; order: number | null }[]
}
/** Is an identity in one of the ten batches? */
export const inBatch = (i: Pick<RankedIdentity, 'tier'>): boolean => isUmaTier(i.tier)
/** Every identity in ranking order (T1 first, board order within a tier), then the unranked by name, then F (P133). */
export function rankedIdentities(catalog: TierCatalog, states: BoardStates, profiles: UmaProfiles): RankedIdentity[] {
  const pool = new Set(catalog.umas.flatMap((u) => u.outfits.map((o) => String(o.id))))
  const order = new Map(ordered(states.umas, pool).map((e, i) => [Number(e.id), { tier: e.tier as UmaTier | 'F', order: i + 1 }]))
  return identities(catalog, profiles).map((identity): RankedIdentity => {
    const ranked = identity.outfits.map((o) => ({ outfitId: o.id, tier: order.get(o.id)?.tier ?? null, order: order.get(o.id)?.order ?? null }))
      .sort((a, b) => (a.order ?? Infinity) - (b.order ?? Infinity) || a.outfitId - b.outfitId)
    return { ...identity, tier: ranked[0]?.tier ?? null, order: ranked[0]?.order ?? null, ranked }
  }).sort((a, b) => group(a) - group(b) || (a.order ?? 0) - (b.order ?? 0) || a.name.localeCompare(b.name) || a.id.localeCompare(b.id))
}
/** Batches first, then the unranked, then F. */
const group = (i: RankedIdentity): number => (inBatch(i) ? 0 : i.tier === null ? 1 : 2)

/** The plan every later tool reads (schema 2, P131). */
export function tierPlan(catalog: TierCatalog, states: BoardStates, profiles: UmaProfiles, generatedAt: string) {
  const all = pools(catalog, states, profiles), stats = allStats(catalog, states, profiles, all)
  const umas = new Map(catalog.umas.map((u) => [u.id, u])), enemies = new Map(catalog.enemies.map((u) => [u.id, u]))
  const outfits = outfitIndex(catalog), byOutfit = identityByOutfit(catalog, profiles)
  const describe = (board: BoardId, id: string) => {
    if (board === 'umas') {
      const found = outfits.get(Number(id)), identity = byOutfit.get(Number(id))
      return found && identity
        ? { name: identity.name, title: found.outfit.title, outfitId: found.outfit.id, characterId: Number(found.uma.id), identity: identity.id, sister: identity.sister !== null, playstyle: found.outfit.way }
        : { name: id }
    }
    const uma = umas.get(id)
    if (uma) {
      return { name: uma.name, characterId: Number(uma.id), playstyle: playstyleOf(uma, profiles), defaultOutfit: defaultOutfit(uma, profiles)?.id ?? null,
        outfitPicked: outfitPick(uma, profiles) !== null, outfits: ownOutfits(uma, profiles).map((o) => o.id) }
    }
    const unit = enemies.get(id)
    return unit ? { name: unit.name, franchise: unit.franchise, category: unit.category } : { name: id }
  }
  const ranked = rankedIdentities(catalog, states, profiles), careers = ranked.filter(inBatch).length
  return {
    schemaVersion: 2, kind: 'tier-plan', generatedAt, release: catalog.release, profilesRevision: profiles.revision,
    umaTiers: UMA_TIERS.map((t) => t.id), playableTiers: PLAYABLE_TIERS.map((t) => t.id), tierOrder: TIERS.map((t) => t.id),
    boards: BOARDS.map((b) => {
      const pool = all[b.id], ids = new Set(pool.map((m) => m.id)), via = new Map(pool.map((m) => [m.id, m]))
      const notes = new Map(states[b.id].entries.map((e) => [e.id, e.note]))
      const order = ordered(states[b.id], ids).map((e, i) => ({
        order: i + 1, id: e.id, tier: e.tier, ...(b.id === 'umas' && isUmaTier(e.tier) ? { batch: batchOf(e.tier) } : {}), note: e.note, via: via.get(e.id)?.via ?? null, ...describe(b.id, e.id),
      }))
      const done = new Set(order.map((e) => e.id))
      return {
        id: b.id, title: b.title, pool: b.pool, next: b.next, tiers: tierIdsOf(b.id), revision: states[b.id].revision, updatedAt: states[b.id].updatedAt, stats: stats[b.id],
        order, unranked: pool.filter((m) => !done.has(m.id)).map((m) => ({ id: m.id, note: notes.get(m.id) ?? '', via: m.via, ...describe(b.id, m.id) })),
        ...(b.franchise ? { leftOut: leftOut(states[b.id]).filter((id) => enemies.has(id)).map((id) => ({ id, ...describe(b.id, id) })) } : {}),
      }
    }),
    /** Every Uma identity in ranking order, then the unranked, then F: how Character Art lays out its album (P131, P133). */
    identities: ranked.map((i) => ({
      id: i.id, characterId: Number(i.characterId), name: i.name, sister: i.sister ? { relation: i.sister.relation, age: i.sister.age } : null,
      defaultOutfit: i.defaultOutfit, tier: i.tier, batch: isUmaTier(i.tier) ? batchOf(i.tier) : null, notUsed: i.tier === 'F', order: i.order, outfits: i.ranked,
    })),
    /** The ten art batches: each tier's outfits in order (P131). */
    batches: UMA_TIERS.map((t) => ({ batch: batchOf(t.id), tier: t.id, outfits: states.umas.entries.filter((e) => e.tier === t.id && outfits.has(Number(e.id))).map((e) => Number(e.id)) })),
    careers: careerMath(careers, BOSS_BOARDS.map((b) => stats[b])),
    playstyles: playstyleCounts(catalog, states, profiles),
  }
}
export type TierPlan = ReturnType<typeof tierPlan>

/** Playable Umas by outfit, and Uma NPCs by character, each tier by playstyle: counts for the plan. */
export function playstyleCounts(catalog: TierCatalog, states: BoardStates, profiles: UmaProfiles) {
  const all = pools(catalog, states, profiles), umas = new Map(catalog.umas.map((u) => [u.id, u])), outfits = outfitIndex(catalog)
  const grid = (board: BoardId) => Object.fromEntries([...tierIdsOf(board), 'unranked'].map((t) => [t, Object.fromEntries(WAYS.map((w) => [w.id, 0]))])) as Record<AnyTier | 'unranked', Record<Way, number>>
  const playable = grid('umas'), npcs = grid('npcs')
  const pt = tierMap(states.umas), nt = tierMap(states.npcs)
  for (const m of all.umas) { const o = outfits.get(Number(m.id)); if (o) playable[pt.get(m.id) ?? 'unranked']![o.outfit.way]++ }
  for (const m of all.npcs) { const u = umas.get(m.id); if (u) npcs[nt.get(m.id) ?? 'unranked']![playstyleOf(u, profiles)]++ }
  return { umas: playable, npcs }
}
