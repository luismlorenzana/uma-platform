import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, relative, sep } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { enemiesDir, enemyStatus, enemyUniverses, planEnemyPush, pushEnemies, readEnemies, type EnemyIndex, type EnemyPublication } from './enemies.js'
import { FLAG_SCRIPT } from './flag.js'
import { INDEX, type Remote, type RemoteFile } from './lib.js'

// Invented enemies, factions and pictures only (EA1): a PNG signature and header in front of filler, never a real image.
const png = (width: number, height: number, seed: string): Buffer => {
  const head = Buffer.alloc(24)
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(head, 0)
  head.writeUInt32BE(13, 8); head.write('IHDR', 12, 'latin1'); head.writeUInt32BE(width, 16); head.writeUInt32BE(height, 20)
  return Buffer.concat([head, Buffer.from(`invented pixels ${seed}`)])
}
const sha = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex')
const md5 = (bytes: Uint8Array) => createHash('md5').update(bytes).digest('base64')
const folders: string[] = []
const temp = () => { const dir = mkdtempSync(join(tmpdir(), 'enemy-test-')); folders.push(dir); return dir }
afterEach(() => { for (const dir of folders.splice(0)) rmSync(dir, { recursive: true, force: true }) })

interface Foe { id: string; character: string; faction: string; look?: string; seed?: string; approval?: unknown }
const APPROVED = { status: 'approved', by: 'owner', date: '2026-01-02', scope: 'invented' }
/** An invented universe's enemy collection: its manifest, PNGs, album words and album page. */
function collection(base: string, universe: string, foes: Foe[], album: Record<string, unknown> = {}): string {
  const dir = enemiesDir(universe, base)
  const assets = foes.map((f) => {
    const image = `${f.faction}/${f.id}/look.png`, bytes = png(32, 48, f.seed ?? f.id)
    mkdirSync(dirname(join(dir, image)), { recursive: true })
    writeFileSync(join(dir, image), bytes)
    return { id: f.id, character: f.character, faction: f.faction, unitId: `unit-${f.id}`, look: f.look ?? 'station', image, sha256: sha(bytes), width: 32, height: 48, approval: f.approval ?? APPROVED }
  })
  writeFileSync(join(dir, 'manifest.json'), JSON.stringify({ assets }))
  writeFileSync(join(dir, 'album.json'), JSON.stringify({ factions: { 'blue-guild': 'The Blue Guild', 'red-guild': 'The Red Guild' }, looks: { station: 'Station uniform' }, ...album }))
  writeFileSync(join(dir, 'review.html'), `<!doctype html><html><head><title>t</title></head><body><header><h1>t</h1></header>${assets.map((a) => `<figure><img src="${a.image}"><figcaption><span class="badge">Approved</span></figcaption></figure>`).join('')}</body></html>`)
  return dir
}
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
  return { remote, files, index: (): EnemyIndex => JSON.parse(files.get(INDEX)!.bytes.toString('utf8')) as EnemyIndex }
}
const T1 = '2026-01-03T10:00:00.000Z', T2 = '2026-01-04T10:00:00.000Z'
const FOES: Foe[] = [
  { id: 'red-one-station', character: 'Red One', faction: 'red-guild' },
  { id: 'blue-one-station', character: 'Blue One', faction: 'blue-guild' },
  { id: 'blue-two-station', character: 'Blue Two', faction: 'blue-guild', approval: { status: 'candidate' } },
]

