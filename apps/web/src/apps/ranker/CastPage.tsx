// Uma Cyberpunk's enemy casting (P193): the Umas of the ten batches, read only, tier by tier, each with her faction and
// four slots: one Boss (♛, the boss boards' SS) and three Sub-bosses (◆, their S). A slot opens a picker with every
// franchise's candidates in board order; anyone already cast is gone from every picker. Factions start one after another
// in ranking order and can be renamed and changed. Keys: Escape closes the picker, Cmd/Ctrl+Z undoes, / searches.
import {
  castCandidates, castPlan, dropUma, FRANCHISES, inBatch, outfitIndex, rankedIdentities, renameFaction, setFaction, setSlot, SUB_BOSS_SLOTS, withFactions,
  type CastGame, type CastPlan, type CastSlot, type EnemyCast, type EnemyUnit, type Franchise,
} from '@uma-platform/tiers'
import { AppFrame, PlaceHeader } from '@luismlorenzana/uma-kit/shell'
import { Button, Chip, Panel, Sheet } from '@luismlorenzana/uma-kit/ui'
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { Art } from './art'
import { useRanker } from './data'
import { TierBadge } from './Detail'

const GAME_TITLE: Record<CastGame, string> = { cyberpunk: 'Uma Cyberpunk' }
const SLOTS: CastSlot[] = ['boss', ...Array.from({ length: SUB_BOSS_SLOTS }, (_, i) => i)]
const slotName = (slot: CastSlot) => (slot === 'boss' ? 'Boss' : `Sub-boss ${slot + 1}`)
const parseSlot = (value: string | null): CastSlot | null => (value === 'boss' ? 'boss' : value !== null && /^[0-2]$/.test(value) ? Number(value) : null)
const franchiseLabel = (f: Franchise | null) => FRANCHISES.find((x) => x.id === f)?.label ?? f ?? ''
type Row = CastPlan['tiers'][number]['umas'][number]
type CastPick = Row['boss']

function useWide(): boolean {
  const query = '(min-width: 1024px)'
  const [wide, setWide] = useState(() => typeof window !== 'undefined' && window.matchMedia(query).matches)
  useEffect(() => {
    const m = window.matchMedia(query), on = () => setWide(m.matches)
    m.addEventListener('change', on); return () => m.removeEventListener('change', on)
  }, [])
  return wide
}

function SlotButton({ slot, pick, unit, selected, onOpen }: { slot: CastSlot; pick: CastPick; unit: EnemyUnit | undefined; selected: boolean; onOpen: () => void }) {
  const boss = slot === 'boss'
  const label = pick ? `${slotName(slot)}: ${pick.name}${pick.fits ? '' : ` (now ${pick.tier ?? 'unranked'} on her board)`}` : `${slotName(slot)}: open`
  return (
    <button type="button" onClick={onOpen} title={label} aria-label={label} aria-pressed={selected}
      className={`slot ${boss ? 'slot-boss size-16' : 'slot-sub size-12'} ${pick ? '' : 'empty'} ${pick && !pick.fits ? 'misfit' : ''} ${selected ? 'ring-2 ring-accent ring-offset-1 ring-offset-panel' : ''}`}>
      {pick
        ? <Art path={unit?.images.face ?? unit?.images.art ?? null} kind="pack" alt={pick.name} className="size-full" />
        : <span className="slot-empty-label">{boss ? 'Boss' : 'Sub'}</span>}
      <span aria-hidden className="slot-mark">{boss ? '♛' : '◆'}</span>
    </button>
  )
}

