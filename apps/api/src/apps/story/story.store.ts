// Uma Story's store (US1, AP55–AP58, AP61): each book's review copy. In production a book is `story/<book>/` in the
// app's bucket, filled by `pnpm story:push`; run locally it is the writer's own drafts folder, read in place. The app
// reads drafts, the book's check report and the Ranker's plan, and writes one file: the owner's verdicts.
import { createHash } from 'node:crypto'
import { ABSENT, type BlobStore } from '../../store/blob-store'
import {
  BOOKS, CAST, CHECKS, INDEX, REVIEWS, StoryInvalid, castFromPlan, emptyReviews, heldUmas, isDraftPath, parseIndex, parseReport, parseReviews,
  parseVerdict, staleFiles, withVerdict, type Book, type Cast, type DraftFile, type Layer, type Level, type Report, type Reviews, type Verdict,
} from './story.model'

export class StoryMissing extends Error {}
export class StoryConflict extends Error {}

/** Where the Ranker's files are read from: files, never its code (AP1). */
export interface RankerFiles { read(path: string): Promise<Uint8Array | null> }

export interface BookView {
  book: Book
  /** When the drafts were last pushed; null when they're read in place, or nothing was pushed. */
  pushedAt: string | null
  files: DraftFile[]
  report: Report | null
  /** Why the report couldn't be read, when it couldn't. */
  reportProblem: string | null
  /** Drafts the report doesn't describe any more. */
  stale: string[]
  reviews: Reviews
  reviewsProblem: string | null
}
export interface DraftText extends DraftFile { text: string }
export interface BookSummary {
  book: Book
  files: number
  bytes: number
  pushedAt: string | null
  /** The Umas the book holds. */
  umas: number
  findings: Record<Level, number> | null
  stale: number
  verdicts: Record<Verdict, number>
}
export interface CastView extends Cast { books: Record<Book, Record<string, Layer | null>> }

const encoder = new TextEncoder(), decoder = new TextDecoder('utf-8', { fatal: false })
const sha256 = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex')
const parse = (bytes: Uint8Array): unknown => JSON.parse(decoder.decode(bytes)) as unknown
const message = (error: unknown) => (error instanceof Error ? error.message : String(error))
const SAVE_TRIES = 4

export class StoryStore {
  constructor(private readonly books: Record<Book, BlobStore>, private readonly ranker: RankerFiles, private readonly now: () => Date = () => new Date()) {}

  /** A book's drafts: the pushed index when there is one, else every draft in the folder, hashed here. */
  private async drafts(book: Book): Promise<{ pushedAt: string | null; files: DraftFile[] }> {
    const blobs = this.books[book], pushed = await blobs.read(INDEX)
    if (pushed) { const index = parseIndex(parse(pushed.bytes), book); return { pushedAt: index.pushedAt, files: index.files } }
    const files: DraftFile[] = []
    for (const path of (await blobs.list('')).filter(isDraftPath)) {
      const blob = await blobs.read(path)
      if (blob) files.push({ path, bytes: blob.bytes.byteLength, sha256: sha256(blob.bytes) })
    }
    return { pushedAt: null, files }
  }

  async view(book: Book): Promise<BookView> {
    const blobs = this.books[book]
    const [{ pushedAt, files }, checks, stored] = await Promise.all([this.drafts(book), blobs.read(CHECKS), blobs.read(REVIEWS)])
    let report: Report | null = null, reportProblem: string | null = null
    if (checks) try { report = parseReport(parse(checks.bytes), book) } catch (error) { reportProblem = message(error) }
    let reviews = emptyReviews(), reviewsProblem: string | null = null
    if (stored) try { reviews = parseReviews(parse(stored.bytes)) } catch (error) { reviewsProblem = message(error) }
    return { book, pushedAt, files, report, reportProblem, stale: report ? staleFiles(report, files) : [], reviews, reviewsProblem }
  }

  /** One draft's text. Only a draft's path is ever read. */
  async file(book: Book, path: string): Promise<DraftText> {
    if (!isDraftPath(path)) throw new StoryInvalid('Not a draft of this book')
    const blob = await this.books[book].read(path)
    if (!blob) throw new StoryMissing(`No ${path} in the ${book} book`)
    return { path, bytes: blob.bytes.byteLength, sha256: sha256(blob.bytes), text: decoder.decode(blob.bytes) }
  }

  /** Sets one item's verdict. Read, change, write over the generation read; another save in between is merged, not lost. */
  async saveVerdict(book: Book, value: unknown): Promise<Reviews> {
    const input = parseVerdict(value), blobs = this.books[book]
    for (let attempt = 0; attempt < SAVE_TRIES; attempt++) {
      const stored = await blobs.read(REVIEWS)
      // An unreadable file is never overwritten: it stops the save, and says so.
      const next = withVerdict(stored ? parseReviews(parse(stored.bytes)) : emptyReviews(), input, this.now().toISOString())
      if (await blobs.write(REVIEWS, encoder.encode(`${JSON.stringify(next, null, 2)}\n`), stored?.generation ?? ABSENT) !== null) return next
    }
    throw new StoryConflict('The verdicts kept changing while this one was saved. Try again.')
  }

  private async held(book: Book, view: BookView): Promise<Record<string, Layer | null>> {
    const listed = view.files.some((f) => f.path === CAST) ? await this.books[book].read(CAST) : null
    let castFile: unknown = null
    if (listed) try { castFile = parse(listed.bytes) } catch { castFile = null }
    return heldUmas(view.files, view.report, castFile)
  }

  /** The Ranker's cast, and which of its Umas each book holds. */
  async cast(): Promise<CastView> {
    const [plan, profiles] = await Promise.all([this.ranker.read('plan.json'), this.ranker.read('profiles.json')])
    if (!plan) throw new StoryMissing("The Ranker's plan isn't there yet")
    const cast = castFromPlan(parse(plan), profiles ? parse(profiles) : null)
    const books = Object.fromEntries(await Promise.all(BOOKS.map(async (book) => [book, await this.held(book, await this.view(book))] as const))) as CastView['books']
    return { ...cast, books }
  }

  async summaries(): Promise<BookSummary[]> {
    return Promise.all(BOOKS.map(async (book): Promise<BookSummary> => {
      const view = await this.view(book)
      const count = <T extends string>(keys: readonly T[], of: readonly T[]) => Object.fromEntries(keys.map((k) => [k, of.filter((v) => v === k).length])) as Record<T, number>
      return {
        book, files: view.files.length, bytes: view.files.reduce((n, f) => n + f.bytes, 0), pushedAt: view.pushedAt,
        umas: Object.keys(await this.held(book, view)).length,
        findings: view.report ? count(['error', 'todo', 'note'] as const, view.report.findings.map((f) => f.level)) : null,
        stale: view.stale.length,
        verdicts: count(['liked', 'rework', 'question'] as const, Object.values(view.reviews.items).flatMap((r) => (r.status ? [r.status] : []))),
      }
    }))
  }

  /** How many Umas the Ranker's ten batches hold; null when its plan can't be read. */
  async castSize(): Promise<number | null> {
    try {
      const plan = await this.ranker.read('plan.json')
      return plan ? castFromPlan(parse(plan), null).umas.length : null
    } catch { return null }
  }
}
