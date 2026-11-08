import { createReleaseClient, releasePaths, type ArtIndex, type SpriteSet } from '@luismlorenzana/uma-data'
import { buildMemoryRelease, syntheticArtIndex, syntheticMasterData, syntheticSpriteSet } from '@luismlorenzana/uma-data/testing'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { FakeBucket } from './__fixtures__/bucket'
import { writeDataSets, type MasterSets } from './pack'
import { publishManifest } from './publish'
import { readLocalManifest, sha256, writeLocalManifest } from './release-dir'
import { checkCarried, planSpritesOnly, recordPublished } from './sprites-only'

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

/** The published release: synthetic sets, two art files and an art index, as `latest` in a fake bucket. */
async function publishedBucket(art: ArtIndex = syntheticArtIndex(PAGE, IMAGE), sprites?: SpriteSet[], pages: Record<string, Uint8Array> = {}) {
  const release = await buildMemoryRelease(syntheticMasterData(), {
    art, sprites, extraFiles: { [PAGE]: new Uint8Array([1, 2, 3]), [IMAGE]: new Uint8Array([4, 5]), ...pages },
  })
  return { release, bucket: new FakeBucket(release.objects) }
}

function sets(data = syntheticMasterData()): MasterSets {
  return {
    characters: data.characters, outfits: data.outfits, 'support-cards': data.supportCards, skills: data.skills,
    scenarios: data.scenarios, races: data.races, tracks: data.tracks, courses: data.courses, objectives: data.objectives,
  }
}

/** A local release with packed sprite sets for `outfitIds`, on top of (possibly different) master sets. */
async function localRelease(outfitIds: number[], data = syntheticMasterData()): Promise<string> {
  const dir = await temp('uma-sprites-local-')
  const base = await writeDataSets({ releaseDir: dir, sources: { 'synthetic/test': '2' }, sets: sets(data) })
  await mkdir(resolve(dir, 'atlases'), { recursive: true })
  await mkdir(resolve(dir, 'art/outfit-sprites'), { recursive: true })
  const files = [...base.files]
  const sprites: Record<string, string> = {}
  for (const outfitId of outfitIds) {
    const pageBytes = Buffer.from(`page of ${outfitId}`)
    const pagePath = `atlases/outfit-sprites-${outfitId}-0.${sha256(pageBytes).slice(0, 16)}.webp`
    await writeFile(resolve(dir, pagePath), pageBytes)
    files.push({ path: pagePath, bytes: pageBytes.byteLength, sha256: sha256(pageBytes) })
    const set = { ...syntheticSpriteSet(), outfitId, pages: [{ path: pagePath, width: 32, height: 32 }] }
    const json = JSON.stringify(set)
    const setPath = `art/outfit-sprites/${outfitId}.${sha256(json).slice(0, 16)}.json`
    await writeFile(resolve(dir, setPath), json)
    files.push({ path: setPath, bytes: Buffer.byteLength(json), sha256: sha256(json) })
    sprites[String(outfitId)] = setPath
  }
  const index = JSON.stringify({ atlases: {}, images: {}, sprites })
  const indexPath = `data/art.${sha256(index).slice(0, 16)}.json`
  await writeFile(resolve(dir, indexPath), index)
  files.push({ path: indexPath, bytes: Buffer.byteLength(index), sha256: sha256(index) })
  await writeLocalManifest(dir, { sources: base.sources, sets: base.sets, art: indexPath, files })
  return dir
}

