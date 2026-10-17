// The activity rule: an Uma does one timed thing at a time. She is Free (nothing started, nothing to collect), Working
// (an entry is running, maybe with a queue) or Ready (everything finished and waiting for Collect). Starting work for a
// Ready Uma collects her first; a Working one is refused with her free time; a queue never leaves its slot.
import { isRefusal } from './refusal.js'
import { kindRules, type WorkEnv } from './kinds.js'
import { settle } from './settle.js'
import { speedAt } from './state.js'
import { assertNow, chainTimes, endsAt, finishedCount } from './timeline.js'
import type { ItemStock, RequestOf, WorkRow, WorkState } from './types.js'

export type WorkStatus = 'free' | 'working' | 'ready'

/** Her status on a settled state: Working while her last entry runs, Ready once it has ended, else Free. */
export function statusOf(row: WorkRow | undefined, now: number): WorkStatus {
  if (row === undefined || row.entries.length === 0) return 'free'
  return endsAt(row.entries[row.entries.length - 1]!) > now ? 'working' : 'ready'
}

/** Her status at `now`, after settling every queue due by then. */
export function workState<S extends WorkState>(state: S, outfitId: string, now: number, env: WorkEnv<NoInfer<S>>): WorkStatus {
  assertNow(now)
  return statusOf(settle(state, now, env).state.work[outfitId], now)
}

/**
 * When her chain ends on a settled state: the running entry's end, then each queued request planned at the building's
 * speed now, in order. A queued entry that couldn't plan ends the projection there. Stock isn't projected.
 */
export function chainEnd<S extends WorkState>(state: S, row: WorkRow, now: number, env: WorkEnv<NoInfer<S>>): number {
  const slot = row.slot!
  const earlier = row.entries.map((entry) => entry.request) as RequestOf<S>[]
  const queued: number[][] = []
  for (const request of row.queue) {
    const plan = kindRules(env, request.kind)?.plan(state, row.outfitId, request as RequestOf<S>, now, {
      slot, speed: speedAt(state, slot.building, env.buildings), earlier: [...earlier], env,
    })
    if (plan === undefined || isRefusal(plan)) break
    queued.push(plan.map((item) => item.seconds))
    earlier.push(request as RequestOf<S>)
  }
  return chainTimes(row, queued).endsAt!
}

/** When a Working Uma stops working ("busy for another 2h 10m"), or null when she isn't Working. */
export function freeAt<S extends WorkState>(state: S, outfitId: string, now: number, env: WorkEnv<NoInfer<S>>): number | null {
  assertNow(now)
  const settled = settle(state, now, env).state
  const row = settled.work[outfitId]
  return row !== undefined && statusOf(row, now) === 'working' ? chainEnd(settled, row, now, env) : null
}

/**
 * Whether she is Free: no started entry and no queue. A row that only keeps her last work or a dropped queue is Free;
 * any other value in an untyped `work` is not. Time doesn't change it: only Collect and Recall empty a row.
 */
export function isFree(state: { readonly work: Readonly<Record<string, unknown>> }, outfitId: string): boolean {
  const row = state.work[outfitId] as Partial<WorkRow> | undefined
  if (row === undefined) return true
  return Array.isArray(row.entries) && row.entries.length === 0 && Array.isArray(row.queue) && row.queue.length === 0
}

/**
 * The Warehouse's reserved stock at `now`: the inputs of every item not yet made in a started entry, summed by item
 * over every Uma. They left the Warehouse count when the entry started; an item made or collected has used its inputs,
 * and a queued request reserves nothing until it starts. It is what Recall would hand back, so read it on a settled
 * state, as the screens do. An item none holds is absent.
 */
export function reservedStock(state: Pick<WorkState, 'work'>, now: number): ItemStock {
  assertNow(now)
  const reserved: Record<string, number> = {}
  for (const row of Object.values(state.work)) {
    for (const entry of row.entries) {
      const made = Math.max(entry.collected, finishedCount(entry, now))
      for (const inputs of entry.inputs.slice(made)) for (const { item, qty } of inputs) reserved[item] = (reserved[item] ?? 0) + qty
    }
  }
  return reserved
}
