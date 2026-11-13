import { parseArtIndex } from '@luismlorenzana/uma-data'
import { syntheticMasterData } from '@luismlorenzana/uma-data/testing'
import { readLocalManifest, readVerifiedFile, writeLocalManifest, writeReleaseFile } from '@uma-platform/data-pipeline/release-dir'
import { writeDataSets } from '@uma-platform/data-pipeline/pack'
import { mkdtemp, readdir, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { writeArt } from './write'

const tempDirs: string[] = []

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((path) => rm(path, { recursive: true, force: true })))
})

async function releaseWithData(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'uma-platform-art-'))
  tempDirs.push(dir)
  const data = syntheticMasterData()
  await writeDataSets({
    releaseDir: dir,
    sources: {},
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
  return dir
}

const atlas = (seed: number) => ({
  family: 'outfit-icons' as const,
  atlas: {
    pages: [{ bytes: Buffer.from([seed, 1, 2]), width: 132, height: 132 }],
    frames: { '900101': { page: 0, x: 2, y: 2, width: 128, height: 128 } },
  },
})

const portraits = (seed: number) => ({
  family: 'outfit-portraits' as const,
  images: [{ id: '900101', bytes: Buffer.from([seed, 9]), width: 400, height: 512 }],
})

async function artIndex(dir: string) {
  const manifest = (await readLocalManifest(dir))!
  const file = manifest.files.find((entry) => entry.path === manifest.art)!
  return { manifest, index: parseArtIndex(JSON.parse((await readVerifiedFile(dir, file)).toString('utf8')) as unknown, manifest.art!) }
}

describe('writeArt', () => {
  it('writes atlas pages, per-record images and an art index the manifest points at', async () => {
    const dir = await releaseWithData()
    await writeArt({ releaseDir: dir, atlases: [atlas(1)], images: [portraits(1)] })
    const { manifest, index } = await artIndex(dir)
    expect(manifest.art).toMatch(/^data\/art\.[a-f0-9]{16}\.json$/)
    expect(index.atlases['outfit-icons']).toEqual({
      frameWidth: 128,
      frameHeight: 128,
      pages: [{ path: expect.stringMatching(/^atlases\/outfit-icons-0\.[a-f0-9]{16}\.webp$/), width: 132, height: 132 }],
      frames: { '900101': { page: 0, x: 2, y: 2, width: 128, height: 128 } },
    })
    const portrait = index.images['outfit-portraits']!['900101']!
    expect(portrait).toMatchObject({ width: 400, height: 512 })
    expect(manifest.files.map((file) => file.path)).toEqual(expect.arrayContaining([portrait.path, index.atlases['outfit-icons']!.pages[0]!.path]))
  })

  it('rebuilds one family and keeps the others, removing only the stale files of the rebuilt one', async () => {
    const dir = await releaseWithData()
    await writeArt({ releaseDir: dir, atlases: [atlas(1)], images: [portraits(1)] })
    const before = await artIndex(dir)
    await writeArt({ releaseDir: dir, images: [portraits(2)] })
    const after = await artIndex(dir)
    expect(after.index.atlases).toEqual(before.index.atlases)
    expect(after.index.images['outfit-portraits']!['900101']!.path).not.toBe(before.index.images['outfit-portraits']!['900101']!.path)
    expect(await readdir(resolve(dir, 'art/outfit-portraits'))).toEqual([after.index.images['outfit-portraits']!['900101']!.path.split('/').pop()])
    expect((await readdir(resolve(dir, 'data'))).filter((name) => name.startsWith('art.'))).toEqual([after.manifest.art!.slice(5)])
    // Sets are untouched by art writes.
    expect(after.manifest.sets).toEqual(before.manifest.sets)
  })

  it("keeps the sprite and enemy-key maps, which sprites:pack and enemies:pack own, and the enemies set", async () => {
    const dir = await releaseWithData()
    await writeArt({ releaseDir: dir, images: [portraits(1)] })
    const { manifest } = await artIndex(dir)
    const sprite = { path: 'art/outfit-sprites/900101.3333333333333333.json', bytes: 2, sha256: 'a'.repeat(64) }
    const enemyKey = { path: 'art/enemy-keys/799999.4444444444444444.json', bytes: 2, sha256: 'b'.repeat(64) }
    const enemies = { path: 'data/enemies.5555555555555555.json', bytes: 2, sha256: 'c'.repeat(64) }
    const indexJson = JSON.stringify({ ...(await artIndex(dir)).index, sprites: { 900101: sprite.path }, enemyKeys: { 799999: enemyKey.path } })
    const indexFile = await writeReleaseFile(dir, 'data', 'art', 'json', indexJson)
    await writeLocalManifest(dir, { sources: manifest.sources, sets: { ...manifest.sets, enemies: enemies.path }, art: indexFile.path,
      files: [...manifest.files.filter((f) => f.path !== manifest.art), sprite, enemyKey, enemies, indexFile] })
    await writeArt({ releaseDir: dir, images: [portraits(2)] })
    const after = await artIndex(dir)
    expect(after.index.sprites).toEqual({ 900101: sprite.path })
    expect(after.index.enemyKeys).toEqual({ 799999: enemyKey.path })
    expect(after.manifest.sets.enemies).toBe(enemies.path)
    expect(after.manifest.files.map((f) => f.path)).toEqual(expect.arrayContaining([sprite.path, enemyKey.path, enemies.path]))
  })

  it('needs the data sets first', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'uma-platform-art-'))
    tempDirs.push(dir)
    await expect(writeArt({ releaseDir: dir, images: [portraits(1)] })).rejects.toThrow('run pnpm data:import first')
  })
})
