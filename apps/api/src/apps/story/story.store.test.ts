import { createHash } from 'node:crypto'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { afterAll, describe, expect, it } from 'vitest'
import { DirectoryBlobStore, type BlobStore } from '../../store/blob-store'
import { castFromPlan, heldUmas, isDraftPath, parseIndex, parseReport, parseReviews, staleFiles, StoryInvalid, withVerdict, type Book, type DraftFile } from './story.model'
import { StoryConflict, StoryMissing, StoryStore, type RankerFiles } from './story.store'

// Invented records only: Umas 9000001–9000003 and a sister, s900000102.
const dirs: string[] = []
afterAll(async () => { for (const d of dirs) await rm(d, { recursive: true, force: true }) })
const folder = async () => { const dir = await mkdtemp(join(tmpdir(), 'story-')); dirs.push(dir); return dir }
const put = async (dir: string, path: string, value: unknown) => {
  const file = join(dir, path)
  await mkdir(dirname(file), { recursive: true })
  await writeFile(file, typeof value === 'string' ? value : `${JSON.stringify(value, null, 2)}\n`)
}
const sha = (text: string) => createHash('sha256').update(text).digest('hex')
const at = new Date('2026-11-12T12:00:00.000Z')

const plan = {
  schemaVersion: 2, kind: 'tier-plan', generatedAt: '2026-11-12T00:00:00.000Z', profilesRevision: 6,
  boards: [{ id: 'umas', revision: 337 }, { id: 'npcs', revision: 4 }],
  identities: [
    { id: 's900000102', characterId: 9000001, name: 'Stand-in sister', sister: { relation: 'younger sister', age: 'an invented age' }, defaultOutfit: 900000102, tier: 'T2', batch: 2, notUsed: false, order: 11 },
    { id: '9000001', characterId: 9000001, name: 'Stand-in 1', sister: null, defaultOutfit: 900000101, tier: 'T1', batch: 1, notUsed: false, order: 1 },
    { id: '9000002', characterId: 9000002, name: 'Stand-in 2', sister: null, defaultOutfit: 900000201, tier: 'T1', batch: 1, notUsed: false, order: 2 },
    { id: '9000003', characterId: 9000003, name: 'Stand-in 3', sister: null, defaultOutfit: 900000301, tier: 'F', batch: null, notUsed: true, order: 101 },
    { id: '9000004', characterId: 9000004, name: 'Stand-in 4', sister: null, defaultOutfit: 900000401, tier: null, batch: null, notUsed: false, order: null },
  ],
}
const profiles = { schemaVersion: 1, kind: 'uma-profiles', revision: 6, sisters: [{ outfitId: 900000102, characterId: 9000001, name: 'Stand-in sister', relation: 'younger sister', age: 'an invented age', profile: 'Invented.' }] }
const rankerOf = (files: Record<string, unknown>): RankerFiles => ({ read: async (p) => (p in files ? new TextEncoder().encode(JSON.stringify(files[p])) : null) })

async function fresh(ranker: RankerFiles = rankerOf({ 'plan.json': plan, 'profiles.json': profiles })) {
  const dirsOf = { cast: await folder(), quest: await folder(), farm: await folder() } satisfies Record<Book, string>
  const books = { cast: new DirectoryBlobStore(dirsOf.cast), quest: new DirectoryBlobStore(dirsOf.quest), farm: new DirectoryBlobStore(dirsOf.farm) } satisfies Record<Book, BlobStore>
  return { dirs: dirsOf, books, store: new StoryStore(books, ranker, () => at) }
}

describe('which files are drafts', () => {
  it('takes text files on lowercase paths, and nothing else', () => {
    for (const path of ['world.md', 'cast.json', 'bundles/9000001.json', 'pairs/9000001-9000002.json', 'archive/2026-11-10-racing/bundles/9000001.json', 'docs/chapters/chapter-1.json'])
      expect(isDraftPath(path), path).toBe(true)
    for (const path of [
      'reviews.json', 'checks.json', 'index.json', 'published.json', // the app's own files
      'packs/ss-2026-11-09/pack.json', 'pack/9000001/face.json', 'export/boards.json', 'bundles/images/a.json', // packs and exports
      'packs/ss-2026-11-09/images/a.webp', 'export/boards.zip', 'world.txt', // not text drafts
      '../uma-farm/content/story/cast.json', 'bundles/../../secret.json', '/etc/passwd.json', './world.md', '.hidden.json', 'a/.git/config.json', // outside or hidden
      'Bundles/9000001.json', 'bundles/Stand In.json', 'bundles//x.json', '', // not a store path
    ]) expect(isDraftPath(path), path).toBe(false)
    // A nested file may reuse an app-owned name; only the root's are the app's.
    expect(isDraftPath('archive/2026-11-10-racing/reviews.json')).toBe(true)
  })
})

