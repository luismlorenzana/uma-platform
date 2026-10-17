// Content in the app, the same in both games (uma-platform SE2): uma-platform's master data release through the game's
// API (`/api/master/`), and the game's private packs (`/api/content/`), both with the owner's token. Built from
// uma-rpg's `master.ts` and `art.tsx`, with uma-racer's habits where they're better: every release file's bytes are
// checked against the manifest's SHA-256, kept in Cache Storage under that hash so art survives a restart, and a
// failure is classified for the screen (`contentProblem`). uma-data loads on first use, so the startup bundle stays small.
import type { ReleaseClient, ReleaseManifest } from '@luismlorenzana/uma-data'

/** The bits of Cache Storage the client uses (`caches.open(…)`); tests pass a map. */
export interface ContentCache {
  match(key: string): Promise<Response | undefined>
  put(key: string, response: Response): Promise<void>
}

export interface ContentClientOptions {
  /** The game's API base (default `/api`). */
  readonly base?: string
  /** The owner's ID token; null with auth off or signed out. */
  readonly token: () => Promise<string | null>
  /** The release channel to follow (default `latest`). */
  readonly channel?: string
  /** Cache Storage for art, or null for memory only. Default: the `uma-kit-content` cache where the browser has one. */
  readonly cache?: ContentCache | null | Promise<ContentCache | null>
  readonly fetch?: (input: string, init?: RequestInit) => Promise<Response>
  /** Makes a blob URL (default `URL.createObjectURL`). */
  readonly objectUrl?: (blob: Blob) => string
}

export interface ContentClient {
  /** uma-data's release client over `/api/master/`, for the game's own sets. */
  release(): Promise<ReleaseClient>
  /** The channel's manifest, loaded once per session (`refresh` forgets it). */
  manifest(): Promise<ReleaseManifest>
  refresh(): void
  /** A blob URL for a release file (`atlases/…`, `art/…`), checked against the manifest and kept for the session. */
  artUrl(path: string): Promise<string>
  /** A private pack file's bytes (`enemies.json`). */
  pack(path: string): Promise<Uint8Array>
  /** A blob URL for a private pack file, kept for the session; hash-named ones also in Cache Storage. */
  packUrl(path: string): Promise<string>
}

/** A content request the API refused or couldn't answer. */
export class ContentError extends Error {
  override readonly name = 'ContentError'
  constructor(readonly path: string, readonly status: number | null, message = `Content returned ${status ?? 'no answer'} for ${path}`) {
    super(message)
  }
}

const CACHE_NAME = 'uma-kit-content'
const TYPES: Readonly<Record<string, string>> = { webp: 'image/webp', png: 'image/png', avif: 'image/avif', json: 'application/json', mp3: 'audio/mpeg', ogg: 'audio/ogg' }

export const contentType = (path: string): string => TYPES[path.slice(path.lastIndexOf('.') + 1).toLowerCase()] ?? 'application/octet-stream'

/** A name carrying its content hash: `<stem>.<8 or more hex>.<ext>`. */
export const isHashNamed = (path: string): boolean => /\.[a-f0-9]{8,64}\.[a-z0-9]+$/.test(path)

/** The Cache Storage key for a release file: its SHA-256, so a file is stored once whatever its path or release. */
export const releaseCacheKey = (sha256: string): string => `https://uma-kit.invalid/release/${sha256}`
/** The Cache Storage key for a hash-named pack file: its path, which names its hash. */
export const packCacheKey = (path: string): string => `https://uma-kit.invalid/pack/${path}`

const encodePath = (path: string): string => path.split('/').map(encodeURIComponent).join('/')

async function sha256Hex(bytes: Uint8Array): Promise<string | null> {
  const subtle = globalThis.crypto?.subtle
  if (subtle === undefined) return null
  const digest = new Uint8Array(await subtle.digest('SHA-256', bytes as Uint8Array<ArrayBuffer>))
  return Array.from(digest, (b) => b.toString(16).padStart(2, '0')).join('')
}

function defaultCache(): Promise<ContentCache | null> {
  const storage = (globalThis as { caches?: CacheStorage }).caches
  if (storage === undefined) return Promise.resolve(null)
  return storage.open(CACHE_NAME).then(
    (cache) => ({ match: (key: string) => cache.match(key), put: (key: string, response: Response) => cache.put(key, response) }),
    () => null,
  )
}

