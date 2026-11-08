// An in-memory bucket for publisher tests: the storage client's four calls over a map of object paths.

import type { ReleaseSource } from '@luismlorenzana/uma-data'
import { readFile } from 'node:fs/promises'
import type { ReleaseStorageClient, UploadEntry } from '../publish'

export class FakeBucket implements ReleaseStorageClient {
  objects = new Map<string, Buffer>()
  log: string[] = []

  /** Starts with the objects of a memory release (`buildMemoryRelease().objects`). */
  constructor(seed?: ReadonlyMap<string, Uint8Array>) {
    for (const [path, bytes] of seed ?? []) this.objects.set(path, Buffer.from(bytes))
  }

  async read(path: string) {
    return this.objects.get(path) ?? null
  }

  async list(prefix: string) {
    this.log.push(`list ${prefix}`)
    return new Map([...this.objects].filter(([path]) => path.startsWith(prefix)).map(([path, bytes]) => [path, bytes.byteLength]))
  }

  async uploadImmutable(entries: readonly UploadEntry[]) {
    for (const entry of entries) {
      if (this.objects.has(entry.objectPath)) continue
      this.log.push(`put ${entry.objectPath}`)
      this.objects.set(entry.objectPath, await readFile(entry.localPath))
    }
  }

  async replace(entry: UploadEntry) {
    this.log.push(`replace ${entry.objectPath}`)
    this.objects.set(entry.objectPath, await readFile(entry.localPath))
  }

  source(): ReleaseSource {
    return {
      read: async (path) => {
        const bytes = this.objects.get(path)
        if (!bytes) throw new Error(`missing ${path}`)
        return new Uint8Array(bytes)
      },
    }
  }
}
