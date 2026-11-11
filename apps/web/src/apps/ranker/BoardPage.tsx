// One board (RK1): its tier rows, best first, then the unranked and, on an imported boss board, the left-out row. A card
// opens its panel (beside the rows on desktop, as a sheet on a phone). Keys: 1–9 and 0 rank (Playable: T1–T10; lettered
// boards: their tiers, 0 unranks), Backspace unranks, arrows browse, [ ] move one place, Shift+[ ] a whole tier, D makes an
// outfit her default, Cmd/Ctrl+Z undoes, / searches. Cards drag between rows on desktop.
import {
  boardOf, BOARDS, ordered, parseBoard, pools, setDefaultOutfit, setNote, setTier, shift, tierStep, tiersOf, WAYS, place, outfitIndex, identityByOutfit,
  type AnyTier, type BoardId, type BoardState, type Way,
} from '@uma-platform/tiers'
import { AppFrame, PlaceHeader } from '@luismlorenzana/uma-kit/shell'
import { Button, Chip, Sheet } from '@luismlorenzana/uma-kit/ui'
import { useCallback, useEffect, useMemo, useRef, useState, type DragEvent, type ReactNode } from 'react'
import { Navigate, useNavigate, useParams, useSearchParams } from 'react-router'
import { Art } from './art'
import { useRanker } from './data'
import { Detail, TierBadge, type Moves } from './Detail'
import { items, matches, type Item } from './view'

function useWide(): boolean {
  const query = '(min-width: 1024px)'
  const [wide, setWide] = useState(() => typeof window !== 'undefined' && window.matchMedia(query).matches)
  useEffect(() => {
    const m = window.matchMedia(query), on = () => setWide(m.matches)
    m.addEventListener('change', on); return () => m.removeEventListener('change', on)
  }, [])
  return wide
}

function download(name: string, value: unknown) {
  const url = URL.createObjectURL(new Blob([`${JSON.stringify(value, null, 2)}\n`], { type: 'application/json' }))
  const a = document.createElement('a'); a.href = url; a.download = name; a.click(); URL.revokeObjectURL(url)
}

function Card({ item, selected, onSelect, onDragStart }: { item: Item; selected: boolean; onSelect: () => void; onDragStart: (e: DragEvent) => void }) {
  return (
    <button type="button" onClick={onSelect} draggable onDragStart={onDragStart} data-id={item.id} title={`${item.name} · ${item.line}`}
      aria-label={`${item.name}, ${item.line}`} aria-pressed={selected}
      className={`relative size-14 shrink-0 overflow-hidden rounded-sm bg-raised ${selected ? 'ring-2 ring-accent ring-offset-1 ring-offset-panel' : ''}`}>
      <Art path={item.image} kind={item.imageKind} alt={item.name} className="size-full" />
      {item.sister && <span aria-hidden className="absolute right-0.5 top-0.5 size-2.5 rounded-full bg-accent ring-1 ring-panel" />}
    </button>
  )
}

