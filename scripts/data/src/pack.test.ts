import { syntheticMasterData } from '@luismlorenzana/uma-data/testing'
import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { writeDataSets, type MasterSets } from './pack'
import { readLocalManifest, readLocalSet, sha256, writeLocalManifest } from './release-dir'

const tempDirs: string[] = []

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((path) => rm(path, { recursive: true, force: true })))
})

function sets(): MasterSets {
  const data = syntheticMasterData()
  return {
    characters: data.characters,
    outfits: data.outfits,
    'support-cards': data.supportCards,
    skills: [...data.skills].reverse(),
    scenarios: data.scenarios,
    races: data.races,
    tracks: data.tracks,
    courses: data.courses,
    objectives: data.objectives,
  }
}

async function releaseDir(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'uma-platform-pack-'))
  tempDirs.push(dir)
  return dir
}

describe('writeDataSets', () => {
  it('writes deterministic, content-addressed sets sorted by id and a manifest versioned by their hashes', async () => {
    const dir = await releaseDir()
    const now = new Date('2099-01-01T00:00:00.000Z')
    const manifest = await writeDataSets({ sets: sets(), sources: { 'gametora/skills': 'v1' }, releaseDir: dir, now })
    expect(manifest.files).toHaveLength(9)
    expect(manifest.sets.skills).toMatch(/^data\/skills\.[a-f0-9]{16}\.json$/)
    expect(manifest.art).toBeNull()
    expect(manifest.createdAt).toBe(now.toISOString())
    expect(manifest.schemaMajor).toBe(1)
    const skills = await readLocalSet(dir, manifest, 'skills')
    expect(skills.map((skill) => skill.id)).toEqual([...skills.map((skill) => skill.id)].sort((left, right) => left - right))
    const bytes = await readFile(resolve(dir, manifest.sets.skills))
    expect(manifest.sets.skills).toContain(sha256(bytes).slice(0, 16))

    // Same sources, same bytes, same version; a changed record moves only its own set.
    const again = await writeDataSets({ sets: sets(), sources: { 'gametora/skills': 'v1' }, releaseDir: dir })
    expect(again.version).toBe(manifest.version)
    const changed = sets()
    changed.races = [{ ...changed.races[0]!, entries: 12 }]
    const next = await writeDataSets({ sets: changed, sources: { 'gametora/skills': 'v1' }, releaseDir: dir })
    expect(next.version).not.toBe(manifest.version)
    expect(next.sets.skills).toBe(manifest.sets.skills)
    expect(next.sets.races).not.toBe(manifest.sets.races)
    expect((await readdir(resolve(dir, 'data'))).filter((name) => name.startsWith('races.'))).toEqual([next.sets.races.slice(5)])
  })

  it('keeps art files and the art index written by the asset pipeline', async () => {
    const dir = await releaseDir()
    const first = await writeDataSets({ sets: sets(), sources: {}, releaseDir: dir })
    const art = '{"atlases":{},"images":{}}'
    await mkdir(resolve(dir, 'art/outfit-portraits'), { recursive: true })
    await writeFile(resolve(dir, 'data/art.0000000000000000.json'), art)
    await writeFile(resolve(dir, 'art/outfit-portraits/1.1111111111111111.webp'), 'webp')
    const withArt = await writeLocalManifest(dir, {
      sources: first.sources,
      sets: first.sets,
      art: 'data/art.0000000000000000.json',
      files: [
        ...first.files,
        { path: 'data/art.0000000000000000.json', bytes: art.length, sha256: sha256(art) },
        { path: 'art/outfit-portraits/1.1111111111111111.webp', bytes: 4, sha256: sha256('webp') },
      ],
    })
    const next = await writeDataSets({ sets: sets(), sources: {}, releaseDir: dir })
    expect(next.art).toBe(withArt.art)
    expect(next.files.map((file) => file.path)).toEqual(withArt.files.map((file) => file.path))
    expect(await readLocalManifest(dir)).toEqual(next)
  })

  it('refuses a set that the published parser would reject', async () => {
    const broken = sets()
    broken.outfits = [{ ...broken.outfits[0]!, rarity: 0 }]
    await expect(writeDataSets({ sets: broken, sources: {}, releaseDir: await releaseDir() })).rejects.toThrow(
      'outfits.items[0].rarity: expected a positive integer',
    )
  })
})