function UmaCard({ row, face, factions, units, selected, onOpen, onFaction, onDrop }: {
  row: Pick<Row, 'uma' | 'name' | 'faction' | 'boss' | 'subBosses'> & { order?: number | null; sister?: boolean }
  face: string | null
  factions: EnemyCast['factions']
  units: Map<string, EnemyUnit>
  selected: CastSlot | null
  onOpen: (slot: CastSlot) => void
  onFaction: (faction: string) => void
  onDrop?: () => void
}) {
  const faction = factions.find((f) => f.id === row.faction)
  const picks = [row.boss, ...row.subBosses]
  return (
    <article className="cast-card flex flex-col gap-2 rounded-md bg-panel p-2 shadow-1" style={{ '--faction': faction?.color ?? 'transparent' } as CSSProperties}>
      <div className="flex items-center gap-2">
        <span className="relative shrink-0">
          <Art path={face} kind="release" alt={row.name} className="size-12 rounded-sm bg-raised" />
          {row.sister && <span aria-hidden className="absolute right-0.5 top-0.5 size-2.5 rounded-full bg-accent ring-1 ring-panel" />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-display font-bold leading-tight" title={row.name}>{row.name}</p>
          <label className="flex items-center gap-1 text-xs text-ink-soft">
            <span aria-hidden className="faction-dot size-2.5 shrink-0 rounded-full" />
            <span className="sr-only">Faction</span>
            <select value={row.faction} onChange={(e) => onFaction(e.target.value)} className="min-w-0 max-w-full truncate rounded-xs border border-hairline bg-panel px-1 py-0.5 text-xs text-ink">
              {factions.map((f) => <option key={f.id} value={f.id}>{f.title}</option>)}
            </select>
          </label>
        </div>
        {row.order != null && <span className="self-start text-[11px] text-ink-faint" title="Her place in the ranking">#{row.order}</span>}
      </div>
      <div className="flex items-end gap-1.5">
        {SLOTS.map((slot, i) => (
          <SlotButton key={String(slot)} slot={slot} pick={picks[i] ?? null} unit={picks[i] ? units.get(picks[i]!.id) : undefined} selected={selected === slot} onOpen={() => onOpen(slot)} />
        ))}
      </div>
      {onDrop && <Button size="sm" variant="tertiary" onClick={onDrop} title="Takes her off the casting and frees her picks">Free her picks</Button>}
    </article>
  )
}

function Picker({ game, cast, uma, slot, onPick, onClose }: { game: CastGame; cast: EnemyCast; uma: Row; slot: CastSlot; onPick: (unit: string | null) => void; onClose: () => void }) {
  const { data } = useRanker()
  const [query, setQuery] = useState('')
  const units = useMemo(() => new Map(data!.catalog.enemies.map((u) => [u.id, u])), [data])
  const candidates = useMemo(() => castCandidates(data!.catalog, data!.states, cast, slot), [data, cast, slot])
  const current = slot === 'boss' ? uma.boss : uma.subBosses[slot] ?? null
  const q = query.trim().toLowerCase()
  const groups = FRANCHISES.flatMap((f) => {
    const list = candidates.filter((c) => c.franchise === f.id).map((c) => units.get(c.id)!).filter((u) => u && (!q || u.name.toLowerCase().includes(q) || u.details.some((d) => d.toLowerCase().includes(q))))
    return list.length ? [{ franchise: f.id, label: f.label, list }] : []
  })
  const tier = slot === 'boss' ? 'SS' : 'S'
  const faction = cast.factions.find((f) => f.id === uma.faction)
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-xl font-bold leading-tight">{slot === 'boss' ? '♛' : '◆'} {slotName(slot)}</h2>
          <p className="text-sm text-ink-soft">for <b className="text-ink">{uma.name}</b> · <span className="cast-chip" style={{ '--faction': faction?.color } as CSSProperties}>{faction?.title}</span></p>
          <p className="text-xs text-ink-faint">Every boss board’s {tier}, in board order; anyone cast is gone ({GAME_TITLE[game]}).</p>
        </div>
        <Button size="sm" variant="tertiary" onClick={onClose} title="Close (Escape)">Close</Button>
      </div>
      {current && (
        <div className="flex items-center gap-2 rounded-md bg-raised p-2">
          <Art path={units.get(current.id)?.images.face ?? null} kind="pack" alt={current.name} className="size-12 rounded-sm" />
          <div className="min-w-0 flex-1 text-sm">
            <p className="truncate font-bold">{current.name}</p>
            <p className="text-ink-soft">{franchiseLabel(current.franchise)} · {current.tier ?? 'unranked'}{current.fits ? '' : ` (not ${tier} any more)`}</p>
          </div>
          <Button size="sm" variant="secondary" onClick={() => onPick(null)}>Clear</Button>
        </div>
      )}
      <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search a name" aria-label="Search the candidates" autoFocus
        className="min-h-11 w-full rounded-sm border border-hairline-strong bg-panel px-3 text-ink" />
      {groups.length === 0 && (
        <p className="text-sm text-ink-soft">{candidates.length ? 'Nobody matches.' : `No ${tier} left to cast on any boss board: rank more on the boss boards.`}</p>
      )}
      {groups.map((g) => (
        <section key={g.franchise} className="flex flex-col gap-1.5">
          <h3 className="flex items-baseline gap-2 text-sm font-semibold">
            <Link to={`/ranker/${g.franchise}-bosses`} className="hover:underline">{g.label}</Link><span className="font-normal text-ink-faint">{g.list.length}</span>
          </h3>
          <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-5">
            {g.list.map((u) => (
              <button key={u.id} type="button" onClick={() => onPick(u.id)} title={[u.name, ...u.details].join(' · ')}
                className="flex min-w-0 flex-col items-center gap-0.5 rounded-sm p-0.5 text-center hover:bg-raised">
                <Art path={u.images.face ?? u.images.art ?? null} kind="pack" alt={u.name} className={`size-14 rounded-sm bg-raised ${slot === 'boss' ? 'pick-boss' : 'pick-sub'}`} />
                <span className="line-clamp-2 w-full break-words text-[11px] leading-tight">{u.name}</span>
              </button>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}

export function CastPage({ game }: { game: CastGame }) {
  const { data, error, editCast, undoCast, canUndoCast, saving } = useRanker()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const [query, setQuery] = useState('')
  const [only, setOnly] = useState<string | 'all'>('all')
  const [openOnly, setOpenOnly] = useState(false)
  const search = useRef<HTMLInputElement>(null)
  const wide = useWide()
  const selected = useMemo(() => {
    const uma = params.get('u'), slot = parseSlot(params.get('s'))
    return uma && slot !== null ? { uma, slot } : null
  }, [params])
  const select = useCallback((next: { uma: string; slot: CastSlot } | null) => setParams((p) => {
    const n = new URLSearchParams(p)
    if (next) { n.set('u', next.uma); n.set('s', String(next.slot)) } else { n.delete('u'); n.delete('s') }
    return n
  }, { replace: true }), [setParams])

  const identities = useMemo(() => (data ? rankedIdentities(data.catalog, data.states, data.profiles) : []), [data])
  const batch = useMemo(() => identities.filter(inBatch), [identities])
  /** The casting with every Uma in the batches given a faction: what the page edits and saves. */
  const cast = useMemo(() => (data ? withFactions(data.casts[game], batch) : null), [data, game, batch])
  const view = useMemo(() => (data ? castPlan(data.catalog, data.states, identities, data.casts[game]) : null), [data, identities, game])
  const units = useMemo(() => new Map(data?.catalog.enemies.map((u) => [u.id, u]) ?? []), [data])
  const faces = useMemo(() => (data ? outfitIndex(data.catalog) : null), [data])
  /** Every card by Uma: the batches', then those outside them who still hold picks (with their identity's face). */
  const rows = useMemo(() => {
    if (!view) return new Map<string, Row>()
    const byId = new Map(identities.map((i) => [i.id, i]))
    const outside = view.outside.map((o): Row => {
      const i = byId.get(o.uma)
      return { ...o, characterId: Number(i?.characterId ?? 0), sister: !!i?.sister, order: i?.order ?? null, defaultOutfit: i?.defaultOutfit ?? 0 }
    })
    return new Map([...view.tiers.flatMap((t) => t.umas), ...outside].map((r) => [r.uma, r]))
  }, [view, identities])
  const current = selected ? rows.get(selected.uma) ?? null : null

  const change = useCallback((next: (c: EnemyCast) => EnemyCast) => { if (cast) editCast(game, next(cast)) }, [cast, editCast, game])
  const pick = (unit: string | null) => {
    if (!selected || !cast) return
    const next = setSlot(cast, selected.uma, selected.slot, unit)
    change(() => next)
    if (unit === null) return
    // On to her next open slot, else close.
    const entry = next.umas.find((e) => e.uma === selected.uma)!
    const open = SLOTS.find((s) => (s === 'boss' ? !entry.boss : !entry.subBosses[s]))
    select(open === undefined ? null : { uma: selected.uma, slot: open })
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target instanceof Element ? e.target : null
      if (e.key === 'Escape') { select(null); return }
      if (target?.closest('input, textarea, select, [contenteditable]')) return
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); undoCast(game); return }
      if (e.key === '/') { e.preventDefault(); search.current?.focus() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [select, undoCast, game])

  if (error) return <div className="fixed inset-0 flex items-center justify-center bg-page p-8 text-center text-ink-soft">The Ranker couldn’t load: {error}</div>
  if (!data || !cast || !view) return <div className="fixed inset-0 flex items-center justify-center bg-page text-ink-soft">Loading the casting</div>

  const faceOf = (r: Pick<Row, 'defaultOutfit'>) => faces?.get(r.defaultOutfit)?.outfit.face ?? null
  const q = query.trim().toLowerCase()
  const shown = (r: Row) => (only === 'all' || r.faction === only) && (!q || r.name.toLowerCase().includes(q)) && (!openOnly || !r.boss || r.subBosses.some((s) => !s))
  const filled = (list: readonly Row[]) => ({ bosses: list.filter((r) => r.boss).length, subs: list.reduce((n, r) => n + r.subBosses.filter(Boolean).length, 0) })
  const key = `cast:${game}` as const
  const status = saving[key] === 'saving' ? 'Saving…' : saving[key] === 'failed' ? 'Not saved' : 'Saved'
  const card = (r: Row, drop?: () => void) => (
    <UmaCard key={r.uma} row={r} face={faceOf(r)} factions={cast.factions} units={units} selected={selected?.uma === r.uma ? selected.slot : null}
      onOpen={(slot) => select(selected?.uma === r.uma && selected.slot === slot ? null : { uma: r.uma, slot })}
      onFaction={(f) => change((c) => setFaction(c, r.uma, f))} onDrop={drop} />
  )
  const panel = current && selected ? <Picker game={game} cast={cast} uma={current} slot={selected.slot} onPick={pick} onClose={() => select(null)} /> : null

  return (
    <AppFrame
      top={<PlaceHeader title={`${GAME_TITLE[game]} enemies`} onBack={() => void navigate('/ranker')} words={{ back: 'Uma Ranker', about: 'About the casting' }}
        about={<>
          <p>The Umas of the ten batches, as ranked on Playable Umas (read only). Each fights one of the factions, given one after another in ranking order; change one on her card.</p>
          <p>♛ Boss: one, from the boss boards’ SS. ◆ Sub-boss: three, from their S. Every franchise is offered; an enemy cast once is gone from every slot.</p>
          <p>Keys: Escape closes the picker; Cmd/Ctrl+Z undoes; / searches.</p>
        </>}>
        <span className="hidden text-xs text-ink-faint sm:inline">{status}</span>
        <Button size="sm" variant="tertiary" disabled={!canUndoCast(game)} onClick={() => undoCast(game)} title="Undo (Cmd/Ctrl+Z)">Undo</Button>
      </PlaceHeader>}
      overlays={!wide && <Sheet open={!!panel} onClose={() => select(null)} title={current?.name}>{panel}</Sheet>}
    >
      <div className="flex h-full">
        <main className="pb-safe h-full min-w-0 flex-1 overflow-y-auto bg-page px-3 py-3 sm:px-4">
          <div className="mx-auto flex max-w-6xl flex-col gap-3">
            <Panel>
              <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 text-sm">
                <span><b className="font-display text-lg">{view.counts.bosses}</b> / {view.counts.umas} ♛ Bosses</span>
                <span><b className="font-display text-lg">{view.counts.subBosses}</b> / {view.counts.umas * SUB_BOSS_SLOTS} ◆ Sub-bosses</span>
                <span className="text-ink-soft">Left to cast: <b className="text-ink">{view.counts.available.boss}</b> SS · <b className="text-ink">{view.counts.available.subBoss}</b> S</span>
                {view.counts.misfits > 0 && <span className="text-ink-soft" title="Picks whose tier changed on their board since">⚠ {view.counts.misfits} re-ranked since</span>}
              </div>
              <ul className="faction-grid mt-3 grid gap-1.5" aria-label="Factions">
                {view.byFaction.map((f) => (
                  <li key={f.id} className={`cast-faction flex flex-col gap-1 rounded-sm bg-raised p-2 ${only === f.id ? 'ring-2 ring-accent' : ''}`} style={{ '--faction': f.color } as CSSProperties}>
                    <div className="flex items-center gap-1.5">
                      <button type="button" onClick={() => setOnly(only === f.id ? 'all' : f.id)} aria-pressed={only === f.id} title={only === f.id ? 'Show every faction' : 'Show only this faction'}
                        className="faction-dot size-4 shrink-0 rounded-full" />
                      <input defaultValue={f.title} key={`${f.id}:${f.title}`} aria-label={`Name of ${f.title}`} maxLength={60}
                        onBlur={(e) => change((c) => renameFaction(c, f.id, e.target.value))} onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur() }}
                        className="min-w-0 flex-1 rounded-xs bg-transparent px-1 font-display font-bold hover:bg-panel focus:bg-panel" />
                    </div>
                    <span className="text-xs text-ink-soft">{f.umas.length} Umas · ♛ {f.bosses}/{f.umas.length} · ◆ {f.subBosses}/{f.umas.length * SUB_BOSS_SLOTS}</span>
                  </li>
                ))}
              </ul>
            </Panel>
            <div className="flex flex-wrap items-center gap-2">
              <input ref={search} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search an Uma (/)" aria-label="Search an Uma"
                className="min-h-11 w-full rounded-sm border border-hairline-strong bg-panel px-3 text-ink sm:w-56" />
              <Chip selected={only === 'all'} onClick={() => setOnly('all')}>Every faction</Chip>
              <Chip selected={openOnly} onClick={() => setOpenOnly((v) => !v)}>Open slots only</Chip>
            </div>
            {view.tiers.map((t) => {
              const list = t.umas.filter(shown), all = filled(t.umas)
              return (
                <section key={t.tier} className={`tier-row tier-${t.tier} rounded-md bg-panel shadow-1`} aria-label={t.tier}>
                  <header className="flex flex-wrap items-center gap-2 px-3 py-2">
                    <TierBadge tier={t.tier} />
                    <span className="ml-auto text-xs text-ink-soft">{t.umas.length} Umas · ♛ {all.bosses}/{t.umas.length} · ◆ {all.subs}/{t.umas.length * SUB_BOSS_SLOTS}</span>
                  </header>
                  {list.length > 0
                    ? <div className="cast-grid grid gap-2 px-2 pb-2">{list.map((r) => card(r))}</div>
                    : <p className="px-3 pb-3 text-sm text-ink-faint">{t.umas.length ? 'None shown.' : 'No Umas in this tier.'}</p>}
                </section>
              )
            })}
            {view.outside.length > 0 && (
              <section className="tier-row unranked rounded-md bg-panel shadow-1">
                <header className="px-3 py-2" title="Umas no longer in a batch who still hold picks: free them to cast those enemies again.">
                  <span className="font-display font-bold">No longer in a batch</span><span className="ml-2 text-xs text-ink-soft">{view.outside.length}</span>
                </header>
                <div className="cast-grid grid gap-2 px-2 pb-2">
                  {view.outside.map((o) => card(rows.get(o.uma)!, () => change((c) => dropUma(c, o.uma))))}
                </div>
              </section>
            )}
          </div>
        </main>
        {wide && (
          <aside className="h-full w-96 shrink-0 overflow-y-auto border-l border-hairline bg-panel p-4" aria-label="Slot">
            {panel ?? <p className="text-sm text-ink-soft">Pick a slot: ♛ Boss or ◆ Sub-boss.</p>}
          </aside>
        )}
      </div>
    </AppFrame>
  )
}
