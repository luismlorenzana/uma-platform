// Shared authenticated release/pack bytes and bounded held art URLs (SE2, hardened for SE4).
import type { ReleaseClient, ReleaseFile, ReleaseManifest } from '@luismlorenzana/uma-data'
import { defaultCache, releaseCacheKey, verifiedBytes } from './bytes.js'
import { contentUrls } from './urls.js'
export { releaseCacheKey } from './bytes.js'

export interface ContentCache { match(key: string): Promise<Response | undefined>; put(key: string, response: Response): Promise<void> }
export interface ContentClientOptions {
  readonly base?: string
  readonly token: () => Promise<string | null>
  readonly channel?: string
  readonly cache?: ContentCache | null | Promise<ContentCache | null>
  readonly cacheName?: string
  /** Preserve an existing game's content-addressed cache key. */
  readonly cacheKey?: (sha256: string) => string
  readonly fetch?: (input: string, init?: RequestInit) => Promise<Response>
  readonly objectUrl?: (blob: Blob) => string
  readonly revokeUrl?: (url: string) => void
  readonly urlLimit?: number
  /** Previously verified snapshot, used by createContentRuntime for offline boot. */
  readonly manifest?: ReleaseManifest
}
export interface ContentClient {
  release(): Promise<ReleaseClient>
  manifest(): Promise<ReleaseManifest>
  refresh(): void
  artUrl(path: string): Promise<string>
  /** Passing an envelope verifies and persistently caches immutable private bytes; indexes stay fresh. */
  pack(path: string, file?: ReleaseFile): Promise<Uint8Array>
  packUrl(path: string): Promise<string>
  hold(path: string): () => void
  dispose(): void
}
export class ContentError extends Error {
  override readonly name = 'ContentError'
  constructor(readonly path: string, readonly status: number | null, message = `Content returned ${status ?? 'no answer'} for ${path}`) { super(message) }
}
const TYPES: Readonly<Record<string, string>> = { webp: 'image/webp', png: 'image/png', avif: 'image/avif', json: 'application/json', mp3: 'audio/mpeg', ogg: 'audio/ogg' }
export const contentType = (path: string): string => TYPES[path.slice(path.lastIndexOf('.') + 1).toLowerCase()] ?? 'application/octet-stream'
export const isHashNamed = (path: string): boolean => /\.[a-f0-9]{8,64}\.[a-z0-9]+$/.test(path)
export const packCacheKey = (path: string): string => `https://uma-kit.invalid/pack/${path}`
const encodePath = (path: string): string => path.split('/').map(encodeURIComponent).join('/')

