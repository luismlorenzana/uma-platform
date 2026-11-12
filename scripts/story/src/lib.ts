// Shared by Uma Story's scripts (US1, AP55–AP58, AP68): which files of a writer's folder are drafts, what a push
// uploads, how the owner's verdicts are kept in step, and the scoped gcloud. The rules for a draft's path are the API's
// (apps/api/src/apps/story/story.model.ts), repeated here because a script can't import the app; both are tested on the
// same cases.
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

export const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
export const BUCKET = process.env.CONTENT_BUCKET ?? 'uma-platform-content'

export const BOOKS = ['cast', 'quest', 'farm'] as const
export type Book = typeof BOOKS[number]
export const isBook = (value: string | undefined): value is Book => (BOOKS as readonly unknown[]).includes(value)

/** Where each book's drafts are on this machine, unless `--from`, `--to` or the book's variable says otherwise. */
const FOLDERS: Record<Book, { env: string; fallback: string }> = {
  cast: { env: 'STORY_CAST_DIR', fallback: 'content/authoring/story/cast' },
  quest: { env: 'STORY_QUEST_DIR', fallback: '../uma-quest/content/stories' },
  farm: { env: 'STORY_FARM_DIR', fallback: '../uma-farm/content/story' },
}
export const folderOf = (book: Book, given?: string): string => resolve(root, given ?? process.env[FOLDERS[book].env] ?? FOLDERS[book].fallback)

export const INDEX = 'index.json', REVIEWS = 'reviews.json', CHECKS = 'checks.json', PUBLISHED = 'published.json'
/** What the last pull brought down, kept beside the drafts so the next sync knows which side changed. Hidden: never a draft. */
export const SYNCED = '.story-sync.json'
const RESERVED = new Set([INDEX, REVIEWS, CHECKS, PUBLISHED])
const SKIPPED = new Set(['packs', 'pack', 'export', 'images', 'node_modules'])

/** A draft: text only (`.json`, `.md`), a lowercase path, never a pack, an export or one of the app's own files. */
export function isDraftPath(path: string): boolean {
  if (!/^[a-z0-9][a-z0-9._/-]{0,199}\.(json|md)$/.test(path)) return false
  const parts = path.split('/')
  if (parts.some((p) => p === '' || p.startsWith('.'))) return false
  if (parts.slice(0, -1).some((p) => SKIPPED.has(p))) return false
  return !(parts.length === 1 && RESERVED.has(path))
}

export interface DraftFile { path: string; bytes: number; sha256: string }
export interface BookIndex { schemaVersion: 1; kind: 'story-index'; book: Book; pushedAt: string | null; files: DraftFile[] }

const sha256 = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex')

/** Every draft under a folder, and the text files that can't be one (a name the store refuses). Packs are never opened. */
export function scan(dir: string): { drafts: DraftFile[]; refused: string[] } {
  const drafts: DraftFile[] = [], refused: string[] = []
  const walk = (folder: string, prefix: string) => {
    for (const entry of readdirSync(folder, { withFileTypes: true })) {
      const path = prefix ? `${prefix}/${entry.name}` : entry.name
      if (entry.isDirectory()) { if (!SKIPPED.has(entry.name) && !entry.name.startsWith('.')) walk(join(folder, entry.name), path) }
      else if (isDraftPath(path)) { const bytes = readFileSync(join(folder, entry.name)); drafts.push({ path, bytes: bytes.byteLength, sha256: sha256(bytes) }) }
      else if (/\.(json|md)$/i.test(entry.name) && !entry.name.startsWith('.') && !(prefix === '' && RESERVED.has(entry.name))) refused.push(path)
    }
  }
  if (existsSync(dir)) walk(dir, '')
  return { drafts: drafts.sort((a, b) => a.path.localeCompare(b.path)), refused: refused.sort() }
}

const object = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)

