// The content client in Node, on a synthetic uma-data release behind a fake API: the token on every request, sets
// through uma-data, art checked and kept (memory for the session, Cache Storage by SHA-256 across restarts), a damaged
// cached copy replaced, private packs, the cache keys, `imagePath`, and the failure classes.
import { buildMemoryRelease, syntheticArtIndex } from '@luismlorenzana/uma-data/testing'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { AtlasSprite, ContentProvider, imagePath } from './art.js'
import { ContentError, contentProblem, createContentClient, isHashNamed, packCacheKey, releaseCacheKey, type ContentCache } from './client.js'

const PAGE = 'atlases/outfit-icons-0.0123456789abcdef.webp'
const BUST = 'art/outfit-portraits/900101.fedcba9876543210.webp'
const bytes = (text: string) => new TextEncoder().encode(text)

async function api(packs: Record<string, string> = {}) {
  const release = await buildMemoryRelease(undefined, { art: syntheticArtIndex(PAGE, BUST), extraFiles: { [PAGE]: bytes('RIFF-page'), [BUST]: bytes('RIFF-bust') } })
  const calls: { path: string; auth: string | null }[] = []
  const fetch = async (input: string, init?: RequestInit) => {
    const url = new URL(input)
    const auth = new Headers(init?.headers).get('Authorization')
    calls.push({ path: url.pathname, auth })
    const [, , route, ...rest] = url.pathname.split('/')
    const path = rest.map(decodeURIComponent).join('/')
    const found = route === 'master' ? release.objects.get(path) : route === 'content' && path in packs ? bytes(packs[path]!) : undefined
    return found ? new Response(found as Uint8Array<ArrayBuffer>) : new Response('not found', { status: 404 })
  }
  return { release, calls, fetch }
}

function memoryCache(): ContentCache & { readonly stored: Map<string, Uint8Array> } {
  const stored = new Map<string, Uint8Array>()
  return {
    stored,
    match: async (key) => (stored.has(key) ? new Response(stored.get(key)! as Uint8Array<ArrayBuffer>) : undefined),
    put: async (key, response) => { stored.set(key, new Uint8Array(await response.arrayBuffer())) },
  }
}

let urls = 0
const objectUrl = () => `blob:test/${(urls += 1)}`