/** Remembers a promise per key; a failed one is forgotten so the next call tries again. */
function memo<T>(): (key: string, make: () => Promise<T>) => Promise<T> {
  const held = new Map<string, Promise<T>>()
  return (key, make) => {
    let value = held.get(key)
    if (value === undefined) {
      value = make()
      value.catch(() => held.delete(key))
      held.set(key, value)
    }
    return value
  }
}

export function createContentClient(options: ContentClientOptions): ContentClient {
  const base = (options.base ?? '/api').replace(/\/+$/, '')
  const origin = (globalThis as { location?: { origin?: string } }).location?.origin ?? 'http://localhost'
  const absolute = /^https?:\/\//.test(base) ? base : `${origin}${base}`
  const doFetch = options.fetch ?? ((input: string, init?: RequestInit) => fetch(input, init))
  const objectUrl = options.objectUrl ?? ((blob: Blob) => URL.createObjectURL(blob))
  const cache: Promise<ContentCache | null> = Promise.resolve(options.cache === undefined ? defaultCache() : options.cache)
  const headers = async (): Promise<Record<string, string>> => {
    const token = await options.token()
    return token ? { Authorization: `Bearer ${token}` } : {}
  }

  let releasePromise: Promise<ReleaseClient> | null = null
  let manifestPromise: Promise<ReleaseManifest> | null = null
  const artUrls = memo<string>()
  const packUrls = memo<string>()

  const release = (): Promise<ReleaseClient> => {
    releasePromise ??= import('@luismlorenzana/uma-data').then(({ createFetchSource, createReleaseClient }) => createReleaseClient({
      source: createFetchSource({ baseUrl: `${absolute}/master/`, init: async () => ({ headers: await headers() }), fetch: doFetch }),
      ...(options.channel ? { channel: options.channel } : {}),
    }))
    releasePromise.catch(() => { releasePromise = null })
    return releasePromise
  }

  const manifest = (): Promise<ReleaseManifest> => {
    manifestPromise ??= release().then((client) => client.manifest())
    manifestPromise.catch(() => { manifestPromise = null })
    return manifestPromise
  }

  async function releaseBytes(path: string): Promise<Uint8Array> {
    const current = await manifest()
    const entry = current.files.find((file) => file.path === path)
    if (entry === undefined) throw new ContentError(path, 404, `${path} isn't in the release`)
    const store = await cache
    const hit = await store?.match(releaseCacheKey(entry.sha256)).catch(() => undefined)
    if (hit !== undefined) {
      const bytes = new Uint8Array(await hit.arrayBuffer())
      // A damaged copy is dropped and downloaded again.
      if (bytes.byteLength === entry.bytes && (await sha256Hex(bytes)) === entry.sha256) return bytes
    }
    const bytes = await (await release()).file(current, path)
    await store?.put(releaseCacheKey(entry.sha256), new Response(bytes as Uint8Array<ArrayBuffer>, { headers: { 'Content-Type': contentType(path) } })).catch(() => undefined)
    return bytes
  }

  async function pack(path: string): Promise<Uint8Array> {
    const response = await doFetch(`${absolute}/content/${encodePath(path)}`, { headers: await headers() }).catch((err: unknown) => {
      throw new ContentError(path, null, err instanceof Error ? err.message : String(err))
    })
    if (!response.ok) throw new ContentError(path, response.status)
    return new Uint8Array(await response.arrayBuffer())
  }

  async function packBytes(path: string): Promise<Uint8Array> {
    if (!isHashNamed(path)) return pack(path)
    const store = await cache
    const hit = await store?.match(packCacheKey(path)).catch(() => undefined)
    if (hit !== undefined) return new Uint8Array(await hit.arrayBuffer())
    const bytes = await pack(path)
    await store?.put(packCacheKey(path), new Response(bytes as Uint8Array<ArrayBuffer>, { headers: { 'Content-Type': contentType(path) } })).catch(() => undefined)
    return bytes
  }

  const blobUrl = (bytes: Uint8Array, path: string): string => objectUrl(new Blob([bytes as Uint8Array<ArrayBuffer>], { type: contentType(path) }))

  return {
    release,
    manifest,
    refresh: () => { manifestPromise = null },
    artUrl: (path) => artUrls(path, async () => blobUrl(await releaseBytes(path), path)),
    pack,
    packUrl: (path) => packUrls(path, async () => blobUrl(await packBytes(path), path)),
  }
}

/** What went wrong, for the game's words: signed out, not the owner, missing, damaged, offline, or something else. */
export type ContentProblem = 'signed-out' | 'not-allowed' | 'missing' | 'damaged' | 'offline' | 'failed'

/** Classifies a content failure (uma-racer's diagnostics, without the words: each game says them its way). */
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
