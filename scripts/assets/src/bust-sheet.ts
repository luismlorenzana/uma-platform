// Review sheets for cropped outfit art: every image, labelled, in pages the owner can scan on a phone. Writes to the
// gitignored content/review folder; nothing here is published.

import { parseArtIndex } from '@luismlorenzana/uma-data'
import {
  DEFAULT_CONTENT_DIR,
  DEFAULT_RELEASE_DIR,
  readLocalManifest,
  readLocalSet,
  readVerifiedFile,
} from '@uma-platform/data-pipeline/release-dir'
import { mkdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import sharp from 'sharp'

const LABEL = 30
const GAP = 8

const family = process.argv.includes('--family=outfit-faces') ? 'outfit-faces' : 'outfit-busts'
const sheet = family === 'outfit-faces'
  ? { tile: 192, columns: 5, rows: 6, prefix: 'faces' }
  : { tile: 128, columns: 6, rows: 8, prefix: 'busts' }

const escape = (text: string) => text.replace(/[&<>"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[char]!)

async function main(): Promise<void> {
  const releaseDir = DEFAULT_RELEASE_DIR
  const manifest = await readLocalManifest(releaseDir)
  if (!manifest?.art) throw new Error('No art in the local release; run pnpm assets:import first')
  const indexFile = manifest.files.find((file) => file.path === manifest.art)!
  const index = parseArtIndex(JSON.parse((await readVerifiedFile(releaseDir, indexFile)).toString('utf8')) as unknown, manifest.art)
  const images = Object.entries(index.images[family] ?? {}).sort(([left], [right]) => Number(left) - Number(right))
  const [outfits, characters] = await Promise.all([
    readLocalSet(releaseDir, manifest, 'outfits'),
    readLocalSet(releaseDir, manifest, 'characters'),
  ])
  const characterNames = new Map(characters.map((character) => [character.id, character.name.en ?? character.name.ja]))
  const names = new Map(outfits.map((outfit) => [String(outfit.id), `${characterNames.get(outfit.characterId) ?? ''} ${outfit.title.en ?? ''}`.trim()]))

  const outDir = resolve(DEFAULT_CONTENT_DIR, 'review')
  await mkdir(outDir, { recursive: true })
  const perPage = sheet.columns * sheet.rows
  for (let page = 0; page * perPage < images.length; page += 1) {
    const slice = images.slice(page * perPage, (page + 1) * perPage)
    const layers: sharp.OverlayOptions[] = []
    for (const [position, [id, image]] of slice.entries()) {
      const x = GAP + (position % sheet.columns) * (sheet.tile + GAP)
      const y = GAP + Math.floor(position / sheet.columns) * (sheet.tile + LABEL + GAP)
      const card = Buffer.from(`<svg width="${sheet.tile}" height="${sheet.tile + LABEL}"><rect x="0.5" y="0.5" width="${sheet.tile - 1}" height="${sheet.tile - 1}" rx="12" fill="#ffffff" stroke="#cfd8e6"/>` +
        `<text x="${sheet.tile / 2}" y="${sheet.tile + 12}" font-family="Helvetica" font-size="10" font-weight="bold" text-anchor="middle" fill="#23324a">${escape(id)}</text>` +
        `<text x="${sheet.tile / 2}" y="${sheet.tile + 25}" font-family="Helvetica" font-size="9" text-anchor="middle" fill="#5a6780">${escape((names.get(id) ?? '').slice(0, 26))}</text></svg>`)
      const art = await sharp(resolve(releaseDir, image.path)).resize(sheet.tile - 8, sheet.tile - 8).png().toBuffer()
      layers.push({ input: card, left: x, top: y }, { input: art, left: x + 4, top: y + 4 })
    }
    const width = GAP + sheet.columns * (sheet.tile + GAP)
    const height = GAP + Math.ceil(slice.length / sheet.columns) * (sheet.tile + LABEL + GAP)
    const file = resolve(outDir, `${sheet.prefix}-${String(page + 1).padStart(2, '0')}.png`)
    await sharp({ create: { width, height, channels: 4, background: '#f4f6fa' } }).composite(layers).png().toFile(file)
    console.log(file)
  }
  console.log(`${images.length} ${family} on ${Math.ceil(images.length / perPage)} pages`)
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
