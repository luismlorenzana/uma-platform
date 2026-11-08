// `pnpm release:publish -- --sprites-only` (UA5, CR27): a release that is the published `latest` plus the local
// release's sprite sets. Every file of `latest` is carried byte for byte except its art index, which is replaced by
// the same index with a `sprites` map. A GameTora refresh in the local release never rides along.

import {
  parseArtIndex,
  parseReleaseManifest,
  parseSpriteSet,
  releasePaths,
  releaseVersion,
  verifyReleaseVersion,
  SCHEMA_MAJOR,
  type ReleaseFile,
  type ReleaseManifest,
  type SpriteSet,
} from '@luismlorenzana/uma-data'
import { createHash } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { parseRemoteChannel, type ReleaseStorageClient } from './publish'
import { MANIFEST_FILE, NAME_HASH_LENGTH, readLocalManifest, readVerifiedFile, schemaVersion } from './release-dir'

const sha256 = (bytes: Buffer | string) => createHash('sha256').update(bytes).digest('hex')

export interface SpritesOnlyPlan {
  /** The published release it builds on. */
  base: ReleaseManifest
  manifest: ReleaseManifest
  /** Where the new manifest and the new art index were written. */
  manifestPath: string
  /** Local copies of the files the bucket may lack: the new art index and every sprite file. */
  localPaths: Map<string, string>
  /** The sprite sets this release adds or replaces, by outfit id. */
  added: SpriteSet[]
  /** Every outfit the new release's `sprites` map lists. */
  sprites: Record<string, string>
}

export interface PlanSpritesOnlyOptions {
  /** The local release holding the packed sprite files (`pnpm sprites:pack`). */
  releaseDir: string
  storage: ReleaseStorageClient
  /** An empty folder for the new manifest and art index. */
  stagingDir: string
  /** The channel whose release it builds on. Always `latest` in practice. */
  from?: string
  now?: () => Date
}

async function remoteBase(storage: ReleaseStorageClient, from: string): Promise<{ manifest: ReleaseManifest; index: Record<string, unknown> }> {
  const channelPath = releasePaths.channel(from)
  const pointer = parseRemoteChannel(await storage.read(channelPath), channelPath)
  if (!pointer) throw new Error(`${channelPath} doesn't exist; a sprite-only release builds on a published one`)
  const raw = await storage.read(pointer.manifest)
  if (!raw) throw new Error(`${pointer.manifest} is missing from the bucket`)
  const manifest = parseReleaseManifest(JSON.parse(raw.toString('utf8')) as unknown, pointer.manifest)
  await verifyReleaseVersion(manifest)
  if (manifest.version !== pointer.version) throw new Error(`${pointer.manifest} holds version ${manifest.version}, not ${pointer.version}`)
  let index: Record<string, unknown> = { atlases: {}, images: {} }
  if (manifest.art) {
    const entry = manifest.files.find((file) => file.path === manifest.art)!
    const bytes = await storage.read(releasePaths.file(entry.path))
    if (!bytes || bytes.byteLength !== entry.bytes || sha256(bytes) !== entry.sha256) throw new Error(`The published art index ${entry.path} fails its hash`)
    index = JSON.parse(bytes.toString('utf8')) as Record<string, unknown>
    parseArtIndex(index, entry.path)
  }
  return { manifest, index }
}

