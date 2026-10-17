// The work operations: `start`, `queue`, `collect`, `recall`, `speedUp`, `finish` and `upgrade`, each
// `(state, input, now, env) → { state, receipt } | Refusal`. Every one settles to `now` before and after it runs, so a
// Finish starts the next queued entry at once, and its receipt lists every item movement for a game's item ledger.
// Refusals are plain words with the data a screen needs to ask again; a malformed input (an unknown building or room,
// a negative ticket count) is a caller's bug and throws.
import { isRefusal, type Refusal } from './refusal.js'
import { chainEnd, statusOf } from './activity.js'
import { payWork, type CollectReceipt, type PaidWork } from './collect.js'
import { countAllowed, kindRules, requestCount, type PlannedItem, type UpgradeCharge, type WorkEnv } from './kinds.js'
import { workRefusal } from './refusals.js'
import { joinSettles, settle } from './settle.js'
import {
  buildingLevel, emptyRow, entryFrom, largestCoverable, moveStock, movements, samePlace, shortfall, slotExists, slotHolder, speedAt,
  sumInputs, totalSlots, withRow,
} from './state.js'
import { applyTickets, assertNow, endsAt, finishedCount, itemEnds, remainingMs, ticketsToFinish } from './timeline.js'
import type { Done, ItemMovement, ItemQty, OpResult, RequestOf, SettleReport, SlotRef, WorkRequest, WorkRow, WorkState } from './types.js'

/** Up to 3 requests wait behind the running one. */
export const MAX_QUEUE = 3
const MS_PER_MINUTE = 60_000

function plan<S extends WorkState>(state: S, outfitId: string, request: WorkRequest, now: number, slot: SlotRef, earlier: readonly WorkRequest[], env: WorkEnv<S>): readonly PlannedItem[] | Refusal {
  const rules = kindRules(env, request.kind)
  if (rules === undefined) return workRefusal('not-here')
  return rules.plan(state, outfitId, request as RequestOf<S>, now, {
    slot, speed: speedAt(state, slot.building, env.buildings), earlier: earlier as readonly RequestOf<S>[], env,
  })
}

/** A request's size check: 1 to its kind's most (10 by default). */
function sizeRefusal<S extends WorkState>(request: WorkRequest, env: WorkEnv<S>): Refusal | null {
  const rules = kindRules(env, request.kind)
  return countAllowed(requestCount(request, rules), rules) ? null : workRefusal('count', { max: rules?.maxItems ?? 10 })
}

const unknownWorker = <S extends WorkState>(state: S, outfitId: string, env: WorkEnv<S>): Refusal | null =>
  env.isWorker !== undefined && !env.isWorker(state, outfitId) ? workRefusal('unknown-worker', { uma: outfitId }) : null

/** Runs `op` on the state settled to `now`, then settles again, joining both settles into the receipt. */
function settled<S extends WorkState, R extends { readonly movements: readonly ItemMovement[] }>(
  state: S, now: number, env: WorkEnv<S>, op: (state: S) => { readonly state: S; readonly receipt: R } | Refusal,
): { readonly state: S; readonly receipt: R & { readonly settled: SettleReport<RequestOf<S>> } } | Refusal {
  assertNow(now)
  const before = settle(state, now, env)
  const result = op(before.state)
  if (isRefusal(result)) return result
  const after = settle(result.state, now, env)
  return {
    state: after.state,
    receipt: {
      ...result.receipt,
      movements: [...before.report.movements, ...result.receipt.movements, ...after.report.movements],
      settled: joinSettles(before.report, after.report),
    },
  }
}

const done = <R, S>(result: { readonly state: S; readonly receipt: R } | Refusal): Done<R, S> => {
  if (isRefusal(result)) throw new Error(`Never refuses: ${result.code}`)
  return result
}

// --- start ----------------------------------------------------------------------------------------------------------

