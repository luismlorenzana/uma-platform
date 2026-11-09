// Legacy: the old enemy board's format (P113). The tier boards read it once, to seed themselves, and never write it.
export const ENEMY_TIERS = [
  { id: 'SS', label: 'First pass', description: 'Start authoring here.' },
  { id: 'A1', label: 'Next wave', description: 'Follow the first cast.' },
  { id: 'A2', label: 'Later wave', description: 'Build after the next wave.' },
  { id: 'B', label: 'Alternatives', description: 'Keep as a good alternative.' },
  { id: 'F', label: 'On file', description: 'Unlikely to author.' },
] as const
export const ENEMY_BUCKETS = [
  { id: 'regular', label: 'Regular', description: 'The everyday encounters.' },
  { id: 'elite', label: 'Elite', description: 'Distinctive threats and lieutenants.' },
  { id: 'boss', label: 'Boss', description: 'The centrepiece of a battle.' },
] as const
export const FRANCHISES = [{ id: 'azurlane', label: 'Azur Lane' }, { id: 'nikke', label: 'NIKKE' }] as const
export type EnemyTier = typeof ENEMY_TIERS[number]['id']
export type EnemyBucket = typeof ENEMY_BUCKETS[number]['id']
export type Franchise = typeof FRANCHISES[number]['id']
export type EnemyImage = 'face' | 'art' | 'splash'
export interface Enemy {
  id: string
  name: string
  franchise: Franchise
  sourceTier: 'regular' | 'key' | 'subboss' | 'boss'
  defaultBucket: EnemyBucket
  studyAvailable: boolean
  images: Partial<Record<EnemyImage, string>>
}
export interface EnemyCatalog { schemaVersion: 1; sourceVersion: string; sources: string[]; importedAt: string; units: Enemy[] }
export interface EnemyRanking { enemyId: string; bucket: EnemyBucket; tier: EnemyTier | null; note: string }
export interface EnemyRankings { schemaVersion: 1; kind: 'enemy-authoring-plan'; revision: number; updatedAt: string | null; rankings: EnemyRanking[] }
export const emptyEnemyRankings = (): EnemyRankings => ({ schemaVersion: 1, kind: 'enemy-authoring-plan', revision: 0, updatedAt: null, rankings: [] })
const object = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)
const idPattern = /^[a-z0-9][a-z0-9-]{0,99}$/
const bucket = (v: unknown): v is EnemyBucket => ENEMY_BUCKETS.some(b => b.id === v)
const tier = (v: unknown): v is EnemyTier => ENEMY_TIERS.some(t => t.id === v)

export function parseEnemyCatalog(value: unknown): EnemyCatalog {
  if (!object(value) || value.schemaVersion !== 1 || typeof value.sourceVersion !== 'string' ||
      !Array.isArray(value.sources) || !value.sources.every(s => typeof s === 'string') ||
      typeof value.importedAt !== 'string' || !Array.isArray(value.units)) throw new Error('Invalid private enemy catalog.')
  const seen = new Set<string>()
  const units = value.units.map((u: unknown): Enemy => {
    if (!object(u) || typeof u.id !== 'string' || !idPattern.test(u.id) || seen.has(u.id) ||
        typeof u.name !== 'string' || !u.name.trim() || !FRANCHISES.some(f => f.id === u.franchise) ||
        !['regular', 'key', 'subboss', 'boss'].includes(String(u.sourceTier)) || !bucket(u.defaultBucket) ||
        typeof u.studyAvailable !== 'boolean' || !object(u.images)) throw new Error('Invalid or duplicate enemy entry.')
    seen.add(u.id)
    const images: Enemy['images'] = {}
    for (const kind of ['face', 'art', 'splash'] as const) {
      const path = u.images[kind]
      if (path === undefined) continue
      // Only original release images: never permit an authoring/custom image or arbitrary local path.
      if (typeof path !== 'string' || !path.startsWith(`assets/enemies/${u.id}-${kind}.`) ||
          !new RegExp(`^assets/enemies/[a-z0-9-]+-${kind}\\.[a-f0-9]{8}\\.webp$`).test(path)) throw new Error('Invalid enemy image path.')
      images[kind] = path
    }
    return { id: u.id, name: u.name, franchise: u.franchise as Franchise, sourceTier: u.sourceTier as Enemy['sourceTier'], defaultBucket: u.defaultBucket, studyAvailable: u.studyAvailable, images }
  })
  return { schemaVersion: 1, sourceVersion: value.sourceVersion, sources: value.sources as string[], importedAt: value.importedAt, units }
}

