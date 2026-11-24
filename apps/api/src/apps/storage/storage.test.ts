import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { BucketBlobStore, DirectoryBlobStore } from '../../store/blob-store'
import { parseReport, type StorageReport, type Usage } from './report'
import { StorageService } from './storage.service'

const value = (bytes: number): Usage => ({ liveBytes: bytes, liveObjects: 1, noncurrentBytes: 0, noncurrentObjects: 0, softDeletedBytes: 0, softDeletedObjects: 0 })
function sample(): StorageReport {
  const buckets = Array.from({ length: 6 }, (_, id) => ({ name: `invented-${id}`, project: 'test', location: 'TEST', storageClass: 'STANDARD', versioned: false, softDeleteDays: 7,
    lifecycleRuleCount: 0, usage: value(1), repeatedLiveBytes: 0, deltaBytes: null }))
  return { schemaVersion: 1, generatedAt: '2026-01-01T00:00:00Z', automaticUpdates: false, previousGeneratedAt: null, totals: { ...value(6), liveObjects: 6 }, buckets,
    groups: buckets.map(bucket => ({ id: bucket.name, bucket: bucket.name, world: 'shared', purpose: 'master-data', usage: value(1), deltaBytes: null })), history: [], deltaBytes: null }
}
describe('storage snapshots', () => {
  const snapshot = 'snapshots/2026-01-01T00-00-00.000Z.aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee.json'
  it('reads a published timestamp filename through the local store', async () => {
    const root = await mkdtemp(join(tmpdir(), 'uma-storage-report-'))
    try {
      await mkdir(join(root, 'snapshots'))
      await writeFile(join(root, snapshot), JSON.stringify(sample()))
      const store = new DirectoryBlobStore(root)
      expect(await new StorageService(store).report()).toEqual(sample())
      await expect(store.read('snapshots/../private.json')).rejects.toThrow('Unsafe store path')
    } finally { await rm(root, { recursive: true, force: true }) }
  })
  it('preserves the published timestamp case when reading its exact cloud generation', async () => {
    const store = new BucketBlobStore('invented', 'reports/storage/', async () => ({
      getFiles: async () => [[{ name: `reports/storage/${snapshot}` }]],
      file: (path, options) => {
        expect(path).toBe(`reports/storage/${snapshot}`)
        return {
          metadata: {},
          getMetadata: async () => [{ generation: '123' }],
          download: async () => {
            expect(options).toEqual({ generation: '123' })
            return [new TextEncoder().encode(JSON.stringify(sample()))]
          },
          save: async () => { throw new Error('The report reader must not write') },
        }
      },
    }))
    expect(await new StorageService(store).report()).toEqual(sample())
    await expect(store.read('snapshots/../private.json')).rejects.toThrow('Unsafe store path')
  })
  it('serves aggregate fields only and rejects incomplete or inconsistent totals', () => {
    expect(parseReport({ ...sample(), objectPaths: ['private-test.png'] })).not.toHaveProperty('objectPaths')
    expect(() => parseReport({ ...sample(), buckets: [] })).toThrow('Incomplete')
    expect(() => parseReport({ ...sample(), totals: value(10) })).toThrow('totals')
    expect(() => parseReport({ ...sample(), totals: { ...value(-1), liveObjects: 6 } })).toThrow('count')
    const invalid = sample(); invalid.groups[0]!.usage = value(2)
    expect(() => parseReport(invalid)).toThrow('groups')
  })
  it('uses only the latest valid snapshot path, shares reads and supports explicit refresh', async () => {
    let reads = 0
    const service = new StorageService({
      list: async () => ['snapshots/2026-01-01T00-00-00.000Z.abc.json', 'snapshots/2026-01-02T00-00-00.000Z.def.json', 'snapshots/../../private.json'],
      read: async path => { reads++; expect(path).toContain('2026-01-02'); return { bytes: new TextEncoder().encode(JSON.stringify(sample())), generation: '1' } },
    })
    await Promise.all([service.report(), service.report()])
    expect(reads).toBe(1)
    await service.report(true)
    expect(reads).toBe(2)
  })
  it('distinguishes an absent report from invalid data without exposing its contents', async () => {
    expect(await new StorageService({ list: async () => [], read: async () => null }).report()).toBeNull()
    const service = new StorageService({ list: async () => ['snapshots/2026-01-01T00-00-00.000Z.abc.json'], read: async () => ({ bytes: new TextEncoder().encode('private-test'), generation: '1' }) })
    await expect(service.report()).rejects.toThrow('could not be verified')
  })
})
