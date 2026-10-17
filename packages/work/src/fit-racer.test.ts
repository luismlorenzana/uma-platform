// uma-racer's rules fit the engine (SC1 "Done when"): its gather, craft and cook, a Training Hub session that unlocks
// nodes, Speed Tickets as a Warehouse item, Prize Money with a ledger and Farm Level with aptitude EXP, run through
// start, queue 3, a dropped queue, collect part-way, recall, speed up, finish and upgrade. The kinds are
// test/fixtures/farm.ts; the full port of uma-racer's scenarios is in the other tests.
import { describe, expect, it } from 'vitest'
import {
  ENV, farmAccount, farmItemSeconds, HELPER, ledgerTotal, node, PLAIN, SPRINTS, STUDENT, withNodes, withPrizeMoney, withStock,
  type FarmRequest, type FarmState,
} from '../test/fixtures/farm.js'
import { clock, minutes, ok } from '../test/fixtures/support.js'
import { freeAt, reservedStock } from './activity.js'
import { collect, finish, queue, recall, speedUp, start, upgrade } from './operations.js'
import { settle } from './settle.js'
import type { SlotRef } from './types.js'

const T0 = clock('08:00')
const GARDEN: SlotRef = { building: 'vegetable-garden', slot: 0 }
const PANTRY: SlotRef = { building: 'pantry', slot: 0 }
const KITCHEN: SlotRef = { building: 'kitchen', slot: 0 }
const OBSERVATORY: SlotRef = { building: 'observatory', slot: 0 }
const farm = (kind: FarmRequest['kind'], item: string, count: number): FarmRequest => ({ kind, item, count })
const G = farmItemSeconds('gather', 1) * 1000
const C = farmItemSeconds('craft', 1) * 1000
const K = farmItemSeconds('cook', 1) * 1000

/** One morning on the Farm and at the Observatory, every kind running at once. */
function morning(): FarmState {
  let state = withNodes(withStock(farmAccount(), { carrot: 3, 'chopped-carrot': 4, 'wheat-flour': 1, 'dish-vegetables-1': 2, 'speed-ticket': 12 }), STUDENT.id, 0)
  state = ok(start(state, { outfitId: PLAIN.id, slot: GARDEN, request: farm('gather', 'carrot', 2) }, T0, ENV)).state
  for (const n of [1, 2, 3]) state = ok(queue(state, { outfitId: PLAIN.id, add: { request: farm('gather', 'carrot', n), building: 'vegetable-garden' } }, T0, ENV)).state
  state = ok(start(state, { outfitId: HELPER.id, slot: PANTRY, request: farm('craft', 'chopped-carrot', 3) }, T0, ENV)).state
  state = ok(queue(state, { outfitId: HELPER.id, add: { request: farm('craft', 'chopped-carrot', 2), building: 'pantry' } }, T0, ENV)).state
  state = ok(start(state, { outfitId: SPRINTS.id, slot: KITCHEN, request: farm('cook', 'dish-vegetables-1', 1) }, T0, ENV)).state
  return ok(start(state, { outfitId: STUDENT.id, slot: OBSERVATORY, request: { kind: 'session', unlocks: [node(1), node(2)] } }, T0, ENV)).state
}

describe('uma-racer-like kinds on the engine', () => {
  it('start every kind, queue three, and refuse a fourth', () => {
    const state = morning()
    expect(state.items).toEqual({ 'speed-ticket': 12 })
    expect(reservedStock(state, T0)).toEqual({ carrot: 3, 'chopped-carrot': 4, 'wheat-flour': 1, 'dish-vegetables-1': 2 })
    expect(queue(state, { outfitId: PLAIN.id, add: { request: farm('gather', 'carrot', 1), building: 'vegetable-garden' } }, T0, ENV)).toMatchObject({ code: 'queue-full' })
    expect(freeAt(state, PLAIN.id, T0, ENV)).toBe(T0 + 8 * G)
  })

  it('drop the Pantry queue that finds no carrots, while the garden chain runs on', () => {
    const { state, report } = settle(morning(), T0 + 3 * C, ENV)
    expect(report.dropped).toMatchObject([{ outfitId: HELPER.id, at: T0 + 3 * C, requests: [farm('craft', 'chopped-carrot', 2)], short: [{ item: 'carrot', qty: 2 }] }])
    expect(state.work[PLAIN.id]!.queue).toHaveLength(3)
  })

  it('collect part-way: items into the Warehouse with Farm EXP, unlocks into her build', () => {
    const now = T0 + G + 1
    const plain = collect(morning(), { outfitId: PLAIN.id }, now, ENV)
    expect(plain.receipt).toMatchObject({ outputs: [{ item: 'carrot' }], exp: 432, expDetail: { farmLevel: { from: 1, to: 1 } }, freed: false })
    expect(plain.state.items).toMatchObject({ carrot: 1 })
    const student = collect(plain.state, { outfitId: STUDENT.id }, T0 + minutes(180), ENV)
    expect(student.receipt).toMatchObject({ outputs: [{ unlock: node(1) }], paid: [{ opened: ['n1'] }], exp: 0 })
    expect(student.state.umas[STUDENT.id]!.build.constellationOpened).toBe(1)
  })

  it('recall the Kitchen: the dish in progress gives its inputs back', () => {
    const { state, receipt } = recall(morning(), { outfitId: SPRINTS.id }, T0 + K / 2, ENV)
    expect(receipt).toMatchObject({ recalled: true, outputs: [], returned: [{ item: 'chopped-carrot', qty: 4 }, { item: 'wheat-flour', qty: 1 }] })
    expect(state.items).toMatchObject({ 'chopped-carrot': 4, 'wheat-flour': 1 })
  })

  it('speed up the session and finish the garden from the Warehouse’s Speed Tickets', () => {
    const sped = ok(speedUp(morning(), { outfitId: STUDENT.id, startedAt: T0, tickets: 2 }, T0 + minutes(30), ENV))
    expect(sped.receipt).toMatchObject({ tickets: 2, savedMinutes: 60, movements: [{ kind: 'ticket', item: 'speed-ticket', qty: 2 }] })
    const done = ok(finish(sped.state, { outfitId: PLAIN.id, startedAt: T0 }, T0 + minutes(30), ENV))
    expect(done.receipt.tickets).toBe(Math.ceil((2 * G - minutes(30)) / minutes(30)))
    expect(done.receipt.settled.started).toEqual([{ outfitId: PLAIN.id, slot: GARDEN, at: T0 + minutes(30), request: farm('gather', 'carrot', 1) }])
    expect(done.state.items['speed-ticket']).toBe(12 - 2 - done.receipt.tickets)
  })

  it('upgrade the Pantry with Prize Money, written to the ledger, and the crafted items', () => {
    const items = Object.fromEntries(['honey', 'apple-preserve', 'carp-fillet', 'peanut-butter', 'dried-basil', 'wheat-flour', 'chopped-carrot', 'mushrooms-crafted-1'].map((id) => [id, 1]))
    const before = withPrizeMoney(withStock(farmAccount(), items), 1_500)
    const { state, receipt } = ok(upgrade(before, { building: 'pantry' }, T0, ENV))
    expect(receipt).toMatchObject({ from: 1, to: 2, money: 1_500, slotsPerRoom: 5 })
    expect(state.items).toEqual({})
    expect(state.ledger).toEqual([{ id: 'upgrade:pantry:2', resource: 'prize-money', delta: -1_500, reason: 'upgrade', at: T0 }])
    expect(ledgerTotal(state.ledger)).toBe(state.profile.prizeMoney - before.profile.prizeMoney)
  })
})
