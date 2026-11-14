import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, relative, sep } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { FLAG_SCRIPT } from './flag.js'
import {
  failureKind, gcloudCommand, INDEX, isUniverse, parseIndex, planPush, pngSize, publicationOf, publishedPath, push, readCollection, status, universesIn, withFlagTags,
  type Publication, type Remote, type RemoteFile, type UniverseIndex,
} from './lib.js'

// Invented pictures only: a PNG signature and header in front of a few bytes of filler, never a real image.
const png = (width: number, height: number, seed: string): Buffer => {
  const head = Buffer.alloc(24)
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(head, 0)
  head.writeUInt32BE(13, 8); head.write('IHDR', 12, 'latin1'); head.writeUInt32BE(width, 16); head.writeUInt32BE(height, 20)
  return Buffer.concat([head, Buffer.from(`invented pixels ${seed}`)])
}
const sha = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex')
const md5 = (bytes: Uint8Array) => createHash('md5').update(bytes).digest('base64')

const folders: string[] = []
const temp = () => { const dir = mkdtempSync(join(tmpdir(), 'art-test-')); folders.push(dir); return dir }
afterEach(() => { for (const dir of folders.splice(0)) rmSync(dir, { recursive: true, force: true }) })

interface Asset { id: string; character?: string; outfit: string; title?: string; seed?: string; approval?: unknown; width?: number; height?: number }
const APPROVED = { status: 'approved', by: 'owner', on: '2026-01-02', basis: 'yes' }
/** A universe's approved folder under an invented authoring root: the manifest, its PNGs and a gallery page. */
function universe(base: string, name: string, assets: Asset[], extra: Record<string, unknown> = {}): string {
  const dir = join(base, name, 'approved')
  const entries = assets.map((a) => {
    const image = `rider-one/${a.outfit}.png`, bytes = png(a.width ?? 64, a.height ?? 96, a.seed ?? a.id)
    mkdirSync(dirname(join(dir, image)), { recursive: true })
    writeFileSync(join(dir, image), bytes)
    return { id: a.id, character: a.character ?? 'Rider One', outfit: a.outfit, ...(a.title ? { title: a.title } : {}), image, width: 64, height: 96, sha256: sha(bytes), approval: a.approval ?? APPROVED }
  })
  writeFileSync(join(dir, 'manifest.json'), JSON.stringify({ collection: `${name}-approved`, revision: 2, style: 'Invented Style', ...extra, assets: entries }))
  writeFileSync(join(dir, 'review.html'), `<!doctype html><html><head><title>t</title></head><body><header><h1>t</h1></header><main>${entries.map((e) => `<figure><img src="${e.image}"><figcaption><span class="badge">Approved</span></figcaption></figure>`).join('')}</main></body></html>`)
  return dir
}

/** The bucket as a map of paths to bytes, with generations, like the real one. */
function fakeRemote() {
  const files = new Map<string, { bytes: Buffer; generation: number }>()
  let clock = 100
  const put = (path: string, bytes: Buffer) => { files.set(path, { bytes, generation: ++clock }) }
  const walk = (dir: string, at = dir): string[] => readdirSync(at).flatMap((name) => { const p = join(at, name); return statSync(p).isDirectory() ? walk(dir, p) : [relative(dir, p).split(sep).join('/')] })
  const remote: Remote = {
    read: (path) => { const f = files.get(path); return f ? { text: f.bytes.toString('utf8'), generation: String(f.generation) } : null },
    uploadFolder: (dir) => { for (const path of walk(dir)) put(path, readFileSync(join(dir, path))) },
    uploadFile: (file, path, ifGeneration) => { if (String(files.get(path)?.generation ?? 0) !== ifGeneration) return false; put(path, readFileSync(file)); return true },
    list: (): RemoteFile[] => [...files].map(([path, f]) => ({ path, bytes: f.bytes.byteLength, md5: md5(f.bytes) })),
  }
  return { remote, files, index: (): UniverseIndex => JSON.parse(files.get(INDEX)!.bytes.toString('utf8')) as UniverseIndex }
}
const T1 = '2026-01-03T10:00:00.000Z', T2 = '2026-01-04T10:00:00.000Z', T3 = '2026-01-05T10:00:00.000Z'

