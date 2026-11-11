import { createReleaseClient, type ArtIndex } from '@luismlorenzana/uma-data'
import { buildMemoryRelease, syntheticArtIndex, syntheticMasterData } from '@luismlorenzana/uma-data/testing'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { FakeBucket } from './__fixtures__/bucket'
import { planFamiliesOnly } from './families-only'
import { writeDataSets, type MasterSets } from './pack'
import { publishManifest } from './publish'
import { sha256, writeLocalManifest } from './release-dir'
import { checkCarried } from './sprites-only'

const tempDirs: string[] = []
afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((path) => rm(path, { recursive: true, force: true })))
})
async function temp(prefix: string): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), prefix))
  tempDirs.push(dir)
  return dir
}

const PAGE = 'atlases/outfit-icons-0.1111111111111111.webp'
const IMAGE = 'art/outfit-portraits/900101.2222222222222222.webp'

async function publishedBucket(art: ArtIndex = syntheticArtIndex(PAGE, IMAGE)) {
  const release = await buildMemoryRelease(syntheticMasterData(), {
    art, extraFiles: { [PAGE]: new Uint8Array([1, 2, 3]), [IMAGE]: new Uint8Array([4, 5]) },
  })
  return { release, bucket: new FakeBucket(release.objects) }
}

function sets(data = syntheticMasterData()): MasterSets {
  return {
    characters: data.characters, outfits: data.outfits, 'support-cards': data.supportCards, skills: data.skills,
    scenarios: data.scenarios, races: data.races, tracks: data.tracks, courses: data.courses, objectives: data.objectives,
  }
}

/** A local release whose art index holds `families`, one invented image each, and a refreshed portrait. */
async function localRelease(families: string[]): Promise<string> {
  const dir = await temp('uma-families-local-')
  const base = await writeDataSets({ releaseDir: dir, sources: { 'synthetic/test': '3' }, sets: sets() })
  const files = [...base.files]
  const images: Record<string, Record<string, { path: string; width: number; height: number }>> = {}
  for (const family of [...families, 'outfit-portraits']) {
    const bytes = Buffer.from(`${family} of 900101`)
    const path = `art/${family}/900101.${sha256(bytes).slice(0, 16)}.webp`
    await mkdir(resolve(dir, 'art', family), { recursive: true })
    await writeFile(resolve(dir, path), bytes)
    files.push({ path, bytes: bytes.byteLength, sha256: sha256(bytes) })
    images[family] = { 900101: { path, width: 768, height: 1024 } }
  }
  const index = JSON.stringify({ atlases: {}, images })
  const indexPath = `data/art.${sha256(index).slice(0, 16)}.json`
  await mkdir(resolve(dir, 'data'), { recursive: true })
  await writeFile(resolve(dir, indexPath), index)
  files.push({ path: indexPath, bytes: Buffer.byteLength(index), sha256: sha256(index) })
  await writeLocalManifest(dir, { sources: base.sources, sets: base.sets, art: indexPath, files })
  return dir
}

describe('a families-only release (P137)', () => {
  it('carries every published file byte for byte and adds only the new family and a new art index', async () => {
    const { release, bucket } = await publishedBucket()
    const plan = await planFamiliesOnly({ releaseDir: await localRelease(['outfit-renders']), storage: bucket, families: ['outfit-renders'], stagingDir: await temp('uma-stage-') })
    expect(checkCarried(release.manifest, plan.manifest).carried).toBe(release.manifest.files.length - 1)
    expect(plan.added).toEqual({ 'outfit-renders': 1 })
    expect(plan.manifest.sets).toEqual(release.manifest.sets)
    expect(plan.manifest.sources).toEqual(release.manifest.sources)
    // The local refreshed portrait never rides along: only the render file and the index are new.
    const before = new Set(release.manifest.files.map((file) => file.path))
    expect(plan.manifest.files.filter((file) => !before.has(file.path)).map((file) => file.path.split('/')[1])).toEqual(['outfit-renders', expect.stringMatching(/^art\./)])

    await publishManifest({ manifest: plan.manifest, manifestPath: plan.manifestPath, localPaths: plan.localPaths, storage: bucket, channel: 'candidate', dryRun: false })
    const client = createReleaseClient({ source: bucket.source(), channel: 'candidate' })
    const manifest = await client.manifest()
    const art = await client.art(manifest)
    expect(art?.images['outfit-renders']?.['900101']).toMatchObject({ width: 768, height: 1024 })
    expect(art?.images['outfit-portraits']?.['900101']?.path).toBe(IMAGE)
  })

  it('refuses a family latest already has, an unknown family, and one the local release lacks', async () => {
    const { bucket } = await publishedBucket()
    const dir = await localRelease(['outfit-renders'])
    const options = { releaseDir: dir, storage: bucket, stagingDir: await temp('uma-stage-') }
    await expect(planFamiliesOnly({ ...options, families: ['outfit-portraits'] })).rejects.toThrow('already has outfit-portraits')
    await expect(planFamiliesOnly({ ...options, families: ['outfit-hats'] })).rejects.toThrow('Not an image family')
    await expect(planFamiliesOnly({ ...options, families: [] })).rejects.toThrow('Name the families')
    await expect(planFamiliesOnly({ ...options, releaseDir: await localRelease([]), families: ['outfit-renders'] })).rejects.toThrow('has no outfit-renders')
  })
})
