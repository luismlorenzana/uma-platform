// A character's own collection inside a universe (P174): `characters/<key>/active-study.json` names the active version,
// whose manifest holds her approved full-body looks and her dialogue portraits. Invented riders and pictures only.
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, relative, sep } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { characterStudies, INDEX, push, readCollection, studyFile, type Publication, type Remote, type RemoteFile, type UniverseIndex } from './lib.js'
import { BLEND, PORTRAITS_INDEX, pushPortraits, readPortraits, type PortraitIndex } from './portraits.js'

const png = (width: number, height: number, seed: string): Buffer => {
  const head = Buffer.alloc(24)
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(head, 0)
  head.writeUInt32BE(13, 8); head.write('IHDR', 12, 'latin1'); head.writeUInt32BE(width, 16); head.writeUInt32BE(height, 20)
  return Buffer.concat([head, Buffer.from(`invented pixels ${seed}`)])
}
const sha = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex')
const md5 = (bytes: Uint8Array) => createHash('md5').update(bytes).digest('base64')
const folders: string[] = []
const temp = () => { const dir = mkdtempSync(join(tmpdir(), 'studies-test-')); folders.push(dir); return dir }
afterEach(() => { for (const dir of folders.splice(0)) rmSync(dir, { recursive: true, force: true }) })
const put = (file: string, bytes: Buffer | string) => { mkdirSync(join(file, '..'), { recursive: true }); writeFileSync(file, bytes) }
const APPROVED = { status: 'approved', by: 'owner', date: '2026-01-02' }

/**
 * A universe with the shared collections (one rider's look, crop and face) and a second rider's own collection whose
 * active version (v002) reuses files from v001, as ChatGPT lays it out.
 */
function universe(options: { activeApproved?: boolean; looseLook?: boolean; unapprovedState?: boolean } = {}) {
  const base = temp(), u = join(base, 'sky-city'), approved = join(u, 'approved'), dialogue = join(u, 'dialogue-portraits')
  // The shared collections.
  const look = png(60, 90, 'rider-one-street')
  put(join(approved, 'rider-one/street.png'), look)
  put(join(approved, 'manifest.json'), JSON.stringify({ revision: 1, assets: [{ id: 'rider-one-street', character: 'Rider One', outfit: 'street', image: 'rider-one/street.png', width: 60, height: 90, sha256: sha(look), approval: { status: 'approved', by: 'owner', on: '2026-01-01' } }] }))
  put(join(approved, 'review.html'), '<html><body><header></header></body></html>')
  const crop = png(40, 50, 'rider-one-street-crop'), face = png(10, 10, 'rider-one-happy')
  put(join(dialogue, 'bases/rider-one-street.png'), crop); put(join(dialogue, 'faces/rider-one-happy.png'), face)
  put(join(dialogue, 'manifest.json'), JSON.stringify({ revision: 1, expressions: ['neutral', 'happy'], outfits: ['street'], characterNames: { 'rider-one': 'Rider One' },
    faces: [{ character: 'rider-one', expression: 'happy', file: 'faces/rider-one-happy.png', sha256: sha(face) }], assets: [{ character: 'rider-one', outfit: 'street', base: 'bases/rider-one-street.png' }] }))
  put(join(dialogue, 'approval.json'), JSON.stringify({ status: 'approved', by: 'owner', date: '2026-01-02', assets: [{ character: 'rider-one', outfit: 'street', baseSha256: sha(crop), outputs: [{ expression: 'happy', sha256: 'a'.repeat(64), faceSha256: sha(face), position: { x: 5, y: 5 } }] }] }))
  put(join(dialogue, 'review.html'), '<html><body></body></html>')
  // The second rider's own collection.
  const folder = join(u, 'characters/rider-two')
  const full = png(60, 90, 'rider-two-street'), full2 = png(60, 90, 'rider-two-dinner-v002')
  put(join(folder, 'v001/full-body/street.png'), full); put(join(folder, 'v002/rider-two-dinner-v002.png'), full2)
  const c2 = png(40, 50, 'rider-two-street-crop'), c3 = png(40, 50, 'rider-two-dinner-crop'), f2 = png(10, 10, 'rider-two-happy')
  put(join(folder, 'v001/bases/street-neutral.png'), c2); put(join(folder, 'v002/bases/dinner-neutral.png'), c3); put(join(folder, 'v001/faces/rider-two-happy.png'), f2)
  if (options.looseLook) put(join(u, 'outside.png'), full)
  put(join(folder, 'active-study.json'), JSON.stringify({ character: 'Rider Two', activeVersion: 'v002', ownerApproved: options.activeApproved ?? true }))
  put(join(folder, 'v002/manifest.json'), JSON.stringify({
    characterNames: { 'rider-two': 'Rider Two' }, outfits: ['street', 'dinner'], expressions: ['neutral', 'happy'], approval: APPROVED,
    faces: [{ character: 'rider-two', expression: 'happy', file: '../v001/faces/rider-two-happy.png', sha256: sha(f2) }],
    assets: [
      { character: 'rider-two', outfit: 'street', base: '../v001/bases/street-neutral.png', baseSha256: sha(c2), neutralOwnerApproved: true,
        outputs: [{ expression: 'happy', sha256: 'b'.repeat(64), faceSha256: sha(f2), position: { x: 6, y: 5 }, ownerApproved: !options.unapprovedState }] },
      { character: 'rider-two', outfit: 'dinner', base: 'bases/dinner-neutral.png', baseSha256: sha(c3), neutralOwnerApproved: true,
        outputs: [{ expression: 'happy', sha256: 'c'.repeat(64), faceSha256: sha(f2), position: { x: 6, y: 5 }, ownerApproved: true }] },
    ],
    fullBodyAssets: [
      { id: 'rider-two-street', character: 'Rider Two', outfit: 'street', image: options.looseLook ? '../../../outside.png' : '../v001/full-body/street.png', width: 60, height: 90, sha256: sha(full), approval: APPROVED },
      { id: 'rider-two-dinner-v002', character: 'Rider Two', outfit: 'dinner', image: 'rider-two-dinner-v002.png', width: 60, height: 90, sha256: sha(full2), approval: APPROVED },
    ],
  }))
  put(join(folder, 'v002/review.html'), '<html><body><img src="../v001/full-body/street.png"></body></html>')
  return { base, u, approved, dialogue, folder }
}

