// Read the shared engine, never a game's store or hand-built view model (SC2). All previews are pure.
import {
  applyTickets, buildingLevel, endsAt, finishedCount, holdsSlot, isRefusal, itemEnds, itemProgress,
  recall, sameSlot, settle, slotsOf, stockOf, sumInputs, ticketsToFinish, totalSlots, upgrade, SPEED_TICKET_MS,
  type BuildingRules, type DroppedQueue, type ItemQty, type Refusal, type WorkEnv, type WorkRequest,
  type WorkRow, type WorkState, type SlotRef,
} from '@luismlorenzana/uma-work'
import { durationText } from './words.js'

export interface FreeSlotCard { readonly kind: 'free'; readonly slot: SlotRef }
export interface HeldSlotCard {
  readonly kind: 'held'; readonly slot: SlotRef; readonly outfitId: string; readonly request: WorkRequest
  readonly startedAt: number; readonly made: number; readonly count: number; readonly waiting: number
  readonly running: boolean; readonly nextAt: number | null; readonly endsAt: number; readonly leftMs: number
  readonly progress: number; readonly queue: readonly WorkRequest[]
}
export type SlotCardModel = FreeSlotCard | HeldSlotCard

/** A settled row; the frozen plan's length also supports a game's custom request shape. */
export function heldCard(row: WorkRow, now: number): HeldSlotCard {
  const last = row.entries[row.entries.length - 1]!
  const made = finishedCount(last, now)
  const end = endsAt(last)
  return {
    kind: 'held', slot: row.slot!, outfitId: row.outfitId, request: last.request, startedAt: last.startedAt,
    made, count: last.seconds.length, waiting: row.entries.reduce((n, entry) => n + Math.max(0, finishedCount(entry, now) - entry.collected), 0),
    running: end > now, nextAt: end > now ? itemEnds(last.startedAt, last.seconds, last.acceleratedMs)[made] ?? null : null,
    endsAt: end, leftMs: Math.max(0, end - now), progress: itemProgress(last, now), queue: row.queue,
  }
}

export function slotCards(state: WorkState, building: string, now: number, rules: BuildingRules): SlotCardModel[] {
  const holders = Object.values(state.work).filter(holdsSlot)
  return slotsOf(state, building, rules).map((slot) => {
    const row = holders.find((one) => sameSlot(one.slot!, slot))
    return row === undefined ? { kind: 'free', slot } : heldCard(row, now)
  })
}

/** Buying tickets is game-owned. A quote includes its complete formatted price and any refusal. */
export interface TicketOffer { readonly price: number; readonly label: string; readonly refusal?: string | null }
export interface SpeedUpModel {
  readonly state: 'hidden' | 'ready' | 'buy' | 'waste' | 'short'
  readonly outfitId: string; readonly startedAt: number; readonly remainingMs: number
  readonly finish: number; readonly have: number; readonly buy: number; readonly wastedMinutes: number
  readonly offer: TicketOffer | null
}

export function speedUpModel<S extends WorkState>(state: S, outfitId: string, now: number, env: WorkEnv<S>, quote?: (count: number) => TicketOffer | null): SpeedUpModel {
  const row = state.work[outfitId]
  const entry = row?.entries[row.entries.length - 1]
  const left = entry === undefined ? 0 : Math.max(0, endsAt(entry) - now)
  const have = env.tickets.balance(state)
  const finish = ticketsToFinish(left)
  const buy = Math.max(0, finish - have)
  const offer = left > 0 && buy > 0 ? quote?.(buy) ?? null : null
  return {
    state: left <= 0 ? 'hidden' : buy > 0 ? offer === null ? 'short' : 'buy' : left < SPEED_TICKET_MS ? 'waste' : 'ready',
    outfitId, startedAt: entry?.startedAt ?? 0, remainingMs: left, finish, have, buy, offer,
    wastedMinutes: entry === undefined ? 0 : Math.round(applyTickets(entry, finish, now).wastedMs / 60_000),
  }
}

export interface RecallPreview {
  readonly outfitId: string; readonly paid: readonly ItemQty[]; readonly unlocks: number
  readonly returned: readonly ItemQty[]; readonly lostMinutes: number; readonly droppedQueue: number; readonly recalled: boolean
}
export function recallPreview<S extends WorkState>(state: S, outfitId: string, now: number, env: WorkEnv<S>): RecallPreview {
  const { receipt } = recall(state, { outfitId }, now, env)
  return {
    outfitId, paid: sumInputs(receipt.outputs.flatMap((out) => 'item' in out ? [[{ item: out.item, qty: 1 }]] : [])),
    unlocks: receipt.outputs.filter((out) => 'unlock' in out).length, returned: receipt.returned,
    lostMinutes: Math.round(receipt.lostMinutes), droppedQueue: receipt.droppedQueue.length, recalled: receipt.recalled,
  }
}

