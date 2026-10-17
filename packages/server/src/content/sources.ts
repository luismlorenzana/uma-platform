// Where release and pack files come from (uma-platform SE2): the private bucket in production, a local folder in
// development, so local work never needs cloud credentials. Both games' API sources, merged (uma-rpg's
// `master-source.ts` and `content-source.ts`, uma-racer's `content.service.ts`).
import { readFile } from 'node:fs/promises'
import { resolve, sep } from 'node:path'

/** Reads one file by its path; null when it's missing. */
export interface FileSource {
  read(path: string): Promise<Uint8Array | null>
}

/** Plain files under a folder; nothing outside it. */
export class DirectoryFileSource implements FileSource {
  protected readonly root: string
  constructor(dir: string) {
    this.root = resolve(dir)
  }

  async read(path: string): Promise<Uint8Array | null> {
    const full = resolve(this.root, path)
    if (!full.startsWith(this.root + sep)) return null
    try {
      return new Uint8Array(await readFile(full))
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT' || (err as NodeJS.ErrnoException).code === 'EISDIR') return null
      throw err
    }
  }
}

/**
 * uma-platform's local release folder (`content/release`, P31) served like the bucket. The folder keeps files at their
 * manifest paths (`data/…`, `art/…`) and the manifest at `manifest.json`, where the bucket has `files/…`,
 * `manifests/v1/<version>.json` and `channels/v1/latest.json`; the `latest` channel is made from the manifest.
 */
export class DirectoryReleaseSource extends DirectoryFileSource {
  override async read(path: string): Promise<Uint8Array | null> {
    const direct = await super.read(path.startsWith('files/') ? path.slice('files/'.length) : path)
    if (direct !== null) return direct
    if (!path.startsWith('manifests/') && !path.startsWith('channels/')) return null
    const manifest = await super.read('manifest.json')
    if (manifest === null) return null
    if (path.startsWith('manifests/')) return manifest
    const parsed = JSON.parse(new TextDecoder().decode(manifest)) as { version: string; schemaMajor: number; createdAt: string }
    return new TextEncoder().encode(JSON.stringify({
      schemaMajor: parsed.schemaMajor, channel: 'latest', version: parsed.version, manifest: `manifests/v${parsed.schemaMajor}/${parsed.version}.json`,
      updatedAt: parsed.createdAt,
    }))
  }
}

interface BucketFile {
  download(): Promise<[Uint8Array]>
}
interface Bucket {
  file(path: string): BucketFile
}

/**
 * A private bucket, read with the API's runtime service account. `@google-cloud/storage` loads on the first read, so an
 * API that only serves a local folder never needs it.
 */
export class BucketFileSource implements FileSource {
  private bucket: Promise<Bucket> | undefined
  constructor(private readonly name: string) {}

  private open(): Promise<Bucket> {
    this.bucket ??= import('@google-cloud/storage').then(({ Storage }) => new Storage().bucket(this.name) as unknown as Bucket)
    this.bucket.catch(() => { this.bucket = undefined })
    return this.bucket
  }

  async read(path: string): Promise<Uint8Array | null> {
    try {
      const [bytes] = await (await this.open()).file(path).download()
      return new Uint8Array(bytes.buffer, bytes.byteOffset, bytes.byteLength)
    } catch (err) {
      if ((err as { code?: number }).code === 404) return null
      throw err
    }
  }
}

/** The bucket when one is named, else the folder. One of them is required. */
export function fileSource(options: { readonly bucket?: string | undefined; readonly dir?: string | undefined }, folder: (dir: string) => FileSource): FileSource {
  if (options.bucket) return new BucketFileSource(options.bucket)
  if (options.dir) return folder(options.dir)
  throw new Error('A content route needs a bucket or a local folder')
}
