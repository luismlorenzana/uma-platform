// The Uma outfit catalog and the old outfit roster's format. The roster is frozen (P114): the sprite queue reads it; the tier boards seed from it.
import type { AptitudeGrade } from '@luismlorenzana/uma-data'

export const TIERS = [
  { id: 'SS', label: 'First pass', description: 'The baseline cast. Start authoring here.' },
  { id: 'A1', label: 'First variants', description: 'Mostly variants of the baseline cast.' },
  { id: 'A2', label: 'More variants', description: 'A second wave of baseline variants.' },
  { id: 'B', label: 'Good alternatives', description: 'Other acceptable characters.' },
  { id: 'F', label: 'Unlikely to author', description: 'Keep on file; unlikely to author.' },
] as const
export type Tier = typeof TIERS[number]['id']
export const BUCKETS = [
  { id: 'front', label: 'Front / Front + Pace', short: 'Front', calling: 'Warrior', rule: 'Front among the best styles wins every tie.' },
  { id: 'pace', label: 'Pure Pace', short: 'Pace', calling: 'Spellblade', rule: 'Pace is the only style at the highest grade.' },
  { id: 'pace-late', label: 'Pace + Late', short: 'Pace + Late', calling: 'Mage', rule: 'Pace tied with Late or End, with no Front.' },
  { id: 'late', label: 'Pure Late', short: 'Late', calling: 'Healer', rule: 'Late is the only style at the highest grade.' },
  { id: 'late-end', label: 'Late + End', short: 'Late + End', calling: 'Summoner', rule: 'End alone or tied with Late, with no Front or Pace.' },
] as const
export type Bucket = typeof BUCKETS[number]['id']
export const STYLES = ['front', 'pace', 'late', 'end'] as const
export type Strategy = Record<typeof STYLES[number], AptitudeGrade>
const GRADES: readonly AptitudeGrade[] = ['S', 'A', 'B', 'C', 'D', 'E', 'F', 'G']

export function bestStyles(strategy: Strategy): (typeof STYLES[number])[] {
  const top = Math.min(...STYLES.map((style) => GRADES.indexOf(strategy[style])))
  return STYLES.filter((style) => GRADES.indexOf(strategy[style]) === top)
}

/** Local planning adapter of uma-rpg Classes v3 §5 / CV19. Never part of neutral master data. */
export function bucketOf(strategy: Strategy): Bucket {
  const best = bestStyles(strategy)
  if (best.includes('front')) return 'front'
  if (best.includes('pace')) return best.length === 1 ? 'pace' : 'pace-late'
  return best.includes('end') ? 'late-end' : 'late'
}

export interface Uma {
  id: number
  characterId: number
  name: string
  title: string
  original: boolean
  strategy: Strategy
  bucket: Bucket
  references?: { label: string; path: string }[]
  portrait: string | null
  face: string | null
}
export interface Catalog { release: string; umas: Uma[] }
export interface Ranking { outfitId: number; characterId: number; tier: Tier; bucket: Bucket }
export interface Rankings {
  schemaVersion: 1
  revision: number
  updatedAt: string | null
  rankings: Ranking[]
}

export const emptyRankings = (): Rankings => ({ schemaVersion: 1, revision: 0, updatedAt: null, rankings: [] })
const object = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value)

/** Reject a malformed import before changing anything; unknown outfit IDs survive release changes. */
export function parseRankings(value: unknown): Rankings {
  if (!object(value) || value.schemaVersion !== 1 || !Number.isSafeInteger(value.revision) || Number(value.revision) < 0 ||
      !(value.updatedAt === null || (typeof value.updatedAt === 'string' && Number.isFinite(Date.parse(value.updatedAt)))) ||
      !Array.isArray(value.rankings)) throw new Error('Expected a sprite ranking JSON file (schemaVersion 1).')
  const seen = new Set<number>()
  const rankings = value.rankings.map((row: unknown): Ranking => {
    if (!object(row) || !Number.isSafeInteger(row.outfitId) || Number(row.outfitId) <= 0 ||
        !Number.isSafeInteger(row.characterId) || Number(row.characterId) <= 0 ||
        !TIERS.some((tier) => tier.id === row.tier) || !BUCKETS.some((bucket) => bucket.id === row.bucket)) {
      throw new Error('Each ranking needs positive outfitId and characterId, a valid tier, and a valid bucket.')
    }
    const outfitId = Number(row.outfitId)
    if (seen.has(outfitId)) throw new Error(`Duplicate ranking for outfit ${outfitId}.`)
    seen.add(outfitId)
    return { outfitId, characterId: Number(row.characterId), tier: row.tier as Tier, bucket: row.bucket as Bucket }
  })
  return { schemaVersion: 1, revision: Number(value.revision), updatedAt: value.updatedAt as string | null, rankings }
}

export function reconcileRankings(state: Rankings, umas: readonly Uma[]): Rankings {
  const byId = new Map(umas.map((uma) => [uma.id, uma]))
  return { ...state, rankings: state.rankings.map((row) => {
    const uma = byId.get(row.outfitId)
    return uma ? { ...row, characterId: uma.characterId, bucket: uma.bucket } : row
  }) }
}
