// The catalog the Ranker shows (RK1): Umas from the master data release (the bucket in production, `content/release` in
// dev), enemies and the old boards' hints from the Ranker's own store (`catalog/`, `imports/`, `legacy.json`, uploaded
// by `pnpm ranker:push`). Built once and kept; `POST /api/ranker/reload` rebuilds it after a push.
import { createReleaseClient, ReleaseSourceError, type ReleaseSource } from '@luismlorenzana/uma-data'
import type { FileSource } from '@luismlorenzana/uma-server/content'
import {
  buildCatalog, emptyLegacy, enemyImagePaths, IMPORTED, parseEnemyCatalog, parseEnemyImport, parseLegacy,
  type EnemyImport, type TierCatalog,
} from '@uma-platform/tiers'
import type { BlobStore } from './blob-store'

export interface LoadedCatalog {
  catalog: TierCatalog
  imports: { franchise: string; source: string; filter: string; importedAt: string; units: number }[]
  /** The pack paths the asset route may serve. */
  images: Set<string>
  builtAt: string
}

const decoder = new TextDecoder()
const read = async (blobs: BlobStore, path: string): Promise<unknown | null> => {
  const blob = await blobs.read(path)
  return blob ? JSON.parse(decoder.decode(blob.bytes)) as unknown : null
}

/** uma-server's file source (bucket or folder) as uma-data's release source. */
export function releaseSource(files: FileSource): ReleaseSource {
  return {
    async read(path) {
      const bytes = await files.read(path)
      if (bytes === null) throw new ReleaseSourceError(path, 404, `Release file ${path} not found`)
      return bytes
    },
  }
}

export class CatalogService {
  private loading: Promise<LoadedCatalog> | undefined
  constructor(private readonly release: ReleaseSource, private readonly blobs: BlobStore) {}

  get(): Promise<LoadedCatalog> {
    this.loading ??= this.build()
    this.loading.catch(() => { this.loading = undefined })
    return this.loading
  }
  reload(): Promise<LoadedCatalog> {
    this.loading = undefined
    return this.get()
  }

  private async build(): Promise<LoadedCatalog> {
    const client = createReleaseClient({ source: this.release })
    const manifest = await client.manifest()
    const [characters, outfits, art, enemies, legacy, imports] = await Promise.all([
      client.set(manifest, 'characters'), client.set(manifest, 'outfits'), client.art(manifest),
      read(this.blobs, 'catalog/enemies.json').then((v) => (v === null ? null : parseEnemyCatalog(v))),
      read(this.blobs, 'legacy.json').then((v) => (v === null ? emptyLegacy() : parseLegacy(v))),
      Promise.all(IMPORTED.map((f) => read(this.blobs, `imports/${f}.json`).then((v) => (v === null ? null : parseEnemyImport(v))))),
    ])
    const found = imports.filter((i): i is EnemyImport => i !== null)
    const catalog = buildCatalog({ release: manifest.version, characters, outfits, art, enemies, imports: found, legacy })
    return {
      catalog, images: enemyImagePaths(catalog), builtAt: new Date().toISOString(),
      imports: found.map((i) => ({ franchise: i.franchise, source: i.source, filter: i.filter, importedAt: i.importedAt, units: i.units.length })),
    }
  }
}