describe('a sprite-only release', () => {
  it('carries every published file byte for byte and adds only the sprite files and a new art index', async () => {
    const { release, bucket } = await publishedBucket()
    const plan = await planSpritesOnly({ releaseDir: await localRelease([900101]), storage: bucket, stagingDir: await temp('uma-stage-') })

    expect(checkCarried(release.manifest, plan.manifest).carried).toBe(release.manifest.files.length - 1)
    const added = plan.manifest.files.filter((file) => !release.manifest.files.some((old) => old.path === file.path)).map((file) => file.path)
    expect(added).toEqual(expect.arrayContaining([plan.manifest.art!, plan.sprites['900101']!]))
    expect(added).toHaveLength(3)
    expect(plan.manifest.sets).toEqual(release.manifest.sets)
    expect(plan.manifest.sources).toEqual(release.manifest.sources)

    const index = JSON.parse(await readFile(plan.localPaths.get(plan.manifest.art!)!, 'utf8')) as ArtIndex
    expect({ ...index, sprites: undefined }).toEqual({ ...syntheticArtIndex(PAGE, IMAGE), sprites: undefined })
    expect(Object.keys(index.sprites!)).toEqual(['900101'])
  })

  it("never takes the local release's master sets, so a GameTora refresh can't ride along", async () => {
    const { release, bucket } = await publishedBucket()
    const refreshed = syntheticMasterData()
    refreshed.races[0]!.entries = 12
    const dir = await localRelease([900101], refreshed)
    const plan = await planSpritesOnly({ releaseDir: dir, storage: bucket, stagingDir: await temp('uma-stage-') })
    expect(plan.manifest.sets).toEqual(release.manifest.sets)
    expect((await readLocalManifest(dir))!.sets.races).not.toBe(release.manifest.sets.races)
  })

  it('keeps earlier published sprite sets and replaces only the ones packed again', async () => {
    const earlier = { ...syntheticSpriteSet(), outfitId: 900101, revision: 1, pages: [{ path: 'atlases/outfit-sprites-900101-0.aaaaaaaaaaaaaaaa.webp', width: 32, height: 32 }] }
    const other = { ...syntheticSpriteSet(), outfitId: 900202, pages: [{ path: 'atlases/outfit-sprites-900202-0.bbbbbbbbbbbbbbbb.webp', width: 32, height: 32 }] }
    const { release, bucket } = await publishedBucket(syntheticArtIndex(PAGE, IMAGE), [earlier, other], {
      [earlier.pages[0]!.path]: new Uint8Array([9]), [other.pages[0]!.path]: new Uint8Array([8]),
    })
    const plan = await planSpritesOnly({ releaseDir: await localRelease([900101]), storage: bucket, stagingDir: await temp('uma-stage-') })
    expect(Object.keys(plan.sprites)).toEqual(['900101', '900202'])
    expect(plan.sprites['900202']).toBe((await createReleaseClient({ source: bucket.source() }).art(release.manifest))!.sprites!['900202'])
    expect(plan.sprites['900101']).not.toBe((await createReleaseClient({ source: bucket.source() }).art(release.manifest))!.sprites!['900101'])
  })

  it('publishes to candidate, leaves latest alone, and loads every set through the client', async () => {
    const { release, bucket } = await publishedBucket()
    const plan = await planSpritesOnly({ releaseDir: await localRelease([900101, 900303]), storage: bucket, stagingDir: await temp('uma-stage-') })
    const result = await publishManifest({ manifest: plan.manifest, manifestPath: plan.manifestPath, localPaths: plan.localPaths, storage: bucket, channel: 'candidate' })
    expect(result).toMatchObject({ channel: 'candidate', channelBefore: null, channelAfter: plan.manifest.version })
    expect(result.uploadPaths).toHaveLength(5)

    const candidate = createReleaseClient({ source: bucket.source(), channel: 'candidate' })
    const loaded = await candidate.load()
    expect(loaded.data).toEqual(syntheticMasterData())
    for (const outfitId of [900101, 900303]) {
      const set = await candidate.spriteSet(loaded.manifest, loaded.art!, outfitId)
      expect(set).toMatchObject({ outfitId, actions: syntheticSpriteSet().actions })
      expect(await candidate.file(loaded.manifest, set!.pages[0]!.path)).toEqual(new Uint8Array(Buffer.from(`page of ${outfitId}`)))
    }
    expect((await createReleaseClient({ source: bucket.source() }).channel()).version).toBe(release.manifest.version)

    const file = resolve(await temp('uma-authoring-'), 'published.json')
    expect(await recordPublished(bucket, plan.manifest.version, file)).toBe(2)
    expect(JSON.parse(await readFile(file, 'utf8'))).toEqual({
      900101: { revision: 1, version: plan.manifest.version }, 900303: { revision: 1, version: plan.manifest.version },
    })
  })

  it('refuses a local sprite file that no longer matches its manifest, or a release with no sprites', async () => {
    const { bucket } = await publishedBucket()
    const dir = await localRelease([900101])
    const manifest = (await readLocalManifest(dir))!
    const page = manifest.files.find((file) => file.path.startsWith('atlases/outfit-sprites-'))!
    await writeFile(resolve(dir, page.path), 'tampered')
    await expect(planSpritesOnly({ releaseDir: dir, storage: bucket, stagingDir: await temp('uma-stage-') })).rejects.toThrow(page.path)
    await expect(planSpritesOnly({ releaseDir: await localRelease([]), storage: bucket, stagingDir: await temp('uma-stage-') })).rejects.toThrow('no sprite sets')
  })

  it("needs a published release to build on, and won't publish a file the bucket lacks without a local copy", async () => {
    const { release, bucket } = await publishedBucket()
    const empty = new FakeBucket()
    await expect(planSpritesOnly({ releaseDir: await localRelease([900101]), storage: empty, stagingDir: await temp('uma-stage-') })).rejects.toThrow('latest.json')
    const plan = await planSpritesOnly({ releaseDir: await localRelease([900101]), storage: bucket, stagingDir: await temp('uma-stage-') })
    bucket.objects.delete(releasePaths.file(release.manifest.sets.skills))
    await expect(publishManifest({ manifest: plan.manifest, manifestPath: plan.manifestPath, localPaths: plan.localPaths, storage: bucket, dryRun: true }))
      .rejects.toThrow(`${release.manifest.sets.skills} isn't in the bucket`)
  })
})
