// uma-farm F84 (P176): a universe's published splash art and the moments map → the illustrations family in the local
// release → a character-family release on latest (with the dialogue portraits beside it), read back as a game reads it.
// Code-drawn stand-ins only: soft gradients and discs, no character art.
import { createReleaseClient, illustrationFor, type ArtIndex } from '@luismlorenzana/uma-data'
import { buildMemoryRelease, syntheticArtIndex, syntheticMasterData } from '@luismlorenzana/uma-data/testing'
import { createHash } from 'node:crypto'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { FakeBucket } from './__fixtures__/bucket'
import { planCharacterFamiliesOnly } from './character-families-only'
import { fixtureBase, fixtureFace } from './dialogue-portrait-fixture'
import { writeDialoguePortraitRelease } from './dialogue-portrait-release'
import { encodePng, type Rgba } from './enemy-images'
import { writeIllustrationRelease } from './illustration-release'
import { ILLUSTRATION_PSNR_FLOOR, packIllustrations, planIllustrations, readIllustrationMoments, readUniverseArtIndex, type UniverseArtIndex } from './illustrations'
import { LocalOverlayStorage } from './local-storage'
import { writeDataSets, type MasterSets } from './pack'
import { publishManifest } from './publish'
import { readLocalManifest } from './release-dir'
import { checkCarried } from './sprites-only'

const dirs: string[] = []
afterEach(async () => { await Promise.all(dirs.splice(0).map((d) => rm(d, { recursive: true, force: true }))) })
async function temp(prefix: string) { const d = await mkdtemp(join(tmpdir(), prefix)); dirs.push(d); return d }
const PAGE = 'atlases/outfit-icons-0.1111111111111111.webp', IMAGE = 'art/outfit-portraits/900101.2222222222222222.webp'
function sets(data = syntheticMasterData()): MasterSets {
  return { characters: data.characters, outfits: data.outfits, 'support-cards': data.supportCards, skills: data.skills, scenarios: data.scenarios, races: data.races, tracks: data.tracks, courses: data.courses, objectives: data.objectives }
}
const sha = (b: Uint8Array) => createHash('sha256').update(b).digest('hex')
const W = 160, H = 90, ID = 9999

/** A soft scene: a two-colour gradient with a disc, opaque. `noise` fills it with noise instead, which no lossy WebP keeps. */
function scene(seed: number, { noise = false, clear = false } = {}): Rgba {
  const data = new Uint8Array(W * H * 4)
  let r = seed * 7919
  for (let y = 0; y < H; y += 1) for (let x = 0; x < W; x += 1) {
    // A disc with a soft 8 px edge over the gradient, as painted art has.
    const i = (y * W + x) * 4, t = x / W, d = Math.min(1, Math.max(0, (24 - Math.hypot(x - 40 - seed * 10, y - 45)) / 8))
    r = (r * 1103515245 + 12345) % 2 ** 31
    const n = r % 256, mix = (a: number, b: number) => Math.round(a * (1 - d) + b * d)
    data[i] = noise ? n : mix(60 + 120 * t + seed * 10, 240)
    data[i + 1] = noise ? (n * 7) % 256 : mix(90 + 60 * (y / H), 200)
    data[i + 2] = noise ? (n * 13) % 256 : mix(160 - 80 * t, 120)
    data[i + 3] = clear && x < 4 ? 0 : 255
  }
  return { data, width: W, height: H }
}

const SCENES = [['first-meeting', 'spring', 'meeting'], ['confession-flustered', 'kimono', 'confession'], ['confession-loving', 'kimono', 'confession-yes']] as const

