// Content-addressed art writer, ported from uma-racer's atlas and art writers. It writes atlas pages and per-record
// images into the local release, then one art index (`data/art.<hash>.json`) that the manifest points at. Families
// not rebuilt in this run keep their files and index entries.

import {
  ATLAS_FAMILIES,
  IMAGE_FAMILIES,
  parseArtIndex,
  type ArtIndex,
  type Atlas,
  type AtlasFamily,
  type ImageFamily,
  type ReleaseFile,
  type ReleaseManifest,
} from '@luismlorenzana/uma-data'
import {
  readLocalManifest,
  readVerifiedFile,
  removeUnlisted,
  writeLocalManifest,
  writeReleaseFile,
} from '@uma-platform/data-pipeline/release-dir'
import type { BuiltAtlas } from './atlas'
import { safeId } from './download'

export interface AtlasDefinition {
  family: AtlasFamily
  atlas: BuiltAtlas
}

export interface ImageFamilyDefinition {
  family: ImageFamily
  images: readonly { id: string; bytes: Buffer; width: number; height: number }[]
}

export interface WriteArtOptions {
  releaseDir: string
  atlases?: readonly AtlasDefinition[]
  images?: readonly ImageFamilyDefinition[]
  now?: Date
}

const imageDir = (family: ImageFamily) => `art/${family}`

/** Whether a release path belongs to a family's files. */
function belongsTo(path: string, family: AtlasFamily | ImageFamily): boolean {
  if ((IMAGE_FAMILIES as readonly string[]).includes(family)) return path.startsWith(`${imageDir(family as ImageFamily)}/`)
  return path.startsWith(`atlases/${family}-`)
}

async function readPreviousIndex(releaseDir: string, manifest: ReleaseManifest): Promise<ArtIndex> {
  if (!manifest.art) return { atlases: {}, images: {} }
  const file = manifest.files.find((entry) => entry.path === manifest.art)!
  return parseArtIndex(JSON.parse((await readVerifiedFile(releaseDir, file)).toString('utf8')) as unknown, manifest.art)
}

export async function writeArt(options: WriteArtOptions): Promise<ReleaseManifest> {
  const { releaseDir } = options
  const previous = await readLocalManifest(releaseDir)
  if (!previous) throw new Error('No local release; run pnpm data:import first')
  const index = await readPreviousIndex(releaseDir, previous)
  const rebuilt = new Set<AtlasFamily | ImageFamily>([
    ...(options.atlases ?? []).map((entry) => entry.family),
    ...(options.images ?? []).map((entry) => entry.family),
  ])
  const files: ReleaseFile[] = previous.files.filter(
    (file) => file.path !== previous.art && ![...rebuilt].some((family) => belongsTo(file.path, family)),
  )

  for (const { family, atlas } of options.atlases ?? []) {
    const pages: Atlas['pages'] = []
    for (let page = 0; page < atlas.pages.length; page += 1) {
      const built = atlas.pages[page]!
      const file = await writeReleaseFile(releaseDir, 'atlases', `${family}-${page}`, 'webp', built.bytes)
      files.push(file)
      pages.push({ path: file.path, width: built.width, height: built.height })
    }
    index.atlases[family] = { frameWidth: 128, frameHeight: 128, pages, frames: atlas.frames }
  }

  for (const { family, images } of options.images ?? []) {
    const entries: Record<string, { path: string; width: number; height: number }> = {}
    for (const image of [...images].sort((left, right) => left.id.localeCompare(right.id, 'en', { numeric: true }))) {
      const file = await writeReleaseFile(releaseDir, imageDir(family), safeId(image.id), 'webp', image.bytes)
      files.push(file)
      entries[image.id] = { path: file.path, width: image.width, height: image.height }
    }
    index.images[family] = entries
  }

  // Families in a fixed order so the same art always gives the same index bytes.
  const ordered: ArtIndex = { atlases: {}, images: {} }
  for (const family of ATLAS_FAMILIES) if (index.atlases[family]) ordered.atlases[family] = index.atlases[family]
  for (const family of IMAGE_FAMILIES) if (index.images[family]) ordered.images[family] = index.images[family]
  const indexFile = await writeReleaseFile(releaseDir, 'data', 'art', 'json', JSON.stringify(ordered))
  files.push(indexFile)

  const manifest = await writeLocalManifest(
    releaseDir,
    { sources: previous.sources, sets: previous.sets, art: indexFile.path, files },
    options.now,
  )
  await removeUnlisted(releaseDir, 'data', manifest)
  await removeUnlisted(releaseDir, 'atlases', manifest)
  for (const family of IMAGE_FAMILIES) if (rebuilt.has(family)) await removeUnlisted(releaseDir, imageDir(family), manifest)
  return manifest
}
