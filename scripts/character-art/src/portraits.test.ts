import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, relative, sep } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { FLAG_SCRIPT } from './flag.js'
import type { Remote, RemoteFile } from './lib.js'
import {
  BLEND, parsePortraitIndex, planPortraits, portraitPublicationOf, portraitStatus, portraitUniverses, PORTRAITS_INDEX, pushPortraits, readPortraits,
  type PortraitIndex, type PortraitPublication,
} from './portraits.js'

// Invented pieces only: a PNG signature and header in front of a few bytes of filler, never a real image.
const png = (width: number, height: number, seed: string): Buffer => {
  const head = Buffer.alloc(24)
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(head, 0)
  head.writeUInt32BE(13, 8); head.write('IHDR', 12, 'latin1'); head.writeUInt32BE(width, 16); head.writeUInt32BE(height, 20)
  return Buffer.concat([head, Buffer.from(`invented pixels ${seed}`)])
}
const sha = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex')
const md5 = (bytes: Uint8Array) => createHash('md5').update(bytes).digest('base64')
const folders: string[] = []
const temp = () => { const dir = mkdtempSync(join(tmpdir(), 'portraits-test-')); folders.push(dir); return dir }
afterEach(() => { for (const dir of folders.splice(0)) rmSync(dir, { recursive: true, force: true }) })

/**
 * An invented universe with two riders, two outfits and three expressions (neutral, happy, sad): the approved looks folder
 * (with a gallery page), and the dialogue portraits' manifest, approval record, crops and faces.
 */
function collection(options: { approved?: boolean; outfits?: string[]; retired?: string[]; shift?: number } = {}) {
  const base = temp(), universe = join(base, 'sky-city'), dir = join(universe, 'dialogue-portraits')
  mkdirSync(join(dir, 'v001/bases'), { recursive: true }); mkdirSync(join(dir, 'v001/faces'), { recursive: true }); mkdirSync(join(universe, 'approved'), { recursive: true })
  writeFileSync(join(universe, 'approved/manifest.json'), JSON.stringify({ assets: [] }))
  writeFileSync(join(universe, 'approved/review.html'), '<html><body><header><h1>Looks</h1></header></body></html>')
  writeFileSync(join(dir, 'review.html'), '<html><body><h1>Portraits</h1></body></html>')
  const characters = ['rider-one', 'rider-two'], outfits = options.outfits ?? ['street', 'pilot'], expressions = ['neutral', 'happy', 'sad']
  const faces = characters.flatMap((c) => expressions.slice(1).map((e) => {
    const file = `v001/faces/${c}-${e}.png`, bytes = png(24, 24, `${c}-${e}`)
    writeFileSync(join(dir, file), bytes)
    return { character: c, expression: e, file, sha256: sha(bytes) }
  }))
  const assets = characters.flatMap((c) => outfits.map((o) => {
    const file = `v001/bases/${c}-${o}-neutral.png`, bytes = png(60, 80, `${c}-${o}`)
    writeFileSync(join(dir, file), bytes)
    return { character: c, outfit: o, base: file, baseSha256: sha(bytes) }
  }))
  writeFileSync(join(dir, 'manifest.json'), JSON.stringify({
    revision: 1, expressions, outfits: [...outfits, ...(options.retired ?? [])], retiredOutfits: options.retired ?? [],
    characterNames: { 'rider-one': 'Rider One', 'rider-two': 'Rider Two' }, faces, assets,
  }))
  writeFileSync(join(dir, 'approval.json'), JSON.stringify({
    status: options.approved === false ? 'pending' : 'approved', by: 'owner', date: '2026-01-02',
    assets: assets.map((a) => ({
      character: a.character, outfit: a.outfit, baseSha256: a.baseSha256,
      outputs: expressions.slice(1).map((e) => ({ expression: e, sha256: sha(Buffer.from(`${a.character}-${a.outfit}-${e}`)), faceSha256: faces.find((f) => f.character === a.character && f.expression === e)!.sha256, position: { x: 18 + (options.shift ?? 0), y: 20 } })),
    })),
  }))
  return { base, universe, dir }
}

/** The bucket as a map, with generations, like the real one. */
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
  return { remote, files, index: (): PortraitIndex => JSON.parse(files.get(PORTRAITS_INDEX)!.bytes.toString('utf8')) as PortraitIndex }
}
const T1 = '2026-01-03T10:00:00.000Z', T2 = '2026-01-04T10:00:00.000Z'

