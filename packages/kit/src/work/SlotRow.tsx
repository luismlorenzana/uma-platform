import { MAX_QUEUE, sameSlot, type SlotRef } from '@luismlorenzana/uma-work'
import { useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import { FaceTile } from '../album/art.js'
import { Sheet } from '../ui/BottomSheet.js'
import { ArrowDownIcon, MoreIcon, PlusIcon, RetryIcon, TicketIcon } from '../ui/icons/index.js'
import { WorkItem } from './art.js'
import { useTap, useWork, TapNoteLine } from './context.js'
import { RecallSheet, SpeedUpControls, WORK_BUTTON } from './controls.js'
import { QueueChips, QueueCount, QueueLine } from './QueueChips.js'
import { durationText } from './words.js'
import type { SlotCardModel } from './model.js'

const ICON = 'flex size-11 shrink-0 items-center justify-center rounded-full border border-hairline-strong bg-panel text-ink disabled:opacity-45'
export function FaceRing({ outfitId, progress, ready, size = 44 }: { outfitId: string; progress: number; ready: boolean; size?: number }) {
  const degrees = Math.round(Math.max(0, Math.min(1, progress)) * 360)
  return <span aria-hidden data-ring={ready ? 'ready' : degrees} className="flex shrink-0 items-center justify-center rounded-full p-[3px]"
    style={{ width: size, height: size, background: ready ? 'var(--color-accent)' : `conic-gradient(var(--color-accent-strong) ${degrees}deg, var(--color-hairline-strong) 0)` }}>
    <span className="block size-full rounded-full border-2 border-panel bg-sunken"><FaceTile outfitId={outfitId} size={size - 10} round label="" /></span>
  </span>
}
export interface SlotRowProps {
  readonly slot: SlotRef
  readonly startTo?: string; readonly onStart?: () => void
  readonly queueTo?: string; readonly onQueue?: (outfitId: string) => void
  readonly startLabel?: string; readonly repeat?: boolean
  readonly what?: { readonly icon?: ReactNode; readonly name: string }
}
export function SlotRow(props: SlotRowProps) { return <SlotEntry {...props} compact={false} /> }
export function PeekRow(props: SlotRowProps) { return <SlotEntry {...props} compact /> }

function SlotEntry(props: SlotRowProps & { compact: boolean }) {
  const { view } = useWork()
  const card = view.cards(props.slot.building).find((one) => sameSlot(one.slot, props.slot))
  const seconds = card?.kind === 'held' ? view.settled.work[card.outfitId]?.entries.at(-1)?.seconds : undefined
  const generation = useRef({ seconds, key: 0 })
  if (seconds !== generation.current.seconds) generation.current = { seconds, key: generation.current.key + 1 }
  if (card === undefined) return null
  // The frozen seconds array survives acceleration, but a queued start creates a new one, even in the same ms.
  const identity = card.kind === 'free' ? 'free' : `${card.outfitId}:${card.startedAt}:${generation.current.key}`
  return <Row key={identity} {...props} card={card} />
}

function Row({ slot, startTo, onStart, queueTo, onQueue, startLabel, repeat = false, what, compact, card }: SlotRowProps & { compact: boolean; card: SlotCardModel }) {
  const { view, actions, copy, requestLabel, umaName } = useWork()
  const tap = useTap()
  const [sheet, setSheet] = useState<'speed' | 'more' | 'recall' | null>(null)
  if (card.kind === 'free') {
    const body = <><span aria-hidden className="flex size-11 shrink-0 items-center justify-center rounded-full border-2 border-dashed border-accent/60"><PlusIcon size={24} /></span><span>{copy('free')}</span></>
    const style = `flex w-full ${compact ? 'min-h-12' : 'min-h-14'} items-center gap-2 rounded-md border border-dashed border-hairline-strong px-1.5 text-[13px] text-ink-soft`
    const label = copy('startSlot', { n: slot.slot + 1, start: startLabel ?? copy('startJob') })
    return <article data-kit={compact ? 'peek-row' : 'slot-row'} data-slot-card="free" data-slot={slot.slot} aria-label={copy('cardFree', { n: slot.slot + 1 })}>
      {startTo ? <Link to={startTo} state={{ back: true }} className={style} aria-label={label}>{body}</Link>
        : onStart ? <button type="button" onClick={onStart} className={style} aria-label={label}>{body}</button>
        : <div className={style}>{body}</div>}
    </article>
  }
  const described = requestLabel(card.request)
  const name = what?.name ?? described.name
  const icon = what?.icon ?? (described.item === undefined ? null : <WorkItem id={described.item} />)
  const ready = !card.running
  const queueFull = card.queue.length >= MAX_QUEUE
  const voice = copy(card.running ? 'cardRunning' : 'cardReady', { uma: umaName(card.outfitId), what: name, made: card.made, count: card.count, left: durationText(card.leftMs) })
  return <article data-kit={compact ? 'peek-row' : 'slot-row'} data-slot-card={ready ? 'ready' : 'running'} data-slot={slot.slot} data-outfit={card.outfitId}
    aria-label={voice} className="space-y-1 rounded-md border border-hairline bg-panel px-1.5 py-1 shadow-1">
    <div className={`flex ${compact ? 'min-h-9' : 'min-h-11'} items-center gap-1.5`}>
      <FaceRing outfitId={card.outfitId} progress={card.progress} ready={ready} size={compact ? 40 : 44} />
      <span aria-hidden className="flex size-8 shrink-0 items-center justify-center">{icon}</span>
      <span aria-hidden className="min-w-0 flex-1 leading-tight tabular-nums">
        <span className="block truncate text-[14px] font-semibold">×{card.count}<span className="font-normal text-ink-soft"> · {card.made}/{card.count}</span></span>
        <span className={`block text-[13px] font-semibold ${ready ? 'text-accent-strong' : ''}`}>{ready ? copy('done') : durationText(card.leftMs)}</span>
      </span>
      {compact && <QueueCount n={card.queue.length} />}
      {card.waiting > 0 && actions.collect && <button type="button" disabled={tap.pending} data-action="collect" aria-label={copy('collectLabel', { n: card.waiting, what: name })}
        onClick={() => void tap.run(() => actions.collect!({ outfitId: card.outfitId }))} className="flex h-11 min-w-11 shrink-0 items-center justify-center gap-0.5 rounded-full bg-accent px-2 font-semibold text-accent-ink disabled:opacity-45"><ArrowDownIcon size={16} />{card.waiting}</button>}
      {ready && repeat && actions.repeat && <button type="button" disabled={tap.pending} className={ICON} data-action="repeat" aria-label={copy('repeatLabel', { what: name })}
        onClick={() => void tap.run(() => actions.repeat!({ outfitId: card.outfitId }))}><RetryIcon size={20} /></button>}
      {!compact && card.running && actions.speedUp && <button type="button" className={ICON} data-action="speed" aria-label={copy('speedTitle', { what: name })} onClick={() => setSheet('speed')}><TicketIcon size={20} /></button>}
      {!compact && card.running && <button type="button" className={ICON} data-action="more" aria-label={`${copy('more')}: ${umaName(card.outfitId)}`} onClick={() => setSheet('more')}><MoreIcon size={20} /></button>}
    </div>
    {!compact && card.queue.length > 0 && <div className="pl-[52px]"><QueueLine outfitId={card.outfitId} /></div>}
    <TapNoteLine tap={tap} className="pl-[52px]" />
    <Sheet open={sheet === 'speed' && card.running} onClose={() => setSheet(null)} title={copy('speedTitle', { what: name })} closeLabel={copy('close')}>
      <p className="mb-2 text-[13px] text-ink-soft">{copy('speedLeft', { time: durationText(card.leftMs) })} · {copy('ticketsHeld', { n: view.speed(card.outfitId).have })}</p>
      <SpeedUpControls outfitId={card.outfitId} />
    </Sheet>
    <Sheet open={sheet === 'more' && card.running} onClose={() => setSheet(null)} title={`${umaName(card.outfitId)} · ${name}`} closeLabel={copy('close')}>
      <div className="space-y-3">
        <QueueChips outfitId={card.outfitId} />
        <div className="flex flex-wrap gap-2">
          {(queueTo || onQueue) && (queueFull ? <p className="min-h-11 text-[13px] text-ink-soft">{copy('queueFull')}</p>
            : queueTo ? <Link to={queueTo} state={{ back: true }} className={WORK_BUTTON} onClick={() => setSheet(null)}>{copy('queueNext')}</Link>
            : <button type="button" className={WORK_BUTTON} onClick={() => { setSheet(null); onQueue?.(card.outfitId) }}>{copy('queueNext')}</button>)}
          {actions.recall && <button type="button" className={`${WORK_BUTTON} text-danger`} onClick={() => setSheet('recall')}>{copy('recall')}</button>}
        </div>
      </div>
    </Sheet>
    <RecallSheet outfitId={card.outfitId} open={sheet === 'recall' && card.running} onClose={() => setSheet(null)} />
  </article>
}