export interface StartInput<R extends WorkRequest = WorkRequest> {
  readonly outfitId: string
  readonly slot: SlotRef
  readonly request: R
}

export interface StartReceipt<R extends WorkRequest = WorkRequest> {
  readonly outfitId: string
  readonly slot: SlotRef
  readonly request: R
  readonly startedAt: number
  readonly endsAt: number
  /** Her finished work, collected first when she was Ready, else null. */
  readonly collected: PaidWork | null
  readonly movements: readonly ItemMovement[]
  readonly settled: SettleReport<R>
}

/**
 * `start`: reserves every item's inputs and starts the entry now. In order: she may work; the slot exists and is free;
 * she is Free, or Ready (collected in the same receipt); 1–10 items (or her kind's most); this building makes it; her
 * level opens the grade (or the kind's own rules); the free stock covers it, else `short` with `largestCoverable`.
 * Starting clears any dropped queue she kept (a new start acts on it).
 */
export function start<S extends WorkState>(state: S, input: StartInput<RequestOf<S>>, now: number, env: WorkEnv<NoInfer<S>>): OpResult<StartReceipt<RequestOf<S>>, S> {
  assertNow(now)
  const { outfitId, slot, request } = input
  const unknown = unknownWorker(state, outfitId, env)
  if (unknown) return unknown
  return settled(state, now, env, (current) => {
    if (!slotExists(current, slot, env.buildings)) throw new RangeError(`${slot.building} has no slot ${slot.slot} at Lv ${buildingLevel(current, slot.building)}`)
    const holder = slotHolder(current, slot)
    if (holder !== undefined && holder !== outfitId) return workRefusal('slot-taken')
    const row = current.work[outfitId]
    const status = statusOf(row, now)
    if (status === 'working') {
      const time = chainEnd(current, row!, now, env)
      return workRefusal('busy', { uma: outfitId, time, freeAt: time })
    }
    let next = current
    let collected: PaidWork | null = null
    if (status === 'ready') ({ state: next, paid: collected } = payWork(current, outfitId, now, env))
    const size = sizeRefusal(request, env)
    if (size) return size
    const items = plan(next, outfitId, request, now, slot, [], env)
    if (isRefusal(items)) return items
    const inputs = sumInputs(items.map((item) => item.inputs))
    const short = shortfall(next.items, inputs)
    if (short.length > 0) return workRefusal('short', { n: short[0]!.qty, item: short[0]!.item, largestCoverable: largestCoverable(next.items, items) })
    const entry = entryFrom(request, items, now, speedAt(next, slot.building, env.buildings), false)
    const mine: WorkRow = next.work[outfitId] ?? emptyRow(outfitId)
    // A new start acts on a stopped queue, so it clears it, as a restart or Dismiss would.
    next = withRow({ ...next, items: moveStock(next.items, inputs, -1) }, { ...mine, slot, entries: [entry], queue: [], dropped: null })
    return {
      state: next,
      receipt: {
        outfitId, slot, request, startedAt: now, endsAt: endsAt(entry), collected,
        movements: [...(collected?.movements ?? []), ...movements('reserve', inputs, outfitId, now)],
      },
    }
  })
}

// --- queue ----------------------------------------------------------------------------------------------------------

/** Add at a place (the sheet's building and room), remove by index, or move one entry to another index. */
export type QueueEdit<R extends WorkRequest = WorkRequest> =
  | { readonly add: { readonly request: R; readonly building: string; readonly room?: string } }
  | { readonly remove: number }
  | { readonly move: { readonly from: number; readonly to: number } }

export type QueueInput<R extends WorkRequest = WorkRequest> = { readonly outfitId: string } & QueueEdit<R>

export interface QueueReceipt<R extends WorkRequest = WorkRequest> {
  readonly outfitId: string
  /** Her queue after the edit. */
  readonly queued: readonly R[]
  readonly movements: readonly ItemMovement[]
  readonly settled: SettleReport<R>
}