describe('the approved collection', () => {
  it('reads each look the owner approved, and names a look by its outfit when it has no title', () => {
    const dir = universe(temp(), 'sky-city', [{ id: 'rider-one-street', outfit: 'street' }, { id: 'rider-one-pilot', outfit: 'pilot', title: 'Ship · Pilot suit' }])
    const c = readCollection('sky-city', dir)
    expect(c).toMatchObject({ universe: 'sky-city', title: 'Sky City', style: 'Invented Style', revision: 2, refused: [] })
    expect(c.looks.map((l) => [l.id, l.title, l.image, l.width, l.height, l.approvedOn])).toEqual([
      ['rider-one-street', 'Street', 'rider-one/street.png', 64, 96, '2026-01-02'], ['rider-one-pilot', 'Ship · Pilot suit', 'rider-one/pilot.png', 64, 96, '2026-01-02'],
    ])
  })

  it('refuses a look that isn’t approved, changed since, lost its file, or isn’t the size its entry says', () => {
    const dir = universe(temp(), 'sky-city', [
      { id: 'a-ok', outfit: 'ok' }, { id: 'b-pending', outfit: 'pending', approval: { status: 'pending', by: 'owner' } }, { id: 'c-agent', outfit: 'agent', approval: { status: 'approved', by: 'agent' } },
      { id: 'd-edited', outfit: 'edited' }, { id: 'e-gone', outfit: 'gone' }, { id: 'f-size', outfit: 'size', width: 65 }, { id: 'a-ok', outfit: 'twice' },
    ])
    writeFileSync(join(dir, 'rider-one/edited.png'), png(64, 96, 'another picture'))
    rmSync(join(dir, 'rider-one/gone.png'))
    const c = readCollection('sky-city', dir)
    expect(c.looks.map((l) => l.id)).toEqual(['a-ok'])
    expect(c.refused.map((r) => [r.id, r.kind])).toEqual([['b-pending', 'unapproved'], ['c-agent', 'unapproved'], ['d-edited', 'damaged'], ['e-gone', 'damaged'], ['f-size', 'damaged'], ['a-ok', 'damaged']])
    expect(c.refused.find((r) => r.id === 'd-edited')!.why).toMatch(/changed since it was approved/)
  })

  it('refuses a picture path outside the approved folder, and a manifest without assets', () => {
    const base = temp(), dir = universe(base, 'sky-city', [{ id: 'a-ok', outfit: 'ok' }])
    const manifest = JSON.parse(readFileSync(join(dir, 'manifest.json'), 'utf8')) as { assets: { image: string }[] }
    manifest.assets[0]!.image = '../../other/ok.png'
    writeFileSync(join(dir, 'manifest.json'), JSON.stringify(manifest))
    expect(readCollection('sky-city', dir).refused[0]).toMatchObject({ id: 'a-ok', kind: 'damaged' })
    writeFileSync(join(dir, 'manifest.json'), '{"collection":"x"}')
    expect(() => readCollection('sky-city', dir)).toThrow(/no assets/)
    expect(() => readCollection('Sky City', dir)).toThrow(/lowercase/)
  })

  it('finds the universes that have an approved collection', () => {
    const base = temp()
    universe(base, 'sky-city', [{ id: 'a-ok', outfit: 'ok' }]); universe(base, 'old-road', [{ id: 'a-ok', outfit: 'ok' }])
    mkdirSync(join(base, 'no-approval-yet/v001'), { recursive: true }); mkdirSync(join(base, 'references'))
    expect(universesIn(base)).toEqual(['old-road', 'sky-city'])
    expect(universesIn(join(base, 'missing'))).toEqual([])
    expect([isUniverse('farm-life'), isUniverse('Farm'), isUniverse('a/b'), isUniverse('')]).toEqual([true, false, false, false])
  })

  it('reads a PNG’s size from its header only', () => {
    expect(pngSize(png(1024, 1536, 'x'))).toEqual({ width: 1024, height: 1536 })
    expect(pngSize(Buffer.from('not a picture at all, just words'))).toBeNull()
  })
})