export function createContentClient(options: ContentClientOptions): ContentClient {
  const base = (options.base ?? '/api').replace(/\/+$/, '')
  const origin = (globalThis as { location?: { origin?: string } }).location?.origin ?? 'http://localhost'
  const absolute = /^https?:\/\//.test(base) ? base : `${origin}${base}`
  const doFetch = options.fetch ?? ((input: string, init?: RequestInit) => fetch(input, init))
  const cache = Promise.resolve(options.cache === undefined ? defaultCache(options.cacheName) : options.cache).catch(() => null)
  const key = options.cacheKey ?? releaseCacheKey
  const urls = contentUrls(options.objectUrl ?? ((blob) => URL.createObjectURL(blob)), options.revokeUrl ?? ((url) => URL.revokeObjectURL(url)), options.urlLimit ?? 320)
  let disposed = false
  const check = () => { if (disposed) throw new Error('Content load cancelled') }
  const fetchBytes = async (route: string, path: string) => {
    check()
    const token = await options.token()
    const response = await doFetch(`${absolute}/${route}/${encodePath(path)}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} }).catch((error: unknown) => {
      if (error instanceof ContentError) throw error
      throw new ContentError(path, null, error instanceof Error ? error.message : String(error))
    })
    if (!response.ok) throw new ContentError(path, response.status)
    const bytes = new Uint8Array(await response.arrayBuffer()); check(); return bytes
  }
  let releasePromise: Promise<ReleaseClient> | null = null
  let manifestPromise: Promise<ReleaseManifest> | null = options.manifest ? Promise.resolve(options.manifest) : null
  const files = new Map<string, ReleaseFile>(options.manifest?.files.map((file) => [file.path, file]))
  const release = (): Promise<ReleaseClient> => {
    check()
    releasePromise ??= import('@luismlorenzana/uma-data').then(({ createReleaseClient }) => {
      const source = { read: async (path: string) => {
        const file = path.startsWith('files/') ? files.get(path.slice(6)) : undefined
        return file ? verifiedBytes(file, () => fetchBytes('master', path), cache, key) : fetchBytes('master', path)
      } }
      const client = createReleaseClient({ source, ...(options.channel ? { channel: options.channel } : {}) })
      const register = (manifest: ReleaseManifest) => { for (const file of manifest.files) files.set(file.path, file) }
      const wrapped: ReleaseClient = { ...client,
        manifest: async (version) => { const value = await client.manifest(version); register(value); return value },
        set: (manifest, name) => { register(manifest); return client.set(manifest, name) },
        art: (manifest) => { register(manifest); return client.art(manifest) },
        file: (manifest, path) => { register(manifest); return client.file(manifest, path) },
        load: async (version) => {
          const current = await wrapped.manifest(version)
          const { SET_NAMES, MASTER_DATA_KEYS } = await import('@luismlorenzana/uma-data')
          const entries = await Promise.all(SET_NAMES.map(async (name) => [MASTER_DATA_KEYS[name], await wrapped.set(current, name)] as const))
          return { manifest: current, data: Object.fromEntries(entries) as unknown as import('@luismlorenzana/uma-data').MasterData, art: await wrapped.art(current) }
        },
      }
      return wrapped
    })
    releasePromise.catch(() => { releasePromise = null }); return releasePromise
  }
  const manifest = (): Promise<ReleaseManifest> => {
    check(); manifestPromise ??= release().then((client) => client.manifest())
    manifestPromise.catch(() => { manifestPromise = null }); return manifestPromise
  }
  const pack = (path: string, file?: ReleaseFile) => file
    ? file.path !== path ? Promise.reject(new ContentError(path, 404, 'Pack envelope path mismatch')) : verifiedBytes(file, () => fetchBytes('content', path), cache, key)
    : fetchBytes('content', path)
  async function packBytes(path: string) {
    if (!isHashNamed(path)) return pack(path)
    const store = await cache
    try { const hit = await store?.match(packCacheKey(path)); if (hit) return new Uint8Array(await hit.arrayBuffer()) } catch { /* Repair online. */ }
    const bytes = await pack(path)
    try { await store?.put(packCacheKey(path), new Response(bytes as Uint8Array<ArrayBuffer>)) } catch { /* Memory only. */ }
    return bytes
  }
  const blob = (bytes: Uint8Array, path: string) => new Blob([bytes as Uint8Array<ArrayBuffer>], { type: contentType(path) })
  return {
    release, manifest, refresh: () => { manifestPromise = null },
    artUrl: (path) => urls.load(path, async () => {
      const current = await manifest()
      if (!current.files.some((file) => file.path === path)) throw new ContentError(path, 404, `${path} isn't in the release`)
      return blob(await (await release()).file(current, path), path)
    }),
    pack, packUrl: (path) => urls.load(`pack:${path}`, async () => blob(await packBytes(path), path)),
    hold: (path) => urls.hold(path), dispose: () => { disposed = true; urls.dispose() },
  }
}
export type ContentProblem = 'signed-out' | 'not-allowed' | 'missing' | 'damaged' | 'offline' | 'failed'
export function contentProblem(error: unknown, online: boolean = (globalThis as { navigator?: { onLine?: boolean } }).navigator?.onLine ?? true): ContentProblem {
  const named = error as { name?: unknown; status?: unknown } | null
  const status = typeof named?.status === 'number' ? named.status : null
  if (status === 401) return 'signed-out'
  if (status === 403) return 'not-allowed'
  if (status === 404) return 'missing'
  if (named?.name === 'MasterDataError') return 'damaged'
  if (!online || error instanceof TypeError || ((named?.name === 'ContentError' || named?.name === 'ReleaseSourceError') && status === null)) return 'offline'
  return 'failed'
}
