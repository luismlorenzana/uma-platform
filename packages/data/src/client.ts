// Release client: channel → manifest → files, with hash checks and validation (docs/master-data.md#release-client).
// The source is injected, so each game's API can read the private bucket its own way and its web app can read
// through the API's logged-in endpoint.

import { parseArtIndex, type ArtIndex } from './art.js'
import { MASTER_DATA_KEYS, parseSet, type MasterData, type SetItems } from './master.js'
import { MasterDataError } from './parse.js'
import {
  parseReleaseChannel,
  parseReleaseManifest,
  releasePaths,
  sha256Hex,
  SET_NAMES,
  verifyReleaseVersion,
  type ReleaseChannel,
  type ReleaseFile,
  type ReleaseManifest,
  type SetName,
} from './release.js'

/** Reads one object by its bucket path (`channels/v1/latest.json`, `manifests/v1/<v>.json`, `files/…`). */
export interface ReleaseSource {
  read(path: string): Promise<Uint8Array>
}

/** Thrown when a source can't return an object. */
export class ReleaseSourceError extends Error {
  override readonly name = 'ReleaseSourceError'

  constructor(
    readonly path: string,
    readonly status: number | null,
    message: string,
  ) {
    super(message)
  }
}

export interface FetchSourceOptions {
  /** Base URL the bucket paths are appended to, e.g. `https://api.example.com/api/master/`. */
  baseUrl: string
  /** Defaults to the global fetch. */
  fetch?: (input: string, init?: RequestInit) => Promise<Response>
  /** Extra request options, e.g. an Authorization header, or a function that returns them per request. */
  init?: RequestInit | (() => RequestInit | Promise<RequestInit>)
}

/** A source over HTTP: a game's own logged-in endpoint, a signed-URL proxy, or a local server. */
export function createFetchSource(options: FetchSourceOptions): ReleaseSource {
  const fetcher = options.fetch ?? ((input: string, init?: RequestInit) => fetch(input, init))
  const base = options.baseUrl.endsWith('/') ? options.baseUrl : `${options.baseUrl}/`
  return {
    async read(path) {
      const init = typeof options.init === 'function' ? await options.init() : options.init
      const response = await fetcher(`${base}${path}`, init)
      if (!response.ok) throw new ReleaseSourceError(path, response.status, `Release source returned HTTP ${response.status} for ${path}`)
      return new Uint8Array(await response.arrayBuffer())
    },
  }
}

export interface ReleaseClientOptions {
  source: ReleaseSource
  /** Channel to follow. Defaults to `latest`. */
  channel?: string
  /**
   * Check every file's byte length and SHA-256 against the manifest. Defaults to true; turn it off only when the
   * source already verifies.
   */
  verifyHashes?: boolean
}

export interface MasterRelease {
  manifest: ReleaseManifest
  data: MasterData
  art: ArtIndex | null
}

export interface ReleaseClient {
  /** The channel pointer this client follows. */
  channel(): Promise<ReleaseChannel>
  /** A manifest by version, or the channel's when no version is given. */
  manifest(version?: string): Promise<ReleaseManifest>
  /** One set's records. */
  set<N extends SetName>(manifest: ReleaseManifest, name: N): Promise<SetItems[N][]>
  /** The release's art index, or null when it has none. */
  art(manifest: ReleaseManifest): Promise<ArtIndex | null>
  /** A file's verified bytes, e.g. an art image. */
  file(manifest: ReleaseManifest, path: string): Promise<Uint8Array>
  /** Every set and the art index of one release (the channel's when no version is given). */
  load(version?: string): Promise<MasterRelease>
}

const decoder = new TextDecoder('utf-8', { fatal: true })

function json(bytes: Uint8Array, path: string): unknown {
  try {
    return JSON.parse(decoder.decode(bytes)) as unknown
  } catch (error) {
    throw new MasterDataError(path, `valid UTF-8 JSON (${error instanceof Error ? error.message : String(error)})`)
  }
}

export function createReleaseClient(options: ReleaseClientOptions): ReleaseClient {
  const { source } = options
  const channelName = options.channel ?? 'latest'
  const verify = options.verifyHashes ?? true

  async function channel(): Promise<ReleaseChannel> {
    const path = releasePaths.channel(channelName)
    const pointer = parseReleaseChannel(json(await source.read(path), path), path)
    if (pointer.channel !== channelName) throw new MasterDataError(`${path}.channel`, JSON.stringify(channelName))
    if (pointer.manifest !== releasePaths.manifest(pointer.version)) {
      throw new MasterDataError(`${path}.manifest`, releasePaths.manifest(pointer.version))
    }
    return pointer
  }

  async function manifest(version?: string): Promise<ReleaseManifest> {
    const target = version ?? (await channel()).version
    const path = releasePaths.manifest(target)
    const parsed = parseReleaseManifest(json(await source.read(path), path), path)
    if (parsed.version !== target) throw new MasterDataError(`${path}.version`, JSON.stringify(target))
    await verifyReleaseVersion(parsed)
    return parsed
  }

  async function file(release: ReleaseManifest, path: string): Promise<Uint8Array> {
    const entry: ReleaseFile | undefined = release.files.find((candidate) => candidate.path === path)
    if (!entry) throw new MasterDataError(path, 'a file listed in the manifest')
    const bytes = await source.read(releasePaths.file(path))
    if (verify) {
      if (bytes.byteLength !== entry.bytes) throw new MasterDataError(path, `${entry.bytes} bytes, got ${bytes.byteLength}`)
      if ((await sha256Hex(bytes)) !== entry.sha256) throw new MasterDataError(path, 'bytes matching the manifest SHA-256')
    }
    return bytes
  }

  async function set<N extends SetName>(release: ReleaseManifest, name: N): Promise<SetItems[N][]> {
    const path = release.sets[name]
    return parseSet(name, json(await file(release, path), path))
  }

  async function art(release: ReleaseManifest): Promise<ArtIndex | null> {
    if (release.art === null) return null
    const index = parseArtIndex(json(await file(release, release.art), release.art), release.art)
    const listed = new Set(release.files.map((entry) => entry.path))
    for (const family of Object.values(index.images)) {
      for (const [key, image] of Object.entries(family)) {
        if (!listed.has(image.path)) throw new MasterDataError(`${release.art}.${key}`, `${image.path} to be in the manifest`)
      }
    }
    for (const atlas of Object.values(index.atlases)) {
      for (const page of atlas.pages) {
        if (!listed.has(page.path)) throw new MasterDataError(release.art, `${page.path} to be in the manifest`)
      }
    }
    return index
  }

  async function load(version?: string): Promise<MasterRelease> {
    const release = await manifest(version)
    const entries = await Promise.all(SET_NAMES.map(async (name) => [MASTER_DATA_KEYS[name], await set(release, name)] as const))
    return { manifest: release, data: Object.fromEntries(entries) as unknown as MasterData, art: await art(release) }
  }

  return { channel, manifest, set, art, file, load }
}
