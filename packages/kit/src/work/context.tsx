import { createContext, useContext, useMemo, useRef, useState, type ReactNode } from 'react'
import type { QueueInput, Refusal, SpeedUpInput, StartInput, WorkEnv, WorkState } from '@luismlorenzana/uma-work'
import type { TicketOffer } from './model.js'
import { workView, type WorkView } from './view.js'
import { durationText, itemsList, workWords, type WorkCopy, type WorkNames, type WorkWords } from './words.js'

export type WorkAnswer = void | Refusal | { readonly kind: 'done' | 'say'; readonly message?: string } |
  { readonly kind: 'ask'; readonly message: string; readonly confirm: () => WorkAnswer | Promise<WorkAnswer> }
export type WorkAction<I> = (input: I) => WorkAnswer | Promise<WorkAnswer>
export interface WorkActions {
  readonly collect?: WorkAction<{ readonly outfitId: string }>
  /** The game owns Collect + Repeat, including any shrink/skip receipt. */
  readonly repeat?: WorkAction<{ readonly outfitId: string }>
  readonly speedUp?: WorkAction<SpeedUpInput>
  readonly finish?: WorkAction<{ readonly outfitId: string; readonly startedAt: number }>
  /** Must recheck entry identity, stock and current price before charging. */
  readonly buyAndFinish?: WorkAction<{ readonly outfitId: string; readonly startedAt: number; readonly tickets: number; readonly quote: TicketOffer }>
  readonly recall?: WorkAction<{ readonly outfitId: string }>
  readonly queue?: WorkAction<QueueInput>
  readonly unqueue?: WorkAction<{ readonly outfitId: string; readonly index: number }>
  readonly upgrade?: WorkAction<{ readonly building: string }>
  readonly start?: WorkAction<StartInput>
  readonly restart?: WorkAction<{ readonly outfitId: string }>
  readonly dismiss?: WorkAction<{ readonly outfitId: string }>
}
export interface RequestLabel { readonly name: string; readonly item?: string; readonly count?: number }
interface WorkContextValue {
  readonly view: WorkView; readonly actions: WorkActions; readonly copy: WorkCopy
  readonly umaName: (id: string) => string; readonly itemName: (id: string) => string; readonly placeName: (id: string) => string
  readonly requestLabel: (request: import('@luismlorenzana/uma-work').WorkRequest) => RequestLabel
  readonly refusal: (refusal: Refusal) => string
  readonly restartRefusal: (outfitId: string) => Refusal | null
  readonly money: (amount: number) => ReactNode
  readonly pending: boolean
  readonly acquire: () => boolean; readonly release: () => void
}
const WorkContext = createContext<WorkContextValue | null>(null)

export function WorkProvider<S extends WorkState>({ state, now, env, actions, names = {}, words, ticketOffer, describeRequest, formatRefusal, checkRestart, renderMoney, children }: {
  readonly state: S; readonly now: number; readonly env: WorkEnv<S>; readonly actions: WorkActions
  readonly names?: WorkNames; readonly words?: Partial<WorkWords>
  readonly ticketOffer?: (state: S, count: number) => TicketOffer | null
  readonly describeRequest?: WorkContextValue['requestLabel']
  readonly formatRefusal?: (refusal: Refusal) => string
  /** Pure preview of the game's complete restart, including alternate slots or restored queues. */
  readonly checkRestart?: (state: S, outfitId: string) => Refusal | null
  readonly renderMoney?: (amount: number) => ReactNode
  readonly children: ReactNode
}) {
  const view = useMemo(() => workView(state, now, env, ticketOffer), [state, now, env, ticketOffer])
  const copy = useMemo(() => workWords(words), [words])
  const lock = useRef(false)
  const [pending, setPending] = useState(false)
  const umaName = names.uma ?? ((id: string) => id)
  const itemName = names.item ?? ((id: string) => id)
  const placeName = names.place ?? ((id: string) => id)
  const refusal = (value: Refusal) => formatRefusal?.(value) ?? value.message.replace(/\{(\w+)\}/g, (whole, key: string) => {
    const field = value.data?.[key]
    if (typeof field === 'string') return key === 'uma' ? umaName(field) : key === 'item' ? itemName(field) : key === 'place' ? placeName(field) : field
    if (typeof field === 'number') return key === 'time' ? durationText(field - now) : field.toLocaleString('en-US')
    return whole
  })
  return <WorkContext.Provider value={{
    view, actions, copy, umaName, itemName, placeName, refusal, pending,
    restartRefusal: (id) => checkRestart === undefined ? view.restart(id) : checkRestart(view.projection.current, id),
    requestLabel: describeRequest ?? ((request) => {
      const row = request as { readonly item?: string; readonly count?: number; readonly unlocks?: readonly unknown[] }
      return { name: row.item === undefined ? copy(row.unlocks?.length === 1 ? 'unlockOne' : 'unlocks', { n: row.unlocks?.length ?? 0 }) : itemName(row.item), item: row.item, count: row.count ?? row.unlocks?.length }
    }),
    money: renderMoney ?? ((amount) => copy('upgradeCost', { amount: amount.toLocaleString('en-US') })),
    acquire: () => { if (lock.current) return false; lock.current = true; setPending(true); return true },
    release: () => { lock.current = false; setPending(false) },
  }}>{children}</WorkContext.Provider>
}
export function useWork(): WorkContextValue {
  const value = useContext(WorkContext)
  if (value === null) throw new Error('Work components need WorkProvider')
  return value
}
export const useWorkView = (): WorkView => useWork().view

export function useTap() {
  const { acquire, release, pending, copy, refusal } = useWork()
  const [note, setNote] = useState<{ readonly text: string; readonly yes?: () => Promise<boolean> } | null>(null)
  const run = async (action: (() => WorkAnswer | Promise<WorkAnswer>) | undefined, onDone?: () => void): Promise<boolean> => {
    if (action === undefined || !acquire()) return false
    setNote(null)
    try {
      const answer = await action()
      if (answer !== undefined && 'refused' in answer) { setNote({ text: refusal(answer) }); return false }
      if (answer?.kind === 'ask') { setNote({ text: answer.message, yes: () => run(answer.confirm, onDone) }); return false }
      if (answer?.kind === 'say') { setNote({ text: answer.message ?? '' }); return false }
      if (answer?.message) setNote({ text: answer.message })
      onDone?.()
      return true
    } catch (error) {
      setNote({ text: error instanceof Error && error.message ? error.message : copy('unexpected') })
      return false
    } finally { release() }
  }
  return { pending, note, run, clear: () => setNote(null) }
}
export type Tap = ReturnType<typeof useTap>
export function TapNoteLine({ tap, className = '' }: { tap: Tap; className?: string }) {
  const { copy } = useWork()
  if (tap.note === null) return null
  return <div role="status" className={`flex flex-wrap items-center gap-2 text-[13px] text-ink-soft ${className}`}>
    <span className="min-w-0 flex-1">{tap.note.text}</span>
    {tap.note.yes && <>
      <button type="button" disabled={tap.pending} onClick={() => void tap.note?.yes?.()} className="min-h-11 rounded-sm bg-accent px-4 font-semibold text-accent-ink">{copy('yes')}</button>
      <button type="button" onClick={tap.clear} className="min-h-11 px-3">{copy('notNow')}</button>
    </>}
  </div>
}

export function useItemList() {
  const { itemName } = useWork()
  return (items: readonly { readonly item: string; readonly qty: number }[]) => itemsList(items, itemName)
}
