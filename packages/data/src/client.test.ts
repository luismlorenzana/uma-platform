import { describe, expect, it, vi } from 'vitest'
import { createFetchSource, createReleaseClient, ReleaseSourceError } from './client.js'
import { MasterDataError } from './parse.js'
import { releasePaths } from './release.js'
import { buildMemoryRelease, createMemorySource, syntheticArtIndex, syntheticMasterData } from './testing.js'

const encoder = new TextEncoder()
const PAGE = 'atlases/outfit-icons-0.1111111111111111.webp'
const IMAGE = 'art/outfit-portraits/900101.2222222222222222.webp'

async function release() {
  return buildMemoryRelease(syntheticMasterData(), {
    art: syntheticArtIndex(PAGE, IMAGE),
    extraFiles: { [PAGE]: new Uint8Array([1, 2, 3]), [IMAGE]: new Uint8Array([4, 5]) },
  })
}

describe('createReleaseClient', () => {
  it('loads latest: channel, manifest, every set and the art index', async () => {
    const built = await release()
    const client = createReleaseClient({ source: createMemorySource(built.objects) })
    const loaded = await client.load()
    expect(loaded.manifest.version).toBe(built.channel.version)
    expect(loaded.data).toEqual(syntheticMasterData())
    expect(loaded.art).toEqual(syntheticArtIndex(PAGE, IMAGE))
    expect(await client.file(loaded.manifest, IMAGE)).toEqual(new Uint8Array([4, 5]))
  })

  it('loads a pinned version without reading the channel', async () => {
    const built = await release()
    built.objects.delete(releasePaths.channel('latest'))
    const client = createReleaseClient({ source: createMemorySource(built.objects) })
    expect((await client.load(built.manifest.version)).manifest.version).toBe(built.manifest.version)
    await expect(client.channel()).rejects.toBeInstanceOf(ReleaseSourceError)
  })

  it('rejects a file whose bytes do not match the manifest', async () => {
    const built = await release()
    const path = releasePaths.file(built.manifest.sets.skills)
    const tampered = new Uint8Array(built.objects.get(path)!)
    tampered[tampered.length - 2] = 0x20
    built.objects.set(path, tampered)
    const client = createReleaseClient({ source: createMemorySource(built.objects) })
    await expect(client.load()).rejects.toThrow('bytes matching the manifest SHA-256')
  })

  it('rejects a manifest whose version is not the hash of its files', async () => {
    const built = await release()
    const path = releasePaths.manifest(built.manifest.version)
    const files = built.manifest.files.map((file, index) => (index === 0 ? { ...file, sha256: 'f'.repeat(64) } : file))
    built.objects.set(path, encoder.encode(JSON.stringify({ ...built.manifest, files })))
    const client = createReleaseClient({ source: createMemorySource(built.objects) })
    await expect(client.manifest()).rejects.toThrow('manifest.version')
  })

  it('rejects an art index that points at a file the manifest lacks', async () => {
    const built = await buildMemoryRelease(syntheticMasterData(), {
      art: syntheticArtIndex(PAGE, IMAGE),
      extraFiles: { [PAGE]: new Uint8Array([1]) },
    })
    const client = createReleaseClient({ source: createMemorySource(built.objects) })
    await expect(client.load()).rejects.toBeInstanceOf(MasterDataError)
  })

  it('rejects a channel that points somewhere unexpected', async () => {
    const built = await release()
    built.objects.set(
      releasePaths.channel('latest'),
      encoder.encode(JSON.stringify({ ...built.channel, manifest: 'manifests/v1/elsewhere.json' })),
    )
    const client = createReleaseClient({ source: createMemorySource(built.objects) })
    await expect(client.channel()).rejects.toThrow(`latest.json.manifest: expected ${built.channel.manifest}`)
  })
})

describe('createFetchSource', () => {
  it('reads bucket paths under the base URL with the given request options', async () => {
    const fetcher = vi.fn(async () => new Response(new Uint8Array([7, 8])))
    const source = createFetchSource({
      baseUrl: 'https://api.test/master',
      fetch: fetcher,
      init: () => ({ headers: { authorization: 'Bearer test' } }),
    })
    expect(await source.read('channels/v1/latest.json')).toEqual(new Uint8Array([7, 8]))
    expect(fetcher).toHaveBeenCalledWith('https://api.test/master/channels/v1/latest.json', {
      headers: { authorization: 'Bearer test' },
    })
  })

  it('turns an HTTP error into a ReleaseSourceError with its status', async () => {
    const source = createFetchSource({ baseUrl: 'https://api.test/', fetch: async () => new Response('no', { status: 403 }) })
    await expect(source.read('x')).rejects.toMatchObject({ status: 403, path: 'x' })
  })
})
