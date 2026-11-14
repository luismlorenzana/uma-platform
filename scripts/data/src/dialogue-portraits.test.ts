// uma-farm F75 (P170): a universe's published portraits → the dialogue-portraits family in the local release → the
// portraits-only release on latest, read back as a game reads it. Code-drawn stand-ins only.
import { createReleaseClient, dialoguePortraitFor, type ArtIndex } from '@luismlorenzana/uma-data'
import { buildMemoryRelease, syntheticArtIndex, syntheticMasterData } from '@luismlorenzana/uma-data/testing'
import { createHash } from 'node:crypto'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { FakeBucket } from './__fixtures__/bucket'
import { fixtureBase, fixtureFace, FIXTURE_BASE, FIXTURE_FACE_AT, FIXTURE_FACE_SIZE, FIXTURE_PORTRAIT_ID } from './dialogue-portrait-fixture'
import { writeDialoguePortraitRelease, type PackedDialoguePortraits } from './dialogue-portrait-release'
import { planDialoguePortraitsOnly } from './dialogue-portraits-only'
import { encodePng } from './enemy-images'
import { LocalOverlayStorage } from './local-storage'
import { writeDataSets, type MasterSets } from './pack'
import { packPortraits, planPortraits, readPortraitsIndex, type UniversePortraitsIndex } from './portraits'
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

/** A published universe's portraits folder, as the art pipeline writes it: an index, bases/ and faces/. */
async function universe(outfits = ['spring', 'kimono'], expressions = ['happy', 'sad'], at = FIXTURE_FACE_AT): Promise<{ dir: string; index: UniversePortraitsIndex }> {
  const dir = await temp('uma-portraits-src-')
  await mkdir(resolve(dir, 'bases')); await mkdir(resolve(dir, 'faces'))
  const bases = [], faces = [], states = []
  for (const o of outfits) {
    const png = await encodePng(fixtureBase(o)), path = `bases/test-uma-${o}.${sha(png).slice(0, 16)}.png`
    await writeFile(resolve(dir, path), png)
    bases.push({ id: `test-uma-${o}`, character: 'test-uma', outfit: o, path, bytes: png.byteLength, sha256: sha(png), ...FIXTURE_BASE })
  }
  for (const e of expressions) {
    const png = await encodePng(fixtureFace(e)), path = `faces/test-uma-${e}.${sha(png).slice(0, 16)}.png`
    await writeFile(resolve(dir, path), png)
    faces.push({ id: `test-uma-${e}`, character: 'test-uma', expression: e, path, bytes: png.byteLength, sha256: sha(png), width: FIXTURE_FACE_SIZE, height: FIXTURE_FACE_SIZE })
  }
  for (const o of outfits) {
    states.push({ character: 'test-uma', outfit: o, expression: 'neutral', base: `test-uma-${o}`, face: null, at: null })
    for (const e of expressions) states.push({ character: 'test-uma', outfit: o, expression: e, base: `test-uma-${o}`, face: `test-uma-${e}`, at: { x: at.left, y: at.top } })
  }
  const index = readPortraitsIndex({ schemaVersion: 1, kind: 'universe-portraits', universe: 'test-life', revision: 1, approvedOn: '2026-11-14', size: FIXTURE_BASE,
    faceSize: { width: FIXTURE_FACE_SIZE, height: FIXTURE_FACE_SIZE }, characters: [{ id: 'test-uma', name: 'Test Uma' }, { id: 'stranger', name: 'Nobody Here' }], outfits, expressions: ['neutral', ...expressions], bases, faces, states }, 'test-life')
  await writeFile(resolve(dir, 'index.json'), JSON.stringify(index))
  return { dir, index }
}
const idOf = (name: string) => (name === 'Test Uma' ? FIXTURE_PORTRAIT_ID : null)
async function packed(): Promise<PackedDialoguePortraits[]> {
  const { dir, index } = await universe()
  const { plans } = planPortraits(index, idOf)
  return Promise.all(plans.map((p) => packPortraits(dir, index, p)))
}
async function localRelease(characters: PackedDialoguePortraits[]): Promise<string> {
  const dir = await temp('uma-portraits-local-')
  await writeDataSets({ releaseDir: dir, sources: { 'synthetic/test': '2' }, sets: sets() })
  await writeDialoguePortraitRelease(dir, characters)
  return dir
}

