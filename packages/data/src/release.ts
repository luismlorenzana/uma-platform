// Release manifests and channels: the bucket layout from docs/architecture.md §2.2 (docs/master-data.md#releases).

import { arrayOf, fail, fields, isoDateTime, literal, nonNegativeInteger, nullable, object, text, type Parser } from './parse.js'

/** The schema major this package reads. Equal to the package's major version (P7). */
export const SCHEMA_MAJOR = 1

/** The master sets every release carries, each one JSON file. */
export const SET_NAMES = [
  'characters',
  'outfits',
  'support-cards',
  'skills',
  'scenarios',
  'races',
  'tracks',
  'courses',
  'objectives',
] as const
export type SetName = (typeof SET_NAMES)[number]

export interface ReleaseFile {
  /** Path under `files/`, e.g. `data/outfits.0123456789abcdef.json`. The name carries a prefix of its hash. */
  path: string
  bytes: number
  /** Lowercase hex SHA-256 of the file's bytes. */
  sha256: string
}

export interface ReleaseManifest {
  schemaMajor: typeof SCHEMA_MAJOR
  /** The `@luismlorenzana/uma-data` version whose schema wrote this release. */
  schemaVersion: string
  /** 12 hex characters of the SHA-256 over the sorted file hashes: the same content always gets the same version. */
  version: string
  createdAt: string
  /** Source dataset versions, e.g. `{ "gametora/skills": "…" }`. */
  sources: Record<string, string>
  /** Where each set's file is. A client ignores set names it doesn't know. */
  sets: Record<SetName, string>
  /** Where the art index is; null when the release has no art yet. */
  art: string | null
  files: ReleaseFile[]
}

export interface ReleaseChannel {
  schemaMajor: typeof SCHEMA_MAJOR
  /** The channel's name, e.g. `latest`. */
  channel: string
  version: string
  /** Bucket path of the manifest it points at. */
  manifest: string
  updatedAt: string
}

/** A file inside a set or art index: one record list. */
export interface SetFile<T> {
  set: SetName
  items: T[]
}

export const RELEASE_VERSION_PATTERN = /^[a-f0-9]{12}$/
const SHA256_PATTERN = /^[a-f0-9]{64}$/
const FILE_PATH_PATTERN = /^(?:data|atlases|art)\/[a-z0-9][a-z0-9._/-]*$/
const SEMVER_PATTERN = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/
const CHANNEL_PATTERN = /^[a-z][a-z0-9-]{0,31}$/

/** Bucket paths (docs/architecture.md §2.2). */
export const releasePaths = {
  channel: (channel = 'latest', major: number = SCHEMA_MAJOR) => `channels/v${major}/${channel}.json`,
  manifest: (version: string, major: number = SCHEMA_MAJOR) => `manifests/v${major}/${version}.json`,
  file: (path: string) => `files/${path}`,
}

const filePath: Parser<string> = (value, path) =>
  typeof value === 'string' && FILE_PATH_PATTERN.test(value) && !value.includes('..') && !value.includes('//')
    ? value
    : fail(path, 'a file path under data/, atlases/ or art/')

const version: Parser<string> = (value, path) =>
  typeof value === 'string' && RELEASE_VERSION_PATTERN.test(value) ? value : fail(path, 'a 12-character hex version')

export const parseReleaseFile: Parser<ReleaseFile> = (value, path) => {
  const f = fields(value, path)
  return {
    path: f('path', filePath),
    bytes: f('bytes', nonNegativeInteger),
    sha256: f('sha256', (entry, at) =>
      typeof entry === 'string' && SHA256_PATTERN.test(entry) ? entry : fail(at, 'a lowercase hex SHA-256'),
    ),
  }
}

export const parseReleaseManifest: Parser<ReleaseManifest> = (value, path) => {
  const f = fields(value, path)
  const files = f('files', arrayOf(parseReleaseFile))
  const paths = new Set(files.map((file) => file.path))
  if (paths.size !== files.length) fail(`${path}.files`, 'unique paths')
  const inFiles: Parser<string> = (entry, at) => {
    const target = filePath(entry, at)
    return paths.has(target) ? target : fail(at, 'a path listed in files')
  }
  const rawSets = f('sets', object)
  const sets = {} as Record<SetName, string>
  for (const name of SET_NAMES) sets[name] = inFiles(rawSets[name], `${path}.sets.${name}`)
  const manifest: ReleaseManifest = {
    schemaMajor: f('schemaMajor', literal(SCHEMA_MAJOR)),
    schemaVersion: f('schemaVersion', (entry, at) =>
      typeof entry === 'string' && SEMVER_PATTERN.test(entry) && entry.split('.')[0] === String(SCHEMA_MAJOR)
        ? entry
        : fail(at, `a ${SCHEMA_MAJOR}.x.y version`),
    ),
    version: f('version', version),
    createdAt: f('createdAt', isoDateTime),
    sources: f('sources', (entry, at) => {
      const record = object(entry, at)
      return Object.fromEntries(Object.entries(record).map(([key, source]) => [key, text(source, `${at}.${key}`)]))
    }),
    sets,
    art: f('art', nullable(inFiles)),
    files,
  }
  return manifest
}

export const parseReleaseChannel: Parser<ReleaseChannel> = (value, path) => {
  const f = fields(value, path)
  return {
    schemaMajor: f('schemaMajor', literal(SCHEMA_MAJOR)),
    channel: f('channel', (entry, at) =>
      typeof entry === 'string' && CHANNEL_PATTERN.test(entry) ? entry : fail(at, 'a lowercase channel name'),
    ),
    version: f('version', version),
    manifest: f('manifest', text),
    updatedAt: f('updatedAt', isoDateTime),
  }
}

/** Parses a set file, checking that it holds the expected set and that ids are unique. */
export function parseSetFile<T extends { id: number }>(
  value: unknown,
  name: SetName,
  parseItem: Parser<T>,
  path: string = name,
): SetFile<T> {
  const f = fields(value, path)
  f('set', literal(name))
  const items = f('items', arrayOf(parseItem))
  const seen = new Set<number>()
  items.forEach((item, index) => {
    if (seen.has(item.id)) fail(`${path}.items[${index}].id`, `a unique id (${item.id} repeats)`)
    seen.add(item.id)
  })
  return { set: name, items }
}

/** The release version for a list of file hashes: the first 12 hex characters of SHA-256 over them, sorted. */
export async function releaseVersion(fileHashes: readonly string[]): Promise<string> {
  return (await sha256Hex(new TextEncoder().encode([...fileHashes].sort().join('')))).slice(0, 12)
}

/** Lowercase hex SHA-256 with WebCrypto, available in browsers and Node 20+. */
export async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes as Uint8Array<ArrayBuffer>)
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')
}

/** Checks that a manifest's version matches its files. */
export async function verifyReleaseVersion(manifest: ReleaseManifest): Promise<void> {
  const expected = await releaseVersion(manifest.files.map((file) => file.sha256))
  if (expected !== manifest.version) fail('manifest.version', `${expected}, the hash of its files`)
}
