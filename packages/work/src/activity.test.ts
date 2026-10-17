// The activity rule: Free, Working or Ready, and the rows of uma-racer's activity table (its 01 §2) that belong to the
// engine. A race's collect of finished sessions is uma-racer's own; here it is composed from `settle` and `payWork`
// the way uma-racer builds it, to show the package carries it. The tier rules (advancing, promotion) stay in uma-racer.
import { describe, expect, it } from 'vitest'
import {
  ENV, farmAccount, farmItemSeconds, node, PLAIN, STUDENT, withNodes, withStock, type FarmRequest, type FarmState,
} from '../test/fixtures/farm.js'
import { clock, ok } from '../test/fixtures/support.js'
import { isRefusal } from './refusal.js'
import { freeAt, isFree, workState } from './activity.js'
import { payWork, type CollectReceipt } from './collect.js'
import { collect, queue, recall, start } from './operations.js'
import { joinSettles, settle } from './settle.js'
import type { Done, SlotRef } from './types.js'

/** uma-racer's race-start collect, built on the package: a session's finished unlocks only; a job runs on. */
function collectSessions(state: FarmState, outfitId: string, now: number): Done<CollectReceipt, FarmState> {
  const before = settle(state, now, ENV)
  const { state: paid, paid: receipt } = payWork(before.state, outfitId, now, ENV, (entry) => entry.request.kind === 'session')
  const after = settle(paid, now, ENV)
  return {
    state: after.state,
    receipt: { ...receipt, movements: [...before.report.movements, ...receipt.movements, ...after.report.movements], settled: joinSettles(before.report, after.report) },
  }
}

const T0 = clock('08:00')
const G = farmItemSeconds('gather', 1) * 1000
const GARDEN: SlotRef = { building: 'vegetable-garden', slot: 0 }
const OBSERVATORY: SlotRef = { building: 'observatory', slot: 0 }
const carrots = (count: number): FarmRequest => ({ kind: 'gather', item: 'carrot', count })

/** Student's night at the Observatory from 22:30, in base minutes: nodes 6–8 end 01:30, 04:45 and 08:00. */
function inSession(): FarmState {
  const state = withNodes(withStock(farmAccount(), { 'dish-vegetables-1': 1, 'dish-vegetables-2': 2 }), STUDENT.id, 5)
  return ok(start(state, { outfitId: STUDENT.id, slot: OBSERVATORY, request: { kind: 'session', unlocks: [node(6), node(7), node(8)] } }, clock('22:30'), ENV)).state
}

describe('work states', () => {
  const working = () => ok(start(farmAccount(), { outfitId: PLAIN.id, slot: GARDEN, request: carrots(2) }, T0, ENV)).state

  it('are Free, Working or Ready', () => {
    expect(workState(farmAccount(), PLAIN.id, T0, ENV)).toBe('free')
    expect(workState(working(), PLAIN.id, T0, ENV)).toBe('working')
    expect(workState(working(), PLAIN.id, T0 + 2 * G - 1, ENV)).toBe('working')
    expect(workState(working(), PLAIN.id, T0 + 2 * G, ENV)).toBe('ready')
    expect(workState(collect(working(), { outfitId: PLAIN.id }, T0 + 2 * G, ENV).state, PLAIN.id, T0 + 2 * G, ENV)).toBe('free')
  })

  it('say when a Working Uma is free, queue included, and nothing otherwise', () => {
    const queued = ok(queue(working(), { outfitId: PLAIN.id, add: { request: carrots(3), building: 'vegetable-garden' } }, T0, ENV)).state
    expect(freeAt(working(), PLAIN.id, T0, ENV)).toBe(T0 + 2 * G)
    expect(freeAt(queued, PLAIN.id, T0, ENV)).toBe(T0 + 5 * G)
    expect(freeAt(queued, PLAIN.id, T0 + 3 * G, ENV)).toBe(T0 + 5 * G)
    expect(freeAt(queued, PLAIN.id, T0 + 5 * G, ENV)).toBeNull()
    expect(freeAt(farmAccount(), PLAIN.id, T0, ENV)).toBeNull()
  })

  it('call her Free with no row, or a row that only keeps her last work', () => {
    const ready = working()
    expect(isFree(ready, PLAIN.id)).toBe(false)
    const done = collect(ready, { outfitId: PLAIN.id }, T0 + 2 * G, ENV).state
    expect(done.work[PLAIN.id]!.last).not.toBeNull()
    expect(isFree(done, PLAIN.id)).toBe(true)
    expect(isFree(done, 'nobody')).toBe(true)
    // Untyped rows that aren't idle work rows are not Free.
    expect(isFree({ work: { x: { kind: 'session' } } }, 'x')).toBe(false)
    expect(isFree({ work: { x: {} } }, 'x')).toBe(false)
  })
})