describe('the content client', () => {
  it('reads the release through the API with the owner’s token, loading the manifest once', async () => {
    const server = await api()
    const client = createContentClient({ base: 'http://game.test/api', token: async () => 'tok', fetch: server.fetch, cache: null, objectUrl })
    const manifest = await client.manifest()
    expect(manifest.version).toBe(server.release.manifest.version)
    const outfits = await (await client.release()).set(manifest, 'outfits')
    expect(outfits.length).toBeGreaterThan(0)
    await client.manifest()
    expect(server.calls.filter((c) => c.path.includes('/channels/'))).toHaveLength(1)
    expect(server.calls.every((c) => c.auth === 'Bearer tok')).toBe(true)
  })

  it('checks art against the manifest and keeps it: one download per file per session, and across restarts by hash', async () => {
    const server = await api()
    const cache = memoryCache()
    const first = createContentClient({ base: 'http://game.test/api', token: async () => null, fetch: server.fetch, cache, objectUrl })
    const url = await first.artUrl(BUST)
    expect(url).toMatch(/^blob:/)
    expect(await first.artUrl(BUST)).toBe(url)
    const downloads = () => server.calls.filter((c) => c.path.endsWith(BUST)).length
    expect(downloads()).toBe(1)
    expect(server.calls.every((c) => c.auth === null)).toBe(true)
    const sha = server.release.manifest.files.find((f) => f.path === BUST)!.sha256
    expect([...cache.stored.keys()]).toContain(releaseCacheKey(sha))
    // A new session reads it from Cache Storage.
    const second = createContentClient({ base: 'http://game.test/api', token: async () => null, fetch: server.fetch, cache, objectUrl })
    await second.artUrl(BUST)
    expect(downloads()).toBe(1)
    // A damaged copy is downloaded again and replaced.
    cache.stored.set(releaseCacheKey(sha), bytes('broken'))
    const third = createContentClient({ base: 'http://game.test/api', token: async () => null, fetch: server.fetch, cache, objectUrl })
    await third.artUrl(BUST)
    expect(downloads()).toBe(2)
    expect(new TextDecoder().decode(cache.stored.get(releaseCacheKey(sha)))).toBe('RIFF-bust')
  })

  it('refuses art the release doesn’t list, and forgets a failure so it can try again', async () => {
    const server = await api()
    const client = createContentClient({ base: 'http://game.test/api', token: async () => null, fetch: server.fetch, cache: null, objectUrl })
    await expect(client.artUrl('art/outfit-portraits/missing.0123456789abcdef.webp')).rejects.toMatchObject({ name: 'ContentError', status: 404 })
  })

  it('fetches private packs, keeping hash-named files in Cache Storage and indexes fresh', async () => {
    const server = await api({ 'enemies.json': '[]', 'enemies/test-unit-art.0a1b2c3d.webp': 'RIFF-enemy' })
    const cache = memoryCache()
    const client = createContentClient({ base: 'http://game.test/api', token: async () => 'tok', fetch: server.fetch, cache, objectUrl })
    expect(new TextDecoder().decode(await client.pack('enemies.json'))).toBe('[]')
    await client.packUrl('enemies/test-unit-art.0a1b2c3d.webp')
    expect([...cache.stored.keys()]).toEqual([packCacheKey('enemies/test-unit-art.0a1b2c3d.webp')])
    await client.packUrl('enemies.json')
    expect(cache.stored.size).toBe(1)
    await expect(client.pack('cast.json')).rejects.toBeInstanceOf(ContentError)
  })
})

describe('art helpers', () => {
  it('find a record’s image path, draw an atlas frame tile, and key caches by content', async () => {
    const art = syntheticArtIndex(PAGE, BUST)
    expect(imagePath(art, 'outfit-portraits', '900101')).toBe(BUST)
    expect(imagePath(art, 'outfit-busts', '900101')).toBeNull()
    expect(imagePath(null, 'outfit-portraits', '900101')).toBeNull()
    const server = await api()
    const client = createContentClient({ base: 'http://game.test/api', token: async () => null, fetch: server.fetch, cache: null, objectUrl })
    const html = renderToStaticMarkup(<ContentProvider client={client}><AtlasSprite art={art} family="outfit-icons" frameKey="900101" size={48} label="Test Uma" /></ContentProvider>)
    expect(html).toContain('aria-label="Test Uma"')
    expect(html).toContain('width:48px')
    expect(releaseCacheKey('ab12')).toBe('https://uma-kit.invalid/release/ab12')
    expect([isHashNamed(PAGE), isHashNamed('enemies.json'), isHashNamed('a.0a1b2c3d.webp')]).toEqual([true, false, true])
  })
})

describe('contentProblem', () => {
  it('says what went wrong in classes each game words its own way', () => {
    expect(contentProblem(new ContentError('x', 401))).toBe('signed-out')
    expect(contentProblem(new ContentError('x', 403))).toBe('not-allowed')
    expect(contentProblem(Object.assign(new Error('gone'), { name: 'ReleaseSourceError', status: 404 }))).toBe('missing')
    expect(contentProblem(Object.assign(new Error('bad'), { name: 'MasterDataError' }))).toBe('damaged')
    expect(contentProblem(new TypeError('Failed to fetch'))).toBe('offline')
    expect(contentProblem(new ContentError('x', null))).toBe('offline')
    expect(contentProblem(new Error('boom'), false)).toBe('offline')
    expect(contentProblem(new ContentError('x', 500))).toBe('failed')
  })
})
