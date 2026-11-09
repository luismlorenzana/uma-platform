import { describe, expect, it } from 'vitest'
import { emptyEnemyRankings, exportEnemyPlan, moveEnemy, orderedEnemies, parseEnemyCatalog, parseEnemyRankings, type EnemyCatalog, type EnemyRanking } from './enemy-model.js'

export const syntheticEnemyCatalog: EnemyCatalog = {
  schemaVersion: 1, sourceVersion: 'synthetic-v1', sources: ['invented-pack'], importedAt: '2026-01-01T00:00:00Z',
  units: [
    { id: 'demo-amber', name: 'Amber Sentinel', franchise: 'azurlane', sourceTier: 'boss', defaultBucket: 'boss', studyAvailable: false, images: { art: 'assets/enemies/demo-amber-art.01234567.webp' } },
    { id: 'demo-cobalt', name: 'Cobalt Ranger', franchise: 'nikke', sourceTier: 'regular', defaultBucket: 'regular', studyAvailable: false, images: {} },
    { id: 'demo-fern', name: 'Fern Keeper', franchise: 'azurlane', sourceTier: 'key', defaultBucket: 'elite', studyAvailable: true, images: {} },
  ],
}
export const syntheticRanking: EnemyRanking = { enemyId: 'demo-amber', bucket: 'elite', tier: 'SS', note: 'Preserve the invented shield.' }
describe('enemy catalog boundaries', () => {
  it('accepts original release references and rejects private or escaped paths', () => {
    expect(parseEnemyCatalog(syntheticEnemyCatalog)).toEqual(syntheticEnemyCatalog)
    for (const path of ['../private.webp', 'assets/enemies/../custom.webp', 'custom/demo-amber.png', 'assets/enemies/different-art.01234567.webp']) {
      const unit = { ...syntheticEnemyCatalog.units[0]!, images: { art: path } }
      expect(() => parseEnemyCatalog({ ...syntheticEnemyCatalog, units: [unit] })).toThrow()
    }
  })
  it('rejects duplicate identities and invalid role suggestions', () => {
    expect(() => parseEnemyCatalog({ ...syntheticEnemyCatalog, units: [syntheticEnemyCatalog.units[0], syntheticEnemyCatalog.units[0]] })).toThrow()
    expect(() => parseEnemyCatalog({ ...syntheticEnemyCatalog, units: [{ ...syntheticEnemyCatalog.units[0], defaultBucket: 'unknown' }] })).toThrow()
  })
})
describe('portable enemy authoring plan', () => {
  it('exports every name and ID, leaves unranked entries null, and preserves source categories', () => {
    const state = { ...emptyEnemyRankings(), rankings: [syntheticRanking] }
    const plan = exportEnemyPlan(syntheticEnemyCatalog, state)
    expect(plan.enemies).toHaveLength(3)
    expect(plan.enemies[0]).toMatchObject({ id: 'demo-amber', name: 'Amber Sentinel', sourceTier: 'boss', bucket: 'elite', tier: 'SS', order: 1 })
    expect(plan.enemies[1]).toMatchObject({ id: 'demo-cobalt', name: 'Cobalt Ranger', bucket: 'regular', tier: null, order: null })
    expect(plan.summary).toMatchObject({ total: 3, ranked: 1, unranked: 2 })
    expect(parseEnemyRankings(JSON.parse(JSON.stringify(plan)) as unknown)).toEqual(state)
  })
  it('orders by priority, uses owner order within a tier, and moves only within that tier', () => {
    const amber = syntheticRanking, cobalt: EnemyRanking = { enemyId: 'demo-cobalt', tier: 'SS', bucket: 'regular', note: '' }, fern: EnemyRanking = { enemyId: 'demo-fern', tier: 'B', bucket: 'elite', note: '' }
    const state = { ...emptyEnemyRankings(), rankings: [fern, amber, cobalt] }
    expect(orderedEnemies(state).map(r => r.enemyId)).toEqual(['demo-amber', 'demo-cobalt', 'demo-fern'])
    const moved = moveEnemy(state, 'demo-cobalt', -1)
    expect(orderedEnemies(moved).map(r => r.enemyId)).toEqual(['demo-cobalt', 'demo-amber', 'demo-fern'])
    expect(moveEnemy(moved, 'demo-cobalt', -1)).toBe(moved)
    expect(exportEnemyPlan(syntheticEnemyCatalog, moved).authoringOrder.map(r => r.order)).toEqual([1, 2, 3])
  })
  it.each([
    { ...emptyEnemyRankings(), kind: 'uma-plan' }, { ...emptyEnemyRankings(), revision: -1 },
    { ...emptyEnemyRankings(), rankings: [syntheticRanking, syntheticRanking] },
    { ...emptyEnemyRankings(), rankings: [{ ...syntheticRanking, tier: 'bad' }] },
    { ...emptyEnemyRankings(), rankings: [{ ...syntheticRanking, bucket: 'bad' }] },
    { ...emptyEnemyRankings(), rankings: [{ ...syntheticRanking, enemyId: '../file' }] },
    { ...emptyEnemyRankings(), rankings: [{ ...syntheticRanking, note: 'x'.repeat(4001) }] },
  ])('rejects malformed imports before saving', value => { expect(() => parseEnemyRankings(value)).toThrow() })
})
