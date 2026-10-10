// Verified release publishing, ported from uma-racer's manifest-last publisher (scripts/data/README.md#publish).
// Order: every file, then the manifest, then the channel pointer. Nothing is ever deleted or overwritten except the
// channel pointer, so a published manifest's files stay readable forever.

import {
  artPaths,
  findReferenceIssues,
  MASTER_DATA_KEYS,
  parseArtIndex,
  parseReleaseChannel,
  parseReleaseManifest,
  parseSet,
  releasePaths,
  SCHEMA_MAJOR,
  SET_NAMES,
  verifyReleaseVersion,
  type ArtIndex,
  type MasterData,
  type ReferenceIssue,
  type ReleaseChannel,
  type ReleaseManifest,
} from '@luismlorenzana/uma-data'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import { MANIFEST_FILE, readVerifiedFile } from './release-dir'

export interface UploadEntry {
  localPath: string
  objectPath: string
}

/** Cache lifetimes: content-addressed files and manifests never change; the channel pointer always might. */
export const IMMUTABLE_CACHE_CONTROL = 'private, max-age=31536000, immutable'
export const CHANNEL_CACHE_CONTROL = 'no-cache, max-age=0'

export interface ReleaseStorageClient {
  /** An object's bytes, or null when it doesn't exist. */
  read(objectPath: string): Promise<Buffer | null>
  /** The size of every object under a prefix, by object path. */
  list(prefix: string): Promise<ReadonlyMap<string, number>>
  /** Uploads files that must not exist yet (immutable); an existing object is left alone. */
  uploadImmutable(entries: readonly UploadEntry[]): Promise<void>
  /** Uploads one object, replacing it when present (the channel pointer). */
  replace(entry: UploadEntry, cacheControl: string): Promise<void>
}

export interface VerifiedRelease {
  manifest: ReleaseManifest
  manifestPath: string
  /** Absolute local path of every release file, by release path. */
  localPaths: Map<string, string>
  data: MasterData
  art: ArtIndex | null
  referenceIssues: ReferenceIssue[]
}

/** Checks the local release the way a client will: manifest, every byte and hash, every set and the art index. */
export async function verifyLocalRelease(releaseDir: string): Promise<VerifiedRelease> {
  const manifestPath = resolve(releaseDir, MANIFEST_FILE)
  let raw: string
  try {
    raw = await readFile(manifestPath, 'utf8')
  } catch (error) {
    throw new Error(`No local release at ${releaseDir}; run pnpm data:import and pnpm assets:import first`, { cause: error })
  }
  const manifest = parseReleaseManifest(JSON.parse(raw) as unknown, MANIFEST_FILE)
  await verifyReleaseVersion(manifest)

  const localPaths = new Map<string, string>()
  const contents = new Map<string, Buffer>()
  for (const file of manifest.files) {
    const bytes = await readVerifiedFile(releaseDir, file)
    localPaths.set(file.path, resolve(releaseDir, ...file.path.split('/')))
    if (file.path.endsWith('.json')) contents.set(file.path, bytes)
  }
  const json = (path: string): unknown => JSON.parse(contents.get(path)!.toString('utf8')) as unknown

  const data = {} as MasterData
  for (const name of SET_NAMES) {
    ;(data as unknown as Record<string, unknown>)[MASTER_DATA_KEYS[name]] = parseSet(name, json(manifest.sets[name]))
  }
  let art: ArtIndex | null = null
  if (manifest.art) {
    art = parseArtIndex(json(manifest.art), manifest.art)
    const missing = artPaths(art).filter((path) => !localPaths.has(path))
    if (missing.length > 0) throw new Error(`The art index points at ${missing.length} file(s) the manifest lacks, e.g. ${missing[0]}`)
  }
  return { manifest, manifestPath, localPaths, data, art, referenceIssues: findReferenceIssues(data) }
}

export interface PublishReleaseOptions {
  releaseDir: string
  storage: ReleaseStorageClient
  channel?: string
  dryRun?: boolean
  now?: () => Date
}

export interface PublishReleaseResult {
  dryRun: boolean
  version: string
  channel: string
  /** The channel's version before publishing, or null when it didn't exist. */
  channelBefore: string | null
  channelAfter: string | null
  uploadPaths: readonly string[]
  alreadyPresentPaths: readonly string[]
  manifestUploaded: boolean
  totalBytes: number
  uploadBytes: number
  referenceIssues: number
  elapsedMs: number
}

