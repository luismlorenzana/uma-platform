import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { emptyBoard, emptyCast, emptyProfiles, type TierCatalog, type UmaCharacter } from '@uma-platform/tiers'
import { afterAll, describe, expect, it } from 'vitest'
import { ABSENT, DirectoryBlobStore } from '../../store/blob-store'
import { RankerConflict, RankerInvalid, RankerStore } from './ranker.store'

// Invented records only.
const look = (id: number) => ({ id, title: `Look ${id}`, original: id % 100 === 1, way: 'front' as const, strategy: { front: 'A', pace: 'B', late: 'B', end: 'C' }, face: null, portrait: null, before: null })
const runner = (id: string, outfits: number[]): UmaCharacter => ({ id, name: `Runner ${id}`, face: null, portrait: null, before: null, outfits: outfits.map(look) })
const catalog: TierCatalog = {
  release: 'synthetic', umas: [runner('701', [70101, 70102]), runner('702', [70201])],
  enemies: [{ id: 'al-a', name: 'Foe al-a', franchise: 'azurlane', category: 'boss', studyAvailable: false, images: {}, details: [], before: null },
    { id: 'gi-1', name: 'Foe gi-1', franchise: 'genshin', category: 'playable', studyAvailable: false, images: {}, details: [], before: null }],
}
const dirs: string[] = []
afterAll(async () => { for (const d of dirs) await rm(d, { recursive: true, force: true }) })
const fresh = async () => { const dir = await mkdtemp(join(tmpdir(), 'ranker-')); dirs.push(dir); return { dir, blobs: new DirectoryBlobStore(dir) } }
const at = new Date('2026-11-11T12:00:00.000Z')

describe('the blob store', () => {
  it('writes only over the generation it read, and refuses unsafe paths', async () => {
    const { blobs } = await fresh()
    expect(await blobs.read('boards/umas.json')).toBeNull()
    const first = await blobs.write('boards/umas.json', new TextEncoder().encode('{}'), ABSENT)
    expect(first).toEqual(expect.any(String))
    expect(await blobs.write('boards/umas.json', new TextEncoder().encode('{"a":1}'), ABSENT)).toBeNull()
    expect(await blobs.write('boards/umas.json', new TextEncoder().encode('{"a":1}'), first!)).not.toBeNull()
    expect(await blobs.list('boards')).toEqual(['boards/umas.json'])
    await expect(blobs.read('../outside.json')).rejects.toThrow(/Unsafe/)
    await expect(blobs.read('boards/UMAS.json')).rejects.toThrow(/Unsafe/)
  })
})

