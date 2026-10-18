import {
  buildingLevel, chainTimes, isRefusal, kindRules, largestCoverable, queue, speedAt, start, sumInputs, workRefusal,
  type ItemQty, type Refusal, type RequestOf, type SlotRef, type WorkEnv, type WorkRequest, type WorkState,
} from '@luismlorenzana/uma-work'
import { projectWork, queueChips, recallPreview, slotCards, speedUpModel, upgradeView, type TicketOffer } from './model.js'

export interface JobPreview {
  readonly start: number; readonly seconds: readonly number[]; readonly max: number; readonly ms: number; readonly exp: number
  readonly inputs: readonly { readonly item: string; readonly need: number; readonly have: number }[]
  readonly refusal: Refusal | null
}
export interface JobInput<R extends WorkRequest = WorkRequest> {
  readonly outfitId: string; readonly slot: SlotRef; readonly request: R; readonly mode: 'start' | 'queue'
}

/** Typed state/env stay captured together; React consumers only see neutral readings of them. */
export function workView<S extends WorkState>(state: S, now: number, env: WorkEnv<S>, ticketOffer?: (state: S, count: number) => TicketOffer | null) {
  const projection = projectWork(state, now, env)
  const settled = projection.current
  return {
    now, settled: settled as WorkState, projection,
    cards: (building: string) => slotCards(settled, building, now, env.buildings),
    queues: (outfitId: string) => queueChips(projection, outfitId),
    speed: (outfitId: string) => speedUpModel(settled, outfitId, now, env, ticketOffer === undefined ? undefined : (n) => ticketOffer(settled, n)),
    recall: (outfitId: string) => recallPreview(settled, outfitId, now, env),
    upgrade: (building: string) => upgradeView(settled, building, now, env),
    facility: (building: string) => {
      const cards = slotCards(settled, building, now, env.buildings)
      return { level: buildingLevel(settled, building), used: cards.filter((card) => card.kind === 'held').length, slots: cards.length, speed: speedAt(settled, building, env.buildings) }
    },
    maxItems: (kind: string) => kindRules(env, kind)?.maxItems ?? 10,
    plan: <R extends WorkRequest>({ outfitId, slot, request, mode }: JobInput<R>): JobPreview => {
      const rules = kindRules(env, request.kind)
      const row = settled.work[outfitId]
      const earlier = mode === 'queue' && row !== undefined ? [...row.entries.map((entry) => entry.request), ...row.queue] : []
      // Requests come from the game's builder for this same registry, as in the engine's start/queue API.
      const planned = rules?.plan(settled, outfitId, request as RequestOf<S>, now, {
        slot, speed: speedAt(settled, slot.building, env.buildings), earlier: earlier as RequestOf<S>[], env,
      })
      if (planned === undefined || isRefusal(planned)) return {
        start: now, seconds: [], max: 0, ms: 0, exp: 0, inputs: [],
        refusal: planned ?? workRefusal('not-here'),
      }
      const chips = mode === 'queue' ? queueChips(projection, outfitId) : []
      const tail = chips[chips.length - 1]?.endsAt ?? (row === undefined ? null : chainTimes(row).endsAt)
      const inputs = sumInputs(planned.map((one) => one.inputs))
      return {
        start: mode === 'queue' ? tail ?? now : now, seconds: planned.map((one) => one.seconds),
        max: mode === 'queue' ? planned.length : Math.max(1, largestCoverable(settled.items, planned)),
        ms: planned.reduce((sum, one) => sum + one.seconds * 1000, 0), exp: planned.reduce((sum, one) => sum + one.exp, 0),
        inputs: inputs.map(({ item, qty }) => ({ item, need: qty, have: settled.items[item] ?? 0 })), refusal: null,
      }
    },
    check: <R extends WorkRequest>({ outfitId, slot, request, mode }: JobInput<R>): Refusal | null => {
      const result = mode === 'queue'
        ? queue(settled, { outfitId, add: { request: request as RequestOf<S>, building: slot.building, ...(slot.room === undefined ? {} : { room: slot.room }) } }, now, env)
        : start(settled, { outfitId, slot, request: request as RequestOf<S> }, now, env)
      return isRefusal(result) ? result : null
    },
    restart: (outfitId: string): Refusal | null => {
      const dropped = settled.work[outfitId]?.dropped
      if (dropped === null || dropped === undefined || dropped.requests[0] === undefined) return null
      const tried = start(settled, { outfitId, slot: dropped.slot, request: dropped.requests[0] as RequestOf<S> }, now, env)
      return isRefusal(tried) ? tried : null
    },
  }
}
export type WorkView = ReturnType<typeof workView>

/** The first usable slot, respecting a room and a link's requested index. */
export function chooseSlot(view: WorkView, building: string, outfitId: string | null, asked: number | null, room?: string): SlotRef | null {
  const cards = view.cards(building).filter((card) => card.slot.room === room)
  const usable = (card: (typeof cards)[number]) => card.kind === 'free' || card.outfitId === outfitId
  return (cards.find((card) => card.slot.slot === asked && usable(card)) ?? cards.find((card) => card.kind === 'held' && card.outfitId === outfitId) ?? cards.find((card) => card.kind === 'free'))?.slot ?? null
}

export const shortItems = (inputs: JobPreview['inputs']): ItemQty[] => inputs.flatMap(({ item, need, have }) => need > have ? [{ item, qty: need - have }] : [])