/** A published universe folder, as `pnpm art:push` writes it: an index with a look and splash scenes, and images/. */
async function universe(pictures: Record<string, Rgba> = {}): Promise<{ dir: string; index: UniverseArtIndex }> {
  const dir = await temp('uma-universe-src-')
  await mkdir(resolve(dir, 'images'))
  const looks: Record<string, unknown>[] = []
  const add = async (id: string, character: string, outfit: string, picture: Rgba, kind?: string) => {
    const png = await encodePng(picture), path = `images/${id}.${sha(png).slice(0, 16)}.png`
    await writeFile(resolve(dir, path), png)
    looks.push({ id, character, outfit, title: `Title of ${id}`, path, bytes: png.byteLength, sha256: sha(png), width: W, height: H, approvedOn: '2026-11-14', publishedAt: '2026-11-14T00:00:00Z', ...(kind ? { kind } : {}) })
  }
  await add('test-uma-spring', 'Test Uma', 'spring', scene(9))
  for (const [i, [id, outfit]] of SCENES.entries()) await add(`test-uma-splash-${id}`, 'Test Uma', outfit, pictures[id] ?? scene(i), 'splash')
  await add('nobody-here-splash-beach', 'Nobody Here', 'swimsuit', scene(5), 'splash')
  const index = readUniverseArtIndex({ schemaVersion: 1, kind: 'universe-art', universe: 'test-life', title: 'Test Life', revision: 3, publishedAt: '2026-11-14T00:00:00Z', looks }, 'test-life')
  await writeFile(resolve(dir, 'index.json'), JSON.stringify(index))
  return { dir, index }
}
const MOMENTS = readIllustrationMoments({ universe: 'test-life', moments: { ...Object.fromEntries(SCENES.map(([id, , moment]) => [`test-uma-splash-${id}`, moment])), 'nobody-here-splash-beach': 'beach' } }, 'test-life')
const idOf = (name: string) => (name === 'Test Uma' ? ID : null)
async function packed() {
  const { dir, index } = await universe()
  return Promise.all(planIllustrations(index, MOMENTS, idOf).plans.map((p) => packIllustrations(dir, 'test-life', p)))
}
async function localRelease(withPortraits = false): Promise<string> {
  const dir = await temp('uma-illustrations-local-')
  await writeDataSets({ releaseDir: dir, sources: { 'synthetic/test': '2' }, sets: sets() })
  await writeIllustrationRelease(dir, await packed())
  if (withPortraits) {
    const { encodeLossless } = await import('./enemy-images')
    const image = async (rgba: Rgba) => ({ bytes: await encodeLossless(rgba), width: rgba.width, height: rgba.height })
    await writeDialoguePortraitRelease(dir, [{ characterId: ID, revision: 1, approvedOn: '2026-11-14', base: { width: 525, height: 700 }, faceSize: { width: 224, height: 224 },
      bases: { spring: { ...(await image(fixtureBase('spring'))), face: { left: 150, top: 150 } } }, faces: { happy: await image(fixtureFace('happy')) } }])
  }
  return dir
}

