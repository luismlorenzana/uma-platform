export type Profile = 'traveler' | 'townsfolk'
export interface Ranking { outfitId: number; characterId: number; tier: string; bucket: string }
export interface QueueOverride { schemaVersion: 1; traveler: number[]; townsfolk: number[]; townsfolkOutfits?: number[] }
const tiers = ['SS', 'A1', 'A2', 'B', 'F']
export const ways = ['front', 'pace', 'pace-late', 'late', 'late-end']
export function scope(rankings: Ranking[], profile: Profile, townsfolkOutfits: number[] = []): Ranking[] {
  const selected = rankings.filter(r => ['SS', 'A1', 'A2'].includes(r.tier))
  if (profile === 'traveler') return [...selected].sort((a, b) => tiers.indexOf(a.tier) - tiers.indexOf(b.tier))
  const selectedCharacters = new Set(selected.map(r => r.characterId)), seen = new Set<number>()
  const choices = new Map<number, Ranking>()
  if (!Array.isArray(townsfolkOutfits)) throw new Error('Invalid townsfolk outfit choices')
  for (const id of townsfolkOutfits) {
    const outfit = rankings.find(r => r.outfitId === id)
    if (!Number.isSafeInteger(id) || !outfit || selectedCharacters.has(outfit.characterId) || choices.has(outfit.characterId)) throw new Error('Townsfolk outfit choices must name one outfit per unselected character')
    choices.set(outfit.characterId, outfit)
  }
  return [...rankings].filter(r => !selectedCharacters.has(r.characterId)).sort((a, b) => tiers.indexOf(a.tier) - tiers.indexOf(b.tier)).filter(r => {
    if (seen.has(r.characterId)) return false
    seen.add(r.characterId); return true
  }).map(r => choices.get(r.characterId) ?? r)
}
export function queue(rankings: Ranking[], profile: Profile, override: number[] = [], townsfolkOutfits: number[] = []): Ranking[] {
  const rows = scope(rankings, profile, townsfolkOutfits), byId = new Map(rows.map(r => [r.outfitId, r]))
  if (new Set(override).size !== override.length || override.some(id => !byId.has(id))) throw new Error('Queue override contains duplicate or out-of-scope outfits')
  const pinned = new Set(override)
  return [...override.map(id => byId.get(id)!), ...rows.filter(r => !pinned.has(r.outfitId))]
}
export function nextBatch(rows: Ranking[], profile: Profile, completed: ReadonlySet<number>, pilotComplete = false): Ranking[] {
  const pending = rows.filter(r => !completed.has(r.outfitId))
  if (profile === 'townsfolk') return pending.slice(0, pilotComplete ? 10 : 3)
  const usedWays = new Set<string>(), characters = new Set<number>(), batch: Ranking[] = []
  for (const r of pending) {
    if (usedWays.has(r.bucket) || characters.has(r.characterId)) continue
    batch.push(r); usedWays.add(r.bucket); characters.add(r.characterId)
    if (batch.length === 5) break
  }
  return batch
}
export function stage(input: { key: boolean; drawn: boolean; verified: boolean; approved: boolean; published?: boolean; inGame?: boolean; started: boolean; changed?: boolean }): string {
  if (input.changed) return 'Changed since approval'
  if (input.inGame) return 'In a game'
  if (input.published) return 'Published'
  if (input.approved && input.verified) return 'Set approved'
  if (input.verified) return 'Set gate'
  if (input.drawn) return 'Drawn'
  if (input.key) return 'Key approved'
  return input.started ? 'Key gate' : 'Queued'
}
