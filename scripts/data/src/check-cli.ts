// CLI for `pnpm release:check` (UA5): reads a published channel back the way a game will and checks it.
//   pnpm release:check -- --channel candidate --against latest [--added-families=outfit-renders] [--local <dir>]
// It loads the channel with the release client (every set and the art index, hash-checked), confirms the bucket holds
// every file at its size, loads each sprite set with `spriteSet` and decodes each of its pages, reads the `enemies` set
// and each enemy key with `enemyKey` and checks her images (enemy-keys.md §6), and with `--against` confirms every file
// of the other channel's release is carried byte for byte. `--local <dir>` reads a release written there by
// `release:publish -- --local <dir>` first, then the bucket (Q16 part A's dry run).

import { BOSS_LAYERS, createReleaseClient, ENEMY_BORDER, enemyKeyPaths, parseArtIndex, ReleaseSourceError, type ReleaseSource } from '@luismlorenzana/uma-data'
import { resolve } from 'node:path'
import sharp from 'sharp'
import { clearBorder, decodeRgba, recomposites } from './enemy-images'
import { DEFAULT_BUCKET, DEFAULT_PROJECT, GcloudStorageClient } from './gcloud-storage'
import { LocalOverlayStorage } from './local-storage'
import { changedSets, checkCarried } from './sprites-only'

function argument(name: string): string | null {
  const inline = process.argv.find((arg) => arg.startsWith(`${name}=`))
  if (inline) return inline.slice(name.length + 1)
  const index = process.argv.indexOf(name)
  return index < 0 ? null : process.argv[index + 1] ?? null
}

/** A profile's whole catalog (format.md §7): actions, body frames and face patches. */
interface Catalog { actions: number; frames: number; faces: number; requires: string[]; before?: string }
/**
 * Each profile's catalog, the current one first. A traveler set published before P105 (batch 1 at 118 frames, without
 * `walk-left` and `run-left`) still passes, with a note, until its next revision replaces it.
 */
const PROFILES: Record<string, Catalog[]> = {
  traveler: [
    { actions: 29, frames: 130, faces: 7, requires: ['walk-left', 'run-left'] },
    { actions: 27, frames: 118, faces: 7, requires: [], before: 'P105' },
  ],
  townsfolk: [{ actions: 12, frames: 45, faces: 2, requires: ['walk-left'] }],
}

