// The Cast book's first page (US1, AP63): the Ranker's Umas in its ten batches, each under her own name (a sister is her
// own Uma), with her picture from master data and the books that hold her. The order is read fresh on every visit. The
// book's own content (who she is in any world, the real relationships) comes with US2.
import type { ArtIndex } from '@luismlorenzana/uma-data'
import { Chip, Panel, Sheet } from '@luismlorenzana/uma-kit/ui'
import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { batches, inFilter, loadCast, when, words, type CastFilter, type CastUma, type CastView, type Layer } from '../shell/api'
import { Face, loadArt } from '../shell/Face'
import { StoryFrame, Waiting } from '../shell/Frame'

const FILTERS: { id: CastFilter; label: string }[] = [{ id: 'all', label: 'Everyone' }, { id: 'quest', label: 'In Quest' }, { id: 'farm', label: 'In Farm' }, { id: 'neither', label: 'In neither' }]

function BookMark({ title, held, layer }: { title: string; held: boolean; layer: Layer | null | undefined }) {
  if (!held) return null
  return <span className="rounded-full border border-hairline-strong px-1.5 text-[11px] font-semibold text-ink-soft" title={layer ? `${title}: ${layer}` : title}>{title}{layer ? ` · ${layer}` : ''}</span>
}

function Card({ uma, cast, art, onOpen }: { uma: CastUma; cast: CastView; art: ArtIndex | null; onOpen: () => void }) {
  return (
    <button type="button" onClick={onOpen} className="flex min-h-16 items-center gap-2.5 rounded-md bg-panel p-2 text-left shadow-1 hover:shadow-2 focus-visible:outline-2 focus-visible:outline-accent">
      <Face art={art} outfitId={uma.outfitId} alt={uma.name} className="size-12 rounded-sm" />
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate text-sm font-semibold text-ink">{uma.name}</span>
        <span className="flex flex-wrap items-center gap-1 text-[12px] text-ink-faint">
          <span>#{uma.order}</span>
          {uma.sister && <span>· sister</span>}
          <BookMark title="Quest" held={uma.id in cast.books.quest} layer={cast.books.quest[uma.id]} />
          <BookMark title="Farm" held={uma.id in cast.books.farm} layer={cast.books.farm[uma.id]} />
        </span>
      </span>
    </button>
  )
}

function Detail({ uma, cast, art }: { uma: CastUma; cast: CastView; art: ArtIndex | null }) {
  const row = (label: string, value: string) => (
    <div className="flex justify-between gap-4 border-b border-hairline py-1.5 text-sm last:border-b-0"><span className="text-ink-soft">{label}</span><span className="text-right font-semibold text-ink">{value}</span></div>
  )
  const inBook = (book: 'quest' | 'farm') => (uma.id in cast.books[book] ? cast.books[book][uma.id] ?? 'in the book' : 'not yet')
  return (
    <div className="flex flex-col gap-3 pb-2">
      <div className="flex gap-3">
        <Face art={art} outfitId={uma.outfitId} kind="full" alt={uma.name} className="h-56 w-40 rounded-md" />
        <div className="min-w-0 flex-1">
          {row('Batch', `${uma.tier} · #${uma.order}`)}
          {row('Id', uma.id)}
          {row('Outfit', String(uma.outfitId))}
          {row('Quest', inBook('quest'))}
          {row('Farm', inBook('farm'))}
        </div>
      </div>
      {uma.sister && (
        <div className="rounded-md bg-raised p-3 text-sm">
          <p className="font-semibold text-ink">{[uma.sister.relation, uma.sister.age].filter(Boolean).join(' · ')}</p>
          {uma.sister.profile && <p className="mt-1 whitespace-pre-wrap leading-relaxed text-ink-soft">{uma.sister.profile}</p>}
        </div>
      )}
      <Link to={`/art?o=${uma.outfitId}`} className="text-sm font-semibold text-accent-strong">Her pictures in Character Art ›</Link>
    </div>
  )
}

export default function CastPage() {
  const [cast, setCast] = useState<CastView | null>(null)
  const [art, setArt] = useState<ArtIndex | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<CastFilter>('all')
  const [params, setParams] = useSearchParams()
  useEffect(() => {
    let live = true
    loadCast().then((c) => { if (live) setCast(c) }, (e: unknown) => { if (live) setError(words(e)) })
    loadArt().then((a) => { if (live) setArt(a) }, () => undefined)
    return () => { live = false }
  }, [])
  const shown = useMemo(() => (cast ? batches(cast.umas.filter((u) => inFilter(cast, u.id, filter))) : []), [cast, filter])
  if (!cast) return <Waiting book="cast" error={error} what="The cast" />

  const open = cast.umas.find((u) => u.id === params.get('uma')) ?? null
  const sisters = cast.umas.filter((u) => u.sister).length
  const count = (book: 'quest' | 'farm') => cast.umas.filter((u) => u.id in cast.books[book]).length
  return (
    <StoryFrame book="cast">
      <Panel>
        <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm">
          <span><b className="text-ink">{cast.umas.length}</b> <span className="text-ink-soft">Umas</span></span>
          <span><b className="text-ink">{cast.umas.length - sisters}</b> <span className="text-ink-soft">characters</span></span>
          <span><b className="text-ink">{sisters}</b> <span className="text-ink-soft">sisters</span></span>
          <span><b className="text-ink">{count('quest')}</b> <span className="text-ink-soft">in Quest</span></span>
          <span><b className="text-ink">{count('farm')}</b> <span className="text-ink-soft">in Farm</span></span>
          <span className="text-ink-faint">The Ranker’s revision {cast.boardRevision}{cast.generatedAt ? ` · ${when(cast.generatedAt)}` : ''}</span>
          <Link to="/story/cast/files" className="font-semibold text-accent-strong">The book’s files ›</Link>
        </div>
      </Panel>
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => <Chip key={f.id} selected={filter === f.id} onClick={() => setFilter(f.id)}>{f.label}</Chip>)}
      </div>
      {shown.length === 0 && <Panel><p className="py-2 text-ink-soft">No Uma here.</p></Panel>}
      {shown.map((group) => (
        <section key={group.batch} className={`story-batch story-t-${group.tier} flex flex-col gap-2 py-1`}>
          <h2 className="flex items-baseline gap-2 font-display text-lg font-bold text-ink">
            <span className={`story-tier story-t-${group.tier} rounded-xs px-1.5 py-0.5 text-[13px]`}>{group.tier}</span>
            Batch {group.batch} <span className="text-sm font-normal text-ink-faint">{group.umas.length}</span>
          </h2>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {group.umas.map((uma) => <Card key={uma.id} uma={uma} cast={cast} art={art} onOpen={() => setParams({ uma: uma.id })} />)}
          </div>
        </section>
      ))}
      <Sheet open={open !== null} onClose={() => setParams({})} title={open?.name ?? ''}>
        {open && <Detail uma={open} cast={cast} art={art} />}
      </Sheet>
    </StoryFrame>
  )
}