describe('the push', () => {
  it('sends each approved look under a hash name, checks it, writes the index last and fills the mirror', () => {
    const base = temp(), mirrorDir = temp(), dir = universe(base, 'sky-city', [{ id: 'rider-one-street', outfit: 'street' }, { id: 'rider-one-pilot', outfit: 'pilot' }])
    const bucket = fakeRemote()
    const r = push('sky-city', dir, mirrorDir, bucket.remote, T1)
    expect(r).toMatchObject({ uploaded: ['rider-one-street', 'rider-one-pilot'], unchanged: 0, withdrawn: [], refused: [], indexed: true })
    const index = bucket.index()
    expect(index).toMatchObject({ schemaVersion: 1, kind: 'universe-art', universe: 'sky-city', title: 'Sky City', style: 'Invented Style', revision: 2, publishedAt: T1 })
    const street = index.looks[0]!
    expect(street).toMatchObject({ id: 'rider-one-street', character: 'Rider One', outfit: 'street', title: 'Street', width: 64, height: 96, approvedOn: '2026-01-02', publishedAt: T1 })
    expect(street.path).toMatch(/^images\/rider-one-street\.[a-f0-9]{16}\.png$/)
    // Byte for byte: the bucket's file is the approved PNG, and its name carries the approved hash.
    const approved = readFileSync(join(dir, 'rider-one/street.png'))
    expect(bucket.files.get(street.path)!.bytes.equals(approved)).toBe(true)
    expect(street.sha256).toBe(sha(approved))
    expect(street.path).toBe(publishedPath({ id: 'rider-one-street', sha256: sha(approved) }))
    expect(readFileSync(join(mirrorDir, 'universes/sky-city', street.path)).equals(approved)).toBe(true)
    expect(JSON.parse(readFileSync(join(mirrorDir, 'universes/sky-city/index.json'), 'utf8'))).toEqual(index)
  })

  it('sends nothing twice: a second push uploads nothing and leaves the index and its date', () => {
    const base = temp(), dir = universe(base, 'sky-city', [{ id: 'rider-one-street', outfit: 'street' }])
    const bucket = fakeRemote()
    push('sky-city', dir, temp(), bucket.remote, T1)
    const generation = bucket.files.get(INDEX)!.generation
    const r = push('sky-city', dir, temp(), bucket.remote, T2)
    expect(r).toMatchObject({ uploaded: [], unchanged: 1, indexed: false })
    expect(bucket.files.get(INDEX)!.generation).toBe(generation)
    expect(bucket.index().publishedAt).toBe(T1)
  })

  it('adds a newly approved look, replaces one approved again, and takes a dropped one off the index without deleting it', () => {
    const base = temp(), bucket = fakeRemote()
    let dir = universe(base, 'sky-city', [{ id: 'rider-one-street', outfit: 'street' }, { id: 'rider-one-old', outfit: 'old' }, { id: 'rider-one-armor', outfit: 'armor' }])
    push('sky-city', dir, temp(), bucket.remote, T1)
    const oldPath = bucket.index().looks.find((l) => l.id === 'rider-one-old')!.path, firstArmor = bucket.index().looks.find((l) => l.id === 'rider-one-armor')!.path
    dir = universe(base, 'sky-city', [{ id: 'rider-one-street', outfit: 'street' }, { id: 'rider-one-armor', outfit: 'armor', seed: 'redrawn' }, { id: 'rider-one-pilot', outfit: 'pilot' }], { revision: 3 })
    const r = push('sky-city', dir, temp(), bucket.remote, T2)
    expect(r).toMatchObject({ uploaded: ['rider-one-armor', 'rider-one-pilot'], unchanged: 1, withdrawn: ['rider-one-old'], indexed: true })
    const index = bucket.index()
    expect(index).toMatchObject({ revision: 3, publishedAt: T2 })
    expect(index.looks.map((l) => [l.id, l.publishedAt])).toEqual([['rider-one-street', T1], ['rider-one-armor', T2], ['rider-one-pilot', T2]])
    expect(index.looks.find((l) => l.id === 'rider-one-armor')!.path).not.toBe(firstArmor)
    // Nothing is deleted: the withdrawn look's file and the replaced picture are still in the bucket.
    expect(bucket.files.has(oldPath) && bucket.files.has(firstArmor)).toBe(true)
  })

  it('keeps a published look as it is when its local copy is damaged, and withdraws one the owner no longer approves', () => {
    const base = temp(), bucket = fakeRemote()
    let dir = universe(base, 'sky-city', [{ id: 'rider-one-street', outfit: 'street' }, { id: 'rider-one-pilot', outfit: 'pilot' }])
    push('sky-city', dir, temp(), bucket.remote, T1)
    const before = bucket.index().looks.find((l) => l.id === 'rider-one-street')!
    writeFileSync(join(dir, 'rider-one/street.png'), png(64, 96, 'edited by hand'))
    let r = push('sky-city', dir, temp(), bucket.remote, T2)
    expect(r).toMatchObject({ uploaded: [], kept: ['rider-one-street'], withdrawn: [], indexed: false })
    expect(bucket.index().looks.find((l) => l.id === 'rider-one-street')).toEqual(before)
    expect(r.publication.looks.find((l) => l.id === 'rider-one-street')).toMatchObject({ state: 'refused', publishedAt: T1 })
    dir = universe(base, 'sky-city', [{ id: 'rider-one-street', outfit: 'street', approval: { status: 'rejected', by: 'owner' } }, { id: 'rider-one-pilot', outfit: 'pilot' }])
    r = push('sky-city', dir, temp(), bucket.remote, T3)
    expect(r).toMatchObject({ withdrawn: ['rider-one-street'], kept: [], indexed: true })
    expect(bucket.index().looks.map((l) => l.id)).toEqual(['rider-one-pilot'])
  })

  it('a dry run sends and writes nothing, and says what a push would do', () => {
    const base = temp(), mirrorDir = temp(), dir = universe(base, 'sky-city', [{ id: 'rider-one-street', outfit: 'street' }])
    const bucket = fakeRemote(), page = readFileSync(join(dir, 'review.html'), 'utf8')
    const r = push('sky-city', dir, mirrorDir, bucket.remote, T1, { dryRun: true })
    expect(r).toMatchObject({ uploaded: ['rider-one-street'], indexed: true, flagged: [] })
    expect(r.publication.counts).toEqual({ published: 0, changed: 0, unpublished: 1, refused: 0 })
    expect(bucket.files.size).toBe(0)
    expect(readdirSync(mirrorDir)).toEqual([])
    expect(existsSync(join(dir, 'publication.json'))).toBe(false)
    expect(readFileSync(join(dir, 'review.html'), 'utf8')).toBe(page)
  })

  it('never writes the index when the bucket’s copy isn’t the approved PNG, or a look didn’t arrive', () => {
    const base = temp(), dir = universe(base, 'sky-city', [{ id: 'rider-one-street', outfit: 'street' }])
    const bucket = fakeRemote(), upload = bucket.remote.uploadFolder
    bucket.remote.uploadFolder = () => undefined
    expect(() => push('sky-city', dir, temp(), bucket.remote, T1)).toThrow(/isn't in the bucket after the upload/)
    bucket.remote.uploadFolder = (stage) => { upload(stage); for (const [path, f] of bucket.files) bucket.files.set(path, { ...f, bytes: Buffer.concat([f.bytes, Buffer.from('!')]) }) }
    expect(() => push('sky-city', dir, temp(), bucket.remote, T1)).toThrow(/isn't the approved PNG/)
    expect(bucket.files.has(INDEX)).toBe(false)
    expect(existsSync(join(dir, 'publication.json'))).toBe(false)
  })

  it('loses a race for the index instead of overwriting another push', () => {
    const base = temp(), dir = universe(base, 'sky-city', [{ id: 'rider-one-street', outfit: 'street' }])
    const bucket = fakeRemote(), read = bucket.remote.read
    push('sky-city', dir, temp(), bucket.remote, T1)
    universe(base, 'sky-city', [{ id: 'rider-one-street', outfit: 'street' }, { id: 'rider-one-pilot', outfit: 'pilot' }])
    bucket.remote.read = (path) => { const seen = read(path); if (path === INDEX) bucket.files.set(INDEX, { ...bucket.files.get(INDEX)!, generation: 999 }); return seen }
    expect(() => push('sky-city', dir, temp(), bucket.remote, T2)).toThrow(/changed in the bucket while pushing/)
  })

  it('refuses a universe with nothing to publish, and another universe’s index', () => {
    const base = temp(), dir = universe(base, 'sky-city', [{ id: 'rider-one-street', outfit: 'street', approval: { status: 'pending' } }])
    expect(() => push('sky-city', dir, temp(), fakeRemote().remote, T1)).toThrow(/Nothing to publish/)
    expect(() => parseIndex('{"kind":"universe-art","universe":"old-road","looks":[]}', 'sky-city')).toThrow(/isn't the sky-city universe's index/)
    expect(parseIndex(null, 'sky-city')).toBeNull()
  })
})

describe('the published flag', () => {
  const record = (dir: string) => JSON.parse(readFileSync(join(dir, 'publication.json'), 'utf8')) as Publication

  it('is written beside the manifest after a push, and the gallery gets its two script tags once', () => {
    const base = temp(), dir = universe(base, 'sky-city', [{ id: 'rider-one-street', outfit: 'street' }, { id: 'rider-one-pilot', outfit: 'pilot' }])
    const manifest = readFileSync(join(dir, 'manifest.json')), picture = readFileSync(join(dir, 'rider-one/street.png'))
    const bucket = fakeRemote()
    const r = push('sky-city', dir, temp(), bucket.remote, T1)
    expect(r.flagged).toEqual(['publication.json', 'publication.js', '../../publication-flag.js', 'review.html'])
    const p = record(dir)
    expect(p).toMatchObject({ schemaVersion: 1, kind: 'universe-art-publication', universe: 'sky-city', destination: 'gs://uma-platform-content/art/universes/sky-city/', checkedAt: T1, publishedAt: T1, revision: 2, counts: { published: 2, changed: 0, unpublished: 0, refused: 0 }, withdrawable: [] })
    expect(p.looks[0]).toMatchObject({ id: 'rider-one-street', image: 'rider-one/street.png', state: 'published', publishedAt: T1, path: bucket.index().looks[0]!.path })
    expect(readFileSync(join(dir, 'publication.js'), 'utf8')).toContain('(window.UMA_PUBLICATIONS = window.UMA_PUBLICATIONS || []).push({ base: document.currentScript ? document.currentScript.src : null, record: {')
    expect(readFileSync(join(base, 'publication-flag.js'), 'utf8')).toBe(FLAG_SCRIPT)
    const page = readFileSync(join(dir, 'review.html'), 'utf8')
    expect(page).toContain('<script src="publication.js"></script><script src="../../publication-flag.js"></script>')
    expect(page.indexOf('publication flags')).toBeLessThan(page.indexOf('</body>'))
    // The approval record and the pictures are never touched.
    expect(readFileSync(join(dir, 'manifest.json')).equals(manifest) && readFileSync(join(dir, 'rider-one/street.png')).equals(picture)).toBe(true)
    // Again: nothing to rewrite.
    expect(push('sky-city', dir, temp(), bucket.remote, T2).flagged).toEqual([])
    expect(record(dir).checkedAt).toBe(T1)
    expect(readFileSync(join(dir, 'review.html'), 'utf8')).toBe(page)
  })

  it('status tells published from not published, changed and refused, and puts the tags back in a regenerated gallery', () => {
    const base = temp(), bucket = fakeRemote()
    let dir = universe(base, 'sky-city', [{ id: 'rider-one-street', outfit: 'street' }, { id: 'rider-one-armor', outfit: 'armor' }, { id: 'rider-one-gone', outfit: 'gone' }])
    push('sky-city', dir, temp(), bucket.remote, T1)
    // The author's next revision: a new look, armor redrawn and approved again, one look dropped, one not approved yet; the
    // gallery page is rebuilt without the tags.
    dir = universe(base, 'sky-city', [
      { id: 'rider-one-street', outfit: 'street' }, { id: 'rider-one-armor', outfit: 'armor', seed: 'redrawn' }, { id: 'rider-one-pilot', outfit: 'pilot' },
      { id: 'rider-one-draft', outfit: 'draft', approval: { status: 'pending', by: 'owner' } },
    ])
    expect(readFileSync(join(dir, 'review.html'), 'utf8')).not.toContain('publication.js')
    const { publication: p, flagged } = status('sky-city', dir, bucket.remote, T2)
    expect(p.looks.map((l) => [l.id, l.state])).toEqual([['rider-one-street', 'published'], ['rider-one-armor', 'changed'], ['rider-one-pilot', 'unpublished'], ['rider-one-draft', 'refused']])
    expect(p.counts).toEqual({ published: 1, changed: 1, unpublished: 1, refused: 1 })
    expect(p.withdrawable).toEqual(['rider-one-gone'])
    expect(flagged).toEqual(['publication.json', 'publication.js', 'review.html'])
    expect(readFileSync(join(dir, 'review.html'), 'utf8')).toContain('<script src="publication.js"></script>')
    // Status publishes nothing.
    expect(bucket.index().looks.map((l) => l.id)).toEqual(['rider-one-street', 'rider-one-armor', 'rider-one-gone'])
    push('sky-city', dir, temp(), bucket.remote, T3)
    expect(record(dir).counts).toEqual({ published: 3, changed: 0, unpublished: 0, refused: 1 })
  })

  it('nothing published yet: every look says so', () => {
    const dir = universe(temp(), 'sky-city', [{ id: 'rider-one-street', outfit: 'street' }])
    const p = publicationOf(readCollection('sky-city', dir), null, T1)
    expect(p).toMatchObject({ publishedAt: null, counts: { published: 0, changed: 0, unpublished: 1, refused: 0 } })
    expect(planPush(readCollection('sky-city', dir), null, T1)).toMatchObject({ same: false, unchanged: 0 })
  })

  it('adds the tags before </body>, replaces its own block, and appends when a page has no body end', () => {
    const tagged = withFlagTags('<html><body><p>x</p></body></html>', '../../publication-flag.js')
    expect(tagged).toMatch(/<p>x<\/p><!-- publication flags[^>]*--><script src="publication\.js"><\/script><script src="\.\.\/\.\.\/publication-flag\.js"><\/script><!-- \/publication flags --><\/body><\/html>$/)
    expect(withFlagTags(tagged, '../../publication-flag.js')).toBe(tagged)
    expect(withFlagTags(tagged, '../flag.js')).toContain('<script src="../flag.js"></script>')
    expect(withFlagTags(tagged, '../flag.js')).not.toContain('../../publication-flag.js')
    expect(withFlagTags('<p>x</p>', 'f.js')).toMatch(/^<p>x<\/p>\n<!-- publication flags/)
  })

  it('the flag script is plain browser code that reads the record and marks each figure', () => {
    expect(() => new Function(FLAG_SCRIPT)).not.toThrow()
    for (const word of ['window.UMA_PUBLICATION', 'Published', 'Not published', 'Changed since published', "querySelectorAll('figure')", "split('?')[0]"]) expect(FLAG_SCRIPT).toContain(word)
  })
})

describe('--only: a push that changes only the named looks', () => {
  // The owner's pajamas swap, with invented riders: an old look retired from the manifest, its replacement approved, and
  // other new looks approved but not asked for.
  const setup = () => {
    const base = temp(), bucket = fakeRemote()
    universe(base, 'sky-city', [{ id: 'rider-one-street', outfit: 'street' }, { id: 'rider-one-pajamas', outfit: 'pajamas' }])
    push('sky-city', approvedDirOf(base), temp(), bucket.remote, T1)
    const dir = universe(base, 'sky-city', [
      { id: 'rider-one-street', outfit: 'street', seed: 'redrawn' }, { id: 'rider-one-pajamas-playful', outfit: 'pajamas-playful' },
      { id: 'rider-one-farm-work', outfit: 'farm-work' },
    ], { revision: 3 })
    return { dir, bucket }
  }
  const approvedDirOf = (base: string) => join(base, 'sky-city', 'approved')

  it('withdraws the retired look and publishes its replacement, leaving every other look as the bucket has it', () => {
    const { dir, bucket } = setup()
    const before = bucket.index().looks.find((l) => l.id === 'rider-one-street')!
    const mirrorDir = temp()
    const r = push('sky-city', dir, mirrorDir, bucket.remote, T2, { only: ['pajamas', 'pajamas-playful'] })
    expect(r).toMatchObject({ uploaded: ['rider-one-pajamas-playful'], withdrawn: ['rider-one-pajamas'], kept: [], indexed: true })
    const index = bucket.index()
    expect(index.looks.map((l) => [l.id, l.publishedAt])).toEqual([['rider-one-street', T1], ['rider-one-pajamas-playful', T2]])
    // Street was redrawn locally but not named: the published street is untouched, and it is flagged as changed.
    expect(index.looks[0]).toEqual(before)
    expect(r.publication.looks.map((l) => [l.id, l.state])).toEqual([['rider-one-street', 'changed'], ['rider-one-pajamas-playful', 'published'], ['rider-one-farm-work', 'unpublished']])
    expect(r.publication.withdrawable).toEqual([])
    // Farm work wasn't named: nothing of it reached the bucket or the mirror.
    expect([...bucket.files.keys()].some((p) => p.includes('farm-work'))).toBe(false)
    expect(existsSync(join(mirrorDir, 'universes/sky-city/images'))).toBe(true)
    expect(readdirSync(join(mirrorDir, 'universes/sky-city/images')).some((p) => p.includes('farm-work'))).toBe(false)
  })

  it('matches by id as well as outfit, keeps a named-only-by-others withdrawal, and refuses a name that matches nothing', () => {
    const { dir, bucket } = setup()
    const r = push('sky-city', dir, temp(), bucket.remote, T2, { only: ['rider-one-pajamas-playful'] })
    expect(r).toMatchObject({ uploaded: ['rider-one-pajamas-playful'], withdrawn: [], kept: ['rider-one-pajamas'] })
    expect(bucket.index().looks.map((l) => l.id)).toEqual(['rider-one-street', 'rider-one-pajamas-playful', 'rider-one-pajamas'])
    expect(r.publication.withdrawable).toEqual(['rider-one-pajamas'])
    expect(() => push('sky-city', dir, temp(), bucket.remote, T3, { only: ['pajama'] })).toThrow(/--only names no approved or published look: pajama/)
  })

  it('a dry run with --only sends nothing', () => {
    const { dir, bucket } = setup()
    const generation = bucket.files.get(INDEX)!.generation
    const r = push('sky-city', dir, temp(), bucket.remote, T2, { only: ['pajamas', 'pajamas-playful'], dryRun: true })
    expect(r).toMatchObject({ uploaded: ['rider-one-pajamas-playful'], withdrawn: ['rider-one-pajamas'] })
    expect(bucket.files.get(INDEX)!.generation).toBe(generation)
  })
})

describe('a failed gcloud call is never read as an empty bucket', () => {
  it('tells a missing file and a lost race from every other failure', () => {
    expect(failureKind('ERROR: (gcloud.storage.objects.describe) gs://b/art%2Fx%2Findex.json not found: 404.')).toBe('missing')
    expect(failureKind('ERROR: One or more URLs matched no objects.')).toBe('missing')
    expect(failureKind('ERROR: HTTPError 412: At least one of the pre-conditions you specified did not hold.')).toBe('precondition')
    for (const stderr of ["'gcloud.cmd' is not recognized as an internal or external command", 'spawn gcloud ENOENT', 'ERROR: (gcloud.storage.cat) There was a problem refreshing your current auth tokens: Reauthentication failed.', 'HTTPError 403: forbidden', ''])
      expect(failureKind(stderr)).toBe('other')
  })
})

describe('gcloud on each platform', () => {
  it('runs directly elsewhere, and through the shell with quoted arguments on Windows', () => {
    expect(gcloudCommand(['storage', 'ls'], 'darwin')).toEqual({ file: 'gcloud', args: ['storage', 'ls'], shell: false })
    expect(gcloudCommand(['storage', 'objects', 'list', 'gs://b/art/**', '--format=json(name,size,md5_hash)'], 'win32')).toEqual({
      file: 'gcloud.cmd', args: ['"storage"', '"objects"', '"list"', '"gs://b/art/**"', '"--format=json(name,size,md5_hash)"'], shell: true,
    })
    expect(() => gcloudCommand(['a"b'], 'win32')).toThrow(/quote/)
  })
})
