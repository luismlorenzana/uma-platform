import { createReleaseClient, releasePaths, type ReleaseSource } from '@luismlorenzana/uma-data'
import { syntheticArtIndex, syntheticMasterData } from '@luismlorenzana/uma-data/testing'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { writeDataSets } from './pack'
import { publishRelease, type ReleaseStorageClient, type UploadEntry } from './publish'
import { readLocalManifest, sha256, writeLocalManifest } from './release-dir'

const tempDirs: string[] = []

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((path) => rm(path, { recursive: true, force: true })))
})

/** A local release with every set, two art files and an art index pointing at them. */
async function localRelease(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'uma-platform-publish-'))
  tempDirs.push(dir)
  const data = syntheticMasterData()
  const base = await writeDataSets({
    releaseDir: dir,
    sources: { 'synthetic/test': '1' },
    sets: {
      characters: data.characters,
      outfits: data.outfits,
      'support-cards': data.supportCards,
      skills: data.skills,
      scenarios: data.scenarios,
      races: data.races,
      tracks: data.tracks,
      courses: data.courses,
      objectives: data.objectives,
    },
  })
  const page = 'atlases/outfit-icons-0.1111111111111111.webp'
  const image = 'art/outfit-portraits/900101.2222222222222222.webp'
  const index = JSON.stringify(syntheticArtIndex(page, image))
  const indexPath = `data/art.${sha256(index).slice(0, 16)}.json`
  await mkdir(resolve(dir, 'atlases'), { recursive: true })
  await mkdir(resolve(dir, 'art/outfit-portraits'), { recursive: true })
  const extra = [[page, 'page'], [image, 'portrait'], [indexPath, index]] as const
  for (const [path, value] of extra) await writeFile(resolve(dir, path), value)
  await writeLocalManifest(dir, {
    sources: base.sources,
    sets: base.sets,
    art: indexPath,
    files: [...base.files, ...extra.map(([path, value]) => ({ path, bytes: Buffer.byteLength(value), sha256: sha256(value) }))],
  })
  return dir
}

class FakeBucket implements ReleaseStorageClient {
  objects = new Map<string, Buffer>()
  log: string[] = []

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

describe('publishRelease', () => {
  it('uploads files, then the manifest, then moves the channel; a client can then load latest', async () => {
    const dir = await localRelease()
    const manifest = (await readLocalManifest(dir))!
    const bucket = new FakeBucket()
    const result = await publishRelease({ releaseDir: dir, storage: bucket, now: () => new Date('2099-01-02T00:00:00.000Z') })

    expect(result).toMatchObject({ version: manifest.version, channelBefore: null, channelAfter: manifest.version, manifestUploaded: true })
    expect(result.uploadPaths).toHaveLength(manifest.files.length)
    const puts = bucket.log.filter((line) => !line.startsWith('list'))
    const manifestAt = puts.indexOf(`put ${releasePaths.manifest(manifest.version)}`)
    const channelAt = puts.indexOf(`replace ${releasePaths.channel('latest')}`)
    expect(puts.slice(0, manifest.files.length).every((line) => line.startsWith('put files/'))).toBe(true)
    expect(manifestAt).toBe(manifest.files.length)
    expect(channelAt).toBe(manifest.files.length + 1)

    const loaded = await createReleaseClient({ source: bucket.source() }).load()
    expect(loaded.manifest.version).toBe(manifest.version)
    expect(loaded.data.outfits).toEqual(syntheticMasterData().outfits)
    expect(loaded.art?.images['outfit-portraits']?.['900101']?.path).toBe('art/outfit-portraits/900101.2222222222222222.webp')
  })

  it('is a no-op the second time and never deletes or overwrites a published file', async () => {
    const dir = await localRelease()
    const bucket = new FakeBucket()
    await publishRelease({ releaseDir: dir, storage: bucket })
    const before = new Map(bucket.objects)
    bucket.log.length = 0
    const again = await publishRelease({ releaseDir: dir, storage: bucket })
    expect(again).toMatchObject({ uploadPaths: [], manifestUploaded: false })
    expect(bucket.log.filter((line) => !line.startsWith('list'))).toEqual([])
    expect(bucket.objects).toEqual(before)
  })

  it('plans without writing on a dry run', async () => {
    const dir = await localRelease()
    const bucket = new FakeBucket()
    const plan = await publishRelease({ releaseDir: dir, storage: bucket, dryRun: true })
    expect(plan.dryRun).toBe(true)
    expect(plan.uploadPaths.length).toBeGreaterThan(0)
    expect(bucket.objects.size).toBe(0)
  })

  it('refuses a local file that no longer matches the manifest', async () => {
    const dir = await localRelease()
    const manifest = (await readLocalManifest(dir))!
    await writeFile(resolve(dir, manifest.sets.races), '{"set":"races","items":[]}')
    await expect(publishRelease({ releaseDir: dir, storage: new FakeBucket() })).rejects.toThrow(manifest.sets.races)
  })

  it('refuses to publish over a different manifest with the same version', async () => {
    const dir = await localRelease()
    const manifest = (await readLocalManifest(dir))!
    const bucket = new FakeBucket()
    const forged = { ...manifest, files: manifest.files.map((file, index) => (index === 0 ? { ...file, bytes: file.bytes + 1 } : file)) }
    bucket.objects.set(releasePaths.manifest(manifest.version), Buffer.from(JSON.stringify(forged)))
    await expect(publishRelease({ releaseDir: dir, storage: bucket })).rejects.toThrow('already exists with different files')
  })
})