export interface WorkProjection<S extends WorkState = WorkState> {
  readonly current: S; readonly ahead: S
  readonly dropped: readonly (DroppedQueue & { readonly outfitId: string })[]
}
/** Simulate every queue in engine tie order, without collecting outputs into stock. */
export function projectWork<S extends WorkState>(state: S, now: number, env: WorkEnv<S>): WorkProjection<S> {
  const current = settle(state, now, env).state
  const ahead = settle(current, Number.MAX_SAFE_INTEGER, env)
  return { current, ahead: ahead.state, dropped: ahead.report.dropped }
}
export interface QueueChip {
  readonly index: number; readonly request: WorkRequest; readonly endsAt: number | null; readonly ms: number | null
  readonly short: readonly ItemQty[]; readonly refusal: Refusal | null
}
export function queueChips(projection: WorkProjection, outfitId: string): QueueChip[] {
  const row = projection.current.work[outfitId]
  if (row === undefined) return []
  const entries = projection.ahead.work[outfitId]?.entries.slice(row.entries.length) ?? []
  const drop = projection.dropped.find((one) => one.outfitId === outfitId)
  return row.queue.map((request, index) => {
    const entry = entries[index]
    return {
      index, request, endsAt: entry === undefined ? null : endsAt(entry),
      ms: entry === undefined ? null : endsAt(entry) - entry.startedAt,
      short: index === entries.length ? drop?.short ?? [] : [],
      refusal: index === entries.length ? drop?.refused ?? null : null,
    }
  })
}

export interface SizeRecommendation {
  readonly size: number; readonly label: string; readonly overnight?: boolean
  readonly idleMs?: Readonly<Record<number, number>>
}
export interface SizeRule {
  readonly mode: 'count' | 'duration'
  /** Sparse count choices (including a game's larger refining batches). No hard-coded cap of ten. */
  readonly sizes?: readonly number[]
  /** The game computes check-in fitting; the kit only marks it. */
  readonly recommend?: (start: number, itemSeconds: readonly number[], max: number) => SizeRecommendation
  /** The most one job of this recipe takes, below the kind's own most, such as a long recipe's (0.15.0). */
  readonly max?: number
}
export interface SizeChipView { readonly size: number; readonly endsAt: number; readonly ms: number; readonly duration: string; readonly idleMs: number }
export interface SizeChipsView { readonly chips: readonly SizeChipView[]; readonly marked: number | null; readonly fit: string | null; readonly overnight: boolean }
export function sizeChipsView(start: number, itemSeconds: readonly number[], max: number, rule: SizeRule = { mode: 'count' }): SizeChipsView {
  const limit = Math.max(1, Math.min(Math.floor(max), itemSeconds.length))
  if (itemSeconds.length === 0) return { chips: [], marked: null, fit: null, overnight: false }
  const sizes = [...new Set([...(rule.sizes ?? Array.from({ length: limit }, (_, i) => i + 1)), limit])]
    .filter((n) => Number.isInteger(n) && n >= 1 && n <= limit).sort((a, b) => a - b)
  const offered = rule.recommend?.(start, itemSeconds.slice(0, limit), limit)
  const recommendation = offered !== undefined && sizes.includes(offered.size) ? offered : undefined
  const marked = recommendation?.size ?? sizes[0]!
  return {
    chips: sizes.map((size) => {
      const ms = itemSeconds.slice(0, size).reduce((sum, seconds) => sum + seconds * 1000, 0)
      return { size, endsAt: start + ms, ms, duration: durationText(ms), idleMs: recommendation?.idleMs?.[size] ?? 0 }
    }),
    marked, fit: recommendation?.label ?? null, overnight: recommendation?.overnight ?? false,
  }
}

export interface UpgradeView {
  readonly to: number; readonly money: number; readonly haveMoney: number
  readonly items: readonly { readonly item: string; readonly need: number; readonly have: number }[]
  readonly slots: number; readonly slotsNow: number; readonly speed: number; readonly speedNow: number
  readonly refusal: Refusal | null
}
export function upgradeView<S extends WorkState>(state: S, building: string, now: number, env: WorkEnv<S>): UpgradeView | null {
  const level = buildingLevel(state, building)
  const rules = env.buildings
  if (level >= rules.maxLevel(building)) return null
  const to = level + 1
  const cost = rules.upgradeCost(building, to)
  const tried = upgrade(state, { building }, now, env)
  return {
    to, money: cost.money, haveMoney: env.money?.balance(state) ?? 0,
    items: cost.items.map(({ item, qty }) => ({ item, need: qty, have: stockOf(state.items, item) })),
    slots: totalSlots(building, to, rules), slotsNow: totalSlots(building, level, rules),
    speed: rules.speed(building, to), speedNow: rules.speed(building, level), refusal: isRefusal(tried) ? tried : null,
  }
}