describe('the Ranker store', () => {
  it('starts every board empty, saves from a revision, and refuses a stale one', async () => {
    const { blobs } = await fresh(), store = new RankerStore(blobs, () => at)
    const empty = (await store.board('umas')).state
    expect(empty).toEqual(emptyBoard('umas'))
    const saved = await store.saveBoard('umas', { ...empty, entries: [{ id: '70102', tier: 'T1', note: 'first' }] }, catalog)
    expect(saved).toMatchObject({ revision: 1, updatedAt: at.toISOString(), entries: [{ id: '70102', tier: 'T1', note: 'first' }] })
    await expect(store.saveBoard('umas', { ...empty, entries: [] }, catalog)).rejects.toBeInstanceOf(RankerConflict)
    await expect(store.saveBoard('umas', { ...empty, entries: [] }, catalog)).rejects.toMatchObject({ current: { revision: 1 } })
    expect((await store.saveBoard('umas', { ...saved, entries: [] }, catalog)).revision).toBe(2)
  })
  it('refuses what a board doesn’t rank, and a malformed board', async () => {
    const { blobs } = await fresh(), store = new RankerStore(blobs, () => at)
    await expect(store.saveBoard('umas', { ...emptyBoard('umas'), entries: [{ id: '99901', tier: 'T1', note: '' }] }, catalog)).rejects.toBeInstanceOf(RankerInvalid)
    await expect(store.saveBoard('npcs', { ...emptyBoard('npcs'), entries: [{ id: '70101', tier: 'S', note: '' }] }, catalog)).rejects.toBeInstanceOf(RankerInvalid)
    await expect(store.saveBoard('umas', { ...emptyBoard('umas'), entries: [{ id: '70101', tier: 'SS', note: '' }] }, catalog)).rejects.toThrow(/T1 to T10/)
    await expect(store.saveBoard('azurlane-bosses', { ...emptyBoard('azurlane-bosses'), out: ['gi-1'] }, catalog)).rejects.toThrow(/own units/)
    await expect(store.saveBoard('genshin-bosses', { ...emptyBoard('genshin-bosses'), out: ['al-a'] }, catalog)).rejects.toThrow(/own units/)
    expect((await store.saveBoard('genshin-bosses', { ...emptyBoard('genshin-bosses'), out: ['gi-1'] }, catalog)).out).toEqual(['gi-1'])
  })
  it('saves profiles from a revision, checks them against the catalog, and writes the plan', async () => {
    const { dir, blobs } = await fresh(), store = new RankerStore(blobs, () => at)
    const sisters = [{ outfitId: 70102, characterId: 701, name: 'Sister 701', relation: 'twin', age: 'an invented age', profile: 'Invented.' }]
    await expect(store.saveProfiles({ ...emptyProfiles(), sisters: [{ ...sisters[0], characterId: 702 }] }, catalog)).rejects.toThrow(/not one of/)
    const profiles = await store.saveProfiles({ ...emptyProfiles(), sisters }, catalog)
    expect(profiles.revision).toBe(1)
    await expect(store.saveProfiles({ ...emptyProfiles(), sisters }, catalog)).rejects.toBeInstanceOf(RankerConflict)
    await store.saveBoard('umas', { ...emptyBoard('umas'), entries: [{ id: '70102', tier: 'T2', note: '' }] }, catalog)
    const plan = await store.writePlan(catalog)
    expect(plan.identities[0]).toMatchObject({ id: 's70102', name: 'Sister 701', batch: 2 })
    const written = JSON.parse(await readFile(join(dir, 'plan.json'), 'utf8')) as { schemaVersion: number; batches: { outfits: number[] }[] }
    expect(written).toMatchObject({ schemaVersion: 2 })
    expect(written.batches[1]!.outfits).toEqual([70102])
    // A second plan overwrites the first.
    expect((await store.writePlan(catalog)).generatedAt).toBe(at.toISOString())
  })
  it('reads an enemy board saved before P192 on SS, S and F, its A and B unranked', async () => {
    const { blobs } = await fresh(), store = new RankerStore(blobs, () => at)
    const old = { ...emptyBoard('azurlane-bosses'), revision: 4, members: ['al-a'], entries: [{ id: 'al-a', tier: 'A', note: 'kept' }, { id: 'gi-1', tier: 'B', note: '' }] }
    await blobs.write('boards/azurlane-bosses.json', new TextEncoder().encode(JSON.stringify(old)), ABSENT)
    expect((await store.board('azurlane-bosses')).state).toEqual({ ...emptyBoard('azurlane-bosses'), revision: 4, entries: [{ id: 'al-a', tier: null, note: 'kept' }] })
  })
  it('saves Uma Cyberpunk’s casting from a revision, refuses an unknown enemy or one cast twice, and puts it in the plan (P193)', async () => {
    const { blobs } = await fresh(), store = new RankerStore(blobs, () => at)
    const empty = (await store.cast('cyberpunk')).cast
    expect(empty).toEqual(emptyCast('cyberpunk'))
    const entry = { uma: '701', faction: 'f1', boss: 'al-a', subBosses: ['gi-1', null, null] }
    await expect(store.saveCast('cyberpunk', { ...empty, umas: [{ ...entry, boss: 'zz-9' }] }, catalog)).rejects.toThrow(/catalog/)
    await expect(store.saveCast('cyberpunk', { ...empty, umas: [{ ...entry, boss: 'gi-1' }] }, catalog)).rejects.toThrow(/cast once/)
    const saved = await store.saveCast('cyberpunk', { ...empty, umas: [entry] }, catalog)
    expect(saved).toMatchObject({ revision: 1, updatedAt: at.toISOString(), umas: [entry] })
    await expect(store.saveCast('cyberpunk', { ...empty, umas: [] }, catalog)).rejects.toBeInstanceOf(RankerConflict)
    await store.saveBoard('umas', { ...emptyBoard('umas'), entries: [{ id: '70101', tier: 'T1', note: '' }] }, catalog)
    const plan = await store.writePlan(catalog)
    expect(plan.enemyCasts.cyberpunk.tiers[0]).toMatchObject({ tier: 'T1', umas: [{ uma: '701', faction: 'f1', boss: { id: 'al-a', fits: false }, subBosses: [{ id: 'gi-1' }, null, null] }] })
  })
})