function edited<R extends WorkRequest>(queue: readonly R[], edit: QueueEdit<R>): readonly R[] | null {
  const index = (n: number) => {
    if (!Number.isInteger(n) || n < 0) throw new RangeError(`A queue index is a whole number ≥ 0: ${n}`)
    return n < queue.length
  }
  if ('add' in edit) return [...queue, edit.add.request]
  if ('remove' in edit) return index(edit.remove) ? queue.filter((_, i) => i !== edit.remove) : null
  if (!index(edit.move.from) || !index(edit.move.to)) return null
  const moved = queue.filter((_, i) => i !== edit.move.from)
  moved.splice(edit.move.to, 0, queue[edit.move.from]!)
  return moved
}

/**
 * `queue`: edits up to three requests behind her running entry, at the same building and room. Nothing is reserved.
 * Every queued request must still plan in order behind the ones before it (the place, the grade gate, a kind's order),
 * so an edit that would strand one is refused with its reason.
 */
export function queue<S extends WorkState>(state: S, input: QueueInput<RequestOf<S>>, now: number, env: WorkEnv<NoInfer<S>>): OpResult<QueueReceipt<RequestOf<S>>, S> {
  assertNow(now)
  const { outfitId } = input
  const unknown = unknownWorker(state, outfitId, env)
  if (unknown) return unknown
  return settled(state, now, env, (current) => {
    const row = current.work[outfitId]
    if (statusOf(row, now) !== 'working') return workRefusal('finished')
    const slot = row!.slot!
    if ('add' in input) {
      if (row!.queue.length >= MAX_QUEUE) return workRefusal('queue-full')
      if (!samePlace(slot, input.add)) return workRefusal('queue-place')
      const size = sizeRefusal(input.add.request, env)
      if (size) return size
    }
    const queued = edited(row!.queue as readonly RequestOf<S>[], input)
    if (queued === null) return workRefusal('finished')
    const earlier: WorkRequest[] = row!.entries.map((entry) => entry.request)
    for (const request of queued) {
      const planned = plan(current, outfitId, request, now, slot, [...earlier], env)
      if (isRefusal(planned)) return planned
      earlier.push(request)
    }
    return { state: withRow(current, { ...row!, queue: queued }), receipt: { outfitId, queued, movements: [] } }
  })
}

// --- collect --------------------------------------------------------------------------------------------------------

/** `collect`: pays every finished item, oldest first. It never refuses; nothing ready pays nothing. */
export function collect<S extends WorkState>(state: S, input: { readonly outfitId: string }, now: number, env: WorkEnv<NoInfer<S>>): Done<CollectReceipt<RequestOf<S>>, S> {
  return done(settled(state, now, env, (current) => {
    const { state: next, paid } = payWork(current, input.outfitId, now, env)
    return { state: next, receipt: paid }
  }))
}

// --- recall ---------------------------------------------------------------------------------------------------------

export interface RecallReceipt<R extends WorkRequest = WorkRequest> extends CollectReceipt<R> {
  /** True when an entry was running and stopped; false when Recall acted as Collect. */
  readonly recalled: boolean
  /** The inputs of every unmade item, the one in progress included, back in the free stock. */
  readonly returned: readonly ItemQty[]
  /** The queue it dropped, with no dropped record. */
  readonly droppedQueue: readonly R[]
  /** Progress lost on the item in progress, in minutes. */
  readonly lostMinutes: number
}

/**
 * `recall`: collects, then stops the running entry. Every unmade item's inputs come back, the one in progress included;
 * the queue drops without a record and her last work is cleared, so Repeat won't restart a deliberate stop. With
 * nothing running it acts as `collect`.
 */
