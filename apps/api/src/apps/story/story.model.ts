// Uma Story's model (US1, P141; AP53–AP59, AP63): the three books, which files are drafts, the pushed index, a book's
// check report, the owner's verdicts, and the cast as the Ranker ranks it. Pure: no Node imports, no game's rules. A
// game's own format and validator stay in its repo; what reaches this app is its files and the report its check wrote.

export const BOOKS = ['cast', 'quest', 'farm'] as const
export type Book = typeof BOOKS[number]
export const isBook = (value: string): value is Book => (BOOKS as readonly string[]).includes(value)
export const BOOK_TITLES: Record<Book, string> = { cast: 'Cast', quest: 'Quest', farm: 'Farm' }

/** Files the app owns at a book's root; never drafts. A book's `cast.json`, when it has one, is a draft the shell also reads. */
export const INDEX = 'index.json', REVIEWS = 'reviews.json', CHECKS = 'checks.json', PUBLISHED = 'published.json', CAST = 'cast.json'
const RESERVED = new Set([INDEX, REVIEWS, CHECKS, PUBLISHED])
/** Folders that hold pictures, downloads and exports: never pushed, never served. */
const SKIPPED = new Set(['packs', 'pack', 'export', 'images', 'node_modules'])

/** A draft the app lists and serves: text only (`.json`, `.md`), a lowercase path, never a pack, an export or an app-owned file. */
export function isDraftPath(path: string): boolean {
  if (!/^[a-z0-9][a-z0-9._/-]{0,199}\.(json|md)$/.test(path)) return false
  const parts = path.split('/')
  if (parts.some((p) => p === '' || p.startsWith('.'))) return false
  if (parts.slice(0, -1).some((p) => SKIPPED.has(p))) return false
  return !(parts.length === 1 && RESERVED.has(path))
}

export class StoryInvalid extends Error {}

const object = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)
const text = (v: unknown): v is string => typeof v === 'string'
const SHA = /^[a-f0-9]{64}$/

// --- the index `pnpm story:push` writes

export interface DraftFile { path: string; bytes: number; sha256: string }
export interface BookIndex { schemaVersion: 1; kind: 'story-index'; book: Book; pushedAt: string | null; files: DraftFile[] }

export function parseIndex(value: unknown, book: Book): BookIndex {
  if (!object(value) || value.schemaVersion !== 1 || value.kind !== 'story-index' || value.book !== book || !Array.isArray(value.files))
    throw new StoryInvalid(`${INDEX} isn't the ${book} book's index`)
  const files = value.files.map((f): DraftFile => {
    if (!object(f) || !text(f.path) || !isDraftPath(f.path) || !Number.isSafeInteger(f.bytes) || !text(f.sha256) || !SHA.test(f.sha256))
      throw new StoryInvalid(`${INDEX} lists a file that isn't a draft`)
    return { path: f.path, bytes: f.bytes as number, sha256: f.sha256 }
  })
  if (new Set(files.map((f) => f.path)).size !== files.length) throw new StoryInvalid(`${INDEX} lists a file twice`)
  return { schemaVersion: 1, kind: 'story-index', book, pushedAt: text(value.pushedAt) ? value.pushedAt : null, files: files.sort((a, b) => a.path.localeCompare(b.path)) }
}

// --- a book's check report (AP57): written by the book's own check, in its own repo

export const LEVELS = ['error', 'todo', 'note'] as const
export type Level = typeof LEVELS[number]
/** One set of layer words for every book (AP59); `outline` is uma-quest's, between skeleton and bible. */
export const LAYERS = ['placeholder', 'skeleton', 'outline', 'bible', 'scripted', 'published'] as const
export type Layer = typeof LAYERS[number]
export interface Finding { level: Level; file: string; where: string; message: string }
export interface Report {
  schemaVersion: 1
  book: Book
  checkedAt: string
  /** Every file the check read, with the hash it had. */
  files: Record<string, string>
  findings: Finding[]
  /** Each item's layer: an Uma's id, or an id the book gives one of its own items. */
  layers: Record<string, Layer>
  /** The book's counts: a group, its labels, and the ids behind each. */
  counts: Record<string, Record<string, string[]>>
}

