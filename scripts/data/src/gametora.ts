// Fetches and locally caches GameTora's public datasets (ported from uma-racer scripts/data). The cache is keyed by
// dataset version, so an import always uses the versions GameTora's manifest names and never a stale copy.

import { mkdir, readFile, readdir, unlink, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

export const GAMETORA_MANIFEST_URL = 'https://gametora.com/data/manifests/umamusume.json'
export const GAMETORA_DATA_URL = 'https://gametora.com/data/umamusume'
export const DATASET_NAMES = [
  'character-cards',
  'characters',
  'support-cards',
  'skills',
  'races',
  'racetracks',
  'scenarios',
  'ura-objectives',
] as const

export type DatasetName = (typeof DATASET_NAMES)[number]
export type GameToraManifest = Record<string, string>

export interface JsonResponse {
  ok: boolean
  status: number
  json(): Promise<unknown>
}

export type FetchJson = (url: string) => Promise<JsonResponse>

export interface LoadGameToraOptions {
  /** Download every dataset again even when its version is cached. */
  refresh?: boolean
  /** Use the last cached manifest and datasets without any network access. */
  offline?: boolean
  cacheDir?: string
  fetcher?: FetchJson
}

export interface LoadedGameToraData {
  /** The dataset versions used, by dataset name. */
  versions: Record<DatasetName, string>
  datasets: Record<DatasetName, unknown>
  /** Datasets read from the cache rather than downloaded. */
  cacheHits: DatasetName[]
}

const packageDir = resolve(dirname(fileURLToPath(import.meta.url)), '..')
export const DEFAULT_CACHE_DIR = resolve(packageDir, '.cache')
const MANIFEST_CACHE = 'manifest.json'
const SAFE_VERSION = /^[A-Za-z0-9._-]+$/

const defaultFetcher: FetchJson = (url) =>
  fetch(url, { headers: { 'User-Agent': 'uma-platform-private-data-importer/1.0' } })

async function fetchJson(url: string, fetcher: FetchJson): Promise<unknown> {
  const response = await fetcher(url)
  if (!response.ok) throw new Error(`GameTora returned HTTP ${response.status} for ${url}`)
  return response.json()
}

export function parseManifest(value: unknown): GameToraManifest {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error('GameTora manifest is not an object')
  }
  const entries = Object.entries(value)
  if (entries.some(([, version]) => typeof version !== 'string' || !SAFE_VERSION.test(version))) {
    throw new Error('GameTora manifest contains an invalid version')
  }
  return Object.fromEntries(entries) as GameToraManifest
}

async function readCached(path: string): Promise<unknown | undefined> {
  try {
    return JSON.parse(await readFile(path, 'utf8'))
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return undefined
    throw error
  }
}

/** Removes cached copies of a dataset other than `keep` (older versions). */
async function pruneOlder(cacheDir: string, name: DatasetName, keep: string): Promise<void> {
  const entries = await readdir(cacheDir)
  await Promise.all(
    entries
      .filter((entry) => entry !== keep && entry.startsWith(`${name}.`) && entry.endsWith('.json'))
      .map((entry) => unlink(resolve(cacheDir, entry))),
  )
}

export async function loadGameToraData(options: LoadGameToraOptions = {}): Promise<LoadedGameToraData> {
  const fetcher = options.fetcher ?? defaultFetcher
  const cacheDir = options.cacheDir ?? DEFAULT_CACHE_DIR
  await mkdir(cacheDir, { recursive: true })

  let manifest: GameToraManifest
  if (options.offline) {
    const cached = await readCached(resolve(cacheDir, MANIFEST_CACHE))
    if (cached === undefined) throw new Error('No cached GameTora manifest; run once without --offline')
    manifest = parseManifest(cached)
  } else {
    manifest = parseManifest(await fetchJson(GAMETORA_MANIFEST_URL, fetcher))
    await writeFile(resolve(cacheDir, MANIFEST_CACHE), JSON.stringify(manifest), 'utf8')
  }

  const cacheHits: DatasetName[] = []
  const entries = await Promise.all(
    DATASET_NAMES.map(async (name) => {
      const version = manifest[name]
      if (!version) throw new Error(`GameTora manifest is missing ${name}`)
      const fileName = `${name}.${version}.json`
      const cachePath = resolve(cacheDir, fileName)
      const cached = options.refresh && !options.offline ? undefined : await readCached(cachePath)
      if (cached !== undefined) {
        cacheHits.push(name)
        return [name, cached] as const
      }
      if (options.offline) throw new Error(`${name} ${version} is not cached; run once without --offline`)
      const dataset = await fetchJson(`${GAMETORA_DATA_URL}/${name}.${version}.json`, fetcher)
      await writeFile(cachePath, JSON.stringify(dataset), 'utf8')
      await pruneOlder(cacheDir, name, fileName)
      return [name, dataset] as const
    }),
  )

  const versions = Object.fromEntries(DATASET_NAMES.map((name) => [name, manifest[name]!])) as Record<DatasetName, string>
  return { versions, datasets: Object.fromEntries(entries) as Record<DatasetName, unknown>, cacheHits }
}
