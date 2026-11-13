// CLI for `pnpm enemies:pack [--fixture] [--release-dir <dir>]` (uma-quest Q16 part A; docs/sprites/enemy-keys.md §7).
// Writes the enemies set and every approved enemy key into the local release, and records new ids in the private
// ledger. `--fixture` adds the code-drawn test boss (799999) for a dry run; pack again without it afterwards.
// It prints counts and ids only, never a name.

import { writeEnemyRelease } from '@uma-platform/data-pipeline/enemy-release'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import { approvedEnemyKeys, emptyLedger, ENEMY_KEYS, ENEMY_LEDGER, packEnemyKey, rosterFromPlan, TIER_PLAN, writeFixtureMaster, type EnemyLedger, type TierPlan } from './enemies.js'
import { atomicJson, content, maybeJson, readJson } from './io.js'

function option(name: string): string | undefined {
  const args = process.argv.slice(2)
  const i = args.indexOf(name)
  return i < 0 ? undefined : args[i + 1]
}

async function main(): Promise<void> {
  const releaseDir = resolve(option('--release-dir') ?? resolve(content, 'release'))
  const plan = await readJson<TierPlan>(TIER_PLAN)
  const { enemies, ledger, assigned } = rosterFromPlan(plan, await maybeJson<EnemyLedger>(ENEMY_LEDGER, emptyLedger()))
  if (assigned.length > 0) await atomicJson(ENEMY_LEDGER, ledger)
  const count = (tier: string) => enemies.filter((enemy) => enemy.tier === tier).length
  console.log(`Roster: ${enemies.length} units (${count('boss')} boss, ${count('key')} key, ${count('regular')} regular) from ` +
    `${new Set(enemies.map((enemy) => enemy.franchise)).size} franchises; ${assigned.length} new id(s) in the ledger, next ${ledger.next}`)

  const { ready, skipped } = await approvedEnemyKeys(ENEMY_KEYS)
  const scratch = process.argv.includes('--fixture') ? await mkdtemp(resolve(tmpdir(), 'uma-enemy-fixture-')) : null
  try {
    if (scratch) {
      const entry = await writeFixtureMaster(scratch)
      if (enemies.some((enemy) => enemy.id === entry.id)) throw new Error(`The test enemy's id ${entry.id} is a unit's`)
      enemies.push(entry)
      const fixture = await approvedEnemyKeys(scratch)
      ready.push(...fixture.ready)
      skipped.push(...fixture.skipped)
      console.log(`Test enemy: ${entry.id} (${entry.tier}), drawn in code; pack again without --fixture afterwards`)
    }
    for (const skip of skipped) console.log(`skip ${skip.enemyId}: ${skip.reason}`)
    const roster = new Set(enemies.map((enemy) => enemy.id))
    const packed = []
    for (const candidate of ready) {
      if (!roster.has(candidate.enemyId)) console.log(`  ${candidate.enemyId} isn't on the boards any more; packed anyway`)
      const key = await packEnemyKey(candidate)
      const images = Object.values(key.poses).reduce((sum, pose) => sum + 1 + (pose.layers?.length ?? 0), 0)
      const bytes = Object.values(key.poses).reduce((sum, pose) => sum + pose.image.bytes.byteLength + (pose.layers ?? []).reduce((s, l) => s + l.image.bytes.byteLength, 0), 0)
      console.log(`${key.enemyId} r${key.revision} ${key.tier}: ${Object.keys(key.poses).join(', ')}; ${images} images, ${(bytes / 1024).toFixed(0)} KB lossless`)
      packed.push(key)
    }
    const manifest = await writeEnemyRelease(releaseDir, enemies, packed)
    console.log(`Release: ${manifest.version} (the enemies set, ${packed.length} enemy key(s), ${manifest.files.length} files)`)
  } finally {
    if (scratch) await rm(scratch, { recursive: true, force: true })
  }
}

main().catch((error: unknown) => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1 })
