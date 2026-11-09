import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { emptyEnemyRankings } from './enemy-model.js'
import { EnemyRankingStore } from './enemy-store.js'
import { ConflictError } from './store.js'

describe('enemy decisions on disk', () => {
  let dir: string, path: string
  const catalog = { schemaVersion: 1 as const, sourceVersion: 'synthetic-v1', sources: [], importedAt: '2026-01-01', units: [{ id: 'demo-ranger', name: 'Invented Ranger', franchise: 'nikke' as const, sourceTier: 'boss' as const, defaultBucket: 'elite' as const, studyAvailable: false, images: {} }] }
  const row = { enemyId: 'demo-ranger', bucket: 'regular' as const, tier: 'SS' as const, note: 'Invented note' }
  beforeEach(async () => { dir = await mkdtemp(join(tmpdir(), 'enemy-ranker-')); path = join(dir, 'plan.json') })
  afterEach(async () => { await rm(dir, { recursive: true, force: true }) })
  it('survives restarts and writes the complete named plan as its canonical file', async () => {
    const store = new EnemyRankingStore(path, catalog)
    expect(await store.read()).toEqual(emptyEnemyRankings())
    const saved = await store.save({ ...emptyEnemyRankings(), rankings: [row] })
    expect(await new EnemyRankingStore(path, catalog).read()).toEqual(saved)
    const full = JSON.parse(await readFile(path, 'utf8')) as { enemies: { id: string; name: string }[]; authoringOrder: { id: string }[] }
    expect(full.enemies).toMatchObject([{ id: 'demo-ranger', name: 'Invented Ranger' }])
    expect(full.authoringOrder).toMatchObject([{ id: 'demo-ranger' }])
    expect((await store.save({ ...saved, rankings: [{ ...row, tier: null }] })).rankings[0]?.tier).toBeNull()
  })
  it('serializes simultaneous writes and recovers after a stale-write rejection', async () => {
    const store = new EnemyRankingStore(path, catalog)
    const results = await Promise.allSettled([store.save({ ...emptyEnemyRankings(), rankings: [row] }), store.save(emptyEnemyRankings())])
    expect(results[0]?.status).toBe('fulfilled')
    expect(results[1]).toMatchObject({ status: 'rejected', reason: expect.any(ConflictError) })
    const state = await store.read()
    expect(state.rankings).toEqual([row])
    expect((await store.save({ ...state, rankings: [] })).revision).toBe(2)
  })
  it('preserves malformed files and rejects unknown imported IDs without creating a file', async () => {
    const store = new EnemyRankingStore(path, catalog)
    expect(() => store.save({ ...emptyEnemyRankings(), rankings: [{ ...row, enemyId: 'unknown' }] })).toThrow()
    await writeFile(path, '{broken')
    await expect(store.save(emptyEnemyRankings())).rejects.toThrow()
    expect(await readFile(path, 'utf8')).toBe('{broken')
  })
})
