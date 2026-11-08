import { readdir } from 'node:fs/promises'
import { resolve, basename } from 'node:path'
import { content, sprites, current } from './io.js'
import { configFor, verifyRevision } from './verify.js'
import { repeatRevision, exportRevision } from './export.js'
import { buildProgress } from './progress.js'

async function main() {
  const [command, ...args] = process.argv.slice(2).filter(v => v !== '--')
  const number = args.find(a => /^\d+$/.test(a))
  const ids = number ? [Number(number)] : (await readdir(sprites)).filter(a => /^\d+$/.test(a)).map(Number)
  const option = (name: string) => { const i = args.indexOf(name); return i < 0 ? undefined : args[i + 1] }
  if (command === 'progress') { console.log(JSON.stringify((await buildProgress(content)).totals)); return }
  if (!['export', 'verify', 'repeat'].includes(command ?? '')) throw new Error('Use export, verify, repeat or progress')
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
main().catch((error: unknown) => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1 })
