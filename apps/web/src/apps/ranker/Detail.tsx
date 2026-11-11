// The card panel (RK1): the picture, the tier buttons, the moves, the note, and what the card is: an outfit with her
// sister's profile and her other outfits, a character, or an enemy unit with its membership and Left out.
import {
  BOARDS, boardOf, defaultOutfit, identityByOutfit, importBoardOf, outfitIndex, ownOutfits, setDefaultOutfit, setMember, setOut, STYLES, tiersOf,
  type AnyTier, type BoardId, type BoardState,
} from '@uma-platform/tiers'
import { Button } from '@luismlorenzana/uma-kit/ui'
import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { Art } from './art'
import { useRanker } from './data'
import { wayLabel, type Item } from './view'

export interface Moves {
  rank: (tier: AnyTier | null) => void
  shift: (direction: -1 | 1) => void
  tierStep: (direction: -1 | 1) => void
  note: (text: string) => void
}

export function TierBadge({ tier, className = '' }: { tier: AnyTier | null; className?: string }) {
  return <span className={`tier-badge tier-${tier ?? 'none'} inline-flex min-w-9 items-center justify-center rounded-xs px-1.5 py-0.5 font-display text-[12px] font-bold text-ink ${tier ? '' : 'bg-sunken text-ink-faint'} ${className}`}>{tier ?? '—'}</span>
}

