// CLI for `pnpm release:publish` (scripts/data/README.md#publish).

import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import { DEFAULT_BUCKET, DEFAULT_PROJECT, GcloudStorageClient } from './gcloud-storage'
import { moveChannel, publishManifest, publishRelease, type PublishReleaseResult } from './publish'
import { DEFAULT_CONTENT_DIR, DEFAULT_RELEASE_DIR } from './release-dir'
import { CHARACTER_FAMILIES, planCharacterFamiliesOnly } from './character-families-only'
import type { CharacterFamilyKey } from './character-family-release'
import { planEnemiesOnly } from './enemies-only'
import { planFamiliesOnly } from './families-only'
import { LocalOverlayStorage } from './local-storage'
import { planSpritesOnly, recordPublished } from './sprites-only'

const PUBLISHED_SPRITES = resolve(DEFAULT_CONTENT_DIR, 'authoring/sprites/published.json')

function argument(name: string): string | null {
  const inline = process.argv.find((arg) => arg.startsWith(`${name}=`))
  if (inline) return inline.slice(name.length + 1)
  const index = process.argv.indexOf(name)
  if (index < 0) return null
  const value = process.argv[index + 1]
  if (!value || value.startsWith('--')) throw new Error(`${name} requires a value`)
  return value
}

const bytes = (value: number): string => `${value.toLocaleString('en-US')} bytes`

