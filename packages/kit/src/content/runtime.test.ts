// Full synthetic releases and in-memory persistence; no private rows, browser saves or network.
import { createHash } from 'node:crypto'
import { buildMemoryRelease, syntheticArtIndex } from '@luismlorenzana/uma-data/testing'
import { describe, expect, it, vi } from 'vitest'
import { createContentRuntime, type ContentSnapshotStore } from './runtime.js'
import { releaseCacheKey, type ContentCache, type ContentClient } from './client.js'

const PAGE = 'atlases/outfit-icons-0.0123456789abcdef.webp'
const FACE = 'art/outfit-portraits/900101.fedcba9876543210.webp'
const bytes = (text: string) => new TextEncoder().encode(text)
async function fixture() {
  const release = await buildMemoryRelease(undefined, { art: syntheticArtIndex(PAGE, FACE), extraFiles: { [PAGE]: bytes('page'), [FACE]: bytes('face') } })
  const overlay = bytes('{"invented":true}'), sha256 = createHash('sha256').update(overlay).digest('hex')
  const file = { path: `overlays/invented.${sha256.slice(0, 16)}.json`, bytes: overlay.length, sha256 }
  const objects = new Map([...release.objects].map(([path, value]) => [`master/${path}`, value]))
  objects.set('content/overlay.json', bytes(JSON.stringify(file))); objects.set(`content/${file.path}`, overlay)
  const fetch = vi.fn(async (url: string) => { const value = objects.get(new URL(url).pathname.slice(5)); return value ? new Response(value as Uint8Array<ArrayBuffer>) : new Response('', { status: 404 }) })
  const stored = new Map<string, Uint8Array>()
  const cache: ContentCache = {
    match: async (key) => stored.has(key) ? new Response(stored.get(key)! as Uint8Array<ArrayBuffer>) : undefined,
    put: async (key, value) => { stored.set(key, new Uint8Array(await value.arrayBuffer())) },
  }
  let snapshot: string | null = null, n = 0
  const store: ContentSnapshotStore = { get: () => snapshot, set: (value) => { snapshot = value } }
  const revoke = vi.fn()
  const options = { base: 'https://invented.test/api', token: async () => null, cache, store, fetch, objectUrl: () => `blob:${++n}`, revokeUrl: revoke,
    metadataKey: 'overlay', parseMetadata: (raw: unknown) => { if (!raw || typeof raw !== 'object' || !('sha256' in raw)) throw new Error('Malformed overlay'); return raw as typeof file },
    readMetadata: async (client: ContentClient) => JSON.parse(new TextDecoder().decode(await client.pack('overlay.json'))) as typeof file,
    prepare: async (client: ContentClient, manifest: typeof release.manifest, metadata: typeof file) => {
      const { SET_NAMES } = await import('@luismlorenzana/uma-data')
      const source = await client.release()
      await Promise.all(SET_NAMES.map((name) => source.set(manifest, name)))
      await source.art(manifest); await client.pack(metadata.path, metadata); await client.artUrl(PAGE)
      return source.set(manifest, 'outfits')
    },
  }
  return { release, file, objects, fetch, cache, stored, store, revoke, options }
}

describe('complete content snapshots', () => {
  it('cold boots every set, required private bytes and previously seen art, using existing snapshot/cache keys', async () => {
    const f = await fixture(), legacyKey = (hash: string) => `https://old-game.invalid/${hash}`
    const first = createContentRuntime({ ...f.options, cacheKey: legacyKey })
    const online = await first.load(); await online.client.artUrl(FACE); first.clear()
    expect(JSON.parse(f.store.get()!)).toHaveProperty('overlay', f.file)
    expect([...f.stored.keys()].every((key) => key.startsWith('https://old-game.invalid/'))).toBe(true)
    const offline = vi.fn(async () => { throw new TypeError('offline') })
    const second = createContentRuntime({ ...f.options, cacheKey: legacyKey, fetch: offline })
    const restored = await second.load()
    expect(restored.origin).toBe('offline-cache')
    expect(await restored.client.artUrl(FACE)).toMatch(/^blob:/)
    expect(offline.mock.calls.length).toBeGreaterThanOrEqual(1)
    expect(offline.mock.calls.length).toBeLessThanOrEqual(2) // Pointer/index only; the first failure cancels the other.
    expect(restored.value).toEqual(online.value)
  })
  it('repairs damaged cache hits, rejects corrupted downloads and never replaces last-good with a partial boot', async () => {
    const f = await fixture()
    await createContentRuntime(f.options).load()
    const before = f.store.get(), outfit = f.release.manifest.files.find((file) => file.path === f.release.manifest.sets.outfits)!
    f.stored.set(releaseCacheKey(outfit.sha256), bytes('damaged'))
    await createContentRuntime(f.options).load()
    expect(f.stored.get(releaseCacheKey(outfit.sha256))?.length).toBe(outfit.bytes)
    f.stored.set(releaseCacheKey(f.file.sha256), bytes('bad overlay'))
    f.objects.set(`content/${f.file.path}`, bytes('bad overlay'))
    await expect(createContentRuntime(f.options).load()).rejects.toThrow('hash mismatch')
    expect(f.store.get()).toBe(before)
  })
  it('never falls back through auth failures, and clear cancels in-flight loads without saving a snapshot', async () => {
    const f = await fixture()
    await createContentRuntime(f.options).load()
    for (const status of [401, 403]) await expect(createContentRuntime({ ...f.options, fetch: async () => new Response('', { status }) }).load()).rejects.toMatchObject({ status })
    let finish!: () => void
    const wait = new Promise<void>((resolve) => { finish = resolve })
    const prepare = vi.fn(async () => { await wait; return [] })
    const store = { get: () => null, set: vi.fn() }
    const runtime = createContentRuntime({ ...f.options, store, prepare })
    const pending = runtime.load()
    await vi.waitFor(() => expect(prepare).toHaveBeenCalled())
    runtime.clear(); finish()
    await expect(pending).rejects.toThrow('cancelled')
    expect(store.set).not.toHaveBeenCalled()
  })
})
