import { buildMemoryRelease, createMemorySource, syntheticSpriteSet } from '@luismlorenzana/uma-data/testing'
import { createReleaseClient } from '@luismlorenzana/uma-data'
import { describe, expect, it } from 'vitest'
import { loadSpriteSet } from './loader.js'

describe('loading a sprite set (Q6)', () => {
  // A release in memory holding the synthetic set and its page's bytes (no network, no art).
  async function release() {
    const set = syntheticSpriteSet()
    const mem = await buildMemoryRelease(undefined, { sprites: [set], extraFiles: { [set.pages[0]!.path]: new Uint8Array([82, 73, 70, 70, 1, 2, 3]) } })
    return createReleaseClient({ source: createMemorySource(mem.objects) })
  }
  it('loads a set by outfit id from a release, with its pages decoded', async () => {
    const client = await release()
    const manifest = await client.manifest()
    const art = (await client.art(manifest))!
    const id = syntheticSpriteSet().outfitId
    const loaded = await loadSpriteSet(client, manifest, art, id, async (bytes, type) => ({ size: bytes.byteLength, type }))
    expect(loaded?.set.outfitId).toBe(id)
    expect(loaded?.pages).toHaveLength(loaded!.set.pages.length)
    expect(loaded?.pages[0]?.type).toBe('image/webp')
    expect(Object.values(loaded!.bytes).every((n) => n > 0)).toBe(true)
  })
  it("answers null for an outfit the release has no set for", async () => {
    const client = await release()
    const manifest = await client.manifest()
    const art = (await client.art(manifest))!
    expect(await loadSpriteSet(client, manifest, art, 1, async () => null)).toBeNull()
  })
})
