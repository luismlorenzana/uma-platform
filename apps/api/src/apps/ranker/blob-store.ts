// Where the Ranker's files live (AP9, AP10): `gs://uma-platform-content/ranker/` in production, a local folder in dev
// (`content/authoring/ranker`, the same layout). Every write names the generation it read, so two saves can never
// overwrite each other: the bucket's own `ifGenerationMatch`, or a content hash under one in-process queue locally.
import { createHash } from 'node:crypto'
import { mkdir, readdir, readFile, rename, unlink, writeFile } from 'node:fs/promises'
import { dirname, join, relative, resolve, sep } from 'node:path'

export interface StoredBlob {
  bytes: Uint8Array
  /** Opaque: pass it back to `write` to say which version this write replaces. */
  generation: string
}
/** The generation of a file that doesn't exist yet. */
export const ABSENT = '0'

export interface BlobStore {
  read(path: string): Promise<StoredBlob | null>
  /** Writes when the file is still at `ifGeneration` (ABSENT: not there yet). The new generation, or null on a lost race. */
  write(path: string, bytes: Uint8Array, ifGeneration: string): Promise<string | null>
  /** Every file path under a folder, relative to the store. */
  list(prefix: string): Promise<string[]>
}

const safe = (path: string): string => {
  if (!/^[a-z0-9][a-z0-9._/-]{0,299}$/.test(path) || path.split('/').some((p) => p === '' || p === '.' || p === '..')) throw new Error(`Unsafe store path: ${path}`)
  return path
}
const hash = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex')

/** A local folder: dev and tests. One queue serializes writes, so a check and its write never interleave. */
export class DirectoryBlobStore implements BlobStore {
  private readonly root: string
  private queue: Promise<unknown> = Promise.resolve()
  constructor(dir: string) { this.root = resolve(dir) }
  private full(path: string) {
    const file = resolve(this.root, safe(path))
    if (!file.startsWith(this.root + sep)) throw new Error('Path outside the store')
    return file
  }
  async read(path: string): Promise<StoredBlob | null> {
    try {
      const bytes = new Uint8Array(await readFile(this.full(path)))
      return { bytes, generation: hash(bytes) }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null
      throw error
    }
  }
  write(path: string, bytes: Uint8Array, ifGeneration: string): Promise<string | null> {
    const work = this.queue.then(async () => {
      const current = await this.read(path)
      if ((current?.generation ?? ABSENT) !== ifGeneration) return null
      const file = this.full(path), temporary = `${file}.${process.pid}.tmp`
      await mkdir(dirname(file), { recursive: true })
      try {
        await writeFile(temporary, bytes, { mode: 0o600 })
        await rename(temporary, file)
      } finally { await unlink(temporary).catch(() => undefined) }
      return hash(bytes)
    })
    this.queue = work.catch(() => undefined)
    return work
  }
  async list(prefix: string): Promise<string[]> {
    const base = this.full(prefix.replace(/\/+$/, '')), out: string[] = []
    const walk = async (dir: string): Promise<void> => {
      const entries = await readdir(dir, { withFileTypes: true }).catch((error: NodeJS.ErrnoException) => { if (error.code === 'ENOENT') return []; throw error })
      for (const entry of entries) {
        const path = join(dir, entry.name)
        if (entry.isDirectory()) await walk(path)
        else if (!entry.name.endsWith('.tmp')) out.push(relative(this.root, path).split(sep).join('/'))
      }
    }
    await walk(base)
    return out.sort()
  }
}

interface GcsFile {
  getMetadata(): Promise<[{ generation?: string | number }]>
  download(): Promise<[Uint8Array]>
  save(data: Uint8Array, options: { resumable: boolean; contentType: string; preconditionOpts: { ifGenerationMatch: number | string } }): Promise<void>
  metadata: { generation?: string | number }
}
interface GcsBucket {
  file(path: string, options?: { generation?: string | number }): GcsFile
  getFiles(options: { prefix: string }): Promise<[{ name: string }[]]>
}
const contentTypeOf = (path: string) => (path.endsWith('.json') ? 'application/json' : path.endsWith('.webp') ? 'image/webp' : 'application/octet-stream')

/** The app's private bucket, under a prefix, read and written with the runtime account. */
export class BucketBlobStore implements BlobStore {
  private bucket: Promise<GcsBucket> | undefined
  constructor(private readonly name: string, private readonly prefix: string) {}
  private open(): Promise<GcsBucket> {
    this.bucket ??= import('@google-cloud/storage').then(({ Storage }) => new Storage().bucket(this.name) as unknown as GcsBucket)
    this.bucket.catch(() => { this.bucket = undefined })
    return this.bucket
  }
  async read(path: string): Promise<StoredBlob | null> {
    const bucket = await this.open(), key = this.prefix + safe(path)
    try {
      const [meta] = await bucket.file(key).getMetadata()
      const generation = String(meta.generation)
      // Read that exact generation, so the bytes and the generation always match.
      const [bytes] = await bucket.file(key, { generation }).download()
      return { bytes: new Uint8Array(bytes.buffer, bytes.byteOffset, bytes.byteLength), generation }
    } catch (error) {
      if ((error as { code?: number }).code === 404) return null
      throw error
    }
  }
  async write(path: string, bytes: Uint8Array, ifGeneration: string): Promise<string | null> {
    const bucket = await this.open(), file = bucket.file(this.prefix + safe(path))
    try {
      await file.save(bytes, { resumable: false, contentType: contentTypeOf(path), preconditionOpts: { ifGenerationMatch: ifGeneration === ABSENT ? 0 : ifGeneration } })
      return String(file.metadata.generation)
    } catch (error) {
      if ((error as { code?: number }).code === 412) return null
      throw error
    }
  }
  async list(prefix: string): Promise<string[]> {
    const [files] = await (await this.open()).getFiles({ prefix: this.prefix + safe(prefix.replace(/\/+$/, '')) + '/' })
    return files.map((f) => f.name.slice(this.prefix.length)).sort()
  }
}

/** The bucket when one is named, else the folder. */
export function blobStore(options: { bucket?: string; dir?: string }): BlobStore {
  if (options.bucket) return new BucketBlobStore(options.bucket, 'ranker/')
  if (options.dir) return new DirectoryBlobStore(options.dir)
  throw new Error('The Ranker needs CONTENT_BUCKET or a local RANKER_DIR')
}
