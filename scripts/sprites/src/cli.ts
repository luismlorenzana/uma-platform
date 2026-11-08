import { readdir } from 'node:fs/promises'
import { resolve, basename } from 'node:path'
import { content, sprites, current } from './io.js'
import { configFor, verifyRevision } from './verify.js'
import { repeatRevision, exportRevision } from './export.js'
import { buildProgress } from './progress.js'
import { approvedSets, DEFAULT_SPRITE_ENCODING, measureEncodings, packRevision, writeSpriteFamily, type SpriteEncoding } from './pack.js'

async function main() {
  const [command, ...args] = process.argv.slice(2).filter(v => v !== '--')
  const number = args.find(a => /^\d+$/.test(a))
  const ids = number ? [Number(number)] : (await readdir(sprites)).filter(a => /^\d+$/.test(a)).map(Number)
  const option = (name: string) => { const i = args.indexOf(name); return i < 0 ? undefined : args[i + 1] }
  if (command === 'progress') { console.log(JSON.stringify((await buildProgress(content)).totals)); return }
  if (command === 'pack') { await pack(args, option); return }
  if (!['export', 'verify', 'repeat'].includes(command ?? '')) throw new Error('Use export, verify, repeat, progress or pack')
  for (const id of ids) {
    const dir = option('--revision') ? resolve(sprites, String(id), `r${Number(option('--revision'))}`) : await current(sprites, id)
    const config = option('--config') ?? await configFor(sprites, dir)
    if (command === 'export') {
      const output = option('--out') ?? resolve(content, 'review/sprite-exports', String(id), basename(dir))
      const result = await exportRevision(dir, config, output)
      console.log(JSON.stringify({ id, output, files: Object.keys(result.hashes).length, literals: result.literals }))
    } else if (command === 'repeat') {
      const result = await repeatRevision(dir, config)
      console.log(JSON.stringify({ id, ...result })); if (!result.byteIdentical) process.exitCode = 1
    } else {
      const result = await verifyRevision(sprites, dir, config)
      console.log(JSON.stringify({ id, checks: result.checks, failures: result.failures, literals: result.repeatExport.literals.length, output: result.output }))
      if (!result.passed) process.exitCode = 1
    }
  }
}
const mb = (bytes: number) => `${(bytes / 1024 / 1024).toFixed(2)} MB`

/** `pack [--measure] [--encoding lossless|lossy]`: approved revisions into content/release (UA5). */
async function pack(args: string[], option: (name: string) => string | undefined) {
  const { ready, skipped } = await approvedSets(sprites)
  for (const skip of skipped) console.log(`skip ${skip.outfitId}: ${skip.reason}`)
  if (args.includes('--measure')) {
    for (const candidate of ready) {
      const sizes = await measureEncodings(candidate)
      console.log(`${candidate.outfitId} r${candidate.atlas.revision} ${candidate.atlas.profile}: lossless ${mb(sizes.lossless)} · lossy q90 ${mb(sizes.lossy)}`)
    }
    return
  }
  const encoding = (option('--encoding') ?? DEFAULT_SPRITE_ENCODING) as SpriteEncoding
  if (encoding !== 'lossless' && encoding !== 'lossy') throw new Error('--encoding takes lossless or lossy')
  const packed = []
  for (const candidate of ready) {
    const entry = await packRevision(candidate, encoding)
    const bytes = entry.pages.reduce((sum, page) => sum + page.bytes.byteLength, 0)
    console.log(`${entry.outfitId} r${entry.revision} ${entry.profile}: ${Object.keys(entry.set.actions).length} actions, ${entry.pages.length} page(s) ${entry.pages.map(p => `${p.width}x${p.height}`).join(', ')}, ${mb(bytes)} ${encoding}`)
    packed.push(entry)
  }
  const manifest = await writeSpriteFamily(resolve(content, 'release'), packed)
  console.log(`Release: ${manifest.version} (${packed.length} sprite set(s), ${manifest.files.length} files)`)
}

main().catch((error: unknown) => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1 })