const ITEM = /^[A-Za-z0-9._:/#-]{1,160}$/

export function parseReport(value: unknown, book: Book): Report {
  const bad = (what: string): never => { throw new StoryInvalid(`${CHECKS}: ${what}`) }
  if (!object(value) || value.schemaVersion !== 1) return bad('not a report (schemaVersion 1)')
  if (value.book !== book) return bad(`written for another book (${String(value.book)})`)
  if (!text(value.checkedAt) || Number.isNaN(Date.parse(value.checkedAt))) return bad('checkedAt is a date')
  if (!object(value.files)) return bad('files is a map of path to sha256')
  const files: Record<string, string> = {}
  for (const [path, sha] of Object.entries(value.files)) {
    if (!isDraftPath(path) || !text(sha) || !SHA.test(sha)) return bad(`files has an entry that isn't a draft and its sha256 (${path})`)
    files[path] = sha
  }
  if (!Array.isArray(value.findings)) return bad('findings is a list')
  const findings = value.findings.map((f): Finding => {
    if (!object(f) || !(LEVELS as readonly unknown[]).includes(f.level) || !text(f.file) || !text(f.where) || !text(f.message)) return bad('a finding has a level, a file, a where and a message')
    return { level: f.level as Level, file: f.file, where: f.where, message: f.message }
  })
  if (!object(value.layers)) return bad('layers is a map of item to layer')
  const layers: Record<string, Layer> = {}
  for (const [item, layer] of Object.entries(value.layers)) {
    if (!ITEM.test(item) || !(LAYERS as readonly unknown[]).includes(layer)) return bad(`layers has an unknown layer (${item})`)
    layers[item] = layer as Layer
  }
  if (!object(value.counts)) return bad('counts is a map of group to labels')
  const counts: Record<string, Record<string, string[]>> = {}
  for (const [group, labels] of Object.entries(value.counts)) {
    if (!object(labels)) return bad(`counts.${group} is a map of label to ids`)
    counts[group] = {}
    for (const [label, ids] of Object.entries(labels)) {
      if (!Array.isArray(ids) || !ids.every(text)) return bad(`counts.${group}.${label} is a list of ids`)
      counts[group][label] = ids as string[]
    }
  }
  return { schemaVersion: 1, book, checkedAt: value.checkedAt, files, findings, layers, counts }
}

/** The drafts a report no longer describes: changed since, or never read. Any at all makes the report stale. */
export function staleFiles(report: Report, files: readonly DraftFile[]): string[] {
  return files.filter((f) => report.files[f.path] !== f.sha256).map((f) => f.path)
}

// --- the owner's verdicts (AP58), in the shape both Story Sandboxes already write

export const VERDICTS = ['liked', 'rework', 'question'] as const
export type Verdict = typeof VERDICTS[number]
export interface Review { status: Verdict | null; note: string; updatedAt: string }
export interface Reviews { schemaVersion: 1; items: Record<string, Review> }
export const emptyReviews = (): Reviews => ({ schemaVersion: 1, items: {} })
export const NOTE_LIMIT = 4000

export function parseReviews(value: unknown): Reviews {
  if (!object(value) || value.schemaVersion !== 1 || !object(value.items)) throw new StoryInvalid(`${REVIEWS} isn't a verdicts file`)
  const items: Record<string, Review> = {}
  for (const [item, r] of Object.entries(value.items)) {
    if (!ITEM.test(item) || !object(r) || !(r.status === null || (VERDICTS as readonly unknown[]).includes(r.status)) || !text(r.note))
      throw new StoryInvalid(`${REVIEWS} has a verdict that can't be read (${item})`)
    items[item] = { status: r.status as Verdict | null, note: r.note, updatedAt: text(r.updatedAt) ? r.updatedAt : '' }
  }
  return { schemaVersion: 1, items }
}

export interface VerdictInput { item: string; status: Verdict | null; note: string }
/** A new verdict's item: a draft's path, `path#anchor`, or an id; never a path that climbs. Older files are read as they are. */
const NEW_ITEM = /^[A-Za-z0-9][A-Za-z0-9._:/#-]{0,159}$/
export function parseVerdict(value: unknown): VerdictInput {
  if (!object(value) || !text(value.item) || !NEW_ITEM.test(value.item) || value.item.includes('..') || value.item.includes('//')) throw new StoryInvalid('A verdict names its item')
  if (!(value.status === null || (VERDICTS as readonly unknown[]).includes(value.status))) throw new StoryInvalid(`A verdict is ${VERDICTS.join(', ')} or none`)
  if (!text(value.note) || value.note.length > NOTE_LIMIT) throw new StoryInvalid(`A note is text of at most ${NOTE_LIMIT} characters`)
  return { item: value.item, status: value.status as Verdict | null, note: value.note }
}

/** The verdicts with one item set; no verdict and no note removes it. Items stay sorted, so the file diffs cleanly. */
export function withVerdict(reviews: Reviews, input: VerdictInput, now: string): Reviews {
  const items = { ...reviews.items }
  if (input.status === null && !input.note.trim()) delete items[input.item]
  else items[input.item] = { status: input.status, note: input.note, updatedAt: now }
  return { schemaVersion: 1, items: Object.fromEntries(Object.entries(items).sort(([a], [b]) => a.localeCompare(b))) }
}

// --- the cast, as the Ranker ranks it (AP63)

export interface CastUma {
  /** Her character id, or `s<outfitId>` for a sister: the id both games key her by. */
  id: string
  characterId: number
  name: string
  sister: { relation: string; age: string; profile: string } | null
  /** The outfit her pictures come from: her default on the Ranker. */
  outfitId: number
  tier: string
  batch: number
  /** Her place in the whole ranking, from 1. */
  order: number
}
export interface Cast { boardRevision: number; profilesRevision: number; generatedAt: string | null; umas: CastUma[] }

/** The Umas in the Ranker's ten batches, in ranking order, from its plan (`ranker/plan.json`) and its profiles. */
export function castFromPlan(plan: unknown, profiles: unknown): Cast {
  if (!object(plan) || plan.kind !== 'tier-plan' || !Array.isArray(plan.identities)) throw new StoryInvalid("The Ranker's plan can't be read")
  const profileOf = new Map<string, string>()
  if (object(profiles) && Array.isArray(profiles.sisters))
    for (const s of profiles.sisters) if (object(s) && Number.isSafeInteger(s.outfitId) && text(s.profile)) profileOf.set(`s${String(s.outfitId)}`, s.profile)
  const umas: CastUma[] = []
  for (const i of plan.identities) {
    if (!object(i) || !text(i.id) || !text(i.name) || !text(i.tier) || i.notUsed === true) continue
    if (!Number.isSafeInteger(i.batch) || (i.batch as number) < 1 || !Number.isSafeInteger(i.characterId) || !Number.isSafeInteger(i.defaultOutfit) || !Number.isSafeInteger(i.order)) continue
    const sister = object(i.sister) ? { relation: text(i.sister.relation) ? i.sister.relation : '', age: text(i.sister.age) ? i.sister.age : '', profile: profileOf.get(i.id) ?? '' } : null
    umas.push({ id: i.id, characterId: i.characterId as number, name: i.name, sister, outfitId: i.defaultOutfit as number, tier: i.tier, batch: i.batch as number, order: i.order as number })
  }
  const board = Array.isArray(plan.boards) ? plan.boards.find((b) => object(b) && b.id === 'umas') : undefined
  return {
    boardRevision: object(board) && Number.isSafeInteger(board.revision) ? (board.revision as number) : 0,
    profilesRevision: Number.isSafeInteger(plan.profilesRevision) ? (plan.profilesRevision as number) : 0,
    generatedAt: text(plan.generatedAt) ? plan.generatedAt : null,
    umas: umas.sort((a, b) => a.order - b.order),
  }
}

const UMA_ID = /^s?[0-9]{1,9}$/

/**
 * The Umas a book holds, each with her layer when the book's report gives one. Three plain signs, none a game's rule:
 * the report's layers, the book's own `cast.json` (`umas: [{ characterId | id }]`), and a draft named by her id. Archived
 * drafts (`archive/…`) don't count.
 */
export function heldUmas(files: readonly DraftFile[], report: Report | null, castFile: unknown): Record<string, Layer | null> {
  const held: Record<string, Layer | null> = {}
  for (const f of files) {
    if (f.path.startsWith('archive/')) continue
    const name = f.path.slice(f.path.lastIndexOf('/') + 1).replace(/\.(json|md)$/, '')
    if (UMA_ID.test(name)) held[name] = null
  }
  if (object(castFile) && Array.isArray(castFile.umas))
    for (const u of castFile.umas) {
      const id = object(u) ? String(u.characterId ?? u.id ?? '') : ''
      if (UMA_ID.test(id)) held[id] = null
    }
  if (report) for (const [item, layer] of Object.entries(report.layers)) if (UMA_ID.test(item)) held[item] = layer
  return held
}
