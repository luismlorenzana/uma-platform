// The local release folder (`content/release/`, gitignored): the same files, paths and manifest a published release
// has. `pnpm data:import` writes the sets, `pnpm assets:import` the art, `pnpm release:publish` uploads it.

import {
  parseReleaseManifest,
  parseSet,
  releaseVersion,
  verifyReleaseVersion,
  SCHEMA_MAJOR,
  type ReleaseFile,
  type ReleaseManifest,
  type SetItems,
  type SetName,
} from '@luismlorenzana/uma-data'
import { createHash } from 'node:crypto'
import { mkdir, readFile, readdir, rename, unlink, writeFile } from 'node:fs/promises'
import { dirname, posix, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
export const DEFAULT_CONTENT_DIR = resolve(repoRoot, 'content')
export const DEFAULT_RELEASE_DIR = resolve(DEFAULT_CONTENT_DIR, 'release')
export const OVERRIDES_DIR = resolve(DEFAULT_CONTENT_DIR, 'overrides')
export const MANIFEST_FILE = 'manifest.json'

/** Hex characters of a file's SHA-256 kept in its name; 64 bits keeps names short and collisions out of reach. */
export const NAME_HASH_LENGTH = 16

export function sha256(value: string | Uint8Array): string {
  return createHash('sha256').update(value).digest('hex')
}

/** `<stem>.<hash16>.<ext>`, the content-addressed name of a release file. */
export const hashedName = (stem: string, digest: string, extension: string): string =>
  `${stem}.${digest.slice(0, NAME_HASH_LENGTH)}.${extension}`

/** The uma-data version whose schema the pipeline writes (its package.json, read at run time). */
export async function schemaVersion(): Promise<string> {
  const raw = JSON.parse(await readFile(resolve(repoRoot, 'packages/data/package.json'), 'utf8')) as { version?: unknown }
  if (typeof raw.version !== 'string' || raw.version.split('.')[0] !== String(SCHEMA_MAJOR)) {
    throw new Error(`packages/data/package.json has version ${String(raw.version)}; expected ${SCHEMA_MAJOR}.x.y`)
  }
  return raw.version
}

/** The local manifest, parsed and checked against its file hashes, or null when there's none yet. */
export async function readLocalManifest(releaseDir: string = DEFAULT_RELEASE_DIR): Promise<ReleaseManifest | null> {
  let raw: string
  try {
    raw = await readFile(resolve(releaseDir, MANIFEST_FILE), 'utf8')
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null
    throw error
  }
  const manifest = parseReleaseManifest(JSON.parse(raw) as unknown, MANIFEST_FILE)
  await verifyReleaseVersion(manifest)
  return manifest
}

export interface ManifestParts {
  sources: Record<string, string>
  sets: Record<SetName, string>
  art: string | null
  files: readonly ReleaseFile[]
}

/** Writes the manifest for `parts` atomically and returns it; the version is the hash of the file hashes. */
export async function writeLocalManifest(
  releaseDir: string,
  parts: ManifestParts,
  now: Date = new Date(),
): Promise<ReleaseManifest> {
  const files = [...parts.files].sort((left, right) => left.path.localeCompare(right.path))
  const manifest: ReleaseManifest = {
    schemaMajor: SCHEMA_MAJOR,
    schemaVersion: await schemaVersion(),
    version: await releaseVersion(files.map((file) => file.sha256)),
    createdAt: now.toISOString(),
    sources: Object.fromEntries(Object.entries(parts.sources).sort(([left], [right]) => left.localeCompare(right))),
    sets: parts.sets,
    art: parts.art,
    files,
  }
  // Round-trip through the published parser so the pipeline can never write a manifest a client would reject.
  parseReleaseManifest(JSON.parse(JSON.stringify(manifest)) as unknown, MANIFEST_FILE)
  await mkdir(releaseDir, { recursive: true })
  const path = resolve(releaseDir, MANIFEST_FILE)
  const temporary = `${path}.${process.pid}.tmp`
  await writeFile(temporary, JSON.stringify(manifest), 'utf8')
  await rename(temporary, path)
  return manifest
}

/** Writes one content-addressed file under `dir` and returns its manifest entry. */
export async function writeReleaseFile(
  releaseDir: string,
  dir: string,
  stem: string,
  extension: string,
  bytes: string | Uint8Array,
): Promise<ReleaseFile> {
  const buffer = typeof bytes === 'string' ? Buffer.from(bytes, 'utf8') : Buffer.from(bytes)
  const digest = sha256(buffer)
  const path = posix.join(dir, hashedName(stem, digest, extension))
  await mkdir(resolve(releaseDir, dir), { recursive: true })
  await writeFile(resolve(releaseDir, path), buffer)
  return { path, bytes: buffer.byteLength, sha256: digest }
}

/** Deletes files in `dir` (non-recursive) that the manifest no longer lists. Published copies are never touched. */
export async function removeUnlisted(releaseDir: string, dir: string, manifest: ReleaseManifest): Promise<number> {
  const listed = new Set(manifest.files.map((file) => file.path))
  let entries: string[]
  try {
    entries = await readdir(resolve(releaseDir, dir))
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return 0
    throw error
  }
  const stale = entries.filter((name) => !listed.has(posix.join(dir, name)) && !name.endsWith('/'))
  await Promise.all(stale.map((name) => unlink(resolve(releaseDir, dir, name)).catch(() => undefined)))
  return stale.length
}

/** Reads one local release file and checks its length and SHA-256 against the manifest. */
export async function readVerifiedFile(releaseDir: string, file: ReleaseFile): Promise<Buffer> {
  let bytes: Buffer
  try {
    bytes = await readFile(resolve(releaseDir, ...file.path.split('/')))
  } catch (error) {
    throw new Error(`Local release file is missing: ${file.path}`, { cause: error })
  }
  if (bytes.byteLength !== file.bytes) {
    throw new Error(`Local release file has ${bytes.byteLength} bytes, the manifest says ${file.bytes}: ${file.path}`)
  }
  if (sha256(bytes) !== file.sha256) throw new Error(`Local release file fails its SHA-256: ${file.path}`)
  return bytes
}

/** One set of the local release, verified and parsed. */
export async function readLocalSet<N extends SetName>(
  releaseDir: string,
  manifest: ReleaseManifest,
  name: N,
): Promise<SetItems[N][]> {
  const file = manifest.files.find((entry) => entry.path === manifest.sets[name])
  if (!file) throw new Error(`The local manifest lists no file for ${name}`)
  return parseSet(name, JSON.parse((await readVerifiedFile(releaseDir, file)).toString('utf8')) as unknown)
}