describe('the approved dialogue portraits', () => {
  it('reads every crop and face the owner approved, and every state: the neutral crop, then each face at its place', () => {
    const { dir } = collection()
    const set = readPortraits('sky-city', dir)
    expect(set.problems).toEqual([])
    expect(set).toMatchObject({ universe: 'sky-city', revision: 1, approvedOn: '2026-01-02', size: { width: 60, height: 80 }, faceSize: { width: 24, height: 24 }, outfits: ['street', 'pilot'], expressions: ['neutral', 'happy', 'sad'] })
    expect(set.characters).toEqual([{ id: 'rider-one', name: 'Rider One' }, { id: 'rider-two', name: 'Rider Two' }])
    expect(set.bases.map((b) => b.id)).toEqual(['rider-one-street', 'rider-one-pilot', 'rider-two-street', 'rider-two-pilot'])
    expect(set.faces.map((f) => f.id)).toEqual(['rider-one-happy', 'rider-one-sad', 'rider-two-happy', 'rider-two-sad'])
    expect(set.bases[0]!.path).toMatch(/^bases\/rider-one-street\.[a-f0-9]{16}\.png$/)
    expect(set.faces[0]!.path).toMatch(/^faces\/rider-one-happy\.[a-f0-9]{16}\.png$/)
    expect(set.states).toHaveLength(12)
    expect(set.states.slice(0, 3)).toEqual([
      { character: 'rider-one', outfit: 'street', expression: 'neutral', base: 'rider-one-street', face: null, at: null, approvedSha256: null },
      expect.objectContaining({ expression: 'happy', base: 'rider-one-street', face: 'rider-one-happy', at: { x: 18, y: 20 } }),
      expect.objectContaining({ expression: 'sad', face: 'rider-one-sad' }),
    ])
  })

  it('finds a problem in an unapproved collection, a changed crop or face, a retired outfit and a face off the crop', () => {
    expect(readPortraits('sky-city', collection({ approved: false }).dir).problems).toEqual(['approval.json doesn’t record the owner’s approval'])
    const { dir } = collection()
    writeFileSync(join(dir, 'v001/bases/rider-one-street-neutral.png'), png(60, 80, 'edited by hand'))
    writeFileSync(join(dir, 'v001/faces/rider-two-sad.png'), png(24, 24, 'edited by hand'))
    const problems = readPortraits('sky-city', dir).problems
    expect(problems).toContain('rider-one street crop: v001/bases/rider-one-street-neutral.png changed since it was approved')
    expect(problems).toContain('rider-two sad face: v001/faces/rider-two-sad.png changed since it was approved')
    expect(readPortraits('sky-city', collection({ retired: ['pajamas'], outfits: ['street'] }).dir).problems).toEqual([])
    const off = readPortraits('sky-city', collection({ shift: 30 }).dir).problems
    expect(off[0]).toMatch(/the face falls outside the crop/)
  })

  it('finds the universes with an approved portrait collection', () => {
    const { base } = collection()
    mkdirSync(join(base, 'old-road/approved'), { recursive: true }); writeFileSync(join(base, 'old-road/approved/manifest.json'), '{"assets":[]}')
    expect(portraitUniverses(base)).toEqual(['sky-city'])
  })
})