async function main(): Promise<void> {
  const project = argument('--project') ?? process.env.UMA_GCP_PROJECT ?? DEFAULT_PROJECT
  const bucket = argument('--bucket') ?? process.env.UMA_RELEASE_BUCKET ?? DEFAULT_BUCKET
  const channel = argument('--channel') ?? 'latest'
  const against = argument('--against')
  // A families-only release (P137) may add these image families to the art index, and nothing else.
  const addedFamilies = (argument('--added-families') ?? '').split(',').filter(Boolean)
  const localDir = argument('--local')
  const bucketStorage = new GcloudStorageClient(bucket, project)
  const storage = localDir ? new LocalOverlayStorage(resolve(localDir), bucketStorage) : bucketStorage
  if (localDir) console.log(`Reading ${resolve(localDir)} first, then gs://${bucket}`)
  const source: ReleaseSource = {
    async read(path) {
      const bytes = await storage.read(path)
      if (!bytes) throw new ReleaseSourceError(path, 404, `${path} isn't in gs://${bucket}`)
      return new Uint8Array(bytes)
    },
  }
  const failures: string[] = []
  const client = createReleaseClient({ source, channel })
  const pointer = await client.channel()
  const { manifest, data, art } = await client.load()
  console.log(`${channel} → ${manifest.version}: ${manifest.files.length} files, schema ${manifest.schemaVersion}, ` +
    `sets ${Object.values(data).map((items) => items.length).join('/')}, art ${art ? 'loaded' : 'none'} (updated ${pointer.updatedAt})`)

  const listed = await storage.list('files/')
  const absent = manifest.files.filter((file) => listed.get(`files/${file.path}`) !== file.bytes)
  if (absent.length > 0) failures.push(`${absent.length} file(s) missing or the wrong size in the bucket, e.g. ${absent[0]!.path}`)
  else console.log(`Bucket: all ${manifest.files.length} files present at their sizes`)

  const sprites = Object.keys(art?.sprites ?? {}).map(Number).sort((a, b) => a - b)
  let pages = 0
  let pageBytes = 0
  for (const outfitId of sprites) {
    const set = (await client.spriteSet(manifest, art!, outfitId))!
    const frames = Object.values(set.actions).reduce((sum, action) => sum + action.frames.length, 0)
    const catalogs = PROFILES[set.profile]
    const counts = `${Object.keys(set.actions).length} actions, ${frames} frames, ${Object.keys(set.faces).length} patches`
    const match = catalogs?.find((c) => Object.keys(set.actions).length === c.actions && frames === c.frames &&
      Object.keys(set.faces).length === c.faces && c.requires.every((name) => name in set.actions))
    if (catalogs && !match) failures.push(`${outfitId}: ${counts}, not a whole ${set.profile} set (format.md §7)`)
    for (const page of set.pages) {
      const bytes = await client.file(manifest, page.path)
      const meta = await sharp(bytes).metadata()
      if (meta.format !== 'webp' || meta.width !== page.width || meta.height !== page.height) failures.push(`${page.path} doesn't decode as a ${page.width}x${page.height} WebP`)
      pages += 1
      pageBytes += bytes.byteLength
    }
    console.log(`Sprite set ${outfitId} r${set.revision} ${set.profile}: ${counts}, ${set.pages.length} page(s)`)
    if (match?.before) console.log(`  ${outfitId} is drawn to the catalog before ${match.before}; its next revision completes it`)
  }
  if (sprites.length > 0) console.log(`Sprite pages: ${pages} decoded, ${(pageBytes / 1024 / 1024).toFixed(2)} MB, every hash checked`)

  // The enemies set and the enemy-keys family (Q16 part A), read like a game reads them. Counts only: no names.
  const enemies = await client.enemies(manifest)
  if (enemies) {
    const count = (tier: string) => enemies.filter((enemy) => enemy.tier === tier).length
    console.log(`Enemies: ${enemies.length} (${count('boss')} boss, ${count('key')} key, ${count('regular')} regular) ` +
      `from ${new Set(enemies.map((enemy) => enemy.franchise)).size} franchises`)
  }
  const keyIds = Object.keys(art?.enemyKeys ?? {}).map(Number).sort((a, b) => a - b)
  const roster = new Set((enemies ?? []).map((enemy) => enemy.id))
  let images = 0
  let imageBytes = 0
  for (const enemyId of keyIds) {
    const key = (await client.enemyKey(manifest, art!, enemyId))!
    if (!roster.has(enemyId)) console.log(`  enemy key ${enemyId} has no entry in the enemies set`)
    const decoded = new Map<string, Awaited<ReturnType<typeof decodeRgba>>>()
    for (const path of enemyKeyPaths(key)) {
      const bytes = await client.file(manifest, path)
      const meta = await sharp(bytes).metadata()
      if (meta.format !== 'webp') failures.push(`${path} isn't a WebP`)
      const rgba = await decodeRgba(bytes)
      if (rgba.width !== key.canvas.width || rgba.height !== key.canvas.height) failures.push(`${path} doesn't decode at ${key.canvas.width}x${key.canvas.height}`)
      else if (!clearBorder(rgba, ENEMY_BORDER)) failures.push(`${path} reaches into its ${ENEMY_BORDER} px border`)
      decoded.set(path, rgba)
      images += 1
      imageBytes += bytes.byteLength
    }
    const battle = key.poses.battle!
    let layered = ''
    if (battle.layers) {
      const fit = recomposites(battle.layers.map((layer) => decoded.get(layer.path)!), decoded.get(battle.path)!)
      if (!fit.ok) failures.push(`${enemyId}: the battle pose's layers don't re-composite to it (alpha off by ${fit.alpha}, colour by ${fit.color.toFixed(1)} at ${fit.at?.x},${fit.at?.y})`)
      layered = `; battle in ${battle.layers.length} layers (${battle.layers.map((layer) => layer.name).join(', ')}), ${fit.ok ? 're-composited exactly' : 'NOT re-compositing'}`
      if (battle.layers.length < BOSS_LAYERS.min) failures.push(`${enemyId}: fewer than ${BOSS_LAYERS.min} layers`)
    }
    console.log(`Enemy key ${enemyId} r${key.revision} ${key.tier}: ${Object.keys(key.poses).join(', ')} on ${key.canvas.width}x${key.canvas.height}, ` +
      `figure ${key.display.figure}${key.display.envelope ? `, envelope ${key.display.envelope}` : ''}${layered}`)
  }
  if (keyIds.length > 0) console.log(`Enemy images: ${images} decoded, ${(imageBytes / 1024 / 1024).toFixed(2)} MB, every hash checked`)

  if (against) {
    const base = await createReleaseClient({ source, channel: against }).manifest()
    if (base.version === manifest.version) console.log(`${against} is the same release`)
    else {
      const sets = changedSets(base, manifest)
      const { carried } = checkCarried(base, manifest, sets)
      const allowed = ['`sprites`', '`enemyKeys`', ...addedFamilies.map((family) => `\`${family}\``)].join(', ')
      console.log(`Against ${against} (${base.version}): ${carried} of ${base.files.length} files carried byte for byte; ` +
        `the sets ${sets.length ? `change only by ${sets.join(', ')}` : 'unchanged'}; the art index may change only by ${allowed}`)
      if (base.art && manifest.art) {
        const read = async (path: string) => JSON.parse(new TextDecoder().decode(await client.file(path === base.art ? base : manifest, path))) as Record<string, unknown>
        const [before, after] = await Promise.all([read(base.art), read(manifest.art)])
        parseArtIndex(after, manifest.art)
        const strip = ({ sprites: _sprites, enemyKeys: _enemyKeys, images, ...rest }: Record<string, unknown>) => {
          const kept = Object.fromEntries(Object.entries((images ?? {}) as Record<string, unknown>).filter(([family]) => !addedFamilies.includes(family)))
          return JSON.stringify({ ...rest, images: kept })
        }
        if (strip(before) !== strip(after)) failures.push(`The art index changed beyond its sprites and enemyKeys maps${addedFamilies.length ? ' and the added families' : ''}`)
        const keysBefore = Object.keys((before.enemyKeys ?? {}) as Record<string, string>).length, keysAfter = Object.keys((after.enemyKeys ?? {}) as Record<string, string>).length
        if (keysBefore !== keysAfter || sets.includes('enemies')) console.log(`Enemy keys: ${keysBefore} → ${keysAfter}`)
        const dropped = Object.keys((before.enemyKeys ?? {}) as Record<string, string>).filter((id) => !(id in ((after.enemyKeys ?? {}) as Record<string, string>)))
        if (dropped.length > 0) failures.push(`${dropped.length} enemy key(s) of ${against} are gone, e.g. ${dropped[0]}`)
        const beforeImages = (before.images ?? {}) as Record<string, unknown>, afterImages = (after.images ?? {}) as Record<string, Record<string, unknown>>
        for (const family of addedFamilies) {
          if (family in beforeImages) failures.push(`${family} was already in ${against}`)
          else console.log(`Added ${family}: ${Object.keys(afterImages[family] ?? {}).length} images`)
        }
      }
    }
  }

  for (const failure of failures) console.error(`FAIL ${failure}`)
  if (failures.length > 0) process.exitCode = 1
  else console.log('Check passed')
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})