function fakeRemote() {
  const files = new Map<string, { bytes: Buffer; generation: number }>()
  let clock = 100
  const walk = (dir: string, at = dir): string[] => readdirSync(at).flatMap((name) => { const p = join(at, name); return statSync(p).isDirectory() ? walk(dir, p) : [relative(dir, p).split(sep).join('/')] })
  const remote: Remote = {
    read: (path) => { const f = files.get(path); return f ? { text: f.bytes.toString('utf8'), generation: String(f.generation) } : null },
    uploadFolder: (dir) => { for (const path of walk(dir)) files.set(path, { bytes: readFileSync(join(dir, path)), generation: ++clock }) },
    uploadFile: (file, path, ifGeneration) => { if (String(files.get(path)?.generation ?? 0) !== ifGeneration) return false; files.set(path, { bytes: readFileSync(file), generation: ++clock }); return true },
    list: (): RemoteFile[] => [...files].map(([path, f]) => ({ path, bytes: f.bytes.byteLength, md5: md5(f.bytes) })),
  }
  return { remote, files }
}
const T1 = '2026-01-03T10:00:00.000Z'

describe('a character’s own collection', () => {
  it('is found through its active study, and only when the owner approved that version', () => {
    const { u } = universe()
    expect(characterStudies(u).map((s) => [s.key, s.name, relative(u, s.versionDir).split(sep).join('/')])).toEqual([['rider-two', 'Rider Two', 'characters/rider-two/v002']])
    expect(characterStudies(universe({ activeApproved: false }).u)).toEqual([])
    const study = characterStudies(u)[0]!
    expect(studyFile(study, '../v001/full-body/street.png')).toBe(join(study.folder, 'v001/full-body/street.png'))
    expect(studyFile(study, '../../../outside.png')).toBeNull()
  })

  it('adds her approved looks to the universe’s, named from the approved folder, and refuses one outside her folder', () => {
    const { approved } = universe()
    const c = readCollection('sky-city', approved)
    expect(c.looks.map((l) => [l.id, l.character, l.image, l.collection ?? null])).toEqual([
      ['rider-one-street', 'Rider One', 'rider-one/street.png', null],
      ['rider-two-street', 'Rider Two', '../characters/rider-two/v001/full-body/street.png', 'characters/rider-two'],
      ['rider-two-dinner-v002', 'Rider Two', '../characters/rider-two/v002/rider-two-dinner-v002.png', 'characters/rider-two'],
    ])
    expect(c.looks[1]!.approvedOn).toBe('2026-01-02')
    const loose = readCollection('sky-city', universe({ looseLook: true }).approved)
    expect(loose.refused).toEqual([expect.objectContaining({ id: 'rider-two-street', kind: 'damaged', why: 'its image isn’t a PNG inside her folder', collection: 'characters/rider-two' })])
  })

  it('publishes her looks with the others, and writes her own record and her album’s tags', () => {
    const { approved, folder } = universe(), bucket = fakeRemote()
    const r = push('sky-city', approved, temp(), bucket.remote, T1)
    expect(r.uploaded).toEqual(['rider-one-street', 'rider-two-street', 'rider-two-dinner-v002'])
    const index = JSON.parse(bucket.files.get(INDEX)!.bytes.toString('utf8')) as UniverseIndex
    expect(index.looks.map((l) => [l.id, l.character])).toEqual([['rider-one-street', 'Rider One'], ['rider-two-street', 'Rider Two'], ['rider-two-dinner-v002', 'Rider Two']])
    expect(index.looks.every((l) => !('collection' in l))).toBe(true)
    // The approved folder's record keeps its own look; hers keeps hers, named as her album names them.
    const shared = JSON.parse(readFileSync(join(approved, 'publication.json'), 'utf8')) as Publication
    expect(shared.looks.map((l) => l.id)).toEqual(['rider-one-street'])
    expect(shared.counts.published).toBe(1)
    const mine = JSON.parse(readFileSync(join(folder, 'publication.json'), 'utf8')) as Publication
    // Named from her folder, where her record's script lives (P175): the flag script resolves them from there.
    expect(mine.looks.map((l) => [l.id, l.image, l.state])).toEqual([['rider-two-street', 'v001/full-body/street.png', 'published'], ['rider-two-dinner-v002', 'v002/rider-two-dinner-v002.png', 'published']])
    expect(mine.counts).toEqual({ published: 2, changed: 0, unpublished: 0, refused: 0 })
    expect(r.flagged).toEqual(expect.arrayContaining(['../characters/rider-two/publication.json', '../characters/rider-two/publication.js', '../characters/rider-two/v002/review.html']))
    expect(readFileSync(join(folder, 'publication.js'), 'utf8')).toContain('(window.UMA_PUBLICATIONS = window.UMA_PUBLICATIONS || []).push({')
    expect(readFileSync(join(folder, 'v002/review.html'), 'utf8')).toContain('<script src="../publication.js"></script><script src="../../../../publication-flag.js"></script>')
  })

  it('adds her crops and faces to the universe’s portraits, gated on her approved states', () => {
    const { dialogue, folder } = universe()
    const set = readPortraits('sky-city', dialogue)
    expect(set.problems).toEqual([])
    expect(set.characters).toEqual([{ id: 'rider-one', name: 'Rider One' }, { id: 'rider-two', name: 'Rider Two' }])
    expect(set.outfits).toEqual(['street', 'dinner'])
    expect(set.bases.map((b) => [b.id, b.file])).toEqual([
      ['rider-one-street', 'bases/rider-one-street.png'],
      ['rider-two-street', '../characters/rider-two/v001/bases/street-neutral.png'],
      ['rider-two-dinner', '../characters/rider-two/v002/bases/dinner-neutral.png'],
    ])
    expect(set.faces.map((f) => f.id)).toEqual(['rider-one-happy', 'rider-two-happy'])
    expect(set.states.filter((s) => s.character === 'rider-two').map((s) => [s.outfit, s.expression, s.at])).toEqual([
      ['street', 'neutral', null], ['street', 'happy', { x: 6, y: 5 }], ['dinner', 'neutral', null], ['dinner', 'happy', { x: 6, y: 5 }],
    ])
    // A state the owner hasn't approved is left out, not refused.
    expect(readPortraits('sky-city', universe({ unapprovedState: true }).dialogue).states.filter((s) => s.character === 'rider-two')).toHaveLength(3)
    const bucket = fakeRemote()
    const r = pushPortraits('sky-city', dialogue, temp(), bucket.remote, T1)
    const index = JSON.parse(bucket.files.get(PORTRAITS_INDEX)!.bytes.toString('utf8')) as PortraitIndex
    expect(index.bases.map((b) => b.path.split('.')[0])).toEqual(['bases/rider-one-street', 'bases/rider-two-street', 'bases/rider-two-dinner'])
    expect(index.bases.every((b) => !('file' in b))).toBe(true)
    expect(r.publication.characters).toEqual({
      'rider-one': { states: 2, bases: 1, faces: 1, state: 'published', publishedAt: T1, note: null },
      'rider-two': { states: 4, bases: 2, faces: 1, state: 'published', publishedAt: T1, note: null },
    })
    // Her share sits beside her looks' record, and her album's script carries both.
    expect(JSON.parse(readFileSync(join(folder, 'portraits-publication.json'), 'utf8'))).toMatchObject({ state: 'published', states: 4, bases: 2, faces: 1 })
    expect(existsSync(join(folder, 'publication.js'))).toBe(true)
    expect(readFileSync(join(folder, 'publication.js'), 'utf8')).toContain('window.UMA_PORTRAIT_PUBLICATION = {')
  })

  it('refuses her collection when her manifest lacks the owner’s approval', () => {
    const { dialogue, folder } = universe()
    const manifest = JSON.parse(readFileSync(join(folder, 'v002/manifest.json'), 'utf8')) as Record<string, unknown>
    writeFileSync(join(folder, 'v002/manifest.json'), JSON.stringify({ ...manifest, approval: { status: 'pending' } }))
    expect(readPortraits('sky-city', dialogue).problems).toEqual(['rider-two: her manifest doesn’t record the owner’s approval'])
  })
})

