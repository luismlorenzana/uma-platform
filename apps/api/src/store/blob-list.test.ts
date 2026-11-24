import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { BucketBlobStore, DirectoryBlobStore } from './blob-store'

describe('catalog-only listings', () => {
  it('asks Cloud Storage for index names and pagination tokens, without image metadata', async () => {
    let requested: { prefix: string; fields: string; matchGlob?: string } | undefined
    const store = new BucketBlobStore('invented', 'art/', async () => ({
      file: () => { throw new Error('No object contents should be read') },
      getFiles: async options => { requested = options; return [[{ name: 'art/universes/test/index.json' }, { name: 'art/universes/test/images/test.png' }]] },
    }))
    expect(await store.list('universes', { indexesOnly: true })).toEqual(['universes/test/index.json'])
    expect(requested).toEqual({ prefix: 'art/universes/', fields: 'items(name),nextPageToken', matchGlob: 'art/universes/**/index.json' })
    await store.list('universes')
    expect(requested?.matchGlob).toBeUndefined()
  })
  it('keeps local index filtering consistent without changing full listings', async () => {
    const root = await mkdtemp(join(tmpdir(), 'uma-catalog-'))
    try {
      await mkdir(join(root, 'universes/test'), { recursive: true })
      await writeFile(join(root, 'universes/test/index.json'), '{}')
      await writeFile(join(root, 'universes/test/test.png'), 'synthetic')
      const store = new DirectoryBlobStore(root)
      expect(await store.list('universes', { indexesOnly: true })).toEqual(['universes/test/index.json'])
      expect(await store.list('universes')).toHaveLength(2)
    } finally { await rm(root, { recursive: true, force: true }) }
  })
})
