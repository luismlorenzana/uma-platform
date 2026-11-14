// A book's Files page (US1): every pushed draft, grouped by folder, with a plain reader and a verdict on each. It stands
// in for a game's book until its real pages land (US3, US4), and stays as the way to read any file as it is.
import { Chip, Panel } from '@luismlorenzana/uma-kit/ui'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import {
  findingsFor, formatBytes, groupFiles, loadBook, loadFile, nameIn, reportLine, verdictsOn, when, words,
  type Book, type BookView, type DraftText, type Reviews,
} from './api'
import { StoryFrame, Waiting } from './Frame'
import { DraftReader } from './Reader'
import { ReviewPanel } from './Review'

type Show = 'all' | 'judged' | 'open'
const TONE = { none: 'text-ink-soft', good: 'text-ink-soft', warn: 'text-warning', bad: 'text-danger' } as const

function Status({ view }: { view: BookView }) {
  const report = reportLine(view)
  const judged = Object.values(view.reviews.items).filter((r) => r.status).length
  return (
    <Panel>
      <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm">
        <span><b className="text-ink">{view.files.length}</b> <span className="text-ink-soft">drafts</span></span>
        <span className="text-ink-soft">{view.pushedAt ? `Pushed ${when(view.pushedAt)}` : view.files.length ? 'Read in place on this machine' : 'Nothing pushed yet'}</span>
        <span className={TONE[report.tone]}>{report.text}{view.report ? ` · checked ${when(view.report.checkedAt)}` : ''}</span>
        <span className="text-ink-soft"><b className="text-ink">{judged}</b> with a verdict</span>
      </div>
      {view.reviewsProblem && <p className="mt-2 text-sm text-danger">The verdicts file can’t be read, so none can be saved: {view.reviewsProblem}</p>}
    </Panel>
  )
}