export function parseIndex(text: string | null, book: Book): BookIndex | null {
  if (text === null) return null
  const value = JSON.parse(text) as unknown
  if (!object(value) || value.kind !== 'story-index' || value.book !== book || !Array.isArray(value.files)) throw new Error(`The bucket's ${INDEX} isn't the ${book} book's index.`)
  return value as unknown as BookIndex
}

/** The drafts a report doesn't describe: changed since the check ran, or never read by it. */
export function staleFor(reportText: string, book: Book, drafts: readonly DraftFile[]): string[] {
  const report = JSON.parse(reportText) as unknown
  if (!object(report) || report.schemaVersion !== 1 || report.book !== book || !object(report.files)) throw new Error(`${CHECKS} isn't the ${book} book's check report.`)
  const files = report.files
  return drafts.filter((d) => files[d.path] !== d.sha256).map((d) => d.path)
}

export interface PushPlan { upload: string[]; unchanged: number; gone: string[]; index: BookIndex }
/** What a push sends: the drafts that are new or changed. A draft gone from the folder stays in the bucket, and is said. */
export function planPush(book: Book, drafts: readonly DraftFile[], remote: BookIndex | null, now: string): PushPlan {
  const before = new Map((remote?.files ?? []).map((f) => [f.path, f.sha256]))
  const upload = drafts.filter((d) => before.get(d.path) !== d.sha256).map((d) => d.path)
  const here = new Set(drafts.map((d) => d.path))
  return {
    upload, unchanged: drafts.length - upload.length, gone: [...before.keys()].filter((p) => !here.has(p)).sort(),
    index: { schemaVersion: 1, kind: 'story-index', book, pushedAt: now, files: [...drafts] },
  }
}

// --- the owner's verdicts, in step on both sides

export interface Review { status: string | null; note: string; updatedAt: string }
export interface Reviews { schemaVersion: 1; items: Record<string, Review> }
const noReviews = (): Reviews => ({ schemaVersion: 1, items: {} })
export function parseReviews(text: string | null): Reviews {
  if (text === null) return noReviews()
  const value = JSON.parse(text) as unknown
  if (!object(value) || !object(value.items)) throw new Error(`${REVIEWS} isn't a verdicts file.`)
  return { schemaVersion: 1, items: value.items as Record<string, Review> }
}
const same = (a: Review | undefined, b: Review | undefined) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null)
/** The same verdicts whatever order the file lists them in. */
const sameReviews = (a: Reviews, b: Reviews) => {
  const ids = Object.keys(a.items)
  return ids.length === Object.keys(b.items).length && ids.every((id) => same(a.items[id], b.items[id]))
}

/**
 * Three-way: `base` is what the last sync left on both sides. An item only one side changed takes that side's value,
 * a removal included; changed on both, the newer `updatedAt` wins, the site's on a tie.
 */
