import { createHash } from 'node:crypto'
import { cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, relative, sep } from 'node:path'
import { afterAll, describe, expect, it } from 'vitest'
import { gcloudCommand, isDraftPath, mergeReviews, planPush, pull, push, scan, staleFor, type Remote, type Reviews } from './lib.js'

// Invented records only: Umas 9000001–9000003.
const dirs: string[] = []
afterAll(() => { for (const d of dirs) rmSync(d, { recursive: true, force: true }) })
const folder = () => { const dir = mkdtempSync(join(tmpdir(), 'story-scripts-')); dirs.push(dir); return dir }
const put = (dir: string, path: string, value: unknown) => {
  const file = join(dir, path)
  mkdirSync(dirname(file), { recursive: true })
  writeFileSync(file, typeof value === 'string' ? value : `${JSON.stringify(value, null, 2)}\n`)
}
const sha = (text: string | Uint8Array) => createHash('sha256').update(text).digest('hex')
const read = (dir: string, path: string) => readFileSync(join(dir, path), 'utf8')
const NOW = '2026-11-12T12:00:00.000Z'

/** The bucket's side as a map of path to text, with a generation that counts its writes. */
function fakeRemote() {
  const files = new Map<string, { text: string; generation: number }>()
  const calls: string[] = []
  const set = (path: string, text: string) => files.set(path, { text, generation: (files.get(path)?.generation ?? 0) + 1 })
  const walk = (dir: string, at = dir): string[] => readdirSync(at).flatMap((name) => (statSync(join(at, name)).isDirectory() ? walk(dir, join(at, name)) : [relative(dir, join(at, name)).split(sep).join('/')]))
  const remote: Remote = {
    read: (path) => { const f = files.get(path); return f ? { text: f.text, generation: String(f.generation) } : null },
    uploadFolder: (dir) => { for (const path of walk(dir)) { set(path, read(dir, path)); calls.push(`folder:${path}`) } },
    uploadFile: (file, path, ifGeneration) => {
      if (ifGeneration !== undefined && String(files.get(path)?.generation ?? 0) !== ifGeneration) return false
      set(path, readFileSync(file, 'utf8')); calls.push(`file:${path}`)
      return true
    },
    downloadFolder: (dir) => { for (const [path, f] of files) put(dir, path, f.text) },
  }
  return { remote, files, calls, set }
}

describe('which files are drafts', () => {
  it('follows the API’s rule, case for case', () => {
    for (const path of ['world.md', 'cast.json', 'bundles/9000001.json', 'pairs/9000001-9000002.json', 'archive/2026-11-10-racing/bundles/9000001.json', 'docs/chapters/chapter-1.json', 'archive/2026-11-10-racing/reviews.json'])
      expect(isDraftPath(path), path).toBe(true)
    for (const path of [
      'reviews.json', 'checks.json', 'index.json', 'published.json',
      'packs/ss-2026-11-09/pack.json', 'pack/9000001/face.json', 'export/boards.json', 'bundles/images/a.json',
      'packs/ss-2026-11-09/images/a.webp', 'export/boards.zip', 'world.txt',
      '../uma-farm/content/story/cast.json', 'bundles/../../secret.json', '/etc/passwd.json', './world.md', '.hidden.json', 'a/.git/config.json',
      'Bundles/9000001.json', 'bundles/Stand In.json', 'bundles//x.json', '',
    ]) expect(isDraftPath(path), path).toBe(false)
  })

  it('scans a folder without opening packs, and names the text files it can’t send', () => {
    const dir = folder()
    put(dir, 'world.md', '# World\n')
    put(dir, 'bundles/9000001.json', { hero: '9000001' })
    put(dir, 'bundles/Stand In.json', { hero: '9000002' })
    put(dir, 'packs/ss-2026-11-09/pack.json', { characters: [] })
    put(dir, 'packs/ss-2026-11-09/images/a.webp', 'not a picture')
    put(dir, 'reviews.json', { schemaVersion: 1, items: {} })
    put(dir, '.story-sync.json', { schemaVersion: 1, items: {} })
    put(dir, 'export/boards.zip', 'zip')
    const { drafts, refused } = scan(dir)
    expect(drafts).toEqual([
      { path: 'bundles/9000001.json', bytes: 24, sha256: sha(`${JSON.stringify({ hero: '9000001' }, null, 2)}\n`) },
      { path: 'world.md', bytes: 8, sha256: sha('# World\n') },
    ])
    expect(refused).toEqual(['bundles/Stand In.json'])
    expect(scan(join(dir, 'nowhere'))).toEqual({ drafts: [], refused: [] })
  })
})

