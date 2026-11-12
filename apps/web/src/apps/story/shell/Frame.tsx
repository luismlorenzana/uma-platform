// Every Uma Story page's frame (US1): the kit's header with Back, and the three books as tabs. The home has no tabs: its
// cards are the way in.
import { AppFrame, PlaceHeader } from '@luismlorenzana/uma-kit/shell'
import { Tabs } from '@luismlorenzana/uma-kit/ui'
import type { ReactNode } from 'react'
import { useNavigate } from 'react-router'
import { BOOK_TITLES, BOOKS, type Book } from './api'

const ABOUT = (
  <>
    <p>Each game’s story is written in its own session, as private files on the writer’s machine. A push copies the drafts here to be read; the game publishes its own release.</p>
    <p>A verdict (liked, rework or question, with a note) is saved here and goes back to the writer on the next pull.</p>
  </>
)

export function StoryFrame({ book, children, trailing }: { book?: Book; children: ReactNode; trailing?: ReactNode }) {
  const navigate = useNavigate()
  return (
    <AppFrame top={
      <PlaceHeader title={book ? `Uma Story · ${BOOK_TITLES[book]}` : 'Uma Story'} onBack={() => void navigate(book ? '/story' : '/')}
        words={{ back: book ? 'Uma Story' : 'Uma Platform', about: 'About Uma Story' }} about={ABOUT}>
        {trailing}
      </PlaceHeader>
    }>
      <main className="pb-safe h-full overflow-y-auto bg-page px-3 py-4 sm:px-4">
        <div className="mx-auto flex max-w-6xl flex-col gap-4">
          {book && <Tabs label="Books" value={book} onChange={(next) => void navigate(`/story/${next}`)} options={BOOKS.map((b) => ({ value: b, label: BOOK_TITLES[b] }))} className="max-w-md" />}
          {children}
        </div>
      </main>
    </AppFrame>
  )
}

/** A page's loading and error states, in the frame. */
export function Waiting({ book, error, what }: { book?: Book; error: string | null; what: string }) {
  return (
    <StoryFrame book={book}>
      <p className="py-10 text-center text-ink-soft">{error ? `${what} couldn’t load: ${error}` : `Loading ${what.toLowerCase()}`}</p>
    </StoryFrame>
  )
}
