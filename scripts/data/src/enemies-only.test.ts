// Q16 part A: the enemies set and the enemy-keys family through the local release, the enemies-only release on
// latest, the local folder a dry run publishes into, and the image checks both tools share.
import { createReleaseClient, releasePaths, type ArtIndex, type EnemyTier } from '@luismlorenzana/uma-data'
import { buildMemoryRelease, syntheticArtIndex, syntheticEnemies, syntheticMasterData } from '@luismlorenzana/uma-data/testing'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { FakeBucket } from './__fixtures__/bucket'
import { planEnemiesOnly } from './enemies-only'
import { fixtureEnemy, fixtureRosterEntry, FIXTURE_ENEMY_ID, type FixtureEnemy } from './enemy-fixture'
import { clearBorder, compositeOver, decodeRgba, encodeLossless, imageDistance, recomposites, type Rgba } from './enemy-images'
import { writeEnemyRelease, type PackedEnemyKey } from './enemy-release'
import { LocalOverlayStorage } from './local-storage'
import { writeDataSets, type MasterSets } from './pack'
import { publishManifest } from './publish'
import { readLocalManifest } from './release-dir'
import { changedSets, checkCarried } from './sprites-only'

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
  const release = await buildMemoryRelease(syntheticMasterData(), { art, extraFiles: { [PAGE]: new Uint8Array([1, 2, 3]), [IMAGE]: new Uint8Array([4, 5]) } })
  return { release, bucket: new FakeBucket(release.objects) }
}
function sets(data = syntheticMasterData()): MasterSets {
  return {
    characters: data.characters, outfits: data.outfits, 'support-cards': data.supportCards, skills: data.skills,
    scenarios: data.scenarios, races: data.races, tracks: data.tracks, courses: data.courses, objectives: data.objectives,
  }
}

async function packed(enemy: FixtureEnemy): Promise<PackedEnemyKey> {
  const image = async (rgba: Rgba) => ({ bytes: await encodeLossless(rgba), width: rgba.width, height: rgba.height })
  const poses: PackedEnemyKey['poses'] = {}
  for (const [name, pose] of Object.entries(enemy.poses)) {
    poses[name] = { image: await image(pose.image), anchors: pose.anchors }
    if (pose.layers) poses[name]!.layers = await Promise.all(pose.layers.map(async (layer) => ({ name: layer.name, pivot: layer.pivot, image: await image(layer.image) })))
  }
  return { enemyId: enemy.enemyId, revision: enemy.revision, tier: enemy.tier, canvas: enemy.canvas, display: enemy.display, poses }
}

/** A local release: the master sets, then the enemies set and the given test enemies packed into it. */
async function localRelease(tiers: EnemyTier[] = ['boss']): Promise<string> {
  const dir = await temp('uma-enemies-local-')
  await writeDataSets({ releaseDir: dir, sources: { 'synthetic/test': '2' }, sets: sets() })
  const enemies = tiers.map((tier, i) => fixtureEnemy(tier, FIXTURE_ENEMY_ID - i))
  await writeEnemyRelease(dir, [...syntheticEnemies(), ...enemies.map((e) => fixtureRosterEntry(e.tier, e.enemyId))], await Promise.all(enemies.map(packed)))
  return dir
}