describe('an approved enemy collection (EA1)', () => {
  it('reads the owner-approved looks with their faction and the album’s words, and refuses the rest', () => {
    const base = temp(), dir = collection(base, 'neon-city', FOES)
    const c = readEnemies('neon-city', dir)
    expect(c).toMatchObject({ game: 'neon-city', title: 'Uma Neon City', factions: [{ id: 'blue-guild', title: 'The Blue Guild' }, { id: 'red-guild', title: 'The Red Guild' }] })
    expect(c.looks.map((l) => [l.id, l.character, l.faction, l.unitId, l.title, l.approvedOn])).toEqual([
      ['red-one-station', 'Red One', 'red-guild', 'unit-red-one-station', 'Station uniform', '2026-01-02'],
      ['blue-one-station', 'Blue One', 'blue-guild', 'unit-blue-one-station', 'Station uniform', '2026-01-02'],
    ])
    expect(c.refused).toEqual([expect.objectContaining({ id: 'blue-two-station', kind: 'unapproved' })])
    expect(enemyUniverses(base)).toEqual(['neon-city'])
    // The album's words may name the game; a changed picture is refused, never published.
    expect(readEnemies('neon-city', collection(temp(), 'neon-city', FOES, { game: 'Uma Invented' })).title).toBe('Uma Invented')
    writeFileSync(join(dir, 'red-guild/red-one-station/look.png'), png(32, 48, 'another'))
    expect(readEnemies('neon-city', dir).refused.map((r) => [r.id, r.why])).toEqual([['red-one-station', 'the PNG changed since it was approved'], ['blue-two-station', 'the owner hasn’t approved it']])
  })
})

/** An invented casual collection beside an enemy collection (EA3): its manifest, PNGs, words and album page. */
function casual(enemyDir: string, foes: Foe[]): string {
  const dir = join(enemyDir, '..', 'casual', 'approved')
  const assets = foes.map((f) => {
    const image = `${f.faction}/${f.id}/suit.png`, bytes = png(32, 48, f.seed ?? f.id)
    mkdirSync(dirname(join(dir, image)), { recursive: true })
    writeFileSync(join(dir, image), bytes)
    return { id: f.id, character: f.character, faction: f.faction, unitId: null, look: f.look ?? 'suit', image, sha256: sha(bytes), width: 32, height: 48, approval: f.approval ?? APPROVED }
  })
  writeFileSync(join(dir, 'manifest.json'), JSON.stringify({ assets }))
  writeFileSync(join(dir, 'album.json'), JSON.stringify({ factions: { 'green-guild': 'The Green Guild' }, looks: { suit: 'Pilot suit' } }))
  writeFileSync(join(dir, 'review.html'), `<!doctype html><html><head><title>t</title></head><body>${assets.map((a) => `<figure><img src="${a.image}"></figure>`).join('')}</body></html>`)
  return dir
}

