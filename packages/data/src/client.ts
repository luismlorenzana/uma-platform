// Release client: channel → manifest → files, with hash checks and validation (docs/master-data.md#release-client).
// The source is injected, so each game's API can read the private bucket its own way and its web app can read
// through the API's logged-in endpoint.

import { parseSpriteSet, type SpriteSet } from './sprites.js'
import { parseDialoguePortraits, type DialoguePortraits } from './dialogue-portraits.js'
import { parseIllustrations, type Illustrations } from './illustrations.js'
import { enemyKeyPaths, parseEnemyKey, type EnemyKey } from './enemy-keys.js'
import type { Enemy } from './sets/enemies.js'
import { parseArtIndex, type ArtIndex } from './art.js'
import { MASTER_DATA_KEYS, parseOptionalSet, parseSet, type MasterData, type SetItems } from './master.js'
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
  /** A sprite set by outfit id, or null when this release has none. */
  spriteSet(manifest: ReleaseManifest, art: ArtIndex, outfitId: number): Promise<SpriteSet | null>
  /** The `enemies` set, or null when this release has none (before 1.6.0). */
  enemies(manifest: ReleaseManifest): Promise<Enemy[] | null>
  /** An enemy's key poses by enemy id, or null when this release has none for her. */
  enemyKey(manifest: ReleaseManifest, art: ArtIndex, enemyId: number): Promise<EnemyKey | null>
  /** A character's dialogue portraits (`dialogue-portraits`, 1.7.0): her bases by outfit and faces by expression, each
   *  base with its face position; null when none is published. Checks the id and that every picture is in the manifest
   *  with its bytes and SHA-256. */
  dialoguePortraits(manifest: ReleaseManifest, art: ArtIndex, characterId: number): Promise<DialoguePortraits | null>
  /** A character's illustrations (`illustrations`, 1.8.0): her full-screen scenes in order, each with its moment; null
   *  when none is published. Checks the id and that every picture is in the manifest with its bytes and SHA-256. */
  illustrations(manifest: ReleaseManifest, art: ArtIndex, characterId: number): Promise<Illustrations | null>
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
    for (const path of [...Object.values(index.sprites ?? {}), ...Object.values(index.enemyKeys ?? {}), ...Object.values(index.dialoguePortraits ?? {}), ...Object.values(index.illustrations ?? {})]) {
      if (!listed.has(path)) throw new MasterDataError(release.art, `${path} to be in the manifest`)
    }
    return index
  }

  async function spriteSet(release: ReleaseManifest, index: ArtIndex, outfitId: number): Promise<SpriteSet | null> {
    const path = index.sprites?.[String(outfitId)]
    if (!path) return null
    const set = parseSpriteSet(json(await file(release, path), path), path)
    if (set.outfitId !== outfitId) throw new MasterDataError(`${path}.outfitId`, String(outfitId))
    const listed = new Set(release.files.map(entry => entry.path))
    for (const page of set.pages) if (!listed.has(page.path)) throw new MasterDataError(path, `${page.path} to be in the manifest`)
    return set
  }

  async function enemies(release: ReleaseManifest): Promise<Enemy[] | null> {
    const path = release.sets.enemies
    return path ? parseOptionalSet('enemies', json(await file(release, path), path)) : null
  }

  async function enemyKey(release: ReleaseManifest, index: ArtIndex, enemyId: number): Promise<EnemyKey | null> {
    const path = index.enemyKeys?.[String(enemyId)]
    if (!path) return null
    const key = parseEnemyKey(json(await file(release, path), path), path)
    if (key.enemyId !== enemyId) throw new MasterDataError(`${path}.enemyId`, String(enemyId))
    const listed = new Set(release.files.map((entry) => entry.path))
    for (const image of enemyKeyPaths(key)) if (!listed.has(image)) throw new MasterDataError(path, `${image} to be in the manifest`)
    return key
  }

  async function dialoguePortraits(release: ReleaseManifest, index: ArtIndex, characterId: number): Promise<DialoguePortraits | null> {
    const path = index.dialoguePortraits?.[String(characterId)]
    if (!path) return null
    const portraits = parseDialoguePortraits(json(await file(release, path), path), path)
    if (portraits.characterId !== characterId) throw new MasterDataError(`${path}.characterId`, String(characterId))
    const listed = new Map(release.files.map((entry) => [entry.path, entry]))
    for (const image of [...Object.values(portraits.bases), ...Object.values(portraits.faces)]) {
      const entry = listed.get(image.path)
      if (!entry) throw new MasterDataError(path, `${image.path} to be in the manifest`)
      if (entry.sha256 !== image.sha256 || entry.bytes !== image.bytes) throw new MasterDataError(path, `${image.path}'s bytes and SHA-256 as the manifest lists them`)
    }
    return portraits
  }

  async function illustrations(release: ReleaseManifest, index: ArtIndex, characterId: number): Promise<Illustrations | null> {
    const path = index.illustrations?.[String(characterId)]
    if (!path) return null
    const ills = parseIllustrations(json(await file(release, path), path), path)
    if (ills.characterId !== characterId) throw new MasterDataError(`${path}.characterId`, String(characterId))
    const listed = new Map(release.files.map((entry) => [entry.path, entry]))
    for (const scene of ills.scenes) {
      const entry = listed.get(scene.path)
      if (!entry) throw new MasterDataError(path, `${scene.path} to be in the manifest`)
      if (entry.sha256 !== scene.sha256 || entry.bytes !== scene.bytes) throw new MasterDataError(path, `${scene.path}'s bytes and SHA-256 as the manifest lists them`)
    }
    return ills
  }

  async function load(version?: string): Promise<MasterRelease> {
    const release = await manifest(version)
    const entries = await Promise.all(SET_NAMES.map(async (name) => [MASTER_DATA_KEYS[name], await set(release, name)] as const))
    return { manifest: release, data: Object.fromEntries(entries) as unknown as MasterData, art: await art(release) }
  }

  return { channel, manifest, set, art, spriteSet, enemies, enemyKey, dialoguePortraits, illustrations, file, load }
}
