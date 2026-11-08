// CLI for `pnpm release:check` (UA5): reads a published channel back the way a game will and checks it.
//   pnpm release:check -- --channel candidate --against latest
// It loads the channel with the release client (every set and the art index, hash-checked), confirms the bucket holds
// every file at its size, loads each sprite set with `spriteSet` and decodes each of its pages, and with `--against`
// confirms every file of the other channel's release is carried byte for byte.

import { createReleaseClient, parseArtIndex, ReleaseSourceError, type ReleaseSource } from '@luismlorenzana/uma-data'
import sharp from 'sharp'
import { DEFAULT_BUCKET, DEFAULT_PROJECT, GcloudStorageClient } from './gcloud-storage'
import { checkCarried } from './sprites-only'

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
  const storage = new GcloudStorageClient(bucket, project)
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

  if (against) {
    const base = await createReleaseClient({ source, channel: against }).manifest()
    if (base.version === manifest.version) console.log(`${against} is the same release`)
    else {
      const { carried } = checkCarried(base, manifest)
      console.log(`Against ${against} (${base.version}): ${carried} of ${base.files.length} files carried byte for byte; the art index changed only by \`sprites\``)
      if (base.art && manifest.art) {
        const read = async (path: string) => JSON.parse(new TextDecoder().decode(await client.file(path === base.art ? base : manifest, path))) as Record<string, unknown>
        const [before, after] = await Promise.all([read(base.art), read(manifest.art)])
        parseArtIndex(after, manifest.art)
        const strip = ({ sprites: _sprites, ...rest }: Record<string, unknown>) => JSON.stringify(rest)
        if (strip(before) !== strip(after)) failures.push('The art index changed beyond its sprites map')
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
