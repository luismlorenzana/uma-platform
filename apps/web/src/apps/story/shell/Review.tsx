// The owner's verdict on one item (US1, AP58): liked, rework or question, and a note. Saved one item at a time; the
// server merges it with the book's other verdicts and answers with all of them. Mount it with `key={item}`, so each
// item starts from its own saved verdict.
import { Button, Chip } from '@luismlorenzana/uma-kit/ui'
import { useState } from 'react'
import { saveVerdict, VERDICT_WORDS, VERDICTS, when, words, type Book, type Reviews, type Verdict } from './api'

export function ReviewPanel({ book, item, reviews, onSaved }: { book: Book; item: string; reviews: Reviews; onSaved: (reviews: Reviews) => void }) {
  const saved = reviews.items[item]
  const [status, setStatus] = useState<Verdict | null>(saved?.status ?? null)
  const [note, setNote] = useState(saved?.note ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const changed = status !== (saved?.status ?? null) || note !== (saved?.note ?? '')

  const save = () => {
    setBusy(true)
    setError(null)
    saveVerdict(book, { item, status, note }).then(onSaved, (e: unknown) => setError(words(e))).finally(() => setBusy(false))
  }
  return (
    <section aria-label="Your verdict" className="flex flex-col gap-2 rounded-md border border-hairline bg-panel p-3 shadow-1">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-semibold text-ink">Your verdict</span>
        {VERDICTS.map((v) => (
          <Chip key={v} selected={status === v} onClick={() => setStatus(status === v ? null : v)}>
            <span className={`story-mark ${v}`} />{VERDICT_WORDS[v]}
          </Chip>
        ))}
      </div>
      <textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={4000} rows={3} placeholder="A note for the writer"
        aria-label="A note for the writer" className="w-full rounded-sm border border-hairline-strong bg-page p-2 text-sm text-ink" />
      <div className="flex flex-wrap items-center gap-3">
        <Button size="sm" disabled={busy || !changed} onClick={save}>{busy ? 'Saving' : 'Save'}</Button>
        <span className="text-[13px] text-ink-soft" role="status">
          {error ? `Not saved: ${error}` : changed ? 'Not saved yet' : saved ? `Saved ${when(saved.updatedAt)}` : 'No verdict yet'}
        </span>
      </div>
    </section>
  )
}