describe('the enemy image checks', () => {
  const px = (pixels: [number, number, number, number][]): Rgba => ({ data: new Uint8Array(pixels.flat()), width: pixels.length, height: 1 })

  it('composites layers source-over, back to front, in straight alpha', () => {
    const back = px([[255, 0, 0, 255], [0, 0, 0, 0], [0, 0, 255, 128]])
    const front = px([[0, 0, 255, 128], [0, 255, 0, 255], [0, 0, 0, 0]])
    expect([...compositeOver([back, front]).data]).toEqual([127, 0, 128, 255, 0, 255, 0, 255, 0, 0, 255, 128])
  })

  it("ignores a clear pixel's colour and holds the rest to 8-bit rounding", () => {
    expect(imageDistance(px([[9, 9, 9, 0]]), px([[200, 1, 50, 0]]))).toMatchObject({ alpha: 0, color: 0 })
    expect(recomposites([px([[100, 100, 100, 255]])], px([[101, 100, 99, 255]])).ok).toBe(true)
    expect(recomposites([px([[100, 100, 100, 255]])], px([[103, 100, 100, 255]])).ok).toBe(false)
    expect(recomposites([px([[100, 100, 100, 255]])], px([[100, 100, 100, 252]])).ok).toBe(false)
  })

  it('finds a figure in the border', () => {
    const image: Rgba = { data: new Uint8Array(20 * 20 * 4), width: 20, height: 20 }
    image.data[(10 * 20 + 10) * 4 + 3] = 255
    expect(clearBorder(image, 8)).toBe(true)
    image.data[(10 * 20 + 12) * 4 + 3] = 1
    expect(clearBorder(image, 8)).toBe(false)
  })

  it("draws a test enemy whose poses fill her tier's canvas inside the border, a boss's layers re-compositing exactly", async () => {
    for (const tier of ['regular', 'key', 'boss'] as const) {
      const enemy = fixtureEnemy(tier)
      for (const pose of Object.values(enemy.poses)) {
        expect([pose.image.width, pose.image.height]).toEqual([enemy.canvas.width, enemy.canvas.height])
        expect(clearBorder(pose.image, 8)).toBe(true)
      }
    }
    const boss = fixtureEnemy('boss'), battle = boss.poses.battle!
    // Through the release's encoding and back, as release:check reads it.
    const decode = async (rgba: Rgba) => decodeRgba(await encodeLossless(rgba))
    expect(recomposites(await Promise.all(battle.layers!.map((l) => decode(l.image))), await decode(battle.image)).ok).toBe(true)
    // A layer moved by a pixel no longer gives the pose.
    const shifted = { ...battle.layers![2]!.image, data: new Uint8Array(battle.layers![2]!.image.data.length) }
    shifted.data.set(battle.layers![2]!.image.data.subarray(4), 0)
    expect(recomposites([battle.layers![0]!.image, battle.layers![1]!.image, shifted], battle.image).ok).toBe(false)
  })
})

describe('the enemies set and family in the local release', () => {
  it('writes the set, each key and its images, and an enemyKeys map; the master sets and other art stay', async () => {
    const dir = await localRelease(['boss', 'regular'])
    const manifest = (await readLocalManifest(dir))!
    expect(manifest.sets.enemies).toMatch(/^data\/enemies\.[0-9a-f]{16}\.json$/)
    const index = JSON.parse(await readFile(resolve(dir, manifest.art!), 'utf8')) as ArtIndex
    expect(Object.keys(index.enemyKeys!)).toEqual([String(FIXTURE_ENEMY_ID - 1), String(FIXTURE_ENEMY_ID)])
    // A boss: 4 poses and 3 layers; a regular: 1 pose; two key manifests.
    expect(manifest.files.filter((file) => file.path.startsWith('art/enemy-keys/'))).toHaveLength(4 + 3 + 1 + 2)
  })

  it('survives a data import and a repack without the test enemy', async () => {
    const dir = await localRelease(['boss'])
    const before = (await readLocalManifest(dir))!
    const after = await writeDataSets({ releaseDir: dir, sources: { 'synthetic/test': '3' }, sets: sets() })
    expect(after.sets.enemies).toBe(before.sets.enemies)
    expect(after.art).toBe(before.art)
    const repacked = await writeEnemyRelease(dir, syntheticEnemies(), [])
    expect(repacked.files.some((file) => file.path.startsWith('art/enemy-keys/'))).toBe(false)
    const index = JSON.parse(await readFile(resolve(dir, repacked.art!), 'utf8')) as ArtIndex
    expect(index.enemyKeys).toBeUndefined()
  })
})