function FileList({ view, selected, show, onPick }: { view: BookView; selected: string | null; show: Show; onPick: (path: string) => void }) {
  const groups = useMemo(() => groupFiles(view.files), [view.files])
  return (
    <nav aria-label="Drafts" className="flex flex-col gap-2">
      {groups.map((group) => {
        const files = group.files.filter((f) => { const v = verdictsOn(view.reviews, f.path); return show === 'all' || (show === 'judged') === Boolean(v.own?.status || v.parts) })
        if (files.length === 0) return null
        return (
          <details key={group.folder} open={group.folder !== 'archive' || files.some((f) => f.path === selected)} className="rounded-md border border-hairline bg-panel shadow-1">
            <summary className="cursor-pointer px-3 py-2 text-sm font-semibold text-ink">{group.folder || 'The book'} <span className="font-normal text-ink-faint">{files.length}</span></summary>
            <ul className="border-t border-hairline">
              {files.map((file) => {
                const verdict = verdictsOn(view.reviews, file.path), findings = findingsFor(view.report, file.path)
                const errors = findings.filter((f) => f.level === 'error').length
                return (
                  <li key={file.path}>
                    <button type="button" onClick={() => onPick(file.path)} aria-current={file.path === selected ? 'true' : undefined}
                      className={`flex min-h-11 w-full items-center gap-2 px-3 py-1.5 text-left text-sm ${file.path === selected ? 'bg-accent-wash text-accent-strong' : 'text-ink hover:bg-sunken'}`}>
                      <span className={`story-mark ${verdict.own?.status ?? (verdict.own?.note || verdict.parts ? 'note' : '')}`} title={verdict.own?.status ?? (verdict.parts ? `${verdict.parts} on its parts` : 'No verdict')} />
                      <span className="min-w-0 flex-1 truncate">{nameIn(file.path, group.folder)}</span>
                      {errors > 0 && <span className="text-[12px] text-danger">{errors} error{errors === 1 ? '' : 's'}</span>}
                      {view.stale.includes(file.path) && <span className="text-[12px] text-warning" title="Changed since the book’s check ran">unchecked</span>}
                      <span className="text-[12px] text-ink-faint">{formatBytes(file.bytes)}</span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </details>
        )
      })}
    </nav>
  )
}

function Draft({ book, path, view, onSaved }: { book: Book; path: string; view: BookView; onSaved: (reviews: Reviews) => void }) {
  const [draft, setDraft] = useState<DraftText | null>(null)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    let live = true
    setDraft(null); setError(null)
    loadFile(book, path).then((d) => { if (live) setDraft(d) }, (e: unknown) => { if (live) setError(words(e)) })
    return () => { live = false }
  }, [book, path])
  const findings = findingsFor(view.report, path)
  return (
    <article className="flex min-w-0 flex-col gap-3">
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="min-w-0 break-all font-display text-lg font-bold text-ink">{path}</h2>
        {draft && <span className="text-[12px] text-ink-faint">{formatBytes(draft.bytes)} · {draft.sha256.slice(0, 8)}</span>}
      </header>
      {!view.reviewsProblem && <ReviewPanel key={`${book}:${path}`} book={book} item={path} reviews={view.reviews} onSaved={onSaved} />}
      {findings.length > 0 && (
        <Panel label="From the book’s check">
          <ul className="flex flex-col gap-1 text-sm">
            {findings.map((f, i) => (
              <li key={i} className={f.level === 'error' ? 'text-danger' : 'text-ink-soft'}>
                <b className="font-semibold">{f.level === 'error' ? 'Error' : f.level === 'todo' ? 'To write' : 'Note'}</b>{f.where ? ` · ${f.where}` : ''} · {f.message}
              </li>
            ))}
          </ul>
        </Panel>
      )}
      <Panel>
        {error ? <p className="text-sm text-danger">This draft couldn’t load: {error}</p> : draft ? <DraftReader path={path} text={draft.text} /> : <p className="text-sm text-ink-soft">Loading</p>}
      </Panel>
    </article>
  )
}

export function Files({ book }: { book: Book }) {
  const [view, setView] = useState<BookView | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [show, setShow] = useState<Show>('all')
  const [params, setParams] = useSearchParams()
  const selected = params.get('file')
  const load = useCallback(() => { loadBook(book).then((v) => { setView(v); setError(null) }, (e: unknown) => setError(words(e))) }, [book])
  useEffect(() => { setView(null); load() }, [load])
  // Drafts change while the page is open (a push, or an edit when they're read in place): look again on coming back.
  useEffect(() => {
    const again = () => { if (document.visibilityState === 'visible') load() }
    document.addEventListener('visibilitychange', again)
    return () => document.removeEventListener('visibilitychange', again)
  }, [load])

  if (!view) return <Waiting book={book} error={error} what="The drafts" />
  const pick = (path: string | null) => setParams(path ? { file: path } : {}, { replace: false })
  const known = selected !== null && view.files.some((f) => f.path === selected)
  return (
    <StoryFrame book={book}>
      {book === 'cast' && <Link to="/story/cast" className="min-h-8 text-sm font-semibold text-accent-strong">‹ The cast by batch</Link>}
      {book === 'farm' && view.files.some((f) => f.path === 'world-book.md') && <Link to="/story/farm/world" className="min-h-8 text-sm font-semibold text-accent-strong">The World Book ›</Link>}
      <Status view={view} />
      {view.files.length === 0 ? (
        <Panel><p className="py-2 text-ink-soft">No drafts here yet. The writer’s session pushes them with <code>pnpm story:push {book}</code>.</p></Panel>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
          <div className={`flex flex-col gap-2 ${known ? 'hidden lg:flex' : ''}`}>
            <div className="flex flex-wrap gap-2">
              <Chip selected={show === 'all'} onClick={() => setShow('all')}>All</Chip>
              <Chip selected={show === 'open'} onClick={() => setShow('open')}>To judge</Chip>
              <Chip selected={show === 'judged'} onClick={() => setShow('judged')}>With a verdict</Chip>
            </div>
            <FileList view={view} selected={selected} show={show} onPick={pick} />
          </div>
          <div className={known ? '' : 'hidden lg:block'}>
            {known && <button type="button" onClick={() => pick(null)} className="mb-2 min-h-11 text-sm font-semibold text-accent-strong lg:hidden">‹ All drafts</button>}
            {known
              ? <Draft book={book} path={selected} view={view} onSaved={(reviews) => setView((v) => v && { ...v, reviews })} />
              : <Panel><p className="py-2 text-ink-soft">{selected ? `No draft named ${selected} in this book.` : 'Pick a draft to read it and leave a verdict.'}</p></Panel>}
          </div>
        </div>
      )}
    </StoryFrame>
  )
}
