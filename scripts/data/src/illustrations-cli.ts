// CLI for `pnpm illustrations:pack [universe] [--no-fetch] [--release-dir <dir>]` (uma-farm F84, P176): mirrors the
// universe's published index and its splash scenes from the app's bucket (read only), then writes every character's into
// the local release's `illustrations` family. The universe defaults to farm-life; the moments come from
// `content/authoring/illustrations/<universe>.json`. It prints ids, counts and sizes, never a picture.

import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { parseSet } from '@luismlorenzana/uma-data'
import { writeIllustrationRelease } from './illustration-release'
import { packIllustrations, planIllustrations, readIllustrationMoments, readUniverseArtIndex } from './illustrations'
import { DEFAULT_CONTENT_DIR, readLocalManifest } from './release-dir'

const args = process.argv.slice(2).filter((a) => a !== '--')
const option = (name: string) => { const i = args.indexOf(name); return i < 0 ? undefined : args[i + 1] }
const universe = args.find((a, i) => !a.startsWith('--') && args[i - 1] !== '--release-dir') ?? 'farm-life'
if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(universe)) throw new Error(`A universe is a lowercase name joined by hyphens: ${universe}`)
const releaseDir = resolve(option('--release-dir') ?? resolve(DEFAULT_CONTENT_DIR, 'release'))
const mirror = resolve(process.env.ART_DIR ?? resolve(DEFAULT_CONTENT_DIR, 'published/art'), 'universes', universe)
const momentsFile = resolve(DEFAULT_CONTENT_DIR, 'authoring/illustrations', `${universe}.json`)
const bucket = process.env.CONTENT_BUCKET ?? 'uma-platform-content'
// Scoped to the owner's default configuration and the games' project; never `config set`.
const gcloud = (argv: string[]) => execFileSync('gcloud', argv, {
  env: { ...process.env, CLOUDSDK_ACTIVE_CONFIG_NAME: 'default', CLOUDSDK_CORE_PROJECT: process.env.CLOUDSDK_CORE_PROJECT ?? 'uma-rpg' }, stdio: ['ignore', 'pipe', 'inherit'], maxBuffer: 64 * 2 ** 20,
})
const sha256 = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex')

async function main(): Promise<void> {
  const remote = `gs://${bucket}/art/universes/${universe}`
  if (!args.includes('--no-fetch')) {
    mkdirSync(resolve(mirror, 'images'), { recursive: true })
    writeFileSync(resolve(mirror, 'index.json'), gcloud(['storage', 'cat', `${remote}/index.json`]))
  }
  const index = readUniverseArtIndex(JSON.parse(await readFile(resolve(mirror, 'index.json'), 'utf8')) as unknown, universe)
  if (!args.includes('--no-fetch')) {
    // Only the splash scenes, and only those not already mirrored with their approved bytes.
    const want = index.looks.filter((l) => l.kind === 'splash' && !(existsSync(resolve(mirror, l.path)) && sha256(readFileSync(resolve(mirror, l.path))) === l.sha256))
    if (want.length > 0) gcloud(['storage', 'cp', ...want.map((l) => `${remote}/${l.path}`), resolve(mirror, 'images')])
  }
  if (!existsSync(momentsFile)) throw new Error(`No moments map for ${universe}: write ${momentsFile} (docs/sprites/illustrations.md)`)
  const moments = readIllustrationMoments(JSON.parse(await readFile(momentsFile, 'utf8')) as unknown, universe)
  const local = await readLocalManifest(releaseDir)
  if (!local) throw new Error('No local release; run pnpm data:import first')
  const characters = parseSet('characters', JSON.parse(await readFile(resolve(releaseDir, ...local.sets.characters.split('/')), 'utf8')) as unknown)
  const byName = new Map(characters.map((c) => [c.name.en, c.id]))
  const { plans, skipped } = planIllustrations(index, moments, (name) => byName.get(name) ?? null)
  for (const s of skipped) console.log(`skip ${s}`)
  const packed = []
  for (const plan of plans) {
    const p = await packIllustrations(mirror, universe, plan)
    const bytes = p.scenes.reduce((s, x) => s + x.bytes.byteLength, 0)
    console.log(`${p.characterId} (${plan.name}): ${p.scenes.length} scenes, ${(bytes / 2 ** 20).toFixed(1)} MB; worst ${Math.min(...p.quality.map((q) => q.psnr)).toFixed(1)} dB`)
    for (const s of p.scenes) console.log(`  ${s.moment.padEnd(18)} ${s.id} (${s.outfit}, ${(s.bytes.byteLength / 1024).toFixed(0)} KB)`)
    packed.push(p)
  }
  const manifest = await writeIllustrationRelease(releaseDir, packed)
  console.log(`Release: ${manifest.version} (${packed.length} character(s) in the illustrations family, from ${universe} r${index.revision})`)
}

main().catch((error: unknown) => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1 })
