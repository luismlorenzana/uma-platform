import { mkdtemp, readdir, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { DATASET_NAMES, GAMETORA_MANIFEST_URL, loadGameToraData, type FetchJson } from './gametora'

const tempDirs: string[] = []

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((path) => rm(path, { recursive: true, force: true })))
})

function fakeGameTora(version: string) {
  const calls: string[] = []
  const manifest = Object.fromEntries(DATASET_NAMES.map((name) => [name, `${version}-${name}`]))
  const fetcher: FetchJson = async (url) => {
    calls.push(url)
    return { ok: true, status: 200, json: async () => (url === GAMETORA_MANIFEST_URL ? manifest : [{ source: url }]) }
  }
  return { calls, fetcher }
}

async function cacheDir(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'uma-platform-gametora-'))
  tempDirs.push(dir)
  return dir
}

describe('loadGameToraData', () => {
  it('caches each dataset by version and downloads again only for a new version or --refresh', async () => {
    const dir = await cacheDir()
    const first = fakeGameTora('a')
    const loaded = await loadGameToraData({ cacheDir: dir, fetcher: first.fetcher })
    expect(loaded.versions.skills).toBe('a-skills')
    expect(loaded.cacheHits).toEqual([])
    expect(first.calls).toHaveLength(DATASET_NAMES.length + 1)

    first.calls.length = 0
    expect((await loadGameToraData({ cacheDir: dir, fetcher: first.fetcher })).cacheHits).toHaveLength(DATASET_NAMES.length)
    expect(first.calls).toEqual([GAMETORA_MANIFEST_URL])

    first.calls.length = 0
    await loadGameToraData({ cacheDir: dir, fetcher: first.fetcher, refresh: true })
    expect(first.calls).toHaveLength(DATASET_NAMES.length + 1)

    const second = fakeGameTora('b')
    const updated = await loadGameToraData({ cacheDir: dir, fetcher: second.fetcher })
    expect(updated.datasets.skills).toEqual([{ source: expect.stringContaining('skills.b-skills.json') }])
    // Older versions are pruned so the cache holds one copy per dataset.
    expect((await readdir(dir)).filter((name) => name.startsWith('skills.'))).toEqual(['skills.b-skills.json'])
  })

  it('works offline from the cached manifest and fails clearly without one', async () => {
    const dir = await cacheDir()
    const offlineFetcher: FetchJson = async () => {
      throw new Error('network used offline')
    }
    await expect(loadGameToraData({ cacheDir: dir, offline: true, fetcher: offlineFetcher })).rejects.toThrow(
      'No cached GameTora manifest',
    )
    await loadGameToraData({ cacheDir: dir, fetcher: fakeGameTora('a').fetcher })
    const offline = await loadGameToraData({ cacheDir: dir, offline: true, fetcher: offlineFetcher })
    expect(offline.cacheHits).toHaveLength(DATASET_NAMES.length)
  })

  it('rejects unsafe dataset versions', async () => {
    const fetcher: FetchJson = async () => ({ ok: true, status: 200, json: async () => ({ skills: '../escape' }) })
    await expect(loadGameToraData({ cacheDir: await cacheDir(), fetcher })).rejects.toThrow('invalid version')
  })
})
