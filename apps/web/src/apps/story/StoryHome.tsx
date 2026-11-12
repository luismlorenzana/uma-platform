// Uma Story's home (US1): the three books, each with its numbers. Numbers only; how it works sits behind the header's (i).
import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { BOOK_TITLES, formatBytes, loadHome, VERDICT_WORDS, VERDICTS, when, words, type BookSummary, type StoryHomeData } from './shell/api'
import { StoryFrame, Waiting } from './shell/Frame'

const BLURBS: Record<BookSummary['book'], string> = {
  cast: 'The Ranker’s Umas in ten batches, and which books hold each.',
  quest: 'uma-quest: a hero, five bosses, five chapters.',
  farm: 'uma-farm: a route to a wedding for every Uma.',
}

function Line({ value, label }: { value: string | number; label: string }) {
  return <span><b className="font-semibold text-ink">{value}</b> <span className="text-ink-soft">{label}</span></span>
}

function BookCard({ book, cast }: { book: BookSummary; cast: number | null }) {
  const judged = VERDICTS.filter((v) => book.verdicts[v] > 0)
  return (
    <Link to={`/story/${book.book}`} className="flex min-h-40 flex-col gap-2 rounded-lg bg-panel p-4 shadow-1 transition hover:shadow-2 focus-visible:outline-2 focus-visible:outline-accent">
      <span className="font-display text-xl font-bold tracking-tight text-ink">{BOOK_TITLES[book.book]}</span>
      <span className="text-sm text-ink-soft">{BLURBS[book.book]}</span>
      <span className="mt-auto flex flex-wrap gap-x-4 gap-y-1 text-sm">
        {book.book === 'cast' ? <Line value={cast ?? '—'} label="Umas" /> : <Line value={book.umas} label="Umas" />}
        <Line value={book.files} label={`draft${book.files === 1 ? '' : 's'}${book.files ? ` · ${formatBytes(book.bytes)}` : ''}`} />
        {judged.map((v) => <span key={v} className="flex items-center gap-1"><span className={`story-mark ${v}`} /><Line value={book.verdicts[v]} label={VERDICT_WORDS[v].toLowerCase()} /></span>)}
        {book.findings && book.findings.error > 0 && <span className="text-danger">{book.findings.error} error{book.findings.error === 1 ? '' : 's'}</span>}
        {book.stale > 0 && <span className="text-warning">{book.stale} unchecked</span>}
      </span>
      <span className="text-[12px] text-ink-faint">{book.pushedAt ? `Pushed ${when(book.pushedAt)}` : book.files ? 'Read in place on this machine' : 'Nothing pushed yet'}</span>
    </Link>
  )
}

export function StoryHome() {
  const [data, setData] = useState<StoryHomeData | null>(null)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    let live = true
    loadHome().then((d) => { if (live) setData(d) }, (e: unknown) => { if (live) setError(words(e)) })
    return () => { live = false }
  }, [])
  if (!data) return <Waiting error={error} what="The books" />
  return (
    <StoryFrame>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {data.books.map((book) => <BookCard key={book.book} book={book} cast={data.cast} />)}
      </div>
    </StoryFrame>
  )
}