function parseRemoteChannel(bytes: Buffer | null, path: string): ReleaseChannel | null {
  if (bytes === null) return null
  return parseReleaseChannel(JSON.parse(bytes.toString('utf8')) as unknown, path)
}

/** A manifest already in the bucket for this version must describe exactly the same files. */
function checkRemoteManifest(bytes: Buffer, local: ReleaseManifest, path: string): void {
  const remote = parseReleaseManifest(JSON.parse(bytes.toString('utf8')) as unknown, path)
  const same = remote.files.length === local.files.length &&
    remote.files.every((file, index) => {
      const mine = local.files[index]!
      return file.path === mine.path && file.sha256 === mine.sha256 && file.bytes === mine.bytes
    })
  if (!same) throw new Error(`${path} already exists with different files; refusing to publish over it`)
}

export async function publishRelease(options: PublishReleaseOptions): Promise<PublishReleaseResult> {
  const now = options.now ?? (() => new Date())
  const startedAt = now().getTime()
  const channel = options.channel ?? 'latest'
  const { storage } = options
  const local = await verifyLocalRelease(options.releaseDir)
  const { manifest } = local

  const channelPath = releasePaths.channel(channel)
  const manifestObject = releasePaths.manifest(manifest.version)
  const channelBefore = parseRemoteChannel(await storage.read(channelPath), channelPath)?.version ?? null
  const remoteManifest = await storage.read(manifestObject)
  if (remoteManifest) checkRemoteManifest(remoteManifest, manifest, manifestObject)

  // One listing instead of a lookup per file: uma-racer measured 2,000 lookups at over half an hour.
  const listed = await storage.list('files/')
  const uploadPaths: string[] = []
  const alreadyPresentPaths: string[] = []
  for (const file of manifest.files) {
    if (listed.get(releasePaths.file(file.path)) === file.bytes) alreadyPresentPaths.push(file.path)
    else uploadPaths.push(file.path)
  }

  let channelAfter = channelBefore
  if (!options.dryRun) {
    await storage.uploadImmutable(uploadPaths.map((path) => ({ localPath: local.localPaths.get(path)!, objectPath: releasePaths.file(path) })))
    const relisted = await storage.list('files/')
    const missing = manifest.files.filter((file) => relisted.get(releasePaths.file(file.path)) !== file.bytes)
    if (missing.length > 0) {
      throw new Error(`${missing.length} file(s) are still missing or the wrong size after upload, e.g. ${missing[0]!.path}`)
    }
    if (!remoteManifest) await storage.uploadImmutable([{ localPath: local.manifestPath, objectPath: manifestObject }])
    const uploaded = await storage.read(manifestObject)
    if (!uploaded) throw new Error(`${manifestObject} is missing after upload`)
    checkRemoteManifest(uploaded, manifest, manifestObject)

    if (channelBefore !== manifest.version) {
      const pointer: ReleaseChannel = {
        schemaMajor: SCHEMA_MAJOR,
        channel,
        version: manifest.version,
        manifest: manifestObject,
        updatedAt: now().toISOString(),
      }
      const scratch = await mkdtemp(resolve(tmpdir(), 'uma-release-'))
      try {
        const pointerPath = resolve(scratch, `${channel}.json`)
        await writeFile(pointerPath, JSON.stringify(pointer), 'utf8')
        await storage.replace({ localPath: pointerPath, objectPath: channelPath }, CHANNEL_CACHE_CONTROL)
      } finally {
        await rm(scratch, { recursive: true, force: true })
      }
    }
    channelAfter = parseRemoteChannel(await storage.read(channelPath), channelPath)?.version ?? null
    if (channelAfter !== manifest.version) {
      throw new Error(`Channel verification failed: ${channelPath} points at ${channelAfter ?? 'nothing'}, expected ${manifest.version}`)
    }
  }

  const sizes = new Map(manifest.files.map((file) => [file.path, file.bytes]))
  return {
    dryRun: options.dryRun ?? false,
    version: manifest.version,
    channel,
    channelBefore,
    channelAfter,
    uploadPaths,
    alreadyPresentPaths,
    manifestUploaded: !options.dryRun && !remoteManifest,
    totalBytes: manifest.files.reduce((total, file) => total + file.bytes, 0),
    uploadBytes: uploadPaths.reduce((total, path) => total + sizes.get(path)!, 0),
    referenceIssues: local.referenceIssues.length,
    elapsedMs: now().getTime() - startedAt,
  }
}
