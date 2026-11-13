// A release bucket in a local folder, over the real one (`--local <dir>`, Q16 part A's dry run): writes land in the
// folder in the bucket's layout (`channels/`, `manifests/`, `files/`), and reads look in the folder first, then the
// bucket. A publish through it uploads nothing; `pnpm release:check -- --local <dir>` then reads the planned release
// back like a game, with the files it carries from `latest` read from the bucket.

import { copyFile, mkdir, readFile, readdir, stat } from 'node:fs/promises'
import { dirname, posix, relative, resolve, sep } from 'node:path'
import type { ReleaseStorageClient, UploadEntry } from './publish'

export class LocalOverlayStorage implements ReleaseStorageClient {
  constructor(
    readonly dir: string,
    /** The bucket underneath, read only; null for a folder on its own (tests). */
    private readonly base: Pick<ReleaseStorageClient, 'read' | 'list'> | null,
  ) {}

  private path(objectPath: string): string {
    const full = resolve(this.dir, ...objectPath.split('/'))
    if (!full.startsWith(resolve(this.dir) + sep)) throw new Error(`${objectPath} is outside ${this.dir}`)
    return full
  }

  async read(objectPath: string): Promise<Buffer | null> {
    try {
      return await readFile(this.path(objectPath))
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
    }
    return this.base ? this.base.read(objectPath) : null
  }

  async list(prefix: string): Promise<ReadonlyMap<string, number>> {
    const sizes = new Map(this.base ? await this.base.list(prefix) : [])
    const walk = async (dir: string): Promise<void> => {
      let names: string[]
      try {
        names = await readdir(dir)
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') return
        throw error
      }
      for (const name of names) {
        const full = resolve(dir, name), info = await stat(full)
        if (info.isDirectory()) await walk(full)
        else {
          const objectPath = relative(this.dir, full).split(sep).join(posix.sep)
          if (objectPath.startsWith(prefix)) sizes.set(objectPath, info.size)
        }
      }
    }
    await walk(this.dir)
    return sizes
  }

  async uploadImmutable(entries: readonly UploadEntry[]): Promise<void> {
    for (const entry of entries) {
      if (await stat(this.path(entry.objectPath)).then(() => true, () => false)) continue
      await mkdir(dirname(this.path(entry.objectPath)), { recursive: true })
      await copyFile(entry.localPath, this.path(entry.objectPath))
    }
  }

  async replace(entry: UploadEntry): Promise<void> {
    await mkdir(dirname(this.path(entry.objectPath)), { recursive: true })
    await copyFile(entry.localPath, this.path(entry.objectPath))
  }
}
