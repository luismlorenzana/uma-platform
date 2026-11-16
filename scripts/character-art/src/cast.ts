// `pnpm art:cast <universe> [--dry-run]`: prepares the enemy cast folders (P200) from the local Ranker's cast for that game:
// in each enemy authoring app (bosses, casual, lieutenants), one folder per cast character with her Ranker references and
// her record. Run `pnpm ranker:pull` first so the cast is the live one. Never deletes.
import { join } from 'node:path'
import { prepareCast, rankerDir } from './enemy-cast.js'
import { authoring, isUniverse } from './lib.js'

const args = process.argv.slice(2).filter((a) => a !== '--')
const dryRun = args.includes('--dry-run')
const universe = args.find((a) => !a.startsWith('--'))
if (!universe || !isUniverse(universe)) throw new Error('Name the universe whose enemies are cast: pnpm art:cast cyberpunk [--dry-run]')

console.log(`${dryRun ? 'Would prepare' : 'Preparing'} ${universe}'s enemy cast folders from the Ranker in ${rankerDir}`)
let problems = 0
for (const r of prepareCast(join(authoring, universe), universe, { dryRun })) {
  console.log(`  ${r.app}: ${r.characters} characters; ${r.created.length} ${dryRun ? 'to create' : 'created'}, ${r.moved.length} ${dryRun ? 'to move' : 'moved'}, ${r.references.length} references ${dryRun ? 'to refresh' : 'refreshed'}, ${r.unchanged} unchanged`)
  for (const m of r.moved) console.log(`    moved ${m}`)
  for (const f of r.references) console.log(`    refreshed ${f}`)
  for (const l of r.leftover) console.log(`    leftover ${l}`)
  for (const m of r.missing) console.log(`    MISSING ${m}`)
  problems += r.missing.length
}
if (problems) process.exitCode = 1
