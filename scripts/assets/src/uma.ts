// `pnpm uma:check` and `pnpm uma:report` (docs/new-umas.md).
// check: GameTora against the local release, before anything changes. report: the local release against the published
// one, after the import, with a review sheet of the new outfits. Neither touches the release.

import { createReleaseClient, parseArtIndex, type ArtIndex, type ImageFamily, type MasterData, type Outfit } from '@luismlorenzana/uma-data'
import { DATASET_NAMES, loadGameToraData } from '@uma-platform/data-pipeline/gametora'
import { DEFAULT_BUCKET, DEFAULT_PROJECT, GcloudStorageClient } from '@uma-platform/data-pipeline/gcloud-storage'
import { DEFAULT_CONTENT_DIR, DEFAULT_RELEASE_DIR, readLocalManifest, readLocalSet, readVerifiedFile } from '@uma-platform/data-pipeline/release-dir'
import { normalizeSets } from '@uma-platform/data-pipeline/sets'
import { mkdir, readdir } from 'node:fs/promises'
import { homedir } from 'node:os'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'
import { artGaps, describeNews, hasNews, newRecords, wikiPage, type RecordSets } from './new-umas'
import { parseWikiName } from './wiki'

const releaseDir = DEFAULT_RELEASE_DIR
const assetCache = resolve(dirname(fileURLToPath(import.meta.url)), '../.cache')
/** The owner's copy of the wiki's files (`assets:import --source`). */
const WIKI_FOLDER = resolve(homedir(), 'Documents/uma-content')

async function localRelease(): Promise<{ version: string; sources: Record<string, string>; sets: RecordSets; art: ArtIndex | null }> {
  const manifest = await readLocalManifest(releaseDir)
  if (!manifest) throw new Error('No local release; run pnpm uma:import first')
  const [characters, outfits, supportCards, skills, scenarios] = await Promise.all([
    readLocalSet(releaseDir, manifest, 'characters'),
    readLocalSet(releaseDir, manifest, 'outfits'),
    readLocalSet(releaseDir, manifest, 'support-cards'),
    readLocalSet(releaseDir, manifest, 'skills'),
    readLocalSet(releaseDir, manifest, 'scenarios'),
  ])
  const indexFile = manifest.files.find((file) => file.path === manifest.art)
  const art = indexFile ? parseArtIndex(JSON.parse((await readVerifiedFile(releaseDir, indexFile)).toString('utf8')) as unknown, indexFile.path) : null
  return { version: manifest.version, sources: manifest.sources, sets: { characters, outfits, supportCards, skills, scenarios }, art }
}

async function wikiFiles(): Promise<Set<string>> {
  const names = await Promise.all([resolve(assetCache, 'wiki'), WIKI_FOLDER].map((dir) => readdir(dir).catch(() => [] as string[])))
  return new Set(names.flat().filter((name) => parseWikiName(name) !== null))
}

function printSaveList(files: readonly string[], held: ReadonlySet<string>): void {
  const toSave = files.filter((file) => !held.has(file))
  if (toSave.length === 0) return
  console.log(`\nStands to save by hand into ${WIKI_FOLDER} (${toSave.length}; games fall back until then):`)
  for (const file of toSave) console.log(`  ${wikiPage(file)}`)
}

async function check(): Promise<void> {
  const local = await localRelease()
  const { versions, datasets } = await loadGameToraData()
  const moved = DATASET_NAMES.filter((name) => local.sources[`gametora/${name}`] !== versions[name])
  console.log(`Local release ${local.version} against GameTora: ${moved.length === 0 ? 'every dataset is current' : `${moved.length} of ${DATASET_NAMES.length} datasets moved (${moved.join(', ')})`}`)

  const { data, warnings } = normalizeSets(datasets)
  const news = newRecords(local.sets, data)
  if (!hasNews(news)) {
    console.log('Nothing new. Next check when a banner opens.')
    return
  }
  console.log(describeNews(news, data).join('\n'))
  for (const warning of warnings) console.warn(`Warning: ${warning}`)
  printSaveList(artGaps(data, local.art).wikiFiles, await wikiFiles())
  console.log('\nNext: pnpm uma:import')
}