// P189: a machine may hold only some of a universe's characters (the others authored and published elsewhere), and the
// owner names whose art goes up. A push changes the characters it reads; every other one stays as the bucket has it.
describe('publishing some characters of a universe', () => {
  /** A bucket that already publishes an invented rider this machine doesn't hold: a look and her portrait pieces. */
  const withAbsentRider = (size = { width: 40, height: 50 }) => {
    const bucket = fakeRemote(), crop = png(size.width, size.height, 'rider-zero-street-crop'), face = png(10, 10, 'rider-zero-happy')
    const add = (path: string, bytes: Buffer) => bucket.files.set(path, { bytes, generation: 1 })
    const look = png(60, 90, 'rider-zero-street')
    add('images/rider-zero-street.0000000000000000.png', look)
    add(INDEX, Buffer.from(JSON.stringify({
      schemaVersion: 1, kind: 'universe-art', universe: 'sky-city', title: 'Sky City', style: null, revision: 4, publishedAt: '2026-01-01T00:00:00.000Z',
      looks: [{ id: 'rider-zero-street', character: 'Rider Zero', outfit: 'street', title: 'Street', path: 'images/rider-zero-street.0000000000000000.png', bytes: look.byteLength, sha256: sha(look), width: 60, height: 90, approvedOn: '2025-12-31', publishedAt: '2026-01-01T00:00:00.000Z' }],
    })))
    add('portraits/bases/rider-zero-street.0.png', crop); add('portraits/faces/rider-zero-happy.0.png', face)
    const zero: PortraitIndex = {
      schemaVersion: 1, kind: 'universe-portraits', universe: 'sky-city', revision: 3, approvedOn: '2025-12-31', publishedAt: '2026-01-01T00:00:00.000Z',
      size, faceSize: { width: 10, height: 10 }, blend: 'old words', characters: [{ id: 'rider-zero', name: 'Rider Zero' }], outfits: ['street'], expressions: ['neutral', 'happy'],
      bases: [{ id: 'rider-zero-street', character: 'rider-zero', outfit: 'street', path: 'bases/rider-zero-street.0.png', bytes: crop.byteLength, sha256: sha(crop), ...size }],
      faces: [{ id: 'rider-zero-happy', character: 'rider-zero', expression: 'happy', path: 'faces/rider-zero-happy.0.png', bytes: face.byteLength, sha256: sha(face), width: 10, height: 10 }],
      states: [
        { character: 'rider-zero', outfit: 'street', expression: 'neutral', base: 'rider-zero-street', face: null, at: null, approvedSha256: null },
        { character: 'rider-zero', outfit: 'street', expression: 'happy', base: 'rider-zero-street', face: 'rider-zero-happy', at: { x: 1, y: 1 }, approvedSha256: 'd'.repeat(64) },
      ],
    }
    add(PORTRAITS_INDEX, Buffer.from(JSON.stringify(zero)))
    return { bucket, zero }
  }
  const looks = (bucket: ReturnType<typeof fakeRemote>) => JSON.parse(bucket.files.get(INDEX)!.bytes.toString('utf8')) as UniverseIndex
  const recipe = (bucket: ReturnType<typeof fakeRemote>) => JSON.parse(bucket.files.get(PORTRAITS_INDEX)!.bytes.toString('utf8')) as PortraitIndex

  it('a push never takes off the looks of a character this machine doesn’t hold, nor sets the revision back', () => {
    const { approved } = universe(), { bucket } = withAbsentRider()
    const r = push('sky-city', approved, temp(), bucket.remote, T1)
    expect(r).toMatchObject({ withdrawn: [], kept: ['rider-zero-street'] })
    expect(looks(bucket).looks.map((l) => l.id)).toEqual(['rider-one-street', 'rider-two-street', 'rider-two-dinner-v002', 'rider-zero-street'])
    expect(looks(bucket).revision).toBe(4)
    expect(r.publication.withdrawable).toEqual([])
  })

  it('--only <her key> publishes her whole set alone, and names her to take her off', () => {
    const { approved } = universe(), { bucket } = withAbsentRider()
    const r = push('sky-city', approved, temp(), bucket.remote, T1, { only: ['rider-two'] })
    expect(r).toMatchObject({ uploaded: ['rider-two-street', 'rider-two-dinner-v002'], withdrawn: [], kept: ['rider-zero-street'] })
    expect(looks(bucket).looks.map((l) => l.id)).toEqual(['rider-two-street', 'rider-two-dinner-v002', 'rider-zero-street'])
    expect([...bucket.files.keys()].some((p) => p.includes('rider-one'))).toBe(false)
    expect(r.publication.looks.map((l) => [l.id, l.state])).toEqual([['rider-one-street', 'unpublished'], ['rider-two-street', 'published'], ['rider-two-dinner-v002', 'published']])
    const gone = push('sky-city', approved, temp(), bucket.remote, T1, { only: ['rider-zero'] })
    expect(gone.withdrawn).toEqual(['rider-zero-street'])
    expect(() => push('sky-city', approved, temp(), bucket.remote, T1, { only: ['rider-nine'] })).toThrow(/names no approved or published look: rider-nine/)
  })

  it('publishes her portraits from her own collection when the universe has no shared one, keeping the bucket’s other characters', () => {
    const { dialogue, folder } = universe(), { bucket, zero } = withAbsentRider()
    rmSync(dialogue, { recursive: true })
    const r = pushPortraits('sky-city', dialogue, temp(), bucket.remote, T1, { only: ['rider-two'] })
    expect(r).toMatchObject({ uploaded: ['rider-two-street', 'rider-two-dinner', 'rider-two-happy'], kept: ['rider-zero'], states: 4, indexed: true })
    const index = recipe(bucket)
    expect(index.characters.map((c) => c.id)).toEqual(['rider-zero', 'rider-two'])
    expect(index.bases.map((b) => b.id)).toEqual(['rider-zero-street', 'rider-two-street', 'rider-two-dinner'])
    expect(index.faces.map((f) => f.id)).toEqual(['rider-zero-happy', 'rider-two-happy'])
    expect(index.states.filter((s) => s.character === 'rider-zero')).toEqual(zero.states)
    expect(index.outfits).toEqual(['street', 'dinner'])
    expect(index).toMatchObject({ revision: 3, approvedOn: '2026-01-02', blend: BLEND })
    // Her flag is her own; no shared folder or record appears.
    expect(JSON.parse(readFileSync(join(folder, 'portraits-publication.json'), 'utf8'))).toMatchObject({ state: 'published', states: 4, bases: 2, faces: 1 })
    expect(existsSync(dialogue)).toBe(false)
    // Again: nothing to send, the recipe untouched.
    const generation = bucket.files.get(PORTRAITS_INDEX)!.generation
    expect(pushPortraits('sky-city', dialogue, temp(), bucket.remote, T1, { only: ['rider-two'] })).toMatchObject({ uploaded: [], indexed: false })
    expect(bucket.files.get(PORTRAITS_INDEX)!.generation).toBe(generation)
  })

  it('--only leaves an unnamed local character out, refuses an unknown name, and a crop size the recipe can’t share', () => {
    const { dialogue } = universe(), { bucket } = withAbsentRider()
    pushPortraits('sky-city', dialogue, temp(), bucket.remote, T1, { only: ['rider-two'] })
    expect(recipe(bucket).characters.map((c) => c.id)).toEqual(['rider-zero', 'rider-two'])
    expect(() => pushPortraits('sky-city', dialogue, temp(), bucket.remote, T1, { only: ['rider-nine'] })).toThrow(/names no character with dialogue portraits here: rider-nine/)
    const other = withAbsentRider({ width: 41, height: 50 })
    expect(() => pushPortraits('sky-city', dialogue, temp(), other.bucket.remote, T1, { only: ['rider-two'] })).toThrow(/the crops are 40×50, the published ones 41×50/)
    // Without --only, every character held here goes up, and the absent one still stays.
    const all = withAbsentRider()
    pushPortraits('sky-city', dialogue, temp(), all.bucket.remote, T1)
    expect(recipe(all.bucket).characters.map((c) => c.id)).toEqual(['rider-zero', 'rider-one', 'rider-two'])
  })
})