describe('a universe’s published portraits', () => {
  it('plans each character master data knows, with each base’s face position from its approved states', async () => {
    const { index } = await universe()
    const { plans, skipped } = planPortraits(index, idOf)
    expect(plans.map((p) => [p.characterId, p.bases.map((b) => [b.outfit, b.face]), p.faces.map((f) => f.expression)]))
      .toEqual([[FIXTURE_PORTRAIT_ID, [['spring', FIXTURE_FACE_AT], ['kimono', FIXTURE_FACE_AT]], ['happy', 'sad']]])
    expect(skipped).toEqual(['stranger: no master data character is named Nobody Here'])
  })
  it('refuses a base whose states place faces in two places, and a file that isn’t the approved one', async () => {
    const { dir, index } = await universe()
    const split = structuredClone(index); split.states.find((s) => s.face && s.outfit === 'spring')!.at = { x: 1, y: 1 }
    expect(() => planPortraits(split, idOf)).toThrow(/not one place/)
    const plan = planPortraits(index, idOf).plans[0]!
    await writeFile(resolve(dir, plan.faces[0]!.path), await encodePng(fixtureFace('sad')))
    await expect(packPortraits(dir, index, plan)).rejects.toThrow(/SHA-256 differs/)
  })
})

describe('the dialogue-portraits family in the local release', () => {
  it('writes each character’s pictures and manifest and a dialoguePortraits map; a game reads her back', async () => {
    const dir = await localRelease(await packed())
    const manifest = (await readLocalManifest(dir))!
    const index = JSON.parse(await readFile(resolve(dir, manifest.art!), 'utf8')) as ArtIndex
    expect(Object.keys(index.dialoguePortraits ?? {})).toEqual([String(FIXTURE_PORTRAIT_ID)])
    const client = createReleaseClient({ source: { read: async (path) => new Uint8Array(await readFile(resolve(dir, ...path.replace(/^files\//, '').split('/')))) } })
    const p = (await client.dialoguePortraits(manifest, index, FIXTURE_PORTRAIT_ID))!
    expect(Object.keys(p.faces)).toEqual(['happy', 'sad'])
    const r = dialoguePortraitFor(p, 'kimono', 'happy')
    expect([r.at, r.face?.path]).toEqual([FIXTURE_FACE_AT, expect.stringMatching(/9999-face-happy\.[0-9a-f]{16}\.webp$/)])
  })
  it('writes the same bytes from the same pictures', async () => {
    const a = await localRelease(await packed()), b = await localRelease(await packed())
    expect((await readLocalManifest(a))!.files).toEqual((await readLocalManifest(b))!.files)
  })
})

describe('the portraits-only release on latest', () => {
  it('carries latest byte for byte, adds the map, and a game reads her through the published release', async () => {
    const release = await buildMemoryRelease(syntheticMasterData(), { art: syntheticArtIndex(PAGE, IMAGE), extraFiles: { [PAGE]: new Uint8Array([1, 2, 3]), [IMAGE]: new Uint8Array([4, 5]) } })
    const bucket = new FakeBucket(release.objects)
    const plan = await planDialoguePortraitsOnly({ releaseDir: await localRelease(await packed()), storage: bucket, stagingDir: await temp('uma-portraits-stage-'), now: () => new Date('2026-11-14T12:00:00Z') })
    expect(checkCarried(plan.base, plan.manifest).carried).toBe(plan.base.files.length - 1)
    expect(plan.manifest.sets).toEqual(plan.base.sets)
    const out = await temp('uma-portraits-published-')
    const storage = new LocalOverlayStorage(out, bucket)
    await publishManifest({ manifest: plan.manifest, manifestPath: plan.manifestPath, localPaths: plan.localPaths, storage, channel: 'candidate', dryRun: false })
    const client = createReleaseClient({ source: { read: async (path) => { const b = await storage.read(path); if (!b) throw new Error(`missing ${path}`); return b } }, channel: 'candidate' })
    const manifest = await client.manifest(), art = (await client.art(manifest))!
    expect(art.images['outfit-portraits']).toBeDefined()
    expect(Object.keys((await client.dialoguePortraits(manifest, art, FIXTURE_PORTRAIT_ID))!.bases)).toEqual(['kimono', 'spring'])
  })
  it('refuses a local release with no portraits', async () => {
    const release = await buildMemoryRelease(syntheticMasterData(), { art: syntheticArtIndex(PAGE, IMAGE), extraFiles: { [PAGE]: new Uint8Array([1, 2, 3]), [IMAGE]: new Uint8Array([4, 5]) } })
    await expect(planDialoguePortraitsOnly({ releaseDir: await localRelease([]), storage: new FakeBucket(release.objects), stagingDir: await temp('uma-portraits-stage-') })).rejects.toThrow(/no (art index|dialogue portraits)/)
  })
})
