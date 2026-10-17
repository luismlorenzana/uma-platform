// Paying finished work. Every finished item is paid once, oldest first, through its kind (items into the Warehouse,
// gear, gems or unlocks elsewhere), and her EXP through the game's `exp.grant`. Once everything is paid her slot is
// freed and her last work kept for Repeat. Nothing ready pays nothing and never refuses. The caller settles before and
// after.
import { kindRules, type WorkEnv } from './kinds.js'
import { movements, sumInputs, withRow } from './state.js'
import { finishedCount } from './timeline.js'
import type { Entry, ItemMovement, RequestOf, SettleReport, WorkOutput, WorkRequest, WorkState } from './types.js'

export interface CollectReceipt<R extends WorkRequest = WorkRequest> {
  readonly outfitId: string
  /** Every output paid, oldest first. */
  readonly outputs: readonly WorkOutput[]
  /** The EXP the paid items carried, in the game's units. */
  readonly exp: number
  /** What `exp.grant` reported (levels crossed, grades opened), or null when nothing was paid. */
  readonly expDetail: unknown
  /** What each kind's pay reported, oldest first (opened unlocks). */
  readonly paid: readonly unknown[]
  /** True when everything was paid, so her slot and she are free. */
  readonly freed: boolean
  readonly movements: readonly ItemMovement[]
  /** Queue starts and drops while the operation settled to its `now`. */
  readonly settled: SettleReport<R>
}

export type PaidWork = Omit<CollectReceipt, 'settled'>

const nothing = (outfitId: string): PaidWork => ({ outfitId, outputs: [], exp: 0, expDetail: null, paid: [], freed: false, movements: [] })

/**
 * Pays her finished items at `now`, on a settled state. `only` limits it to rows whose entries all pass (uma-racer's
 * race start collects sessions only).
 */
export function payWork<S extends WorkState>(
  state: S, outfitId: string, now: number, env: WorkEnv<NoInfer<S>>, only?: (entry: Entry<RequestOf<S>>) => boolean,
): { readonly state: S; readonly paid: PaidWork } {
  const row = state.work[outfitId]
  if (!row || row.entries.length === 0 || (only !== undefined && !row.entries.every((entry) => only(entry as Entry<RequestOf<S>>)))) {
    return { state, paid: nothing(outfitId) }
  }
  let next = state
  const outputs: WorkOutput[] = []
  const details: unknown[] = []
  let exp = 0
  const entries = row.entries.map((entry): Entry => {
    const made = Math.max(entry.collected, finishedCount(entry, now))
    if (made <= entry.collected) return entry
    const paying = entry.outputs.slice(entry.collected, made)
    const rules = kindRules(env, entry.request.kind)
    if (rules === undefined) throw new RangeError(`No rules pay ${entry.request.kind} work`)
    const result = rules.pay(next, outfitId, paying, { now, env })
    next = result.state
    if (result.detail !== undefined) details.push(result.detail)
    outputs.push(...paying)
    exp += entry.exp.slice(entry.collected, made).reduce((sum, n) => sum + n, 0)
    return { ...entry, collected: made }
  })
  if (outputs.length === 0) return { state, paid: nothing(outfitId) }

  const granted = env.exp.grant(next, outfitId, exp, now)
  next = granted.state

  const unpaid = entries.filter((entry) => entry.collected < entry.seconds.length)
  const freed = unpaid.length === 0 && row.queue.length === 0
  const last = entries[entries.length - 1]!
  next = withRow(next, freed
    ? { ...row, slot: null, entries: [], last: { slot: row.slot!, request: last.request } }
    : { ...row, entries: unpaid.length > 0 ? unpaid : [last] })
  const items = sumInputs(outputs.flatMap((output) => ('item' in output ? [[{ item: output.item, qty: 1 }]] : [])))
  return {
    state: next,
    paid: { outfitId, outputs, exp, expDetail: granted.detail ?? null, paid: details, freed, movements: movements('output', items, outfitId, now) },
  }
}