export async function planSpritesOnly(options: PlanSpritesOnlyOptions): Promise<SpritesOnlyPlan> {
  const now = options.now ?? (() => new Date())
  const { manifest: base, index: baseIndex } = await remoteBase(options.storage, options.from ?? 'latest')

  const local = await readLocalManifest(options.releaseDir)
  if (!local?.art) throw new Error('The local release has no art index; run pnpm sprites:pack first')
  const localIndexFile = local.files.find((file) => file.path === local.art)!
  const localIndex = parseArtIndex(JSON.parse((await readVerifiedFile(options.releaseDir, localIndexFile)).toString('utf8')) as unknown, local.art)
  const localSprites = localIndex.sprites ?? {}
  if (Object.keys(localSprites).length === 0) throw new Error('The local release has no sprite sets; run pnpm sprites:pack first')

  const byPath = new Map(local.files.map((file) => [file.path, file]))
  const localPaths = new Map<string, string>()
  const spriteFiles: ReleaseFile[] = []
  const added: SpriteSet[] = []
  const take = async (path: string) => {
    const file = byPath.get(path)
    if (!file) throw new Error(`The local manifest doesn't list ${path}`)
    await readVerifiedFile(options.releaseDir, file)
    localPaths.set(path, resolve(options.releaseDir, ...path.split('/')))
    spriteFiles.push(file)
    return file
  }
  for (const [outfitId, path] of Object.entries(localSprites)) {
    await take(path)
    const set = parseSpriteSet(JSON.parse((await readVerifiedFile(options.releaseDir, byPath.get(path)!)).toString('utf8')) as unknown, path)
    if (String(set.outfitId) !== outfitId) throw new Error(`${path} holds outfit ${set.outfitId}, not ${outfitId}`)
    for (const page of set.pages) await take(page.path)
    added.push(set)
  }

  // The published index, untouched except for its `sprites` map: earlier sets stay unless a newer one replaces them.
  const merged = { ...((baseIndex.sprites as Record<string, string> | undefined) ?? {}), ...localSprites }
  const sprites = Object.fromEntries(Object.entries(merged).sort(([a], [b]) => Number(a) - Number(b)))
  const nextIndex = { ...baseIndex, sprites }
  const indexJson = JSON.stringify(nextIndex)
  parseArtIndex(JSON.parse(indexJson) as unknown, 'art index')
  const indexSha = sha256(indexJson)
  const indexFile: ReleaseFile = { path: `data/art.${indexSha.slice(0, NAME_HASH_LENGTH)}.json`, bytes: Buffer.byteLength(indexJson), sha256: indexSha }
  await mkdir(resolve(options.stagingDir, 'data'), { recursive: true })
  const indexPath = resolve(options.stagingDir, ...indexFile.path.split('/'))
  await writeFile(indexPath, indexJson, 'utf8')
  localPaths.set(indexFile.path, indexPath)

  const files = new Map(base.files.filter((file) => file.path !== base.art).map((file) => [file.path, file]))
  for (const file of [...spriteFiles, indexFile]) {
    const existing = files.get(file.path)
    if (existing && (existing.sha256 !== file.sha256 || existing.bytes !== file.bytes)) throw new Error(`${file.path} differs from the published file of that name`)
    files.set(file.path, file)
  }
  const sorted = [...files.values()].sort((a, b) => a.path.localeCompare(b.path))
  const manifest: ReleaseManifest = {
    schemaMajor: SCHEMA_MAJOR,
    schemaVersion: await schemaVersion(),
    version: await releaseVersion(sorted.map((file) => file.sha256)),
    createdAt: now().toISOString(),
    sources: base.sources,
    sets: base.sets,
    art: indexFile.path,
    files: sorted,
  }
  const manifestJson = JSON.stringify(manifest)
  parseReleaseManifest(JSON.parse(manifestJson) as unknown, MANIFEST_FILE)
  await verifyReleaseVersion(manifest)
  checkCarried(base, manifest)
  const manifestPath = resolve(options.stagingDir, MANIFEST_FILE)
  await writeFile(manifestPath, manifestJson, 'utf8')
  for (const set of Object.values(sprites)) if (!files.has(set)) throw new Error(`${set} is in the sprites map but not in the release`)
  return { base, manifest, manifestPath, localPaths, added, sprites }
}

/** Every file of `base` but its art index is in `next` with the same bytes and hash; the sets are the same files. */
export function checkCarried(base: ReleaseManifest, next: ReleaseManifest): { carried: number } {
  const nextFiles = new Map(next.files.map((file) => [file.path, file]))
  let carried = 0
  for (const file of base.files) {
    if (file.path === base.art) continue
    const same = nextFiles.get(file.path)
    if (!same || same.sha256 !== file.sha256 || same.bytes !== file.bytes) throw new Error(`${file.path} isn't carried byte for byte`)
    carried += 1
  }
  if (JSON.stringify(base.sets) !== JSON.stringify(next.sets)) throw new Error('The master sets changed in a sprite-only release')
  return { carried }
}

/**
 * Records which sprite revisions `latest` serves in `content/authoring/sprites/published.json`
 * (`{ "<outfitId>": { revision, version } }`), so `pnpm sprites:progress` and the Studio show them as published.
 */
export async function recordPublished(storage: ReleaseStorageClient, version: string, file: string): Promise<number> {
  const raw = await storage.read(releasePaths.manifest(version))
  if (!raw) throw new Error(`${releasePaths.manifest(version)} isn't in the bucket`)
  const manifest = parseReleaseManifest(JSON.parse(raw.toString('utf8')) as unknown, releasePaths.manifest(version))
  if (!manifest.art) return 0
  const read = async (path: string) => {
    const entry = manifest.files.find((candidate) => candidate.path === path)!
    const bytes = await storage.read(releasePaths.file(path))
    if (!bytes || sha256(bytes) !== entry.sha256) throw new Error(`${path} fails its hash`)
    return JSON.parse(bytes.toString('utf8')) as unknown
  }
  const index = parseArtIndex(await read(manifest.art), manifest.art)
  const published: Record<string, { revision: number; version: string }> = {}
  for (const [outfitId, path] of Object.entries(index.sprites ?? {})) {
    published[outfitId] = { revision: parseSpriteSet(await read(path), path).revision, version }
  }
  await mkdir(resolve(file, '..'), { recursive: true })
  await writeFile(file, JSON.stringify(published, null, 2) + '\n', 'utf8')
  return Object.keys(published).length
}
