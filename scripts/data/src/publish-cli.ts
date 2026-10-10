// CLI for `pnpm release:publish` (scripts/data/README.md#publish).

import { resolve } from 'node:path'
import { GcloudStorageClient } from './gcloud-storage'
import { publishRelease } from './publish'
import { DEFAULT_RELEASE_DIR } from './release-dir'

/** The platform's GCP project (`uma-platform` was taken) and private release bucket (infra/README.md, P34). */
export const DEFAULT_PROJECT = 'uma-platform-lm'
export const DEFAULT_BUCKET = 'uma-platform-master-data'

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
  const result = await publishRelease({ releaseDir, storage: new GcloudStorageClient(bucket, project), channel, dryRun })

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