describe('a push', () => {
  it('sends what changed, keeps what’s gone, and writes the index last', () => {
    const dir = folder(), { remote, files, calls } = fakeRemote()
    put(dir, 'world.md', '# World\n')
    put(dir, 'cast.json', { umas: [{ characterId: '9000001' }] })
    put(dir, 'packs/ss-2026-11-09/pack.json', { characters: [] })
    const first = push('farm', dir, remote, NOW)
    expect(first).toMatchObject({ uploaded: ['cast.json', 'world.md'], unchanged: 0, gone: [], refused: [], report: 'none' })
    expect([...files.keys()].sort()).toEqual(['cast.json', 'index.json', 'world.md'])
    expect(calls.at(-1)).toBe('file:index.json')
    expect(JSON.parse(files.get('index.json')!.text)).toEqual({ schemaVersion: 1, kind: 'story-index', book: 'farm', pushedAt: NOW, files: scan(dir).drafts })
    // The same drafts again: nothing goes but the index.
    calls.length = 0
    expect(push('farm', dir, remote, NOW)).toMatchObject({ uploaded: [], unchanged: 2 })
    expect(calls).toEqual(['file:index.json'])
    // One changed, one removed: the changed one goes, the removed one stays in the bucket and is said.
    put(dir, 'world.md', '# World\n\nA valley.\n')
    rmSync(join(dir, 'cast.json'))
    expect(push('farm', dir, remote, NOW)).toMatchObject({ uploaded: ['world.md'], unchanged: 0, gone: ['cast.json'] })
    expect(files.get('cast.json')).toBeDefined()
    expect(JSON.parse(files.get('index.json')!.text).files.map((f: { path: string }) => f.path)).toEqual(['world.md'])
  })

  it('sends nothing on a dry run, and refuses an empty or missing folder', () => {
    const dir = folder(), { remote, files } = fakeRemote()
    expect(() => push('quest', dir, remote, NOW)).toThrow(/no drafts/)
    expect(() => push('quest', join(dir, 'nowhere'), remote, NOW)).toThrow(/doesn't exist/)
    put(dir, 'bundles/9000001.json', { hero: '9000001' })
    expect(push('quest', dir, remote, NOW, { dryRun: true })).toMatchObject({ uploaded: ['bundles/9000001.json'], reviews: 'not synced (dry run)' })
    expect(files.size).toBe(0)
  })

  it('is refused while the book’s check report is older than its drafts', () => {
    const dir = folder(), { remote, files } = fakeRemote()
    put(dir, 'world.md', '# World\n')
    put(dir, 'cast.json', '{}')
    const report = (world: string) => ({ schemaVersion: 1, book: 'farm', checkedAt: NOW, files: { 'world.md': sha(world), 'cast.json': sha('{}') }, findings: [], layers: {}, counts: {} })
    put(dir, 'checks.json', report('# Older\n'))
    expect(() => push('farm', dir, remote, NOW)).toThrow(/checks\.json is older than 1 draft \(world\.md\)/)
    expect(files.size).toBe(0)
    put(dir, 'checks.json', report('# World\n'))
    expect(push('farm', dir, remote, NOW).report).toBe('sent')
    expect(JSON.parse(files.get('checks.json')!.text).book).toBe('farm')
    // Another book's report is never taken for this one's.
    expect(() => staleFor(JSON.stringify(report('# World\n')), 'quest', [])).toThrow(/isn't the quest book's/)
    expect(planPush('farm', scan(dir).drafts, null, NOW).upload).toEqual(['cast.json', 'world.md'])
  })
})

describe('the verdicts, kept in step', () => {
  const review = (status: string | null, updatedAt: string, note = '') => ({ status, note, updatedAt })
  const of = (items: Reviews['items']): Reviews => ({ schemaVersion: 1, items })

  it('takes the side that changed, a removal included, and the newer of two changes', () => {
    const base = of({ a: review('liked', '01'), b: review('rework', '01'), c: review('question', '01'), d: review('liked', '01') })
    const local = of({ a: review('liked', '01'), b: review('liked', '03'), d: review('rework', '02'), e: review('liked', '02') })
    const remote = of({ b: review('rework', '01'), c: review('question', '01'), d: review('question', '04'), f: review('rework', '02') })
    expect(mergeReviews(base, local, remote).items).toEqual({
      // a: removed on the site, untouched here: gone. c: removed here, untouched there: gone.
      b: review('liked', '03'), // changed here only
      d: review('question', '04'), // changed on both: the newer
      e: review('liked', '02'), f: review('rework', '02'), // new on each side
    })
    // With nothing remembered, both sides' verdicts are kept.
    expect(Object.keys(mergeReviews(of({}), of({ a: review('liked', '01') }), of({ b: review('liked', '01') })).items)).toEqual(['a', 'b'])
  })

  it('pull brings the site’s verdicts down, sends this machine’s up, and a cleared one stays cleared', () => {
    const dir = folder(), { remote, files, set } = fakeRemote()
    set('reviews.json', JSON.stringify(of({ 'world.md': review('rework', '2026-11-12T10:00:00.000Z', 'Too long') })))
    expect(pull('farm', dir, remote).reviews).toBe('1 verdict, new from the site')
    expect(JSON.parse(read(dir, 'reviews.json')).items['world.md'].note).toBe('Too long')
    // A verdict saved on this machine (the local app, or the sandbox) goes up on the next sync.
    put(dir, 'reviews.json', of({ 'world.md': review('rework', '2026-11-12T10:00:00.000Z', 'Too long'), 'cast.json': review('liked', '2026-11-12T11:00:00.000Z') }))
    expect(pull('farm', dir, remote).reviews).toBe('2 verdicts, this machine’s sent')
    expect(Object.keys(JSON.parse(files.get('reviews.json')!.text).items)).toEqual(['cast.json', 'world.md'])
    // The owner clears one on the site: it goes here too, and isn't sent back.
    set('reviews.json', JSON.stringify(of({ 'cast.json': review('liked', '2026-11-12T11:00:00.000Z') })))
    expect(pull('farm', dir, remote).reviews).toBe('1 verdict, new from the site')
    expect(Object.keys(JSON.parse(read(dir, 'reviews.json')).items)).toEqual(['cast.json'])
    expect(Object.keys(JSON.parse(files.get('reviews.json')!.text).items)).toEqual(['cast.json'])
    expect(pull('farm', folder(), fakeRemote().remote).reviews).toBe('no verdicts yet')
  })

  it('stops when the site’s verdicts change mid-sync, sending nothing', () => {
    const dir = folder(), { remote, files, set } = fakeRemote()
    put(dir, 'reviews.json', of({ 'cast.json': review('liked', '2026-11-12T11:00:00.000Z') }))
    const racing: Remote = { ...remote, uploadFile: (file, path, gen) => { if (path === 'reviews.json') set(path, JSON.stringify(of({ 'world.md': review('question', '2026-11-12T11:30:00.000Z') }))); return remote.uploadFile(file, path, gen) } }
    expect(() => pull('farm', dir, racing)).toThrow(/Run it again/)
    expect(Object.keys(JSON.parse(files.get('reviews.json')!.text).items)).toEqual(['world.md'])
    expect(pull('farm', dir, remote).reviews).toBe('2 verdicts, new from the site, this machine’s sent')
  })
})

describe('a pull with the drafts', () => {
  it('rebuilds the drafts in an empty folder, and never writes over a local file that differs', () => {
    const writer = folder(), { remote } = fakeRemote()
    put(writer, 'world.md', '# World\n')
    put(writer, 'umas/9000001.json', { characterId: '9000001' })
    put(writer, 'checks.json', { schemaVersion: 1, book: 'farm', checkedAt: NOW, files: Object.fromEntries(scan(writer).drafts.map((d) => [d.path, d.sha256])), findings: [], layers: {}, counts: {} })
    push('farm', writer, remote, NOW)

    const mac = folder()
    expect(pull('farm', mac, remote, { drafts: true })).toMatchObject({ written: ['umas/9000001.json', 'world.md'], same: 0, conflicts: [] })
    expect(scan(mac).drafts).toEqual(scan(writer).drafts)
    expect(existsSync(join(mac, 'checks.json'))).toBe(true)
    expect(existsSync(join(mac, 'index.json'))).toBe(false)
    expect(pull('farm', mac, remote, { drafts: true })).toMatchObject({ written: [], same: 2 })

    put(mac, 'world.md', '# Edited on the Mac\n')
    expect(pull('farm', mac, remote, { drafts: true })).toMatchObject({ written: [], same: 1, conflicts: ['world.md'] })
    expect(read(mac, 'world.md')).toBe('# Edited on the Mac\n')
    expect(pull('farm', mac, remote, { drafts: true, force: true })).toMatchObject({ written: ['world.md'], conflicts: [] })
    expect(read(mac, 'world.md')).toBe('# World\n')
    expect(() => pull('quest', folder(), fakeRemote().remote, { drafts: true })).toThrow(/Nothing was pushed/)
  })

  it('stops when a file in the bucket doesn’t match the index', () => {
    const writer = folder(), { remote, set } = fakeRemote()
    put(writer, 'world.md', '# World\n')
    push('farm', writer, remote, NOW)
    set('world.md', '# Tampered\n')
    expect(() => pull('farm', folder(), remote, { drafts: true })).toThrow(/doesn't match its index/)
    cpSync(writer, folder(), { recursive: true })
  })
})

describe('starting gcloud', () => {
  it('runs gcloud directly, and gcloud.cmd through the shell on Windows with every argument quoted', () => {
    expect(gcloudCommand(['storage', 'cat', 'gs://b/story/farm/index.json'], 'linux')).toEqual({ file: 'gcloud', args: ['storage', 'cat', 'gs://b/story/farm/index.json'], shell: false })
    expect(gcloudCommand(['storage', 'cp', '--if-generation-match=0', 'C:\\t\\reviews.json', 'gs://b/story/farm/reviews.json'], 'win32'))
      .toEqual({ file: 'gcloud.cmd', args: ['"storage"', '"cp"', '"--if-generation-match=0"', '"C:\\t\\reviews.json"', '"gs://b/story/farm/reviews.json"'], shell: true })
    expect(() => gcloudCommand(['a"b'], 'win32')).toThrow(/quote/)
  })
})