describe("uma-racer's activity table", () => {
  it('an Uma mid-session races with every finished unlock, collected in the same tap', () => {
    const { state, receipt } = collectSessions(inSession(), STUDENT.id, clock('05:00', 1))
    expect(receipt.outputs).toEqual([{ unlock: node(6) }, { unlock: node(7) }])
    expect(receipt.paid).toEqual([{ opened: ['n6', 'n7'] }])
    expect(state.umas[STUDENT.id]!.build.constellationOpened).toBe(7)
    expect(workState(state, STUDENT.id, clock('05:00', 1), ENV)).toBe('working')
    // The one in progress counts once it finishes.
    expect(collectSessions(state, STUDENT.id, clock('07:59', 1)).receipt.outputs).toEqual([])
  })

  it('an Uma mid-job races and the job runs on, uncollected', () => {
    const state = ok(start(farmAccount(), { outfitId: PLAIN.id, slot: GARDEN, request: carrots(2) }, T0, ENV)).state
    const raced = collectSessions(state, PLAIN.id, T0 + G)
    expect(raced.receipt.outputs).toEqual([])
    expect(raced.state).toBe(state)
  })

  it('an Uma mid-job is refused a session with her free time, and Recall frees her', () => {
    const state = withStock(ok(start(farmAccount(), { outfitId: PLAIN.id, slot: GARDEN, request: carrots(2) }, T0, ENV)).state, { 'dish-vegetables-1': 1 })
    const session = { outfitId: PLAIN.id, slot: OBSERVATORY, request: { kind: 'session' as const, unlocks: [node(1)] } }
    expect(start(state, session, T0 + 1, ENV)).toMatchObject({ code: 'busy', data: { uma: PLAIN.id, time: T0 + 2 * G } })
    const recalled = recall(state, { outfitId: PLAIN.id }, T0 + 1, ENV).state
    expect(isRefusal(start(recalled, session, T0 + 1, ENV))).toBe(false)
  })

  it('an Uma mid-session is refused a Farm job the same way', () => {
    expect(start(inSession(), { outfitId: STUDENT.id, slot: GARDEN, request: carrots(1) }, clock('23:00'), ENV)).toMatchObject({
      code: 'busy', data: { uma: STUDENT.id, time: clock('08:00', 1) },
    })
  })

  it('a Ready Uma assigned elsewhere is collected first', () => {
    const { receipt, state } = ok(start(inSession(), { outfitId: STUDENT.id, slot: GARDEN, request: carrots(1) }, clock('08:00', 1), ENV))
    expect(receipt.collected).toMatchObject({ outputs: [{ unlock: node(6) }, { unlock: node(7) }, { unlock: node(8) }], freed: true })
    expect(state.umas[STUDENT.id]!.build.constellationOpened).toBe(8)
    expect(state.work[STUDENT.id]).toMatchObject({ slot: GARDEN, last: { slot: OBSERVATORY } })
  })

  it('a session never queues behind a Farm job', () => {
    const state = ok(start(farmAccount(), { outfitId: PLAIN.id, slot: GARDEN, request: carrots(2) }, T0, ENV)).state
    expect(queue(state, { outfitId: PLAIN.id, add: { request: { kind: 'session', unlocks: [node(1)] }, building: 'observatory' } }, T0, ENV))
      .toMatchObject({ code: 'queue-place' })
  })
})