async function main(): Promise<void> {
  const dryRun = process.argv.includes('--dry-run')
  const project = argument('--project') ?? process.env.UMA_GCP_PROJECT ?? DEFAULT_PROJECT
  const bucket = argument('--bucket') ?? process.env.UMA_RELEASE_BUCKET ?? DEFAULT_BUCKET
  const enemiesOnly = process.argv.includes('--enemies-only')
  // The per-character families (P170, P176), alone or together in one release.
  const characterFamilies = ([['--portraits-only', 'dialoguePortraits'], ['--illustrations-only', 'illustrations']] as const)
    .filter(([flag]) => process.argv.includes(flag)).map(([, key]): CharacterFamilyKey => key)
  // The enemies-only and character-family releases go to the candidate channel unless told otherwise; `--promote` then moves latest.
  const channel = argument('--channel') ?? (enemiesOnly || characterFamilies.length > 0 ? 'candidate' : 'latest')
  const releaseDir = resolve(argument('--release-dir') ?? DEFAULT_RELEASE_DIR)
  // `--local <dir>` publishes into a folder over the bucket, which is only read: the dry run release:check reads back.
  const localDir = argument('--local')
  const bucketStorage = new GcloudStorageClient(bucket, project)
  const storage = localDir ? new LocalOverlayStorage(resolve(localDir), bucketStorage) : bucketStorage
  const recording = channel === 'latest' && !dryRun && !localDir
  // `--promote` and `--rollback` are the same move: point a channel at a release already in the bucket.
  const target = argument('--promote') ?? argument('--rollback')
  if (target) {
    const moved = await moveChannel({ storage, channel, version: target, dryRun })
    console.log(`Channel ${channel}: ${moved.before ?? 'none'} → ${moved.after}${dryRun ? ' (unchanged; dry run)' : ''}`)
    if (recording) console.log(`Published sprite sets recorded: ${await recordPublished(storage, target, PUBLISHED_SPRITES)}`)
    return
  }
  let result: PublishReleaseResult
  const addFamilies = argument('--add-families')
  if (addFamilies) {
    const staging = await mkdtemp(resolve(tmpdir(), 'uma-families-only-'))
    try {
      const plan = await planFamiliesOnly({ releaseDir, storage, families: addFamilies.split(',').filter(Boolean), stagingDir: staging })
      console.log(`Families-only release on ${plan.base.version}: ${plan.base.files.length - (plan.base.art ? 1 : 0)} files carried byte for byte; ` +
        `adds ${Object.entries(plan.added).map(([family, count]) => `${family} (${count})`).join(', ')}, ${bytes(plan.addedBytes)}`)
      result = await publishManifest({ manifest: plan.manifest, manifestPath: plan.manifestPath, localPaths: plan.localPaths, storage, channel, dryRun })
    } finally {
      await rm(staging, { recursive: true, force: true })
    }
  } else if (enemiesOnly) {
    const staging = await mkdtemp(resolve(tmpdir(), 'uma-enemies-only-'))
    try {
      const plan = await planEnemiesOnly({ releaseDir, storage, stagingDir: staging })
      const tiers = ['boss', 'key', 'regular'].map((tier) => `${plan.enemies.filter((enemy) => enemy.tier === tier).length} ${tier}`).join(', ')
      console.log(`Enemies-only release on ${plan.base.version}: ${plan.base.files.length - (plan.base.art ? 1 : 0)} files carried byte for byte; ` +
        `the enemies set (${plan.enemies.length}: ${tiers}); enemy keys ${plan.added.map((key) => `${key.enemyId} r${key.revision} ${key.tier}`).join(', ') || 'none'} ` +
        `added; ${Object.keys(plan.enemyKeys).length} enemy key(s) in all`)
      if (plan.unlisted.length > 0) console.log(`Enemy keys of units no longer on the boards (kept): ${plan.unlisted.join(', ')}`)
      result = await publishManifest({ manifest: plan.manifest, manifestPath: plan.manifestPath, localPaths: plan.localPaths, storage, channel, dryRun })
    } finally {
      await rm(staging, { recursive: true, force: true })
    }
  } else if (characterFamilies.length > 0) {
    const staging = await mkdtemp(resolve(tmpdir(), 'uma-character-families-'))
    try {
      const plan = await planCharacterFamiliesOnly({ releaseDir, storage, families: characterFamilies, stagingDir: staging })
      const name = (key: CharacterFamilyKey) => CHARACTER_FAMILIES[key].name
      console.log(`Character-family release (${characterFamilies.map(name).join(' and ')}) on ${plan.base.version}: ${plan.base.files.length - (plan.base.art ? 1 : 0)} files carried byte for byte; ` +
        `${characterFamilies.map((key) => `${name(key)} ${plan.added[key]!.map((a) => a.summary).join(', ')}`).join('; ')} added, ${bytes(plan.addedBytes)}; ` +
        `${characterFamilies.map((key) => `${name(key)} for ${Object.keys(plan.maps[key]!).length} character(s)`).join(', ')} in all`)
      result = await publishManifest({ manifest: plan.manifest, manifestPath: plan.manifestPath, localPaths: plan.localPaths, storage, channel, dryRun })
    } finally {
      await rm(staging, { recursive: true, force: true })
    }
  } else if (process.argv.includes('--sprites-only')) {
    const staging = await mkdtemp(resolve(tmpdir(), 'uma-sprites-only-'))
    try {
      const plan = await planSpritesOnly({ releaseDir, storage, stagingDir: staging })
      console.log(`Sprite-only release on ${plan.base.version}: ${plan.base.files.length - (plan.base.art ? 1 : 0)} files carried byte for byte; ` +
        `adds ${plan.added.map((set) => `${set.outfitId} r${set.revision}`).join(', ')}; ${Object.keys(plan.sprites).length} sprite set(s) in all`)
      result = await publishManifest({ manifest: plan.manifest, manifestPath: plan.manifestPath, localPaths: plan.localPaths, storage, channel, dryRun })
    } finally {
      await rm(staging, { recursive: true, force: true })
    }
  } else {
    result = await publishRelease({ releaseDir, storage, channel, dryRun })
  }
  if (recording) console.log(`Published sprite sets recorded: ${await recordPublished(storage, result.version, PUBLISHED_SPRITES)}`)

  console.log(dryRun ? `Release publish plan for gs://${bucket} (dry run)`
    : localDir ? `Release written to ${resolve(localDir)} over gs://${bucket} (nothing uploaded; the bucket was only read)` : `Release published to gs://${bucket}`)
  console.log(`Version: ${result.version}`)
  console.log(`Channel ${result.channel}: ${result.channelBefore ?? 'none'} → ${result.channelAfter ?? 'none'}${dryRun ? ' (unchanged; dry run)' : ''}`)
  console.log(`Files: ${result.uploadPaths.length} ${dryRun ? 'to upload' : 'uploaded'}; ${result.alreadyPresentPaths.length} already present`)
  console.log(`Manifest: ${result.manifestUploaded ? 'uploaded' : dryRun ? 'not uploaded (dry run)' : 'already present'}`)
  console.log(`Bytes: ${bytes(result.totalBytes)} total; ${bytes(result.uploadBytes)} ${dryRun ? 'planned' : 'uploaded'}`)
  if (result.referenceIssues > 0) console.log(`References to records the source lacks: ${result.referenceIssues} (kept as given)`)
  console.log(`Elapsed: ${(result.elapsedMs / 1000).toFixed(2)}s`)
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})