export function recall<S extends WorkState>(state: S, input: { readonly outfitId: string }, now: number, env: WorkEnv<NoInfer<S>>): Done<RecallReceipt<RequestOf<S>>, S> {
  const { outfitId } = input
  return done(settled<S, Omit<RecallReceipt<RequestOf<S>>, 'settled'>>(state, now, env, (current) => {
    const { state: paid, paid: collected } = payWork(current, outfitId, now, env)
    const row = paid.work[outfitId]
    if (row === undefined || row.entries.length === 0) {
      return { state: paid, receipt: { ...collected, recalled: false, returned: [], droppedQueue: [], lostMinutes: 0 } }
    }
    const unmade = row.entries.map((entry) => entry.inputs.slice(Math.max(entry.collected, finishedCount(entry, now))))
    const returned = sumInputs(unmade.flat())
    const first = row.entries[0]!
    const made = Math.max(first.collected, finishedCount(first, now))
    const itemStart = made === 0 ? first.startedAt - first.acceleratedMs : itemEnds(first.startedAt, first.seconds, first.acceleratedMs)[made - 1]!
    const stopped: WorkRow = { ...row, slot: null, entries: [], queue: [], last: null }
    return {
      state: withRow({ ...paid, items: moveStock(paid.items, returned, 1) }, stopped),
      receipt: {
        ...collected, recalled: true, returned, droppedQueue: row.queue as readonly RequestOf<S>[],
        lostMinutes: Math.max(0, now - itemStart) / MS_PER_MINUTE,
        movements: [...collected.movements, ...movements('return', returned, outfitId, now)],
      },
    }
  }))
}

// --- speed-up and finish --------------------------------------------------------------------------------------------

export interface SpeedUpInput {
  readonly outfitId: string
  /** The running entry's `startedAt`, so a ticket meant for a finished entry can't land on the next. */
  readonly startedAt: number
  readonly tickets: number
}

export interface SpeedUpReceipt<R extends WorkRequest = WorkRequest> {
  readonly outfitId: string
  readonly startedAt: number
  /** Speed Tickets spent. */
  readonly tickets: number
  readonly savedMinutes: number
  /** What the last ticket couldn't use. */
  readonly wastedMinutes: number
  /** The entry's new end. */
  readonly endsAt: number
  readonly movements: readonly ItemMovement[]
  readonly settled: SettleReport<R>
}

function spendTickets<S extends WorkState>(
  state: S, input: { readonly outfitId: string; readonly startedAt: number; readonly tickets: number | 'finish' }, now: number, env: WorkEnv<S>,
): OpResult<SpeedUpReceipt<RequestOf<S>>, S> {
  assertNow(now)
  const { outfitId, startedAt } = input
  if (input.tickets !== 'finish' && (!Number.isInteger(input.tickets) || input.tickets < 1)) throw new RangeError(`Spend at least one whole Speed Ticket: ${input.tickets}`)
  const unknown = unknownWorker(state, outfitId, env)
  if (unknown) return unknown
  return settled(state, now, env, (current) => {
    const row = current.work[outfitId]
    const entry = row?.entries[row.entries.length - 1]
    if (row === undefined || entry === undefined || entry.startedAt !== startedAt || endsAt(entry) <= now) return workRefusal('finished')
    const needed = ticketsToFinish(remainingMs(entry, now))
    const tickets = input.tickets === 'finish' ? needed : Math.min(input.tickets, needed)
    const have = env.tickets.balance(current)
    if (have < tickets) return workRefusal('tickets', { n: tickets, have })
    const applied = applyTickets(entry, tickets, now)
    const sped = { ...entry, acceleratedMs: applied.acceleratedMs }
    const spent = env.tickets.item === undefined ? [] : [{ item: env.tickets.item, qty: tickets }]
    return {
      state: withRow(env.tickets.spend(current, tickets), { ...row, entries: [...row.entries.slice(0, -1), sped] }),
      receipt: {
        outfitId, startedAt, tickets, savedMinutes: applied.appliedMs / MS_PER_MINUTE, wastedMinutes: applied.wastedMs / MS_PER_MINUTE,
        endsAt: endsAt(sped), movements: movements('ticket', spent, outfitId, now),
      },
    }
  })
}