describe('a book read in place', () => {
  it('lists the drafts with their hashes, and skips packs, pictures and the app’s own files', async () => {
    const { dirs: d, store } = await fresh()
    await put(d.quest, 'world.json', { towns: 26 })
    await put(d.quest, 'bundles/9000001.json', { hero: '9000001' })
    await put(d.quest, 'packs/ss-2026-11-09/pack.json', { characters: [] })
    await put(d.quest, 'packs/ss-2026-11-09/images/a.webp', 'not a picture')
    await put(d.quest, 'reviews.json', { schemaVersion: 1, items: { '9000001': { status: 'liked', note: '', updatedAt: '2026-11-11T00:00:00.000Z' } } })
    const view = await store.view('quest')
    expect(view.files.map((f) => f.path)).toEqual(['bundles/9000001.json', 'world.json'])
    expect(view.files[1]).toEqual({ path: 'world.json', bytes: 18, sha256: sha(`${JSON.stringify({ towns: 26 }, null, 2)}\n`) })
    expect(view.pushedAt).toBeNull()
    expect(view.report).toBeNull()
    // The sandbox's verdicts file is read as it is.
    expect(view.reviews.items['9000001']).toMatchObject({ status: 'liked' })
    expect((await store.view('farm')).files).toEqual([])
  })

  it('uses the pushed index when there is one', async () => {
    const { dirs: d, store } = await fresh()
    await put(d.farm, 'world.md', '# World\n')
    await put(d.farm, 'cast.json', { umas: [] })
    await put(d.farm, 'index.json', { schemaVersion: 1, kind: 'story-index', book: 'farm', pushedAt: '2026-11-12T10:00:00.000Z', files: [{ path: 'world.md', bytes: 8, sha256: sha('# World\n') }] })
    const view = await store.view('farm')
    expect(view.pushedAt).toBe('2026-11-12T10:00:00.000Z')
    expect(view.files.map((f) => f.path)).toEqual(['world.md'])
    expect(() => parseIndex({ schemaVersion: 1, kind: 'story-index', book: 'quest', files: [] }, 'farm')).toThrow(StoryInvalid)
    expect(() => parseIndex({ schemaVersion: 1, kind: 'story-index', book: 'farm', files: [{ path: 'packs/a/pack.json', bytes: 1, sha256: sha('a') }] }, 'farm')).toThrow(/isn't a draft/)
  })

  it('serves a draft’s text and refuses everything else', async () => {
    const { dirs: d, store } = await fresh()
    await put(d.farm, 'world.md', '# World\n\nA valley.\n')
    await put(d.farm, 'reviews.json', { schemaVersion: 1, items: {} })
    await put(d.farm, 'pack/9000001/profile.json', { private: true })
    expect(await store.file('farm', 'world.md')).toEqual({ path: 'world.md', bytes: 19, sha256: sha('# World\n\nA valley.\n'), text: '# World\n\nA valley.\n' })
    for (const path of ['reviews.json', 'pack/9000001/profile.json', '../farm/world.md', 'world.md/../../x.json', 'World.md', ''])
      await expect(store.file('farm', path), path).rejects.toThrow(StoryInvalid)
    await expect(store.file('farm', 'umas/9000001.json')).rejects.toThrow(StoryMissing)
    // Another book's draft isn't this book's.
    await expect(store.file('quest', 'world.md')).rejects.toThrow(StoryMissing)
  })
})

describe('a book’s check report', () => {
  const file = (path: string, text: string): DraftFile => ({ path, bytes: text.length, sha256: sha(text) })
  const report = (over: Record<string, unknown> = {}) => ({
    schemaVersion: 1, book: 'farm', checkedAt: '2026-11-12T09:00:00.000Z', files: { 'cast.json': sha('a'), 'world.md': sha('b') },
    findings: [{ level: 'todo', file: 'cast.json', where: 'umas[2]', message: 'Her bible is to write' }, { level: 'error', file: 'world.md', where: '', message: 'Invented problem' }],
    layers: { '9000001': 'bible', '9000002': 'skeleton', '9000001:f3': 'scripted' }, counts: { calling: { farming: ['9000001'], fishing: ['9000002'] } }, ...over,
  })

  it('is parsed strictly, and says which drafts it no longer describes', () => {
    const parsed = parseReport(report(), 'farm')
    expect(parsed.findings).toHaveLength(2)
    expect(parsed.layers['9000001']).toBe('bible')
    expect(parsed.counts.calling?.farming).toEqual(['9000001'])
    expect(staleFiles(parsed, [file('cast.json', 'a'), file('world.md', 'b')])).toEqual([])
    expect(staleFiles(parsed, [file('cast.json', 'a'), file('world.md', 'changed'), file('ties.json', 'new')])).toEqual(['world.md', 'ties.json'])
    for (const bad of [report({ book: 'quest' }), report({ schemaVersion: 2 }), report({ checkedAt: 'yesterday' }), report({ layers: { '9000001': 'finished' } }),
      report({ files: { 'packs/a/pack.json': sha('a') } }), report({ findings: [{ level: 'fatal', file: 'a', where: '', message: '' }] }), report({ counts: { calling: { farming: [1] } } })])
      expect(() => parseReport(bad, 'farm')).toThrow(StoryInvalid)
  })

  it('shows on the book, with its stale drafts; a report that can’t be read is said, not thrown', async () => {
    const { dirs: d, store } = await fresh()
    await put(d.farm, 'cast.json', 'a')
    await put(d.farm, 'world.md', 'changed')
    await put(d.farm, 'checks.json', report())
    const view = await store.view('farm')
    expect(view.report?.findings.map((f) => f.level)).toEqual(['todo', 'error'])
    expect(view.stale).toEqual(['world.md'])
    await put(d.farm, 'checks.json', report({ book: 'quest' }))
    const broken = await store.view('farm')
    expect(broken.report).toBeNull()
    expect(broken.reportProblem).toMatch(/another book/)
  })
})

describe('the owner’s verdicts', () => {
  it('sets one item at a time, keeps the others, sorts them, and removes an empty one', async () => {
    const { dirs: d, store } = await fresh()
    await store.saveVerdict('farm', { item: 'world.md', status: 'liked', note: '' })
    await store.saveVerdict('farm', { item: 'cast.json#9000001', status: 'rework', note: 'Her arrival is too early.' })
    const saved = await store.saveVerdict('farm', { item: 'cast.json', status: null, note: 'A question for later' })
    expect(Object.keys(saved.items)).toEqual(['cast.json', 'cast.json#9000001', 'world.md'])
    expect(saved.items['cast.json#9000001']).toEqual({ status: 'rework', note: 'Her arrival is too early.', updatedAt: at.toISOString() })
    const cleared = await store.saveVerdict('farm', { item: 'world.md', status: null, note: '  ' })
    expect(Object.keys(cleared.items)).toEqual(['cast.json', 'cast.json#9000001'])
    // The file on disk is the sandbox's shape, so both tools read it.
    expect(parseReviews(JSON.parse(await readFile(join(d.farm, 'reviews.json'), 'utf8')))).toEqual(cleared)
    expect((await store.view('farm')).reviews).toEqual(cleared)
  })

  it('refuses a malformed verdict, and never overwrites a verdicts file it can’t read', async () => {
    const { dirs: d, store } = await fresh()
    for (const bad of [null, {}, { item: 'world.md', status: 'loved', note: '' }, { item: '../x', status: 'liked', note: '' }, { item: 'world.md', status: 'liked' }, { item: 'world.md', status: 'liked', note: 'x'.repeat(4001) }])
      await expect(store.saveVerdict('farm', bad)).rejects.toThrow(StoryInvalid)
    await put(d.quest, 'reviews.json', '{ not json')
    await expect(store.saveVerdict('quest', { item: '9000001', status: 'liked', note: '' })).rejects.toThrow()
    expect(await readFile(join(d.quest, 'reviews.json'), 'utf8')).toBe('{ not json')
    expect((await store.view('quest')).reviewsProblem).not.toBeNull()
  })

  it('merges with a save that landed in between, and gives up after a few lost races', async () => {
    const { books, store: plain } = await fresh()
    await plain.saveVerdict('quest', { item: '9000001', status: 'liked', note: '' })
    // Another device's save lands between this save's read and its write, once.
    let interrupt = true
    const racing: BlobStore = {
      list: (p) => books.quest.list(p),
      read: async (p) => {
        const blob = await books.quest.read(p)
        if (p === 'reviews.json' && interrupt) {
          interrupt = false
          const now = parseReviews(JSON.parse(new TextDecoder().decode(blob!.bytes)))
          await books.quest.write(p, new TextEncoder().encode(JSON.stringify(withVerdict(now, { item: '9000002', status: 'question', note: 'From the phone' }, at.toISOString()))), blob!.generation)
        }
        return blob
      },
      write: (p, b, g) => books.quest.write(p, b, g),
    }
    const store = new StoryStore({ ...books, quest: racing }, rankerOf({}), () => at)
    const saved = await store.saveVerdict('quest', { item: '9000003', status: 'rework', note: '' })
    expect(Object.keys(saved.items)).toEqual(['9000001', '9000002', '9000003'])
    const never: BlobStore = { ...racing, read: (p) => books.quest.read(p), write: async () => null }
    await expect(new StoryStore({ ...books, quest: never }, rankerOf({}), () => at).saveVerdict('quest', { item: '9000001', status: 'liked', note: '' })).rejects.toThrow(StoryConflict)
  })
})

describe('the cast', () => {
  it('is the Ranker’s ten batches in ranking order, sisters under their own names', () => {
    const cast = castFromPlan(plan, profiles)
    expect(cast).toMatchObject({ boardRevision: 337, profilesRevision: 6, generatedAt: '2026-11-12T00:00:00.000Z' })
    // Not used (F) and unranked Umas are in no batch.
    expect(cast.umas.map((u) => u.id)).toEqual(['9000001', '9000002', 's900000102'])
    expect(cast.umas[2]).toEqual({ id: 's900000102', characterId: 9000001, name: 'Stand-in sister', sister: { relation: 'younger sister', age: 'an invented age', profile: 'Invented.' }, outfitId: 900000102, tier: 'T2', batch: 2, order: 11 })
    expect(() => castFromPlan({ kind: 'tier-board' }, null)).toThrow(StoryInvalid)
  })

  it('knows which Umas a book holds: its report, its cast file, a draft named by her id', () => {
    const files: DraftFile[] = ['bundles/9000001.json', 'bundles/s900000102.json', 'archive/2026-11-10-racing/bundles/9000003.json', 'world.json', 'pairs/9000001-9000002.json']
      .map((path) => ({ path, bytes: 1, sha256: sha(path) }))
    expect(heldUmas(files, null, null)).toEqual({ '9000001': null, s900000102: null })
    expect(heldUmas([], null, { umas: [{ characterId: '9000001' }, { characterId: 9000002 }, { id: 's900000102' }, { name: 'no id' }] })).toEqual({ '9000001': null, '9000002': null, s900000102: null })
    const report = parseReport({ schemaVersion: 1, book: 'quest', checkedAt: '2026-11-12T09:00:00.000Z', files: {}, findings: [], layers: { '9000001': 'bible', '9000002': 'placeholder', '9000001:chapter-2': 'scripted' }, counts: {} }, 'quest')
    expect(heldUmas(files, report, null)).toEqual({ '9000001': 'bible', '9000002': 'placeholder', s900000102: null })
  })

  it('is served with each book’s Umas, and the home’s numbers', async () => {
    const { dirs: d, store } = await fresh()
    await put(d.quest, 'bundles/9000001.json', { hero: '9000001' })
    await put(d.farm, 'cast.json', { version: 1, umas: [{ characterId: '9000001' }, { characterId: '9000002' }] })
    await store.saveVerdict('farm', { item: 'cast.json', status: 'liked', note: '' })
    const cast = await store.cast()
    expect(cast.umas).toHaveLength(3)
    expect(cast.books).toEqual({ cast: {}, quest: { '9000001': null }, farm: { '9000001': null, '9000002': null } })
    const [, quest, farm] = await store.summaries()
    expect(quest).toMatchObject({ book: 'quest', files: 1, umas: 1, findings: null, stale: 0 })
    expect(farm).toMatchObject({ book: 'farm', files: 1, umas: 2, verdicts: { liked: 1, rework: 0, question: 0 } })
    expect(await store.castSize()).toBe(3)
    const empty = (await fresh(rankerOf({}))).store
    expect(await empty.castSize()).toBeNull()
    await expect(empty.cast()).rejects.toThrow(StoryMissing)
  })
})
