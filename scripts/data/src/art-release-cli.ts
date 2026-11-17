// CLI for `pnpm art:release [universe] [--dry-run]` (P203): a universe's published character art → master data `latest` in
// one step (art-release.ts). The universe defaults to farm-life. Each step's own output streams as it runs. `--dry-run`
// packs locally and plans the candidate, publishing nothing.

import { spawn } from 'node:child_process'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { artRelease, readChannel, type ArtReleaseStep } from './art-release'
import { DEFAULT_BUCKET, DEFAULT_PROJECT, GcloudStorageClient } from './gcloud-storage'

const args = process.argv.slice(2).filter((a) => a !== '--')
const universe = args.find((a) => !a.startsWith('--')) ?? 'farm-life'
const dryRun = args.includes('--dry-run')
const here = dirname(fileURLToPath(import.meta.url))

/** Runs a step's CLI with tsx, streaming its output and keeping its standard output. */
const run = (step: ArtReleaseStep): Promise<string> => new Promise((done, fail) => {
  console.log(`\n▸ ${step.label}`)
  const child = spawn(process.execPath, ['--import', 'tsx', resolve(here, step.script), ...step.args], { cwd: resolve(here, '..'), stdio: ['ignore', 'pipe', 'inherit'] })
  let out = ''
  child.stdout.on('data', (chunk: Buffer) => { out += chunk.toString('utf8'); process.stdout.write(chunk) })
  child.on('error', fail)
  child.on('close', (code) => (code === 0 ? done(out) : fail(new Error(`Stopped: ${step.label} failed (exit ${code}); nothing after it ran.`))))
})

async function main(): Promise<void> {
  const storage = new GcloudStorageClient(DEFAULT_BUCKET, DEFAULT_PROJECT)
  const r = await artRelease(universe, { run, channel: (name) => readChannel(storage, name), dryRun, log: (line) => console.log(line) })
  console.log(`\n${r.promoted ? `Master data latest: ${r.latest} (promoted from candidate)` : `Master data latest stays ${r.latest}: ${r.reason}`}`)
}

main().catch((error: unknown) => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1 })