export function mergeReviews(base: Reviews, local: Reviews, remote: Reviews): Reviews {
  const items: Record<string, Review> = {}
  for (const id of [...new Set([...Object.keys(base.items), ...Object.keys(local.items), ...Object.keys(remote.items)])].sort()) {
    const b = base.items[id], l = local.items[id], r = remote.items[id]
    const pick = same(l, b) ? r : same(r, b) ? l : !l ? r : !r ? l : (l.updatedAt ?? '') > (r.updatedAt ?? '') ? l : r
    if (pick) items[id] = pick
  }
  return { schemaVersion: 1, items }
}
const write = (file: string, value: unknown) => { mkdirSync(dirname(file), { recursive: true }); writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`) }

/** The bucket's side of a book: read a text file, upload, download. The real one is gcloud; tests use a map. */
export interface Remote {
  /** A file's text and generation, or null when it isn't there. */
  read(path: string): { text: string; generation: string } | null
  /** Uploads every file of a folder under the book, adding and replacing; never deletes. */
  uploadFolder(dir: string): void
  /** Uploads one file; with `ifGeneration`, only over that generation ('0': not there yet). False on a lost race. */
  uploadFile(file: string, path: string, ifGeneration?: string): boolean
  /** Downloads the book's files into a folder. */
  downloadFolder(dir: string): void
}

/** Brings both sides' verdicts in step, and remembers the result. Says what moved. */
export function syncReviews(dir: string, remote: Remote): string {
  const there = remote.read(REVIEWS)
  const localFile = join(dir, REVIEWS), syncedFile = join(dir, SYNCED)
  const local = parseReviews(existsSync(localFile) ? readFileSync(localFile, 'utf8') : null)
  const base = parseReviews(existsSync(syncedFile) ? readFileSync(syncedFile, 'utf8') : null)
  const theirs = parseReviews(there?.text ?? null)
  const merged = mergeReviews(base, local, theirs)
  const count = Object.keys(merged.items).length
  if (count === 0 && !there && !existsSync(localFile)) return 'no verdicts yet'
  let sent = false
  if (!sameReviews(merged, theirs)) {
    const staged = join(mkdtempSync(join(tmpdir(), 'story-reviews-')), REVIEWS)
    try {
      write(staged, merged)
      if (!remote.uploadFile(staged, REVIEWS, there?.generation ?? '0')) throw new Error('The verdicts changed on the site while syncing. Run it again.')
      sent = true
    } finally { rmSync(dirname(staged), { recursive: true, force: true }) }
  }
  const changedHere = !sameReviews(merged, local)
  if (changedHere || !existsSync(localFile)) write(localFile, merged)
  write(syncedFile, merged)
  return `${count} verdict${count === 1 ? '' : 's'}${changedHere ? ', new from the site' : ''}${sent ? ', this machine’s sent' : ''}`
}

export interface PushResult { uploaded: string[]; unchanged: number; gone: string[]; refused: string[]; report: 'sent' | 'none'; reviews: string }
/** `pnpm story:push <book>`: the drafts that changed, the check report, then the index; and the verdicts in step. */
export function push(book: Book, dir: string, remote: Remote, now: string, options: { dryRun?: boolean } = {}): PushResult {
  if (!existsSync(dir)) throw new Error(`Nothing to push: ${dir} doesn't exist.`)
  const { drafts, refused } = scan(dir)
  if (drafts.length === 0) throw new Error(`Nothing to push: no drafts in ${dir}.`)
  const checks = join(dir, CHECKS), hasReport = existsSync(checks)
  if (hasReport) {
    const stale = staleFor(readFileSync(checks, 'utf8'), book, drafts)
    if (stale.length) throw new Error(`${CHECKS} is older than ${stale.length} draft${stale.length === 1 ? '' : 's'} (${stale.slice(0, 5).join(', ')}${stale.length > 5 ? ', …' : ''}). Run the book's check again, then push.`)
  }
  const plan = planPush(book, drafts, parseIndex(remote.read(INDEX)?.text ?? null, book), now)
  const result: PushResult = { uploaded: plan.upload, unchanged: plan.unchanged, gone: plan.gone, refused, report: hasReport ? 'sent' : 'none', reviews: 'not synced (dry run)' }
  if (options.dryRun) return result
  const stage = mkdtempSync(join(tmpdir(), 'story-push-'))
  try {
    for (const path of plan.upload) { const to = join(stage, path); mkdirSync(dirname(to), { recursive: true }); copyFileSync(join(dir, path), to) }
    if (hasReport) copyFileSync(checks, join(stage, CHECKS))
    if (plan.upload.length || hasReport) remote.uploadFolder(stage)
    // The index goes last: it never lists a draft that isn't there yet.
    const index = join(stage, INDEX)
    write(index, plan.index)
    remote.uploadFile(index, INDEX)
  } finally { rmSync(stage, { recursive: true, force: true }) }
  result.reviews = syncReviews(dir, remote)
  return result
}

