import { parseArtIndex, parseReleaseManifest, parseSet, type ReleaseManifest } from '@luismlorenzana/uma-data'
import { createHash } from 'node:crypto'
import { readFile, realpath } from 'node:fs/promises'
import { resolve, sep } from 'node:path'
import { bucketOf, type Catalog } from './model.js'

export async function inside(root: string, path: string): Promise<string> {
  const [base, file] = await Promise.all([realpath(root), realpath(resolve(root, path))])
  if (!file.startsWith(`${base}${sep}`)) throw new Error('File outside content directory.')
  return file
}

async function verifiedJson(root: string, manifest: ReleaseManifest, path: string): Promise<unknown> {
  const entry = manifest.files.find((file) => file.path === path)
  if (!entry) throw new Error(`Release is missing ${path}`)
  const bytes = await readFile(await inside(root, path))
  if (bytes.length !== entry.bytes || createHash('sha256').update(bytes).digest('hex') !== entry.sha256) {
    throw new Error(`Release verification failed for ${path}`)
  }
  return JSON.parse(bytes.toString('utf8')) as unknown
}

export async function loadCatalog(releaseDir: string): Promise<Catalog> {
  const manifest = parseReleaseManifest(JSON.parse(await readFile(resolve(releaseDir, 'manifest.json'), 'utf8')) as unknown, 'manifest')
  const [characters, outfits, art] = await Promise.all([
    verifiedJson(releaseDir, manifest, manifest.sets.characters).then((value) => parseSet('characters', value)),
    verifiedJson(releaseDir, manifest, manifest.sets.outfits).then((value) => parseSet('outfits', value)),
    manifest.art ? verifiedJson(releaseDir, manifest, manifest.art).then((value) => parseArtIndex(value, 'art')) : null,
  ])
  const names = new Map(characters.map((character) => [character.id, character.name.global ?? character.name.en ?? character.name.ja]))
  return {
    release: manifest.version,
    umas: outfits.map((outfit) => {
      const id = String(outfit.id)
      const portrait = art?.images['outfit-busts']?.[id] ?? art?.images['outfit-portraits']?.[id] ?? art?.images['outfit-faces']?.[id]
      const face = art?.images['outfit-faces']?.[id] ?? portrait
      return {
        id: outfit.id, characterId: outfit.characterId,
        name: names.get(outfit.characterId) ?? `Uma ${outfit.characterId}`,
        title: outfit.title.global ?? outfit.title.en ?? outfit.title.ja,
        original: outfit.variant === null, strategy: outfit.aptitudes.strategy, bucket: bucketOf(outfit.aptitudes.strategy),
        references: [
          ['Portrait', art?.images['outfit-portraits']?.[id]], ['Bust', art?.images['outfit-busts']?.[id]],
          ['Chibi A', art?.images['outfit-chibis']?.[id + '-a']], ['Chibi B', art?.images['outfit-chibis']?.[id + '-b']],
        ].flatMap(([label, image]) => image && typeof image !== 'string' ? [{ label: String(label), path: '/' + image.path }] : []),
        portrait: portrait ? `/${portrait.path}` : null, face: face ? `/${face.path}` : null,
      }
    }).sort((a, b) => a.name.localeCompare(b.name) || a.id - b.id),
  }
}
