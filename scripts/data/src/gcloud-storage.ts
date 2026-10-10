// gcloud adapter for the release publisher, ported from uma-racer. Every command is pinned to the owner's `default`
// gcloud configuration and the platform project through environment variables; the active configuration (the
// owner's work account) is never read or changed.

import { execFile } from 'node:child_process'
import { basename, extname, posix } from 'node:path'
import { promisify } from 'node:util'
import { IMMUTABLE_CACHE_CONTROL, type ReleaseStorageClient, type UploadEntry } from './publish'

const execute = promisify(execFile)
const BUCKET_PATTERN = /^[a-z0-9][a-z0-9._-]{1,220}[a-z0-9]$/
/** Paths per `gcloud storage cp` call, well under the OS argument limit. */
const UPLOAD_BATCH = 200

export const GCLOUD_CONFIGURATION = 'default'

const CONTENT_TYPES: Record<string, string> = {
  '.json': 'application/json',
  '.webp': 'image/webp',
  '.png': 'image/png',
}

interface CommandFailure extends Error {
  stderr?: string | Buffer
}

function detail(error: CommandFailure): string {
  const stderr = typeof error.stderr === 'string' ? error.stderr : error.stderr?.toString('utf8')
  return (stderr || error.message).trim()
}

function isMissing(error: CommandFailure): boolean {
  return /(?:404|not found|no urls matched|matched no objects|does not exist)/i.test(detail(error))
}

function friendlyFailure(error: CommandFailure): Error {
  const message = detail(error)
  if (/(?:credential|login|authentication|reauth|permission|403)/i.test(message)) {
    return new Error(`The release bucket refused the owner's default gcloud account. Run \`CLOUDSDK_ACTIVE_CONFIG_NAME=default gcloud auth login\` and retry. ${message}`)
  }
  if (/(?:network|dns|timed out|timeout|unavailable|connection|resolve)/i.test(message)) {
    return new Error(`The release bucket is unreachable. Check the network and retry. ${message}`)
  }
  return new Error(`A release bucket command failed. ${message}`)
}

export class GcloudStorageClient implements ReleaseStorageClient {
  constructor(
    private readonly bucket: string,
    private readonly project: string,
  ) {
    if (!BUCKET_PATTERN.test(bucket)) throw new Error(`Invalid bucket name: ${bucket}`)
  }

  private uri(path: string): string {
    return `gs://${this.bucket}/${path}`
  }

  private async run(args: readonly string[]): Promise<Buffer> {
    try {
      const result = await execute('gcloud', [...args], {
        env: {
          ...process.env,
          CLOUDSDK_ACTIVE_CONFIG_NAME: GCLOUD_CONFIGURATION,
          CLOUDSDK_CORE_PROJECT: this.project,
        },
        encoding: 'buffer',
        maxBuffer: 64 * 1024 * 1024,
      })
      return result.stdout
    } catch (error) {
      throw Object.assign(friendlyFailure(error as CommandFailure), { cause: error, missing: isMissing(error as CommandFailure) })
    }
  }

  async read(objectPath: string): Promise<Buffer | null> {
    try {
      return await this.run(['storage', 'cat', this.uri(objectPath)])
    } catch (error) {
      if ((error as { missing?: boolean }).missing) return null
      throw error
    }
  }

  async list(prefix: string): Promise<ReadonlyMap<string, number>> {
    let output: string
    try {
      output = (await this.run(['storage', 'objects', 'list', this.uri(`${prefix}**`), '--format=value(name,size)'])).toString('utf8')
    } catch (error) {
      if ((error as { missing?: boolean }).missing) return new Map()
      throw error
    }
    const sizes = new Map<string, number>()
    for (const line of output.split('\n')) {
      if (!line.trim()) continue
      const [name, size] = line.split('\t')
      const bytes = Number(size)
      if (!name || !Number.isSafeInteger(bytes) || bytes < 0) throw new Error(`Bucket listing returned an invalid row: ${line}`)
      sizes.set(name, bytes)
    }
    return sizes
  }

  /** Grouped by destination folder and type so each group is one parallel `gcloud storage cp`. */
  async uploadImmutable(entries: readonly UploadEntry[]): Promise<void> {
    const groups = new Map<string, UploadEntry[]>()
    for (const entry of entries) {
      const key = `${posix.dirname(entry.objectPath)}\n${extname(entry.objectPath)}`
      const group = groups.get(key)
      if (group) group.push(entry)
      else groups.set(key, [entry])
    }
    for (const [key, group] of groups) {
      const [dir, extension] = key.split('\n') as [string, string]
      const contentType = CONTENT_TYPES[extension] ?? 'application/octet-stream'
      for (let start = 0; start < group.length; start += UPLOAD_BATCH) {
        const batch = group.slice(start, start + UPLOAD_BATCH)
        // A batch lands in one folder under each file's own name; a lone file may be renamed (the manifest).
        if (batch.length > 1 && batch.some((entry) => basename(entry.localPath) !== posix.basename(entry.objectPath))) {
          throw new Error(`Batched uploads must keep their file names (${dir})`)
        }
        const destination = batch.length === 1 ? this.uri(batch[0]!.objectPath) : this.uri(`${dir}/`)
        await this.run([
          'storage', 'cp', '--no-clobber',
          `--cache-control=${IMMUTABLE_CACHE_CONTROL}`, `--content-type=${contentType}`,
          ...batch.map((entry) => entry.localPath), destination,
        ])
      }
    }
  }

  async replace(entry: UploadEntry, cacheControl: string): Promise<void> {
    const contentType = CONTENT_TYPES[extname(entry.objectPath)] ?? 'application/octet-stream'
    await this.run(['storage', 'cp', `--cache-control=${cacheControl}`, `--content-type=${contentType}`, entry.localPath, this.uri(entry.objectPath)])
  }
}
