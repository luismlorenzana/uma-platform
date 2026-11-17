// CLI for `pnpm profiles:push [universe] [--channel latest] [--dry-run]` (uma-farm F88, P180): reads every Uma's profile
// pictures from the master data channel (hash-checked, as a game reads them), names each Uma by the universe's portraits
// index (`pnpm portraits:pack` mirrors it), and uploads the pictures, then their index last, to the platform app's bucket,
// `art/universes/<universe>/profiles/`, for the owner's review in Uma Character Art. It prints ids and counts, never a picture.

import { createReleaseClient, dialoguePortraitChoices, ReleaseSourceError, type ReleaseSource } from '@luismlorenzana/uma-data'
import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { characterLookup } from './character-names'
import { DEFAULT_BUCKET, DEFAULT_PROJECT, GcloudStorageClient } from './gcloud-storage'
import { readPortraitsIndex } from './portraits'
import { buildProfilesIndex } from './profiles-push'
import { DEFAULT_CONTENT_DIR } from './release-dir'

const args = process.argv.slice(2).filter((a) => a !== '--')
const option = (name: string) => { const i = args.indexOf(name); return i < 0 ? undefined : args[i + 1] }
const universe = args.find((a, i) => !a.startsWith('--') && args[i - 1] !== '--channel') ?? 'farm-life'
if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(universe)) throw new Error(`A universe is a lowercase name joined by hyphens: ${universe}`)
const channel = option('--channel') ?? 'latest'
const mirror = resolve(process.env.ART_DIR ?? resolve(DEFAULT_CONTENT_DIR, 'published/art'), 'universes', universe, 'portraits')
const appBucket = process.env.CONTENT_BUCKET ?? 'uma-platform-content'
// The app's bucket is in the games' project; scoped to the owner's default configuration, never `config set`.
const gcloud = (argv: string[]) => execFileSync('gcloud', argv, {
  env: { ...process.env, CLOUDSDK_ACTIVE_CONFIG_NAME: 'default', CLOUDSDK_CORE_PROJECT: process.env.APP_PROJECT ?? 'uma-rpg' }, stdio: ['ignore', 'ignore', 'inherit'],
})

async function main(): Promise<void> {
  const storage = new GcloudStorageClient(process.env.UMA_RELEASE_BUCKET ?? DEFAULT_BUCKET, process.env.UMA_GCP_PROJECT ?? DEFAULT_PROJECT)
  const source: ReleaseSource = {
    async read(path) {
      const bytes = await storage.read(path)
      if (!bytes) throw new ReleaseSourceError(path, 404, `${path} isn't in the master data bucket`)
      return new Uint8Array(bytes)
    },
  }
  const client = createReleaseClient({ source, channel })
  const manifest = await client.manifest()
  const art = await client.art(manifest)
  if (!art) throw new Error(`Master data ${manifest.version} has no art index`)
  const idOf = characterLookup(await client.set(manifest, 'characters'))
  const index = readPortraitsIndex(JSON.parse(await readFile(resolve(mirror, 'index.json'), 'utf8')) as unknown, universe)
  const characters = [], files = new Map<string, Uint8Array>()
  for (const c of index.characters) {
    const id = idOf(c.name)
    const portraits = id === null ? null : await client.dialoguePortraits(manifest, art, id)
    if (!portraits) { console.log(`skip ${c.id}: no dialogue portraits in master data ${manifest.version}`); continue }
    const outfits = dialoguePortraitChoices(portraits).outfits
    characters.push({ key: c.id, name: c.name, portraits, outfits })
    for (const outfit of outfits) {
      const p = portraits.bases[outfit]!.profile
      if (p) files.set(`${c.id}-${outfit}.${p.sha256.slice(0, 16)}.webp`, await client.file(manifest, p.path))
    }
  }
  const out = buildProfilesIndex(universe, manifest.version, new Date().toISOString(), characters)
  for (const c of out.characters) console.log(`${c.id}: ${out.profiles.filter((p) => p.character === c.id).length} profile pictures`)
  console.log(`${out.profiles.length} profiles from master data ${manifest.version} (${channel}) → gs://${appBucket}/art/universes/${universe}/profiles/`)
  if (args.includes('--dry-run') || out.profiles.length === 0) return
  const stage = mkdtempSync(join(tmpdir(), 'uma-profiles-'))
  try {
    mkdirSync(join(stage, 'profiles'))
    for (const [name, bytes] of files) writeFileSync(join(stage, 'profiles', name), bytes)
    const remote = `gs://${appBucket}/art/universes/${universe}/profiles/`
    gcloud(['storage', 'cp', ...[...files.keys()].map((name) => join(stage, 'profiles', name)), remote])
    writeFileSync(join(stage, 'index.json'), `${JSON.stringify(out, null, 1)}\n`)
    gcloud(['storage', 'cp', join(stage, 'index.json'), `${remote}index.json`])
  } finally { rmSync(stage, { recursive: true, force: true }) }
  console.log('Pushed: the pictures, then the index')
}

main().catch((error: unknown) => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1 })
