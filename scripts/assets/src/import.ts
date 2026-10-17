// CLI for `pnpm assets:import`: icon atlases and per-record art for the local release (scripts/assets/README.md).

import { ATLAS_FAMILIES, IMAGE_FAMILIES, type AtlasFamily, type ImageFamily } from '@luismlorenzana/uma-data'
import { DEFAULT_RELEASE_DIR } from '@uma-platform/data-pipeline/release-dir'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildArtFamily, type ArtFamily } from './art'
import { buildAtlas } from './atlas'
import { downloadImages, type ImageSource } from './download'
import { readAssetInputs, readBustCrops, readFaceCrops, readScenarioIconOverrides } from './read'
import { artSources } from './sources'
import { buildWikiFamily, selectWikiArt, stageWikiFiles, stagedWikiFiles, WIKI_FAMILIES, type WikiKind } from './wiki'
import { writeArt, type AtlasDefinition, type ImageFamilyDefinition } from './write'

const packageDir = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const cacheDir = resolve(packageDir, '.cache')
const megabytes = (bytes: number): string => `${(bytes / 1024 / 1024).toFixed(1)} MB`

function option(name: string): string | undefined {
  const inline = process.argv.find((arg) => arg.startsWith(`${name}=`))
  if (inline) return inline.slice(name.length + 1)
  const index = process.argv.indexOf(name)
  return index === -1 ? undefined : process.argv[index + 1]
}

async function buildIconAtlas(family: AtlasFamily, sources: readonly ImageSource[], refresh: boolean): Promise<AtlasDefinition | null> {
  // Missing sources are skipped rather than fatal: games draw their own icon for an id the atlas lacks.
  const { images, failures } = await downloadImages(sources, { cacheDir, kind: family, refresh, concurrency: 8, optional: true })
  const hits = images.filter((image) => image.cacheHit).length
  console.log(`${family}: ${images.length} of ${sources.length} images (${hits} cache hits, ${images.length - hits} downloads)`)
  if (failures.length > 0) console.warn(`  skipped ${failures.length} without a source: ${failures.map((failure) => failure.id).join(', ')}`)
  if (images.length === 0) return null
  const atlas = await buildAtlas(images)
  atlas.pages.forEach((page, index) => console.log(`  page ${index}: ${page.width}x${page.height}, ${page.bytes.length} bytes`))
  return { family, atlas }
}

async function buildImages(family: ArtFamily, sources: readonly ImageSource[], refresh: boolean): Promise<ImageFamilyDefinition> {
  const [bustCrops, faceCrops] = await Promise.all([
    family === 'outfit-busts' || family === 'outfit-faces' ? readBustCrops() : {},
    family === 'outfit-faces' ? readFaceCrops() : {},
  ])
  const built = await buildArtFamily(family, sources, {
    cacheDir,
    refresh,
    bustCrops,
    faceCrops,
    onProgress: (done, total) => {
      if (done === total || done % 50 === 0) process.stdout.write(`\r${family}: encoded ${done}/${total}`)
    },
  })
  process.stdout.write('\r')
  const downloads = built.images.length - built.cacheHits
  console.log(`${family}: ${built.images.length} images (${built.cacheHits} cache hits, ${downloads} downloads), ${megabytes(built.bytes)}`)
  if (built.skipped.length > 0) {
    console.warn(`  ${built.skipped.length} without source art (games fall back to the icon): ${built.skipped.map((entry) => entry.id).join(', ')}`)
  }
  return { family, images: built.images }
}

/**
 * Chibis, outfit stands and faces from staged wiki files. `--source dir:<path>` stages the owner's folder first;
 * without it, whatever was staged before is used, and with nothing staged these families keep what the release has.
 */
async function buildWiki(outfits: Parameters<typeof selectWikiArt>[1], dryRun: boolean, wanted: (family: ImageFamily) => boolean) {
  const source = option('--source')
  if (source !== undefined) {
    if (!source.startsWith('dir:')) throw new Error('--source takes dir:<path>')
    const staged = await stageWikiFiles(resolve(source.slice(4).replace(/^~(?=\/)/, process.env.HOME ?? '~')), cacheDir)
    console.log(`wiki: staged ${staged.copied} new files, ${staged.kept} already cached`)
  }
  const files = await stagedWikiFiles(cacheDir)
  if (files.size === 0) {
    console.warn('wiki: nothing staged; chibi, dress and face art left as they are (pass --source dir:<path> once)')
    return []
  }
  const selection = selectWikiArt(files, outfits)
  console.log(`wiki: ${selection.chibi.length} chibis, ${selection.dress.length} outfit stands, ${selection.face.length} faces`)
  if (selection.missing.length > 0) console.warn(`  ${selection.missing.length} missing (games fall back): ${selection.missing.join(', ')}`)
  if (dryRun) return []
  const families: ImageFamilyDefinition[] = []
  for (const kind of ['chibi', 'dress', 'face'] as const satisfies readonly WikiKind[]) {
    const family = WIKI_FAMILIES[kind].family
    if (!wanted(family)) continue
    const images = await buildWikiFamily(kind, selection[kind], cacheDir)
    console.log(`${family}: ${images.length} images, ${megabytes(images.reduce((sum, image) => sum + image.bytes.length, 0))}`)
    families.push({ family, images })
  }
  return families
}

async function main(): Promise<void> {
  const refresh = process.argv.includes('--refresh')
  const dryRun = process.argv.includes('--dry-run')
  const releaseDir = DEFAULT_RELEASE_DIR
  const only = option('--families')?.split(',').filter(Boolean)
  const known = [...ATLAS_FAMILIES, ...IMAGE_FAMILIES] as readonly string[]
  if (only?.some((family) => !known.includes(family))) throw new Error(`--families takes any of: ${known.join(', ')}`)
  const wanted = (family: AtlasFamily | ImageFamily) => !only || only.includes(family)

  const inputs = await readAssetInputs(releaseDir)
  const sources = artSources(inputs, await readScenarioIconOverrides(inputs.scenarios))
  if (dryRun) {
    await buildWiki(inputs.outfits, true, wanted)
    return
  }

  const atlasSources: Record<AtlasFamily, ImageSource[]> = {
    'outfit-icons': sources.outfitIcons,
    'support-card-icons': sources.supportCardIcons,
    'skill-icons': sources.skillIcons,
    'scenario-icons': sources.scenarioIcons,
  }
  const atlases: AtlasDefinition[] = []
  for (const family of ATLAS_FAMILIES) {
    if (!wanted(family)) continue
    const built = await buildIconAtlas(family, atlasSources[family], refresh)
    if (built) atlases.push(built)
  }

  const images: ImageFamilyDefinition[] = []
  if (wanted('outfit-portraits')) images.push(await buildImages('outfit-portraits', sources.outfitPortraits, refresh))
  // Busts reuse the portrait sources just downloaded, so this pass is all cache hits.
  if (wanted('outfit-busts')) images.push(await buildImages('outfit-busts', sources.outfitPortraits, false))
  // Faces use the same portrait source and the bust crop as their starting point.
  if (wanted('outfit-faces')) images.push(await buildImages('outfit-faces', sources.outfitPortraits, false))
  if (wanted('support-card-art')) images.push(await buildImages('support-card-art', sources.supportCardArt, refresh))
  images.push(...(await buildWiki(inputs.outfits, false, wanted)))

  const manifest = await writeArt({ releaseDir, atlases, images })
  console.log(`Release: ${manifest.version} (${manifest.files.length} files)`)
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