export interface PullResult { reviews: string; written: string[]; same: number; conflicts: string[] }
/** `pnpm story:pull <book>`: the verdicts; with `drafts`, the drafts too, never over a local file that differs (unless forced). */
export function pull(book: Book, dir: string, remote: Remote, options: { drafts?: boolean; force?: boolean } = {}): PullResult {
  mkdirSync(dir, { recursive: true })
  const result: PullResult = { reviews: '', written: [], same: 0, conflicts: [] }
  if (options.drafts) {
    const index = parseIndex(remote.read(INDEX)?.text ?? null, book)
    if (!index) throw new Error(`Nothing was pushed for the ${book} book yet.`)
    const stage = mkdtempSync(join(tmpdir(), 'story-pull-'))
    try {
      remote.downloadFolder(stage)
      for (const file of index.files) {
        if (!isDraftPath(file.path)) continue
        const from = join(stage, file.path), to = join(dir, file.path)
        if (!existsSync(from) || sha256(readFileSync(from)) !== file.sha256) throw new Error(`The bucket's ${file.path} doesn't match its index. Push the book again from the writer's machine.`)
        if (existsSync(to)) {
          if (sha256(readFileSync(to)) === file.sha256) { result.same++; continue }
          if (!options.force) { result.conflicts.push(file.path); continue }
        }
        mkdirSync(dirname(to), { recursive: true })
        copyFileSync(from, to)
        result.written.push(file.path)
      }
      const checks = join(stage, CHECKS)
      if (existsSync(checks) && result.conflicts.length === 0) copyFileSync(checks, join(dir, CHECKS))
    } finally { rmSync(stage, { recursive: true, force: true }) }
  }
  result.reviews = syncReviews(dir, remote)
  return result
}

// --- gcloud

/** How to start gcloud on this platform (as the Ranker's scripts do): on Windows it is `gcloud.cmd`, run through the shell
 *  with every argument quoted. */
export function gcloudCommand(args: string[], platform: NodeJS.Platform = process.platform): { file: string; args: string[]; shell: boolean } {
  if (platform !== 'win32') return { file: 'gcloud', args, shell: false }
  if (args.some((a) => a.includes('"'))) throw new Error('A gcloud argument with a quote cannot be passed through cmd.exe.')
  return { file: 'gcloud.cmd', args: args.map((a) => `"${a}"`), shell: true }
}

/** gcloud storage, scoped to the owner's default configuration and the games' project; never `config set`. Null on failure. */
function gcloud(args: string[], options: { quiet?: boolean } = {}): string | null {
  try {
    const command = gcloudCommand(['storage', ...args])
    return execFileSync(command.file, command.args, {
      env: { ...process.env, CLOUDSDK_ACTIVE_CONFIG_NAME: 'default', CLOUDSDK_CORE_PROJECT: process.env.CLOUDSDK_CORE_PROJECT ?? 'uma-rpg' },
      stdio: ['ignore', 'pipe', options.quiet ? 'pipe' : 'inherit'], encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, shell: command.shell,
    })
  } catch (error) {
    if (options.quiet) return null
    throw error
  }
}

/** A book's folder in the app's bucket, `gs://uma-platform-content/story/<book>/`. */
export function bucketRemote(book: Book): Remote {
  const base = `gs://${BUCKET}/story/${book}`
  return {
    read(path) {
      const generation = gcloud(['objects', 'describe', `${base}/${path}`, '--format=value(generation)'], { quiet: true })?.trim()
      if (!generation) return null
      // A newer copy than the generation described only makes the guarded upload lose its race, and say so.
      const text = gcloud(['cat', `${base}/${path}`], { quiet: true })
      return text === null ? null : { text, generation }
    },
    uploadFolder(dir) { gcloud(['rsync', '--recursive', dir, base]) },
    uploadFile(file, path, ifGeneration) {
      return gcloud(['cp', ...(ifGeneration === undefined ? [] : [`--if-generation-match=${ifGeneration}`]), file, `${base}/${path}`], { quiet: ifGeneration !== undefined }) !== null
    },
    downloadFolder(dir) { gcloud(['rsync', '--recursive', base, dir]) },
  }
}