describe('the portraits push', () => {
  it('sends each piece under a hash name, checks it, writes the recipe last and fills the mirror', () => {
    const { dir } = collection(), bucket = fakeRemote(), mirror = temp()
    const r = pushPortraits('sky-city', dir, mirror, bucket.remote, T1)
    expect(r).toMatchObject({ universe: 'sky-city', unchanged: 0, states: 12, indexed: true })
    expect(r.uploaded).toHaveLength(8)
    const index = bucket.index()
    expect(index).toMatchObject({ schemaVersion: 1, kind: 'universe-portraits', universe: 'sky-city', publishedAt: T1, blend: BLEND, size: { width: 60, height: 80 }, faceSize: { width: 24, height: 24 } })
    expect(index.states).toHaveLength(12)
    for (const p of [...index.bases, ...index.faces]) {
      expect(bucket.files.has(`portraits/${p.path}`)).toBe(true)
      expect(sha(bucket.files.get(`portraits/${p.path}`)!.bytes)).toBe(p.sha256)
      expect(existsSync(join(mirror, 'universes/sky-city/portraits', p.path))).toBe(true)
      expect(p).not.toHaveProperty('file')
    }
    expect(JSON.parse(readFileSync(join(mirror, 'universes/sky-city', PORTRAITS_INDEX), 'utf8'))).toEqual(index)
    // Again: nothing to send, and the index and its date stay.
    const generation = bucket.files.get(PORTRAITS_INDEX)!.generation
    expect(pushPortraits('sky-city', dir, temp(), bucket.remote, T2)).toMatchObject({ uploaded: [], unchanged: 8, indexed: false })
    expect(bucket.files.get(PORTRAITS_INDEX)!.generation).toBe(generation)
  })

  it('sends nothing at all when any piece has a problem, and nothing on a dry run', () => {
    const { dir } = collection(), bucket = fakeRemote()
    writeFileSync(join(dir, 'v001/faces/rider-one-happy.png'), png(24, 24, 'edited by hand'))
    expect(() => pushPortraits('sky-city', dir, temp(), bucket.remote, T1)).toThrow(/can't be published, nothing was sent/)
    expect(bucket.files.size).toBe(0)
    const ok = collection()
    const r = pushPortraits('sky-city', ok.dir, temp(), bucket.remote, T1, { dryRun: true })
    expect(r).toMatchObject({ indexed: true, flagged: [] })
    expect(r.uploaded).toHaveLength(8)
    expect(r.publication.state).toBe('unpublished')
    expect(bucket.files.size).toBe(0)
  })

  it('never writes the recipe when a piece didn’t arrive, and loses a race instead of overwriting', () => {
    const { dir } = collection(), bucket = fakeRemote(), upload = bucket.remote.uploadFolder
    bucket.remote.uploadFolder = () => undefined
    expect(() => pushPortraits('sky-city', dir, temp(), bucket.remote, T1)).toThrow(/isn't in the bucket after the upload/)
    expect(bucket.files.has(PORTRAITS_INDEX)).toBe(false)
    bucket.remote.uploadFolder = upload
    pushPortraits('sky-city', dir, temp(), bucket.remote, T1)
    const again = collection({ outfits: ['street', 'pilot', 'farm'] })
    const read = bucket.remote.read
    bucket.remote.read = (path) => { const seen = read(path); if (path === PORTRAITS_INDEX) bucket.files.set(PORTRAITS_INDEX, { ...bucket.files.get(PORTRAITS_INDEX)!, generation: 999 }); return seen }
    expect(() => pushPortraits('sky-city', again.dir, temp(), bucket.remote, T2)).toThrow(/changed in the bucket while pushing/)
  })

  it('refuses another universe’s recipe', () => {
    expect(() => parsePortraitIndex('{"kind":"universe-portraits","universe":"old-road","bases":[],"faces":[],"states":[]}', 'sky-city')).toThrow(/isn't the sky-city universe's portraits index/)
    expect(parsePortraitIndex(null, 'sky-city')).toBeNull()
  })
})

describe('the portraits’ published flag', () => {
  const record = (dir: string) => JSON.parse(readFileSync(join(dir, 'publication.json'), 'utf8')) as PortraitPublication

  it('is written beside the portraits’ manifest, and both galleries get the right script tags', () => {
    const { dir, universe, base } = collection(), bucket = fakeRemote()
    // The looks were flagged first, as on the owner's machine.
    writeFileSync(join(universe, 'approved/publication.js'), 'window.UMA_PUBLICATION = {"looks":[]};\n')
    const manifest = readFileSync(join(dir, 'manifest.json'))
    const r = pushPortraits('sky-city', dir, temp(), bucket.remote, T1)
    expect(r.flagged).toEqual(['publication.json', 'publication.js', '../../publication-flag.js', '../approved/review.html', 'review.html'])
    expect(record(dir)).toMatchObject({ kind: 'universe-portraits-publication', universe: 'sky-city', state: 'published', publishedAt: T1, states: 12, bases: 4, faces: 4, composedBy: 'the games', note: null })
    expect(readFileSync(join(dir, 'publication.js'), 'utf8')).toContain('window.UMA_PORTRAIT_PUBLICATION = {')
    expect(readFileSync(join(base, 'publication-flag.js'), 'utf8')).toBe(FLAG_SCRIPT)
    expect(readFileSync(join(universe, 'approved/review.html'), 'utf8')).toContain('<script src="publication.js"></script><script src="../dialogue-portraits/publication.js"></script><script src="../../publication-flag.js"></script>')
    expect(readFileSync(join(dir, 'review.html'), 'utf8')).toContain('<script src="publication.js"></script><script src="../../publication-flag.js"></script>')
    expect(readFileSync(join(dir, 'manifest.json')).equals(manifest)).toBe(true)
    expect(pushPortraits('sky-city', dir, temp(), bucket.remote, T2).flagged).toEqual([])
  })

  it('status tells published from changed, unpublished and refused, and publishes nothing', () => {
    const { dir } = collection(), bucket = fakeRemote()
    expect(portraitStatus('sky-city', dir, bucket.remote, T1).publication.state).toBe('unpublished')
    pushPortraits('sky-city', dir, temp(), bucket.remote, T1)
    expect(portraitStatus('sky-city', dir, bucket.remote, T2).publication.state).toBe('published')
    const grown = collection({ outfits: ['street', 'pilot', 'farm'] })
    expect(portraitStatus('sky-city', grown.dir, bucket.remote, T2).publication).toMatchObject({ state: 'changed', publishedAt: T1 })
    writeFileSync(join(dir, 'v001/faces/rider-one-sad.png'), png(24, 24, 'edited'))
    const refused = portraitStatus('sky-city', dir, bucket.remote, T2).publication
    expect(refused.state).toBe('refused')
    expect(refused.note).toMatch(/^Can’t publish: rider-one sad face/)
    expect(bucket.index().publishedAt).toBe(T1)
  })

  it('a plan with nothing published is not the same as an empty one', () => {
    const set = readPortraits('sky-city', collection().dir)
    expect(planPortraits(set, null, T1)).toMatchObject({ same: false, unchanged: 0 })
    expect(portraitPublicationOf(set, null, T1)).toMatchObject({ state: 'unpublished', publishedAt: null })
  })
})

describe('the flag script draws the portraits’ line', () => {
  it('reads the portraits’ record as well as the looks’', () => {
    expect(() => new Function(FLAG_SCRIPT)).not.toThrow()
    for (const word of ['window.UMA_PORTRAIT_PUBLICATION', 'Dialogue portraits', 'composed by the games']) expect(FLAG_SCRIPT).toContain(word)
  })
})