describe('a universe’s published splash art', () => {
  it('plans each character master data knows: her scenes in order, ids of her own, moments from the map; looks stay out', async () => {
    const { index } = await universe()
    const { plans, skipped } = planIllustrations(index, MOMENTS, idOf)
    expect(plans.map((p) => [p.characterId, p.scenes.map((s) => [s.id, s.outfit, s.moment])]))
      .toEqual([[ID, SCENES.map(([id, outfit, moment]) => [id, outfit, moment])]])
    expect(skipped).toEqual(['Nobody Here: no master data character has that name'])
  })
  it('stops on a scene the moments map doesn’t name, and refuses a moment that isn’t kebab case', async () => {
    const { index } = await universe()
    const partial = { universe: 'test-life', moments: { 'test-uma-splash-first-meeting': 'meeting' } }
    expect(() => planIllustrations(index, partial, idOf)).toThrow(/No moment for test-uma-splash-confession-flustered/)
    expect(() => readIllustrationMoments({ universe: 'test-life', moments: { a: 'Big Moment' } }, 'test-life')).toThrow(/lowercase/)
  })
  it('refuses a file that isn’t the approved one, one with transparency, and one that encodes under the floor', async () => {
    const { dir, index } = await universe({ 'confession-flustered': scene(1, { clear: true }), 'confession-loving': scene(2, { noise: true }) })
    const plan = planIllustrations(index, MOMENTS, idOf).plans[0]!
    await expect(packIllustrations(dir, 'test-life', { ...plan, scenes: [plan.scenes[1]!] })).rejects.toThrow(/isn't opaque/)
    await expect(packIllustrations(dir, 'test-life', { ...plan, scenes: [plan.scenes[2]!] })).rejects.toThrow(new RegExp(`under the ${ILLUSTRATION_PSNR_FLOOR} dB floor`))
    await writeFile(resolve(dir, plan.scenes[0]!.path), await encodePng(scene(7)))
    await expect(packIllustrations(dir, 'test-life', { ...plan, scenes: [plan.scenes[0]!] })).rejects.toThrow(/SHA-256 differs/)
  })
  it('packs each scene as WebP within the quality floor', async () => {
    const [p] = await packed()
    expect(p!.scenes.map((s) => s.id)).toEqual(SCENES.map(([id]) => id))
    for (const q of p!.quality) expect(q.psnr).toBeGreaterThanOrEqual(ILLUSTRATION_PSNR_FLOOR)
    for (const s of p!.scenes) expect(Buffer.from(s.bytes.subarray(8, 12)).toString('latin1')).toBe('WEBP')
  })
})

describe('the illustrations family in the local release', () => {
  it('writes her scenes and manifest and an illustrations map; a game reads her back and finds a scene by moment', async () => {
    const dir = await localRelease()
    const manifest = (await readLocalManifest(dir))!
    const index = JSON.parse(await readFile(resolve(dir, manifest.art!), 'utf8')) as ArtIndex
    expect(Object.keys(index.illustrations ?? {})).toEqual([String(ID)])
    const client = createReleaseClient({ source: { read: async (path) => new Uint8Array(await readFile(resolve(dir, ...path.replace(/^files\//, '').split('/')))) } })
    const ills = (await client.illustrations(manifest, index, ID))!
    expect(ills.universe).toBe('test-life')
    expect(illustrationFor(ills, 'confession-yes')).toMatchObject({ id: 'confession-loving', outfit: 'kimono', title: 'Title of test-uma-splash-confession-loving', width: W, height: H })
    expect(illustrationFor(ills, 'confession-yes')!.path).toMatch(/^art\/illustrations\/9999-confession-loving\.[0-9a-f]{16}\.webp$/)
  })
  it('writes the same bytes from the same pictures, and keeps the portraits beside it', async () => {
    const a = await localRelease(), b = await localRelease()
    expect((await readLocalManifest(a))!.files).toEqual((await readLocalManifest(b))!.files)
    const both = await localRelease(true)
    const manifest = (await readLocalManifest(both))!
    const index = JSON.parse(await readFile(resolve(both, manifest.art!), 'utf8')) as ArtIndex
    expect([Object.keys(index.illustrations ?? {}), Object.keys(index.dialoguePortraits ?? {})]).toEqual([[String(ID)], [String(ID)]])
  })
})

describe('a character-family release on latest', () => {
  const latest = () => buildMemoryRelease(syntheticMasterData(), { art: syntheticArtIndex(PAGE, IMAGE), extraFiles: { [PAGE]: new Uint8Array([1, 2, 3]), [IMAGE]: new Uint8Array([4, 5]) } })
  it('carries latest byte for byte and adds both maps in one release; a game reads both through it', async () => {
    const bucket = new FakeBucket((await latest()).objects)
    const plan = await planCharacterFamiliesOnly({ families: ['dialoguePortraits', 'illustrations'], releaseDir: await localRelease(true), storage: bucket, stagingDir: await temp('uma-families-stage-'), now: () => new Date('2026-11-14T12:00:00Z') })
    expect(checkCarried(plan.base, plan.manifest).carried).toBe(plan.base.files.length - 1)
    expect(plan.manifest.sets).toEqual(plan.base.sets)
    expect(plan.added.illustrations?.map((a) => a.characterId)).toEqual([ID])
    const out = await temp('uma-families-published-')
    const storage = new LocalOverlayStorage(out, bucket)
    await publishManifest({ manifest: plan.manifest, manifestPath: plan.manifestPath, localPaths: plan.localPaths, storage, channel: 'candidate', dryRun: false })
    const client = createReleaseClient({ source: { read: async (path) => { const b = await storage.read(path); if (!b) throw new Error(`missing ${path}`); return b } }, channel: 'candidate' })
    const manifest = await client.manifest(), art = (await client.art(manifest))!
    expect(art.images['outfit-portraits']).toBeDefined()
    expect((await client.illustrations(manifest, art, ID))!.scenes.map((s) => s.moment)).toEqual(['meeting', 'confession', 'confession-yes'])
    expect(Object.keys((await client.dialoguePortraits(manifest, art, ID))!.bases)).toEqual(['spring'])
  })
  it('adds only the family named: illustrations alone leave the portraits out', async () => {
    const plan = await planCharacterFamiliesOnly({ families: ['illustrations'], releaseDir: await localRelease(true), storage: new FakeBucket((await latest()).objects), stagingDir: await temp('uma-families-stage-') })
    expect(plan.manifest.files.some((f) => f.path.startsWith('art/dialogue-portraits/'))).toBe(false)
    expect(Object.keys(plan.maps)).toEqual(['illustrations'])
  })
  it('refuses a local release without the family', async () => {
    const dir = await temp('uma-illustrations-empty-')
    await writeDataSets({ releaseDir: dir, sources: { 'synthetic/test': '2' }, sets: sets() })
    await writeIllustrationRelease(dir, [])
    await expect(planCharacterFamiliesOnly({ families: ['illustrations'], releaseDir: dir, storage: new FakeBucket((await latest()).objects), stagingDir: await temp('uma-families-stage-') }))
      .rejects.toThrow(/no illustrations; run pnpm illustrations:pack/)
  })
})
