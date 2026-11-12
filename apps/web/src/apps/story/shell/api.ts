// What Uma Story's pages read (US1, P141): the shapes /api/story answers with, its calls, and the small pure helpers the
// pages share. A book's files are private drafts, read at run time behind the owner guard, never from git.
import { request } from '../../../api/client'

export const BOOKS = ['cast', 'quest', 'farm'] as const
export type Book = typeof BOOKS[number]
export const BOOK_TITLES: Record<Book, string> = { cast: 'Cast', quest: 'Quest', farm: 'Farm' }

export const LAYERS = ['placeholder', 'skeleton', 'outline', 'bible', 'scripted', 'published'] as const
export type Layer = typeof LAYERS[number]
export type Level = 'error' | 'todo' | 'note'
export const VERDICTS = ['liked', 'rework', 'question'] as const
export type Verdict = typeof VERDICTS[number]
export const VERDICT_WORDS: Record<Verdict, string> = { liked: 'Liked', rework: 'Rework', question: 'Question' }

export interface DraftFile { path: string; bytes: number; sha256: string }
export interface DraftText extends DraftFile { text: string }
export interface Finding { level: Level; file: string; where: string; message: string }
export interface Report {
  book: Book
  checkedAt: string
  files: Record<string, string>
  findings: Finding[]
  layers: Record<string, Layer>
  counts: Record<string, Record<string, string[]>>
}
export interface Review { status: Verdict | null; note: string; updatedAt: string }
export interface Reviews { schemaVersion: 1; items: Record<string, Review> }
export interface BookView {
  book: Book
  pushedAt: string | null
  files: DraftFile[]
  report: Report | null
  reportProblem: string | null
  stale: string[]
  reviews: Reviews
  reviewsProblem: string | null
}
export interface BookSummary {
  book: Book
  files: number
  bytes: number
  pushedAt: string | null
  umas: number
  findings: Record<Level, number> | null
  stale: number
  verdicts: Record<Verdict, number>
}
export interface StoryHomeData { cast: number | null; books: BookSummary[] }
export interface CastUma {
  id: string
  characterId: number
  name: string
  sister: { relation: string; age: string; profile: string } | null
  outfitId: number
  tier: string
  batch: number
  order: number
}
export interface CastView {
  boardRevision: number
  profilesRevision: number
  generatedAt: string | null
  umas: CastUma[]
  books: Record<Book, Record<string, Layer | null>>
}

export const loadHome = () => request<StoryHomeData>('/api/story')
export const loadCast = () => request<CastView>('/api/story/cast')
export const loadBook = (book: Book) => request<BookView>(`/api/story/${book}/index`)
export const loadFile = (book: Book, path: string) => request<DraftText>(`/api/story/${book}/file?path=${encodeURIComponent(path)}`)
export const saveVerdict = (book: Book, input: { item: string; status: Verdict | null; note: string }) =>
  request<Reviews>(`/api/story/${book}/reviews`, { method: 'PUT', body: JSON.stringify(input) })

/** What an API error said, in words. */
export function words(error: unknown): string {
  const body = (error as { body?: unknown } | null)?.body
  if (typeof body === 'object' && body !== null && typeof (body as { error?: unknown }).error === 'string') return (body as { error: string }).error
  return error instanceof Error ? error.message : String(error)
}

export interface FileGroup { folder: string; files: DraftFile[] }
/** The drafts grouped by their first folder: the root's files first, then each folder by name, `archive` last. */
export function groupFiles(files: readonly DraftFile[]): FileGroup[] {
  const groups = new Map<string, DraftFile[]>()
  for (const file of files) {
    const folder = file.path.includes('/') ? file.path.slice(0, file.path.indexOf('/')) : ''
    groups.set(folder, [...(groups.get(folder) ?? []), file])
  }
  const rank = (folder: string) => (folder === '' ? 0 : folder === 'archive' ? 2 : 1)
  return [...groups].map(([folder, list]) => ({ folder, files: list.sort((a, b) => a.path.localeCompare(b.path, 'en', { numeric: true })) }))
    .sort((a, b) => rank(a.folder) - rank(b.folder) || a.folder.localeCompare(b.folder))
}

/** A file's name inside its group: the path without the group's folder. */
export const nameIn = (path: string, folder: string) => (folder ? path.slice(folder.length + 1) : path)

/** The verdict on a file itself, and how many of its parts (`path#anchor`) carry one. */
export function verdictsOn(reviews: Reviews, path: string): { own: Review | null; parts: number } {
  const parts = Object.keys(reviews.items).filter((item) => item.startsWith(`${path}#`)).length
  return { own: reviews.items[path] ?? null, parts }
}

export const findingsFor = (report: Report | null, path: string): Finding[] => (report ? report.findings.filter((f) => f.file === path) : [])

export function formatBytes(bytes: number): string {
  if (bytes < 1000) return `${bytes} B`
  if (bytes < 1_000_000) return `${(bytes / 1000).toFixed(bytes < 10_000 ? 1 : 0)} KB`
  return `${(bytes / 1_000_000).toFixed(1)} MB`
}

/** A date and time as the owner reads it, in their own zone; an empty or broken date says nothing. */
export function when(iso: string | null | undefined): string {
  if (!iso) return ''
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

/** How a book's check stands, in one line. */
export function reportLine(view: Pick<BookView, 'report' | 'reportProblem' | 'stale'>): { tone: 'none' | 'good' | 'warn' | 'bad'; text: string } {
  if (view.reportProblem) return { tone: 'bad', text: `The check report can’t be read: ${view.reportProblem}` }
  if (!view.report) return { tone: 'none', text: 'No check report yet' }
  const count = (level: Level) => view.report!.findings.filter((f) => f.level === level).length
  const errors = count('error'), todos = count('todo')
  const parts = [errors ? `${errors} error${errors === 1 ? '' : 's'}` : 'No errors', ...(todos ? [`${todos} to write`] : [])]
  if (view.stale.length) return { tone: 'warn', text: `${parts.join(' · ')} · older than ${view.stale.length} draft${view.stale.length === 1 ? '' : 's'}` }
  return { tone: errors ? 'bad' : 'good', text: parts.join(' · ') }
}

/** Which of two books an Uma is in: the cast's own filter. */
export type CastFilter = 'all' | 'quest' | 'farm' | 'neither'
export function inFilter(cast: Pick<CastView, 'books'>, id: string, filter: CastFilter): boolean {
  const quest = id in cast.books.quest, farm = id in cast.books.farm
  return filter === 'all' || (filter === 'quest' && quest) || (filter === 'farm' && farm) || (filter === 'neither' && !quest && !farm)
}

/** The cast in batches, in the Ranker's order. */
export function batches(umas: readonly CastUma[]): { batch: number; tier: string; umas: CastUma[] }[] {
  const out = new Map<number, { batch: number; tier: string; umas: CastUma[] }>()
  for (const uma of umas) {
    const group = out.get(uma.batch) ?? { batch: uma.batch, tier: uma.tier, umas: [] }
    group.umas.push(uma)
    out.set(uma.batch, group)
  }
  return [...out.values()].sort((a, b) => a.batch - b.batch).map((g) => ({ ...g, umas: g.umas.sort((a, b) => a.order - b.order) }))
}