describe('pnpm art:push <universe> --enemies (EA1)', () => {
  it('sends each approved look under its hash name, then the index, its factions in the album’s order, and flags them', () => {
    const base = temp(), dir = collection(base, 'neon-city', FOES), mirror = join(base, '..', `mirror-${Date.now()}`), bucket = fakeRemote()
    folders.push(mirror)
    const dry = pushEnemies('neon-city', dir, mirror, bucket.remote, T1, { dryRun: true })
    expect([dry.uploaded, bucket.files.size, existsSync(join(dir, 'publication.json'))]).toEqual([['red-one-station', 'blue-one-station'], 0, false])
    const r = pushEnemies('neon-city', dir, mirror, bucket.remote, T1)
    expect(r.uploaded).toEqual(['red-one-station', 'blue-one-station'])
    const index = bucket.index()
    expect(index).toMatchObject({ kind: 'enemy-art', game: 'neon-city', title: 'Uma Neon City', publishedAt: T1, factions: [{ id: 'blue-guild', title: 'The Blue Guild' }, { id: 'red-guild', title: 'The Red Guild' }] })
    const red = readFileSync(join(dir, 'red-guild/red-one-station/look.png'))
    expect(index.looks[0]).toEqual({
      id: 'red-one-station', character: 'Red One', faction: 'red-guild', unitId: 'unit-red-one-station', look: 'station', title: 'Station uniform',
      path: `images/red-one-station.${sha(red).slice(0, 16)}.png`, bytes: red.byteLength, sha256: sha(red), width: 32, height: 48, approvedOn: '2026-01-02', publishedAt: T1,
    })
    expect(bucket.files.get(index.looks[0]!.path)!.bytes.equals(red)).toBe(true)
    expect(existsSync(join(mirror, 'neon-city', index.looks[0]!.path))).toBe(true)
    // The flags: the record names Uma Enemy Art, and the album loads it with the shared flag script.
    const record = JSON.parse(readFileSync(join(dir, 'publication.json'), 'utf8')) as EnemyPublication
    expect(record).toMatchObject({ kind: 'enemy-art-publication', app: 'Uma Enemy Art', destination: 'gs://uma-platform-content/enemy-art/neon-city/', noun: 'enemy looks', counts: { published: 2, unpublished: 0, refused: 1 } })
    expect(readFileSync(join(dir, 'review.html'), 'utf8')).toContain('<script src="publication.js"></script><script src="../../../publication-flag.js"></script>')
    expect(readFileSync(join(base, 'publication-flag.js'), 'utf8')).toBe(FLAG_SCRIPT)
    // Again: nothing to send, the index and its date stay.
    const generation = bucket.files.get(INDEX)!.generation
    const again = pushEnemies('neon-city', dir, mirror, bucket.remote, T2)
    expect([again.uploaded, again.unchanged, again.indexed, bucket.files.get(INDEX)!.generation, bucket.index().publishedAt]).toEqual([[], 2, false, generation, T1])
  })

  it('changes only the looks --only names, by id, faction or enemy name, and withdraws a look no longer approved', () => {
    const base = temp(), dir = collection(base, 'neon-city', FOES), bucket = fakeRemote(), mirror = temp()
    pushEnemies('neon-city', dir, mirror, bucket.remote, T1, { only: ['red-guild'] })
    expect(bucket.index().looks.map((l) => l.id)).toEqual(['red-one-station'])
    expect(bucket.index().factions.map((f) => f.id)).toEqual(['red-guild'])
    pushEnemies('neon-city', dir, mirror, bucket.remote, T2, { only: ['blue-one'] })
    expect(bucket.index().looks.map((l) => [l.id, l.publishedAt])).toEqual([['red-one-station', T1], ['blue-one-station', T2]])
    expect(() => pushEnemies('neon-city', dir, mirror, bucket.remote, T2, { only: ['nobody'] })).toThrow(/names no approved or published enemy look: nobody/)
    // The owner takes an approval back: the look leaves the index, its file stays.
    const manifest = JSON.parse(readFileSync(join(dir, 'manifest.json'), 'utf8')) as { assets: { id: string; approval: unknown }[] }
    manifest.assets[0]!.approval = { status: 'revise' }
    writeFileSync(join(dir, 'manifest.json'), JSON.stringify(manifest))
    const r = pushEnemies('neon-city', dir, mirror, bucket.remote, T2)
    expect(r.withdrawn).toEqual(['red-one-station'])
    expect(bucket.index().looks.map((l) => l.id)).toEqual(['blue-one-station'])
    expect([...bucket.files.keys()].filter((p) => p.startsWith('images/red-one-station.'))).toHaveLength(1)
  })

  it('never writes the index when a picture didn’t reach the bucket intact, and status flags without publishing', () => {
    const base = temp(), dir = collection(base, 'neon-city', FOES), bucket = fakeRemote()
    const broken: Remote = { ...bucket.remote, uploadFolder: () => undefined }
    expect(() => pushEnemies('neon-city', dir, temp(), broken, T1)).toThrow(/isn't in the bucket after the upload/)
    expect(bucket.files.has(INDEX)).toBe(false)
    const s = enemyStatus('neon-city', dir, bucket.remote, T1)
    expect(s.publication.counts).toEqual({ published: 0, changed: 0, unpublished: 2, refused: 1 })
    expect(bucket.files.size).toBe(0)
  })

  it('sends the casual collection in the same push, each of its looks marked casual, with its own flags (EA3)', () => {
    const base = temp(), dir = collection(base, 'neon-city', FOES.slice(0, 2)), bucket = fakeRemote()
    // The casual album holds two looks of its own, an enemy-album look itself (same picture: shared, P191), and one with
    // an enemy-album id but another picture (refused).
    const c = casual(dir, [{ id: 'red-one-suit', character: 'Red One', faction: 'red-guild' }, { id: 'green-one-suit', character: 'Green One', faction: 'green-guild' },
      { id: 'red-one-station', character: 'Red One', faction: 'red-guild' }, { id: 'blue-one-station', character: 'Blue One', faction: 'blue-guild', seed: 'another picture' }])
    const read = readEnemies('neon-city', dir)
    expect(read.looks.map((l) => [l.id, l.kind, l.title, l.shared ?? false])).toEqual([
      ['red-one-station', 'combat', 'Station uniform', true], ['blue-one-station', 'combat', 'Station uniform', false], ['red-one-suit', 'casual', 'Pilot suit', false],
      ['green-one-suit', 'casual', 'Pilot suit', false], ['red-one-station', 'casual', 'Pilot suit', true],
    ])
    expect(read.refused).toEqual([expect.objectContaining({ id: 'blue-one-station', kind: 'damaged', why: 'its id is listed twice with another picture', collection: 'casual' })])
    // A faction only the casual album names joins in its order.
    expect(read.factions.map((f) => f.id)).toEqual(['blue-guild', 'red-guild', 'green-guild'])
    pushEnemies('neon-city', dir, temp(), bucket.remote, T1)
    const index = bucket.index()
    // The shared look is listed once, as the base of both.
    expect(index.looks.map((l) => [l.id, l.kind ?? 'combat'])).toEqual([['red-one-station', 'base'], ['blue-one-station', 'combat'], ['red-one-suit', 'casual'], ['green-one-suit', 'casual']])
    expect(bucket.files.get(index.looks[2]!.path)!.bytes.equals(readFileSync(join(c, 'red-guild/red-one-suit/suit.png')))).toBe(true)
    const mine = JSON.parse(readFileSync(join(dir, 'publication.json'), 'utf8')) as EnemyPublication, theirs = JSON.parse(readFileSync(join(c, 'publication.json'), 'utf8')) as EnemyPublication
    expect([mine.looks.map((l) => [l.id, l.state]), mine.noun]).toEqual([[['red-one-station', 'published'], ['blue-one-station', 'published']], 'enemy looks'])
    expect([theirs.looks.map((l) => [l.id, l.state, l.image]), theirs.noun, theirs.counts.refused]).toEqual([[
      ['red-one-suit', 'published', 'red-guild/red-one-suit/suit.png'], ['green-one-suit', 'published', 'green-guild/green-one-suit/suit.png'],
      ['red-one-station', 'published', 'red-guild/red-one-station/suit.png'], ['blue-one-station', 'refused', 'blue-guild/blue-one-station/suit.png'],
    ], 'casual looks', 1])
    expect(readFileSync(join(c, 'review.html'), 'utf8')).toContain('<script src="publication.js"></script><script src="../../../../publication-flag.js"></script>')
  })

  it('plans a kept look’s faction with its old title when the album no longer names it', () => {
    const base = temp(), dir = collection(base, 'neon-city', FOES.slice(0, 2))
    const c = readEnemies('neon-city', dir)
    const remote: EnemyIndex = {
      schemaVersion: 1, kind: 'enemy-art', game: 'neon-city', title: 'Uma Neon City', publishedAt: T1, factions: [{ id: 'green-guild', title: 'The Green Guild' }],
      looks: [{ id: 'green-one-station', character: 'Green One', faction: 'green-guild', unitId: null, look: 'station', title: 'Station uniform', path: `images/green-one-station.${'ab'.repeat(8)}.png`, bytes: 9, sha256: 'ab'.repeat(32), width: 32, height: 48, approvedOn: null, publishedAt: T1 }],
    }
    const plan = planEnemyPush(c, remote, T2, (l) => l.faction !== 'green-guild')
    expect(plan.index.looks.map((l) => l.id)).toEqual(['red-one-station', 'blue-one-station', 'green-one-station'])
    expect(plan.index.factions).toEqual([{ id: 'blue-guild', title: 'The Blue Guild' }, { id: 'red-guild', title: 'The Red Guild' }, { id: 'green-guild', title: 'The Green Guild' }])
  })
})
