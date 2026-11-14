// The farm's World Book page (uma-farm F40; P167): `world-book.md` as pushed with the farm's drafts, read in full. A
// contents column of its headings (a list to open on a phone), the text in the plain reader, and the "For the game"
// section set apart. Owner only like every route; nothing to edit and no verdicts here.
import { Link } from 'react-router'
import { useEffect, useState, type ReactNode } from 'react'
import { loadBook, loadFile, when, words, type BookView, type DraftText } from '../shell/api'
import { StoryFrame, Waiting } from '../shell/Frame'
import { MarkdownText } from '../shell/Reader'
import { WORLD_BOOK, worldSections, type WorldSection } from './worldBook'

function Contents({ sections }: { sections: WorldSection[] }) {
  const listed = sections.filter((s) => s.level >= 1 && s.level <= 3)
  return (
    <ol className="flex flex-col gap-0.5 text-sm">
      {listed.map((s) => (
        <li key={s.id} style={{ paddingLeft: `${(s.level - 1) * 12}px` }}>
          <a href={`#${s.id}`} className={`block rounded-xs px-1.5 py-1 hover:bg-sunken ${s.forGame ? 'font-semibold text-accent-strong' : s.level === 1 ? 'font-semibold text-ink' : 'text-ink-soft'}`}>{s.title}</a>
        </li>
      ))}
    </ol>
  )
}

function Section({ s }: { s: WorldSection }) {
  const size = s.level === 1 ? 'text-2xl' : s.level === 2 ? 'text-xl' : 'text-base'
  return (
    <section id={s.id} className="scroll-mt-4">
      {s.level > 0 && <h2 aria-level={s.level} className={`font-display font-bold text-ink ${size} ${s.level > 1 ? 'mt-3' : ''}`}>{s.title}</h2>}
      {s.body && <div className="mt-2"><MarkdownText text={s.body} /></div>}
    </section>
  )
}

/** The sections in order, the "For the game" run in one panel with its label. */
function Body({ sections }: { sections: WorldSection[] }) {
  const out: ReactNode[] = []
  for (let i = 0; i < sections.length; i++) {
    if (!sections[i]!.forGame) { out.push(<Section key={sections[i]!.id} s={sections[i]!} />); continue }
    const run: WorldSection[] = []
    while (i < sections.length && sections[i]!.forGame) run.push(sections[i++]!)
    i--
    out.push(
      <div key={`game-${run[0]!.id}`} className="rounded-md border-2 border-accent bg-accent-wash p-4" data-testid="for-the-game">
        <p className="mb-1 text-[12px] font-semibold uppercase tracking-wide text-accent-strong">What the story asks of the game</p>
        <div className="flex flex-col gap-2">{run.map((s) => <Section key={s.id} s={s} />)}</div>
      </div>,
    )
  }
  return <article className="flex min-w-0 flex-col gap-3">{out}</article>
}

export default function WorldPage() {
  const [file, setFile] = useState<DraftText | null>(null)
  const [view, setView] = useState<BookView | null>(null)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    loadBook('farm').then((v) => {
      setView(v)
      if (!v.files.some((f) => f.path === WORLD_BOOK)) return
      loadFile('farm', WORLD_BOOK).then(setFile, (e: unknown) => setError(words(e)))
    }, (e: unknown) => setError(words(e)))
  }, [])

  if (error) return <Waiting book="farm" error={error} what="The World Book" />
  if (!view) return <Waiting book="farm" error={null} what="The World Book" />
  const back = <Link to="/story/farm" className="min-h-8 text-sm font-semibold text-accent-strong">‹ The farm’s drafts</Link>
  if (!view.files.some((f) => f.path === WORLD_BOOK)) {
    return <StoryFrame book="farm">{back}<p className="py-10 text-center text-ink-soft">No World Book has been pushed yet: it arrives with the farm’s next story push.</p></StoryFrame>
  }
  if (!file) return <Waiting book="farm" error={null} what="The World Book" />
  const sections = worldSections(file.text)
  return (
    <StoryFrame book="farm">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        {back}
        <span className="text-[12px] text-ink-faint">The World Book · {view.pushedAt ? `pushed ${when(view.pushedAt)}` : 'read in place'}</span>
      </div>
      <details className="rounded-md bg-panel p-3 lg:hidden">
        <summary className="min-h-8 font-semibold text-ink">Contents</summary>
        <div className="mt-2"><Contents sections={sections} /></div>
      </details>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
        <nav aria-label="Contents" className="hidden lg:block">
          <div className="sticky top-0 max-h-[calc(100vh-120px)] overflow-y-auto rounded-md bg-panel p-3"><Contents sections={sections} /></div>
        </nav>
        <div className="rounded-md bg-panel p-4 sm:p-6"><Body sections={sections} /></div>
      </div>
    </StoryFrame>
  )
}
