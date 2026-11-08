// CLI for `pnpm release:publish` (scripts/data/README.md#publish).

import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import { DEFAULT_BUCKET, DEFAULT_PROJECT, GcloudStorageClient } from './gcloud-storage'
import { moveChannel, publishManifest, publishRelease, type PublishReleaseResult } from './publish'
import { DEFAULT_CONTENT_DIR, DEFAULT_RELEASE_DIR } from './release-dir'
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
  const channel = argument('--channel') ?? 'latest'
  const releaseDir = resolve(argument('--release-dir') ?? DEFAULT_RELEASE_DIR)
  const storage = new GcloudStorageClient(bucket, project)
  // `--promote` and `--rollback` are the same move: point a channel at a release already in the bucket.
  const target = argument('--promote') ?? argument('--rollback')
  if (target) {
    const moved = await moveChannel({ storage, channel, version: target, dryRun })
    console.log(`Channel ${channel}: ${moved.before ?? 'none'} → ${moved.after}${dryRun ? ' (unchanged; dry run)' : ''}`)
    if (channel === 'latest' && !dryRun) console.log(`Published sprite sets recorded: ${await recordPublished(storage, target, PUBLISHED_SPRITES)}`)
    return
  }
  let result: PublishReleaseResult
  if (process.argv.includes('--sprites-only')) {
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
  if (channel === 'latest' && !dryRun) console.log(`Published sprite sets recorded: ${await recordPublished(storage, result.version, PUBLISHED_SPRITES)}`)

  console.log(dryRun ? `Release publish plan for gs://${bucket} (dry run)` : `Release published to gs://${bucket}`)
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