export function Detail({ board, item, tier, moves }: { board: BoardId; item: Item; tier: AnyTier | null; moves: Moves }) {
  const { data, edit, editProfiles } = useRanker()
  const [note, setNote] = useState('')
  const state = data!.states[board]
  const saved = state.entries.find((e) => e.id === item.id)?.note ?? ''
  useEffect(() => setNote(saved), [item.id, saved])
  if (!data) return null
  const { catalog, profiles, states } = data
  const kind = boardOf(board)!.kind

  const uma = item.characterId ? catalog.umas.find((u) => u.id === item.characterId) : undefined
  const outfit = kind === 'outfit' ? outfitIndex(catalog).get(Number(item.id))?.outfit : uma ? defaultOutfit(uma, profiles) : undefined
  const identity = kind === 'outfit' ? identityByOutfit(catalog, profiles).get(Number(item.id)) : undefined
  const unit = kind === 'enemy' ? catalog.enemies.find((u) => u.id === item.id) : undefined
  const own = uma ? ownOutfits(uma, profiles) : []
  const isDefault = uma && outfit ? defaultOutfit(uma, profiles)?.id === outfit.id : false
  const tierOf = (outfitId: number) => states.umas.entries.find((e) => e.id === String(outfitId))?.tier ?? null
  const sisters = uma ? profiles.sisters.filter((s) => String(s.characterId) === uma.id) : []

  const editBoard = (id: BoardId, change: (s: BoardState) => BoardState) => edit(id, change(states[id]))
  const member = unit?.franchise === 'azurlane' ? (states['azurlane-bosses'].members ?? []).includes(unit.id) : null
  const importBoard = unit ? importBoardOf(unit.franchise) : undefined
  const isOut = importBoard ? (states[importBoard.id].out ?? []).includes(item.id) : false

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-3">
        <Art path={kind === 'enemy' ? unit?.images.art ?? item.image : outfit?.portrait ?? item.image} kind={item.imageKind} alt={item.name} className="size-32 shrink-0 rounded-md bg-raised" />
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-xl font-bold leading-tight tracking-tight">{item.name}</h2>
          <p className="text-sm text-ink-soft">{item.line}</p>
          <p className="mt-2 flex flex-wrap items-center gap-2 text-sm"><TierBadge tier={tier} />{item.way && <span className="text-ink-soft">{wayLabel(item.way)}</span>}</p>
          {item.via && <p className="mt-1 text-xs text-ink-faint">From {BOARDS.find((b) => b.id === item.via)?.title}{item.viaTier ? `, ${item.viaTier}` : ', unranked'}</p>}
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Tier">
        {tiersOf(board).map((t, i) => (
          <button key={t.id} type="button" onClick={() => moves.rank(t.id)} aria-pressed={tier === t.id} title={`${t.label}: ${t.description} (key ${board === 'umas' ? (t.id === 'F' ? 'F' : (i + 1) % 10) : i + 1})`}
            className={`tier-badge tier-${t.id} min-h-10 min-w-10 rounded-sm px-2 font-display text-sm font-bold text-ink ${tier === t.id ? 'ring-2 ring-ink' : ''}`}>{t.id}</button>
        ))}
        <button type="button" onClick={() => moves.rank(null)} className="min-h-10 rounded-sm bg-sunken px-3 text-sm text-ink-soft" title="Unrank (Backspace)">Unrank</button>
      </div>
      {tier && (
        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4" role="group" aria-label="Move">
          <Button size="sm" variant="secondary" onClick={() => moves.shift(-1)} title="One place up ([)">▲ Up one</Button>
          <Button size="sm" variant="secondary" onClick={() => moves.shift(1)} title="One place down (])">▼ Down one</Button>
          <Button size="sm" variant="secondary" onClick={() => moves.tierStep(-1)} title="To the tier above (Shift+[)">⇈ Tier up</Button>
          <Button size="sm" variant="secondary" onClick={() => moves.tierStep(1)} title="To the tier below (Shift+])">⇊ Tier down</Button>
        </div>
      )}

      <label className="flex flex-col gap-1 text-sm">
        <span className="text-ink-soft">Note</span>
        <textarea value={note} onChange={(e) => setNote(e.target.value)} onBlur={() => { if (note !== saved) moves.note(note) }} rows={3} maxLength={4000}
          className="rounded-sm border border-hairline-strong bg-panel p-2 text-ink" />
      </label>

      {identity?.sister && (
        <section className="rounded-md bg-raised p-3 text-sm">
          <h3 className="font-display font-bold">{identity.sister.name}</h3>
          <p className="text-ink-soft">{uma?.name}’s {identity.sister.relation}. She ran the same career in {identity.sister.age}.</p>
          <p className="mt-2">{identity.sister.profile}</p>
        </section>
      )}

      {outfit && (
        <section className="text-sm">
          <h3 className="mb-1 text-ink-soft">Running styles</h3>
          <div className="flex gap-3">{STYLES.map((s) => <span key={s}><span className="text-ink-faint capitalize">{s}</span> <b>{outfit.strategy[s]}</b></span>)}</div>
        </section>
      )}

      {uma && (
        <section className="text-sm">
          <h3 className="mb-1 text-ink-soft">{uma.name}’s outfits{sisters.length ? ' and sisters' : ''}</h3>
          <ul className="flex flex-col gap-1">
            {uma.outfits.map((o) => {
              const sister = profiles.sisters.find((s) => s.outfitId === o.id)
              return (
                <li key={o.id} className="flex items-center gap-2">
                  <TierBadge tier={tierOf(o.id)} />
                  <Link to={`/ranker/umas?u=${o.id}`} className={`min-w-0 flex-1 truncate ${String(o.id) === item.id && kind === 'outfit' ? 'font-bold' : ''}`}>
                    {sister ? <>{sister.name} <span className="text-ink-faint">· {o.title}</span></> : o.title}
                  </Link>
                  {!sister && defaultOutfit(uma, profiles)?.id === o.id && <span className="text-xs text-accent-strong">★ Default</span>}
                </li>
              )
            })}
          </ul>
          {kind === 'outfit' && !identity?.sister && outfit && (
            isDefault
              ? <p className="mt-2 text-xs text-ink-faint">Her default outfit{profiles.characters[uma.id]?.defaultOutfit === outfit.id ? ', locked in' : ', by the rule'}: her face on Uma NPCs and in the plan.</p>
              : <Button size="sm" variant="secondary" className="mt-2" onClick={() => editProfiles(setDefaultOutfit(profiles, uma, outfit.id))} title="Make it her default (D)">★ Make it her default</Button>
          )}
          {kind === 'uma' && <p className="mt-2 text-xs text-ink-faint">{own.length} outfit{own.length === 1 ? '' : 's'} of her own; rank them on Playable Umas.</p>}
        </section>
      )}

      {unit && (
        <section className="flex flex-col gap-2 text-sm">
          {unit.details.length > 0 && <p className="text-ink-soft">{unit.details.join(' · ')}</p>}
          {member !== null && (
            <Button size="sm" variant="secondary" onClick={() => editBoard('azurlane-bosses', (s) => setMember(s, unit.id, !member))}>
              {member ? 'Take off Azur Lane bosses' : 'Add to Azur Lane bosses'}
            </Button>
          )}
          {importBoard && (
            <Button size="sm" variant={isOut ? 'secondary' : 'destructive'} onClick={() => editBoard(importBoard.id, (s) => setOut(s, unit.id, !isOut))}>
              {isOut ? 'Bring it back, unranked' : 'Leave out of every board'}
            </Button>
          )}
        </section>
      )}

      {item.hints.length > 0 && <ul className="text-xs text-ink-faint">{item.hints.map((h) => <li key={h}>{h}</li>)}</ul>}
    </div>
  )
}