/** One row a new outfit: bust, face, window, the window at list size and its chibi, labelled. */
async function reviewSheet(outfits: readonly Outfit[], art: ArtIndex, sets: RecordSets): Promise<string> {
  const ROW = 280
  const TILE = 256
  const GAP = 12
  const characters = new Map(sets.characters.map((character) => [character.id, character]))
  const cells: readonly (readonly [ImageFamily, (id: number) => string, number])[] = [
    ['outfit-portraits', String, TILE],
    ['outfit-busts', String, TILE],
    ['outfit-faces', String, TILE],
    ['outfit-glass', String, TILE],
    ['outfit-glass', String, 68],
    ['outfit-chibis', (id) => `${id}-a`, TILE],
  ]
  const width = GAP + cells.reduce((sum, [, , size]) => sum + size + GAP, 0)
  const layers: sharp.OverlayOptions[] = []
  for (const [row, outfit] of outfits.entries()) {
    const top = GAP + row * (ROW + GAP)
    const character = characters.get(outfit.characterId)
    const label = `${outfit.id} ${character?.name.en ?? ''} ${outfit.title.en ?? outfit.title.ja} (${outfit.variant ?? 'original'})`.replace(/[&<>"]/g, '')
    layers.push({ input: Buffer.from(`<svg width="${width}" height="18"><text x="0" y="14" font-family="Helvetica" font-size="13" fill="#23324a">${label}</text></svg>`), left: GAP, top })
    let left = GAP
    for (const [family, key, size] of cells) {
      const image = art.images[family]?.[key(outfit.id)]
      if (image) layers.push({ input: await sharp(resolve(releaseDir, image.path)).resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer(), left, top: top + 20 })
      else layers.push({ input: Buffer.from(`<svg width="${size}" height="${TILE}"><rect width="${size}" height="${TILE}" fill="#f7e3e3"/><text x="8" y="20" font-family="Helvetica" font-size="12" fill="#a33">missing</text></svg>`), left, top: top + 20 })
      left += size + GAP
    }
  }
  const file = resolve(DEFAULT_CONTENT_DIR, 'review', 'new-umas.png')
  await mkdir(dirname(file), { recursive: true })
  await sharp({ create: { width, height: GAP + outfits.length * (ROW + GAP), channels: 4, background: '#eef1f6' } }).composite(layers).png().toFile(file)
  return file
}

async function report(): Promise<void> {
  const local = await localRelease()
  const storage = new GcloudStorageClient(process.env.UMA_RELEASE_BUCKET ?? DEFAULT_BUCKET, process.env.UMA_GCP_PROJECT ?? DEFAULT_PROJECT)
  const client = createReleaseClient({
    source: {
      read: async (path) => {
        const bytes = await storage.read(path)
        if (!bytes) throw new Error(`${path} isn't in the bucket`)
        return bytes
      },
    },
  })
  const published: { manifest: { version: string }; data: MasterData } = await client.load()
  console.log(`Local release ${local.version} against the published ${published.manifest.version}:`)
  const news = newRecords(published.data, local.sets)
  console.log(hasNews(news) ? describeNews(news, local.sets).join('\n') : 'No record changes.')

  const gaps = artGaps(local.sets, local.art)
  console.log(`\nArt: ${gaps.required.length} required missing, ${gaps.optional.length} optional missing`)
  if (gaps.optional.length > 0) console.log(`  optional: ${gaps.optional.slice(0, 12).join(', ')}${gaps.optional.length > 12 ? ', …' : ''}`)
  printSaveList(gaps.wikiFiles, await wikiFiles())
  if (news.outfits.length > 0 && local.art) console.log(`\nReview sheet: ${await reviewSheet(news.outfits, local.art, local.sets)}`)

  if (gaps.required.length > 0) {
    console.error(`\nNot ready to publish; missing: ${gaps.required.join(', ')}`)
    process.exitCode = 1
    return
  }
  console.log('\nNext: pnpm release:publish -- --dry-run')
}

const command = process.argv[2]
const run = command === 'check' ? check : command === 'report' ? report : null
if (!run) throw new Error('uma.ts takes check or report')
run().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