/**
 * `speedUp`: 1 or more Speed Tickets on her running entry, each moving every unfinished item 30 minutes earlier, never
 * past `now`: a count above what finishes it spends only what finishes it. Refused on a finished, queued or missing
 * entry or a wrong `startedAt` (`finished`), and without the tickets (`tickets`).
 */
export const speedUp = <S extends WorkState>(state: S, input: SpeedUpInput, now: number, env: WorkEnv<NoInfer<S>>): OpResult<SpeedUpReceipt<RequestOf<S>>, S> =>
  spendTickets(state, input, now, env)

/** `finish`: ⌈remaining ÷ 30 minutes⌉ tickets end the running entry now, and a queue starts at once. */
export const finish = <S extends WorkState>(state: S, input: { readonly outfitId: string; readonly startedAt: number }, now: number, env: WorkEnv<NoInfer<S>>): OpResult<SpeedUpReceipt<RequestOf<S>>, S> =>
  spendTickets(state, { ...input, tickets: 'finish' }, now, env)

// --- upgrade --------------------------------------------------------------------------------------------------------

/** An upgrade's money row id: a building reaches each level once, so the id is once-only. */
export const upgradeLedgerId = (building: string, level: number): string => `upgrade:${building}:${level}`

export interface UpgradeReceipt<R extends WorkRequest = WorkRequest> {
  readonly building: string
  readonly from: number
  readonly to: number
  /** Money charged (Prize Money, Laurels). */
  readonly money: number
  /** Its money row, given to `money.spend` and `ledger.record`; null when the level cost no money. */
  readonly charge: UpgradeCharge | null
  /** Slots per room, and in all, at the new level: they apply at once. */
  readonly slotsPerRoom: number
  readonly totalSlots: number
  /** The new speed, for entries started from now on. */
  readonly speed: number
  readonly movements: readonly ItemMovement[]
  readonly settled: SettleReport<R>
}

/**
 * `upgrade`: the building goes up one level, up to its top, for its money and items, charged once. New slots apply at
 * once; the new speed only to entries started after it. Its only gate is its cost.
 */
export function upgrade<S extends WorkState>(state: S, input: { readonly building: string }, now: number, env: WorkEnv<NoInfer<S>>): OpResult<UpgradeReceipt<RequestOf<S>>, S> {
  const { building } = input
  const rules = env.buildings
  if (!rules.ids.includes(building)) throw new RangeError(`No building ${String(building)}`)
  return settled(state, now, env, (current) => {
    const from = buildingLevel(current, building)
    if (from >= rules.maxLevel(building)) return workRefusal('top-level')
    const to = from + 1
    const cost = rules.upgradeCost(building, to)
    const money = env.money
    if (cost.money > 0) {
      if (money === undefined) throw new RangeError(`${building} costs money to upgrade, and the env has no money rules`)
      const have = money.balance(current)
      if (have < cost.money) return workRefusal('money', { n: cost.money, have })
    }
    const short = shortfall(current.items, cost.items)
    if (short.length > 0) return workRefusal('short', { n: short[0]!.qty, item: short[0]!.item })
    let next = current
    let charge: UpgradeCharge | null = null
    if (cost.money > 0) {
      charge = { id: upgradeLedgerId(building, to), reason: 'upgrade', building, level: to, delta: -cost.money, at: now }
      next = money!.spend(next, cost.money)
      if (env.ledger !== undefined) next = env.ledger.record(next, charge)
    }
    return {
      state: { ...next, items: moveStock(next.items, cost.items, -1), buildings: { ...next.buildings, [building]: { level: to } } },
      receipt: {
        building, from, to, money: cost.money, charge, slotsPerRoom: rules.slots(building, to), totalSlots: totalSlots(building, to, rules),
        speed: rules.speed(building, to), movements: movements('cost', cost.items, null, now),
      },
    }
  })
}