export function parseEnemyRankings(value: unknown): EnemyRankings {
  if (!object(value) || value.schemaVersion !== 1 || value.kind !== 'enemy-authoring-plan' ||
      !Number.isSafeInteger(value.revision) || Number(value.revision) < 0 ||
      !(value.updatedAt === null || typeof value.updatedAt === 'string' && Number.isFinite(Date.parse(value.updatedAt))) ||
      !Array.isArray(value.rankings) || value.rankings.length > 20_000) throw new Error('Expected an enemy authoring-plan JSON file (schemaVersion 1).')
  const seen = new Set<string>()
  const rankings = value.rankings.map((r: unknown): EnemyRanking => {
    if (!object(r) || typeof r.enemyId !== 'string' || !idPattern.test(r.enemyId) || seen.has(r.enemyId) ||
        !bucket(r.bucket) || !(r.tier === null || tier(r.tier)) || typeof r.note !== 'string' || r.note.length > 4000) throw new Error('Each enemy needs a unique ID, bucket, valid tier (or null), and a note of at most 4,000 characters.')
    seen.add(r.enemyId)
    return { enemyId: r.enemyId, bucket: r.bucket, tier: r.tier, note: r.note }
  })
  return { schemaVersion: 1, kind: 'enemy-authoring-plan', revision: Number(value.revision), updatedAt: value.updatedAt as string | null, rankings }
}

export function enemyAssignment(enemy: Enemy, state: EnemyRankings): EnemyRanking {
  return state.rankings.find(r => r.enemyId === enemy.id) ?? { enemyId: enemy.id, bucket: enemy.defaultBucket, tier: null, note: '' }
}

/** Array order is the owner's order within each tier, independent of filters and source IDs. */
export function orderedEnemies(state: EnemyRankings): EnemyRanking[] {
  return ENEMY_TIERS.flatMap(t => state.rankings.filter(r => r.tier === t.id))
}

export function moveEnemy(state: EnemyRankings, enemyId: string, direction: -1 | 1): EnemyRankings {
  const index = state.rankings.findIndex(r => r.enemyId === enemyId)
  const current = state.rankings[index]
  if (!current?.tier) return state
  const peers = state.rankings.flatMap((r, i) => r.tier === current.tier ? [i] : [])
  const other = peers[peers.indexOf(index) + direction]
  if (other === undefined) return state
  const rankings = [...state.rankings]
  rankings[index] = state.rankings[other]!
  rankings[other] = current
  return { ...state, rankings }
}

export function exportEnemyPlan(catalog: EnemyCatalog, state: EnemyRankings) {
  const byId = new Map(catalog.units.map(u => [u.id, u]))
  const queue = orderedEnemies(state).flatMap(r => {
    const u = byId.get(r.enemyId)
    return u ? [{ id: u.id, name: u.name, franchise: u.franchise, bucket: r.bucket, tier: r.tier, note: r.note, studyAvailable: u.studyAvailable }] : []
  }).map((r, i) => ({ order: i + 1, ...r }))
  const orders = new Map(queue.map(r => [r.id, r.order]))
  const enemies = catalog.units.map(u => {
    const r = enemyAssignment(u, state)
    return { ...u, bucket: r.bucket, tier: r.tier, order: orders.get(u.id) ?? null, note: r.note }
  })
  return {
    ...state, catalogVersion: catalog.sourceVersion, sources: catalog.sources, referenceRoot: 'authoring/enemies',
    tierOrder: ENEMY_TIERS.map(t => t.id), buckets: ENEMY_BUCKETS.map(b => b.id),
    summary: { total: enemies.length, ranked: queue.length, unranked: enemies.length - queue.length,
      franchises: Object.fromEntries(FRANCHISES.map(f => [f.id, enemies.filter(e => e.franchise === f.id).length])),
      tiers: Object.fromEntries(ENEMY_TIERS.map(t => [t.id, queue.filter(e => e.tier === t.id).length])) },
    authoringOrder: queue, enemies,
  }
}
