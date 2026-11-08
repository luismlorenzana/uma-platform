import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { emptyRankings } from './model.js'
import { ConflictError, RankingStore } from './store.js'

describe('disk persistence', () => {
  let directory: string
  let path: string
  beforeEach(async () => { directory = await mkdtemp(join(tmpdir(), 'uma-ranker-test-')); path = join(directory, 'rankings.json') })
  afterEach(async () => { await rm(directory, { recursive: true, force: true }) })
  const row = { outfitId: 70101, characterId: 701, tier: 'SS' as const, bucket: 'front' as const }

  it('survives a restart, moves a rank, and removes it', async () => {
    const store = new RankingStore(path, [])
    expect(await store.read()).toEqual(emptyRankings())
    const first = await store.save({ ...emptyRankings(), rankings: [row] })
    expect(first.revision).toBe(1)
    expect(first.updatedAt).toBeTypeOf('string')
    const restarted = new RankingStore(path, [])
    expect(await restarted.read()).toEqual(first)
    const moved = await restarted.save({ ...first, rankings: [{ ...row, tier: 'A2' }] })
    expect(moved.rankings[0]?.tier).toBe('A2')
    expect((await restarted.save({ ...moved, rankings: [] })).rankings).toEqual([])
  })
  it('serializes concurrent saves and refuses the stale revision', async () => {
    const store = new RankingStore(path, [])
    const results = await Promise.allSettled([
      store.save({ ...emptyRankings(), rankings: [row] }),
      store.save({ ...emptyRankings(), rankings: [{ ...row, tier: 'B' }] }),
    ])
    expect(results[0]?.status).toBe('fulfilled')
    expect(results[1]).toMatchObject({ status: 'rejected', reason: expect.any(ConflictError) })
    const saved = await store.read()
    expect(saved.rankings).toEqual([row])
    // A rejected write does not poison later saves.
    expect((await store.save({ ...saved, rankings: [] })).rankings).toEqual([])
  })
  it('never overwrites an unreadable or malformed file', async () => {
    await writeFile(path, '{bad JSON')
    const store = new RankingStore(path, [])
    await expect(store.read()).rejects.toThrow()
    await expect(store.save(emptyRankings())).rejects.toThrow()
    expect(await readFile(path, 'utf8')).toBe('{bad JSON')
  })
  it('rejects invalid imports without changing the saved file', async () => {
    const store = new RankingStore(path, [])
    await store.save({ ...emptyRankings(), rankings: [row] })
    const before = await readFile(path, 'utf8')
    expect(() => store.save({ ...emptyRankings(), rankings: [{ ...row, tier: 'X' }] })).toThrow()
    expect(await readFile(path, 'utf8')).toBe(before)
  })
})
