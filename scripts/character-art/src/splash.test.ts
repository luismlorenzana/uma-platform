// A universe's splash art (P175): `<universe>/splash-art/manifest.json`, approved scene illustrations of a character,
// published with the looks as their own kind. Invented riders and pictures only.
import { createHash } from 'node:crypto'
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, relative, sep } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { FLAG_SCRIPT } from './flag.js'
import { INDEX, keyOf, push, readCollection, type Publication, type Remote, type RemoteFile, type UniverseIndex } from './lib.js'

const png = (width: number, height: number, seed: string): Buffer => {
  const head = Buffer.alloc(24)
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(head, 0)
  head.writeUInt32BE(13, 8); head.write('IHDR', 12, 'latin1'); head.writeUInt32BE(width, 16); head.writeUInt32BE(height, 20)
  return Buffer.concat([head, Buffer.from(`invented pixels ${seed}`)])
}
const sha = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex')
const md5 = (bytes: Uint8Array) => createHash('md5').update(bytes).digest('base64')
const folders: string[] = []
const temp = () => { const dir = mkdtempSync(join(tmpdir(), 'splash-test-')); folders.push(dir); return dir }
afterEach(() => { for (const dir of folders.splice(0)) rmSync(dir, { recursive: true, force: true }) })
const put = (file: string, bytes: Buffer | string) => { mkdirSync(join(file, '..'), { recursive: true }); writeFileSync(file, bytes) }
const APPROVED = { status: 'approved', by: 'owner', on: '2026-01-02' }

/** A universe with one approved look and a splash art folder of two scenes, listed out of order. */
function universe(options: { outside?: boolean; pending?: boolean } = {}) {
  const base = temp(), u = join(base, 'sky-city'), approved = join(u, 'approved'), splash = join(u, 'splash-art')
  const look = png(60, 90, 'street')
  put(join(approved, 'rider-one/street.png'), look)
  put(join(approved, 'manifest.json'), JSON.stringify({ assets: [{ id: 'rider-one-street', character: 'Rider One', outfit: 'street', image: 'rider-one/street.png', width: 60, height: 90, sha256: sha(look), approval: APPROVED }] }))
  put(join(approved, 'review.html'), `<html><body><header></header><figure><img src="rider-one/street.png"></figure><figure><img src="../splash-art/images/meeting.png"></figure></body></html>`)
  const meeting = png(160, 90, 'meeting'), beach = png(160, 90, 'beach')
  put(join(splash, 'images/meeting.png'), meeting); put(join(splash, 'images/beach.png'), beach)
  if (options.outside) put(join(u, 'loose.png'), beach)
  put(join(splash, 'manifest.json'), JSON.stringify({ character: 'Rider One', assets: [
    { id: 'beach', order: 2, title: 'A Day at the Beach', outfit: 'swimsuit', image: options.outside ? '../loose.png' : 'images/beach.png', width: 160, height: 90, sha256: sha(beach), approval: options.pending ? { status: 'pending' } : APPROVED },
    { id: 'meeting', order: 1, title: 'Greeting', outfit: 'street', image: 'images/meeting.png', width: 160, height: 90, sha256: sha(meeting), approval: APPROVED },
  ] }))
  put(join(splash, 'review.html'), '<html><body><figure><img src="images/meeting.png"></figure></body></html>')
  return { u, approved, splash }
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

describe('the splash art', () => {
  it('joins the universe’s collection as its own kind, in its order, ids prefixed by the character', () => {
    const c = readCollection('sky-city', universe().approved)
    expect(c.looks.map((l) => [l.id, l.kind ?? 'look', l.title, l.image, l.collection ?? null])).toEqual([
      ['rider-one-street', 'look', 'Street', 'rider-one/street.png', null],
      ['rider-one-splash-meeting', 'splash', 'Greeting', '../splash-art/images/meeting.png', 'splash-art'],
      ['rider-one-splash-beach', 'splash', 'A Day at the Beach', '../splash-art/images/beach.png', 'splash-art'],
    ])
    expect(c.looks[1]).toMatchObject({ character: 'Rider One', width: 160, height: 90, approvedOn: '2026-01-02' })
    expect(keyOf('Kitasan Black')).toBe('kitasan-black')
  })

  it('refuses a scene outside its folder, and leaves an unapproved one out', () => {
    expect(readCollection('sky-city', universe({ outside: true }).approved).refused).toEqual([expect.objectContaining({ id: 'rider-one-splash-beach', kind: 'damaged', why: 'its image isn’t a PNG inside the splash art folder' })])
    expect(readCollection('sky-city', universe({ pending: true }).approved).refused).toEqual([expect.objectContaining({ id: 'rider-one-splash-beach', kind: 'unapproved' })])
  })

  it('publishes the scenes with the looks, marked as splash in the index, with their own record and tags', () => {
    const { approved, splash } = universe(), bucket = fakeRemote()
    const r = push('sky-city', approved, temp(), bucket.remote, '2026-01-03T10:00:00.000Z')
    expect(r.uploaded).toEqual(['rider-one-street', 'rider-one-splash-meeting', 'rider-one-splash-beach'])
    const index = JSON.parse(bucket.files.get(INDEX)!.bytes.toString('utf8')) as UniverseIndex
    expect(index.looks.map((l) => [l.id, l.kind ?? null])).toEqual([['rider-one-street', null], ['rider-one-splash-meeting', 'splash'], ['rider-one-splash-beach', 'splash']])
    expect(index.looks[1]!.path).toMatch(/^images\/rider-one-splash-meeting\.[a-f0-9]{16}\.png$/)
    // The approved folder's record keeps the looks; the splash record its scenes, named from its own folder.
    const looks = JSON.parse(readFileSync(join(approved, 'publication.json'), 'utf8')) as Publication
    expect(looks.looks.map((l) => l.id)).toEqual(['rider-one-street'])
    const scenes = JSON.parse(readFileSync(join(splash, 'publication.json'), 'utf8')) as Publication
    expect(scenes).toMatchObject({ noun: 'splash images', counts: { published: 2, changed: 0, unpublished: 0, refused: 0 }, withdrawable: [] })
    expect(scenes.looks.map((l) => [l.image, l.kind])).toEqual([['images/meeting.png', 'splash'], ['images/beach.png', 'splash']])
    expect(readFileSync(join(approved, 'review.html'), 'utf8')).toContain('<script src="publication.js"></script><script src="../splash-art/publication.js"></script><script src="../../publication-flag.js"></script>')
    expect(readFileSync(join(splash, 'review.html'), 'utf8')).toContain('<script src="publication.js"></script><script src="../../publication-flag.js"></script>')
    expect(readFileSync(join(splash, 'publication.js'), 'utf8')).toContain('(window.UMA_PUBLICATIONS = window.UMA_PUBLICATIONS || []).push({ base: document.currentScript')
  })

  it('the flag script draws a line for each record and still reads an older page’s single record', () => {
    for (const word of ['window.UMA_PUBLICATIONS', 'window.UMA_PUBLICATION', 'record.noun', 'new URL(path, base)']) expect(FLAG_SCRIPT).toContain(word)
  })
})
