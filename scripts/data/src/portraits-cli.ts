// CLI for `pnpm portraits:pack [universe] [--no-fetch] [--release-dir <dir>]` (uma-farm F75, P170): mirrors the
// universe's published portraits from the app's bucket (read only), then writes every character's into the local
// release's `dialogue-portraits` family. The universe defaults to farm-life. It prints ids and counts, never a picture.

import { execFileSync } from 'node:child_process'
import { mkdirSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { parseSet } from '@luismlorenzana/uma-data'
import { writeDialoguePortraitRelease } from './dialogue-portrait-release'
import { packPortraits, planPortraits, readPortraitsIndex } from './portraits'
import { DEFAULT_CONTENT_DIR, readLocalManifest } from './release-dir'

const args = process.argv.slice(2).filter((a) => a !== '--')
const option = (name: string) => { const i = args.indexOf(name); return i < 0 ? undefined : args[i + 1] }
const universe = args.find((a, i) => !a.startsWith('--') && args[i - 1] !== '--release-dir') ?? 'farm-life'
if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(universe)) throw new Error(`A universe is a lowercase name joined by hyphens: ${universe}`)
const releaseDir = resolve(option('--release-dir') ?? resolve(DEFAULT_CONTENT_DIR, 'release'))
const mirror = resolve(process.env.ART_DIR ?? resolve(DEFAULT_CONTENT_DIR, 'published/art'), 'universes', universe, 'portraits')
const bucket = process.env.CONTENT_BUCKET ?? 'uma-platform-content'

async function main(): Promise<void> {
  if (!args.includes('--no-fetch')) {
    mkdirSync(mirror, { recursive: true })
    // Scoped to the owner's default configuration and the games' project; never `config set`.
    execFileSync('gcloud', ['storage', 'rsync', `gs://${bucket}/art/universes/${universe}/portraits`, mirror, '--recursive'], {
      env: { ...process.env, CLOUDSDK_ACTIVE_CONFIG_NAME: 'default', CLOUDSDK_CORE_PROJECT: process.env.CLOUDSDK_CORE_PROJECT ?? 'uma-rpg' }, stdio: ['ignore', 'ignore', 'inherit'],
    })
  }
  const index = readPortraitsIndex(JSON.parse(await readFile(resolve(mirror, 'index.json'), 'utf8')) as unknown, universe)
  const local = await readLocalManifest(releaseDir)
  if (!local) throw new Error('No local release; run pnpm data:import first')
  const characters = parseSet('characters', JSON.parse(await readFile(resolve(releaseDir, ...local.sets.characters.split('/')), 'utf8')) as unknown)
  const byName = new Map(characters.map((c) => [c.name.en, c.id]))
  const { plans, skipped } = planPortraits(index, (name) => byName.get(name) ?? null)
  for (const s of skipped) console.log(`skip ${s}`)
  const packed = []
  for (const plan of plans) {
    const p = await packPortraits(mirror, index, plan)
    const all = [...Object.values(p.bases), ...Object.values(p.faces)]
    console.log(`${p.characterId} r${p.revision}: ${Object.keys(p.bases).length} bases, ${Object.keys(p.faces).length} faces; ${(all.reduce((s, i) => s + i.bytes.byteLength, 0) / 2 ** 20).toFixed(1)} MB lossless`)
    packed.push(p)
  }
  const manifest = await writeDialoguePortraitRelease(releaseDir, packed)
  console.log(`Release: ${manifest.version} (${packed.length} character(s) in the dialogue-portraits family, from ${universe} r${index.revision}, approved ${index.approvedOn})`)
}

main().catch((error: unknown) => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1 })