describe('an enemies-only release', () => {
  it('carries every published file byte for byte; only the enemies set and the enemyKeys map change', async () => {
    const { release, bucket } = await publishedBucket()
    const plan = await planEnemiesOnly({ releaseDir: await localRelease(['boss']), storage: bucket, stagingDir: await temp('uma-stage-') })
    expect(changedSets(release.manifest, plan.manifest)).toEqual(['enemies'])
    expect(checkCarried(release.manifest, plan.manifest, ['enemies']).carried).toBe(release.manifest.files.length - 1)
    expect(() => checkCarried(release.manifest, plan.manifest)).toThrow('The master sets changed')
    const { enemies: _e, ...masterSets } = plan.manifest.sets
    expect(masterSets).toEqual(release.manifest.sets)
    expect(plan.manifest.sources).toEqual(release.manifest.sources)
    // The set, a new index, and the boss's 4 poses, 3 layers and manifest.
    expect(plan.manifest.files.length - release.manifest.files.length).toBe(1 + 1 + 4 + 3 + 1 - 1)
    expect(plan.added.map((key) => key.enemyId)).toEqual([FIXTURE_ENEMY_ID])
  })

  it('publishes to a folder over the bucket, uploading nothing, and reads back like a game', async () => {
    const { release, bucket } = await publishedBucket()
    const folder = await temp('uma-dry-run-')
    const storage = new LocalOverlayStorage(folder, bucket)
    const plan = await planEnemiesOnly({ releaseDir: await localRelease(['boss']), storage, stagingDir: await temp('uma-stage-') })
    const result = await publishManifest({ manifest: plan.manifest, manifestPath: plan.manifestPath, localPaths: plan.localPaths, storage, channel: 'dry-run' })
    expect(bucket.log.filter((line) => !line.startsWith('list '))).toEqual([])
    expect(result.uploadPaths).toHaveLength(plan.manifest.files.length - release.manifest.files.length + 1)

    const client = createReleaseClient({ source: { read: async (path) => new Uint8Array((await storage.read(path))!) }, channel: 'dry-run' })
    const { manifest, art } = await client.load()
    expect(manifest.version).toBe(plan.manifest.version)
    expect((await client.enemies(manifest))!.map((enemy) => enemy.id)).toContain(FIXTURE_ENEMY_ID)
    const key = (await client.enemyKey(manifest, art!, FIXTURE_ENEMY_ID))!
    expect(key.poses.battle!.layers!.map((layer) => layer.name)).toEqual(['rear', 'body', 'front'])
    const decoded = await decodeRgba(await client.file(manifest, key.poses.attack!.path))
    expect([decoded.width, decoded.height]).toEqual([768, 768])
    // latest itself is untouched.
    expect(await createReleaseClient({ source: bucket.source() }).manifest()).toEqual(release.manifest)
    expect(await storage.read(releasePaths.channel('dry-run'))).not.toBeNull()
    expect(await bucket.read(releasePaths.channel('dry-run'))).toBeNull()
  })

  it('keeps enemy keys latest already has unless a newer one replaces them', async () => {
    const { bucket } = await publishedBucket()
    const first = await planEnemiesOnly({ releaseDir: await localRelease(['boss']), storage: bucket, stagingDir: await temp('uma-stage-') })
    await publishManifest({ manifest: first.manifest, manifestPath: first.manifestPath, localPaths: first.localPaths, storage: bucket, channel: 'latest' })
    const second = await planEnemiesOnly({ releaseDir: await localRelease(['regular']), storage: bucket, stagingDir: await temp('uma-stage-') })
    expect(Object.keys(second.enemyKeys)).toEqual([String(FIXTURE_ENEMY_ID)])
    expect(second.enemyKeys[String(FIXTURE_ENEMY_ID)]).not.toBe(first.enemyKeys[String(FIXTURE_ENEMY_ID)])
    expect(checkCarried(first.manifest, second.manifest, ['enemies']).carried).toBe(first.manifest.files.length - 1)
  })

  it('refuses a local release without the enemies set', async () => {
    const { bucket } = await publishedBucket()
    const dir = await temp('uma-plain-')
    await writeDataSets({ releaseDir: dir, sources: { 'synthetic/test': '2' }, sets: sets() })
    await expect(planEnemiesOnly({ releaseDir: dir, storage: bucket, stagingDir: await temp('uma-stage-') })).rejects.toThrow('run pnpm enemies:pack')
  })
})