export function BoardPage() {
  const { board: param } = useParams()
  const board = boardOf(param ?? '')
  const { data, edit, undo, canUndo, saving, editProfiles } = useRanker()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const [query, setQuery] = useState('')
  const [way, setWay] = useState<Way | 'all'>('all')
  const [onlyUnranked, setOnlyUnranked] = useState(false)
  const [dropAt, setDropAt] = useState<string | null>(null)
  const search = useRef<HTMLInputElement>(null)
  const file = useRef<HTMLInputElement>(null)
  const wide = useWide()
  const selected = params.get('u')
  const select = useCallback((id: string | null) => setParams((p) => { const n = new URLSearchParams(p); if (id) n.set('u', id); else n.delete('u'); return n }, { replace: true }), [setParams])

  const id = board?.id as BoardId
  const all = useMemo(() => (data && board ? pools(data.catalog, data.states, data.profiles) : null), [data, board])
  const state = data && board ? data.states[id] : null
  const list = useMemo(() => (data && all && board ? items(id, all[id], data.catalog, data.profiles) : []), [data, all, board, id])
  const byId = useMemo(() => new Map(list.map((i) => [i.id, i])), [list])
  const poolIds = useMemo(() => new Set(list.map((i) => i.id)), [list])
  const tiers = board ? tiersOf(id) : []
  const shown = (i: Item) => matches(i, query, way)
  const rows = useMemo(() => {
    if (!state) return []
    const ranked = ordered(state, poolIds)
    return tiers.map((t) => ({ tier: t, items: ranked.filter((e) => e.tier === t.id).map((e) => byId.get(e.id)!).filter(shown) }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, poolIds, byId, query, way, id])
  const tierOf = useMemo(() => new Map(state?.entries.map((e) => [e.id, e.tier]) ?? []), [state])
  const unranked = useMemo(() => list.filter((i) => !tierOf.get(i.id) && shown(i)), [list, tierOf, query, way]) // eslint-disable-line react-hooks/exhaustive-deps
  const leftOut = useMemo(() => (data && board?.franchise && state?.out ? items(id, state.out.map((o) => ({ id: o, via: null, viaTier: null })), data.catalog, data.profiles) : []), [data, board, state, id])
  const visible = useMemo(() => [...(onlyUnranked ? [] : rows.flatMap((r) => r.items)), ...unranked], [rows, unranked, onlyUnranked])
  const current = selected ? byId.get(selected) ?? leftOut.find((i) => i.id === selected) ?? null : null

  const change = useCallback((next: (s: BoardState) => BoardState) => { if (state) edit(id, next(state)) }, [state, edit, id])
  const moves = useMemo((): Moves | null => current && ({
    rank: (tier) => change((s) => setTier(s, current.id, tier)),
    shift: (d) => change((s) => shift(s, current.id, d, poolIds)),
    tierStep: (d) => change((s) => tierStep(s, current.id, d, poolIds)),
    note: (text) => change((s) => setNote(s, current.id, text)),
  }), [current, change, poolIds])

  useEffect(() => {
    if (!board || !data) return
    const onKey = (e: KeyboardEvent) => {
      const target = e.target instanceof Element ? e.target : null
      if (target?.closest('input, textarea, select, [contenteditable]')) return
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); undo(id); return }
      if (e.metaKey || e.ctrlKey || e.altKey) return
      if (e.key === '/') { e.preventDefault(); search.current?.focus(); return }
      if (e.key === 'Escape') { select(null); return }
      const at = current ? visible.findIndex((i) => i.id === current.id) : -1
      if (['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp'].includes(e.key)) {
        e.preventDefault()
        const step = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : -1
        const next = visible[at < 0 ? 0 : Math.min(visible.length - 1, Math.max(0, at + step))]
        if (next) select(next.id)
        return
      }
      if (!moves || !current) return
      if (/^[0-9]$/.test(e.key)) {
        const n = Number(e.key)
        if (id === 'umas') moves.rank(tiers[(n + 9) % 10]!.id)
        else if (n === 0) moves.rank(null)
        else if (tiers[n - 1]) moves.rank(tiers[n - 1]!.id)
        return
      }
      if (e.key === 'Backspace' || e.key === 'Delete') { e.preventDefault(); moves.rank(null); return }
      if (e.key === '[' || e.key === '{') { moves[e.shiftKey || e.key === '{' ? 'tierStep' : 'shift'](-1); return }
      if (e.key === ']' || e.key === '}') { moves[e.shiftKey || e.key === '}' ? 'tierStep' : 'shift'](1); return }
      if ((e.key === 'd' || e.key === 'D') && id === 'umas') {
        const found = outfitIndex(data.catalog).get(Number(current.id)), who = identityByOutfit(data.catalog, data.profiles).get(Number(current.id))
        if (found && who && !who.sister) editProfiles(setDefaultOutfit(data.profiles, found.uma, found.outfit.id))
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [board, data, id, current, visible, moves, tiers, select, undo, editProfiles])

  if (!board) return <Navigate to="/ranker" replace />
  if (!data || !state || !all) return <div className="fixed inset-0 flex items-center justify-center bg-page text-ink-soft">Loading the boards</div>

  const drag = (item: Item) => (e: DragEvent) => { e.dataTransfer.setData('text/plain', item.id); e.dataTransfer.effectAllowed = 'move' }
  const drop = (tier: AnyTier | null) => (e: DragEvent) => {
    e.preventDefault(); setDropAt(null)
    const moved = e.dataTransfer.getData('text/plain'), before = (e.target as HTMLElement).closest<HTMLElement>('[data-id]')?.dataset.id ?? null
    if (!moved || moved === before) return
    change((s) => (tier ? place(s, moved, tier, before) : setTier(s, moved, null)))
    select(moved)
  }
  const over = (key: string) => (e: DragEvent) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; if (dropAt !== key) setDropAt(key) }
  const bulk = (tier: AnyTier) => change((s) => unranked.reduce((acc, i) => setTier(acc, i.id, tier), s))
  const importBoard = async (f: File) => {
    try { const parsed = parseBoard(JSON.parse(await f.text()) as unknown, id); edit(id, { ...parsed, revision: state.revision }) }
    catch (e) { alert(e instanceof Error ? e.message : String(e)) }
  }
  const status = saving[id] === 'saving' ? 'Saving…' : saving[id] === 'failed' ? 'Not saved' : 'Saved'
  const stats = { ranked: list.filter((i) => tierOf.get(i.id)).length, pool: list.length }

  const rowView = (key: string, label: ReactNode, sub: string, cls: string, cards: Item[], tier: AnyTier | null | 'out') => (
    <section key={key} className={`tier-row ${cls} rounded-md bg-panel shadow-1 ${dropAt === key ? 'drop-target' : ''}`}
      onDragOver={tier === 'out' ? undefined : over(key)} onDragLeave={() => setDropAt(null)} onDrop={tier === 'out' ? undefined : drop(tier)}>
      <header className="flex items-baseline gap-2 px-3 pt-2">
        {label}<span className="text-xs text-ink-faint">{sub}</span><span className="ml-auto text-xs text-ink-faint">{cards.length}</span>
      </header>
      <div className="flex min-h-16 flex-wrap gap-1.5 p-2">
        {cards.map((i) => <Card key={i.id} item={i} selected={i.id === current?.id} onSelect={() => select(i.id === current?.id ? null : i.id)} onDragStart={drag(i)} />)}
      </div>
    </section>
  )

  const panel = current && moves ? <Detail board={id} item={current} tier={tierOf.get(current.id) ?? null} moves={moves} /> : null
  return (
    <AppFrame
      top={<PlaceHeader title={board.title} onBack={() => void navigate('/ranker')} words={{ back: 'Uma Ranker', about: 'About this board' }}
        about={<><p>{board.blurb}</p><p>{board.pool}</p>{board.next && <p>Leftovers go to {BOARDS.find((b) => b.id === board.next)?.title}.</p>}</>}>
        <span className="hidden text-xs text-ink-faint sm:inline">{status}</span>
        <Button size="sm" variant="tertiary" disabled={!canUndo(id)} onClick={() => undo(id)} title="Undo (Cmd/Ctrl+Z)">Undo</Button>
      </PlaceHeader>}
      overlays={!wide && <Sheet open={!!panel} onClose={() => select(null)} title={current?.name}>{panel}</Sheet>}
    >
      <div className="flex h-full">
        <main className="pb-safe h-full min-w-0 flex-1 overflow-y-auto bg-page px-3 py-3 sm:px-4">
          <div className="mx-auto flex max-w-6xl flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <input ref={search} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search (/)" aria-label="Search"
                className="min-h-11 w-full rounded-sm border border-hairline-strong bg-panel px-3 text-ink sm:w-56" />
              {(board.kind !== 'enemy') && (
                <div className="flex flex-wrap gap-1" role="group" aria-label="Playstyle">
                  <Chip selected={way === 'all'} onClick={() => setWay('all')}>Every playstyle</Chip>
                  {WAYS.map((w) => <Chip key={w.id} selected={way === w.id} onClick={() => setWay(w.id)}>{w.label}</Chip>)}
                </div>
              )}
              <Chip selected={onlyUnranked} onClick={() => setOnlyUnranked((v) => !v)}>Unranked only</Chip>
              <span className="text-sm text-ink-soft">{stats.ranked} of {stats.pool} ranked</span>
            </div>
            {!onlyUnranked && rows.map((r) => rowView(r.tier.id, <TierBadge tier={r.tier.id} />, `${r.tier.label} · ${r.tier.description}`, `tier-${r.tier.id}`, r.items, r.tier.id))}
            {rowView('unranked', <span className="font-display font-bold">Unranked</span>, board.kind === 'outfit' ? 'Outfits not in a batch yet; Umas with none ranked stay Uma NPCs.' : 'Leftovers flow to the next board.', 'unranked', unranked, null)}
            {board.franchise && leftOut.length > 0 && rowView('out', <span className="font-display font-bold">Left out</span>, 'On no board. Rank one to bring it back.', 'unranked opacity-80', leftOut, 'out')}
            {unranked.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 text-sm text-ink-soft">
                <span>Rank the {unranked.length} shown unranked as</span>
                {tiers.map((t) => <button key={t.id} type="button" onClick={() => { if (confirm(`Rank all ${unranked.length} shown unranked as ${t.id}?`)) bulk(t.id) }} className={`tier-badge tier-${t.id} min-h-9 min-w-9 rounded-sm px-1.5 font-display font-bold text-ink`}>{t.id}</button>)}
              </div>
            )}
            <div className="flex flex-wrap gap-2 pt-2">
              <Button size="sm" variant="secondary" onClick={() => download(`${id}.json`, state)}>Export board</Button>
              <Button size="sm" variant="secondary" onClick={() => file.current?.click()}>Import board</Button>
              <input ref={file} type="file" accept="application/json" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) void importBoard(f); e.target.value = '' }} />
            </div>
          </div>
        </main>
        {wide && (
          <aside className="h-full w-96 shrink-0 overflow-y-auto border-l border-hairline bg-panel p-4" aria-label="Card">
            {panel ?? <p className="text-sm text-ink-soft">Pick a card to rank it. Keys: {id === 'umas' ? '1–9 and 0 for T1–T10' : `1–${tiers.length} for ${tiers.map((t) => t.id).join(', ')}, 0 unranks`}; Backspace unranks; arrows browse; [ ] move one place; Shift+[ ] a whole tier{id === 'umas' ? '; D makes an outfit her default' : ''}.</p>}
          </aside>
        )}
      </div>
    </AppFrame>
  )
}
