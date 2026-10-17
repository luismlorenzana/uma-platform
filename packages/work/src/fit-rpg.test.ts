// uma-rpg's rules fit the engine (SC1 "Done when"): its gather, refine ×40, craft behind a grade gate and cut, Speed
// Tickets in the wallet, Laurels for upgrades, 3/4/5 slots and speed at Lv 3, run through start, queue 3, a dropped
// queue, collect part-way, recall, speed up, finish and upgrade. The kinds are test/fixtures/workshop.ts.
import { describe, expect, it } from 'vitest'
import {
  craftExpToNext, GATHER_MINUTES, MAKE_MINUTES, REFINE_MINUTES, stocked, withCraft, withWallet, workshop, WORKSHOP_BUILDINGS, WORKSHOP_ENV as ENV,
  type WorkshopRequest,
} from '../test/fixtures/workshop.js'
import { clock, minutes, ok } from '../test/fixtures/support.js'
import { collect, finish, queue, recall, speedUp, start, upgrade } from './operations.js'
import { settle } from './settle.js'
import { slotsOf } from './state.js'
import type { SlotRef } from './types.js'

const T0 = clock('08:00')
const QUARRY: SlotRef = { building: 'quarry', slot: 0 }
const BENCH: SlotRef = { building: 'workbench', slot: 0 }
const FORGE: SlotRef = { building: 'forge', slot: 0 }
const LAPIDARY: SlotRef = { building: 'lapidary', slot: 0 }
const job = (kind: WorkshopRequest['kind'], item: string, count: number): WorkshopRequest => ({ kind, item, count })
const add = (request: WorkshopRequest, building = 'quarry') => ({ outfitId: 'ace', add: { request, building } })

describe('uma-rpg-like kinds on the engine', () => {
  it('gather at a site with three queued behind, the place and the grade gate checked as they queue', () => {
    let state = ok(start(workshop(), { outfitId: 'ace', slot: QUARRY, request: job('gather', 'stone-1', 3) }, T0, ENV)).state
    expect(queue(state, add(job('gather', 'log-1', 1)), T0, ENV)).toMatchObject({ code: 'not-here' })
    expect(queue(state, add(job('gather', 'stone-2', 1)), T0, ENV)).toMatchObject({ code: 'grade', data: { level: 6 } })
    expect(queue(state, add(job('gather', 'stone-1', 1), 'grove'), T0, ENV)).toMatchObject({ code: 'queue-place' })
    for (const n of [2, 1, 4]) state = ok(queue(state, add(job('gather', 'stone-1', n)), T0, ENV)).state
    expect(queue(state, add(job('gather', 'stone-1', 1)), T0, ENV)).toMatchObject({ code: 'queue-full' })
    // The chain runs 3 + 2 + 1 + 4 hours, each starting at the end before it, with nothing to reserve.
    const night = settle(state, clock('20:00'), ENV)
    expect(night.report.started.map((s) => s.at)).toEqual([clock('11:00'), clock('13:00'), clock('14:00')])
    expect(collect(night.state, { outfitId: 'ace' }, clock('20:00'), ENV).state.items).toEqual({ 'stone-1': 10 })
  })

  it('refine up to ×40 at the Workbench, while gathering stays at 1–10', () => {
    const state = stocked(workshop(), { 'stone-1': 40 })
    expect(start(state, { outfitId: 'bee', slot: BENCH, request: job('refine', 'block-1', 41) }, T0, ENV)).toMatchObject({ code: 'count', data: { max: 40 } })
    expect(start(state, { outfitId: 'ace', slot: QUARRY, request: job('gather', 'stone-1', 11) }, T0, ENV)).toMatchObject({ code: 'count', data: { max: 10 } })
    const { state: next, receipt } = ok(start(state, { outfitId: 'bee', slot: BENCH, request: job('refine', 'block-1', 40) }, T0, ENV))
    expect(receipt.endsAt).toBe(T0 + 40 * minutes(REFINE_MINUTES))
    expect(next.items).toEqual({})
    expect(receipt.movements).toEqual([{ kind: 'reserve', item: 'stone-1', qty: 40, outfitId: 'bee', at: T0 }])
  })

  it('drop a queue the Warehouse cannot cover when it comes due, and keep it to restart', () => {
    let state = ok(start(stocked(workshop(), { 'stone-1': 1 }), { outfitId: 'bee', slot: BENCH, request: job('refine', 'block-1', 1) }, T0, ENV)).state
    state = ok(queue(state, { outfitId: 'bee', add: { request: job('refine', 'block-1', 5), building: 'workbench' } }, T0, ENV)).state
    const { state: next, report } = settle(state, clock('12:00'), ENV)
    expect(report.dropped).toEqual([{
      outfitId: 'bee', at: T0 + minutes(REFINE_MINUTES), slot: BENCH, requests: [job('refine', 'block-1', 5)], short: [{ item: 'stone-1', qty: 5 }], refused: null,
    }])
    const collected = collect(next, { outfitId: 'bee' }, clock('12:00'), ENV)
    expect(collected.state.items).toEqual({ 'block-1': 1 })
    expect(collected.state.work.bee).toMatchObject({ slot: null, entries: [], dropped: { requests: [job('refine', 'block-1', 5)] } })
  })

  it('craft gear behind the grade gate and cut gems, paid into gear and gems rather than the Warehouse', () => {
    const state = stocked(workshop(), { 'block-1': 3, 'plank-1': 1, 'block-2': 2, 'plank-2': 1 })
    expect(start(state, { outfitId: 'cal', slot: FORGE, request: job('craft', 'sword-g2', 1) }, T0, ENV)).toMatchObject({ code: 'grade', data: { level: 6 } })
    expect(start(state, { outfitId: 'cal', slot: LAPIDARY, request: job('craft', 'sword-g1', 1) }, T0, ENV)).toMatchObject({ code: 'not-here' })
    let next = ok(start(state, { outfitId: 'cal', slot: FORGE, request: job('craft', 'sword-g1', 1) }, T0, ENV)).state
    next = ok(start(next, { outfitId: 'bee', slot: LAPIDARY, request: job('cut', 'gem-g1', 1) }, T0, ENV)).state
    expect(next.items).toEqual({ 'block-2': 2, 'plank-2': 1 })
    const later = T0 + minutes(MAKE_MINUTES)
    next = collect(collect(next, { outfitId: 'cal' }, later, ENV).state, { outfitId: 'bee' }, later, ENV).state
    expect([next.gear, next.gems, next.items]).toEqual([{ 'sword-g1': 1 }, { 'gem-g1': 1 }, { 'block-2': 2, 'plank-2': 1 }])
    // A Craft Lv 6 Uma opens grade 2.
    expect(start(withCraft(state, 'cal', { level: 6, exp: 0 }), { outfitId: 'cal', slot: FORGE, request: job('craft', 'sword-g2', 1) }, T0, ENV)).not.toHaveProperty('refused')
  })

  it('collect part-way with Craft EXP from the job minutes, levelling through the game’s curve', () => {
    const state = withCraft(workshop(), 'ace', { level: 1, exp: craftExpToNext(1) - 100 })
    const working = ok(start(state, { outfitId: 'ace', slot: QUARRY, request: job('gather', 'stone-1', 3) }, T0, ENV)).state
    const part = collect(working, { outfitId: 'ace' }, T0 + 1.5 * minutes(GATHER_MINUTES), ENV)
    expect(part.receipt).toMatchObject({ outputs: [{ item: 'stone-1' }], exp: 2 * GATHER_MINUTES, expDetail: { levelsUp: 1 }, freed: false })
    expect(part.state.umas.ace!.craft).toEqual({ level: 2, exp: 20 })
    expect(part.state.work.ace!.entries[0]!.collected).toBe(1)
  })

  it('recall a refine: the finished blocks paid, every unmade stone back, the one in progress included', () => {
    const state = ok(start(stocked(workshop(), { 'stone-1': 40 }), { outfitId: 'bee', slot: BENCH, request: job('refine', 'block-1', 40) }, T0, ENV)).state
    const { state: next, receipt } = recall(state, { outfitId: 'bee' }, T0 + 10 * minutes(REFINE_MINUTES) + minutes(7), ENV)
    expect(receipt).toMatchObject({ recalled: true, returned: [{ item: 'stone-1', qty: 30 }], lostMinutes: 7 })
    expect(next.items).toEqual({ 'block-1': 10, 'stone-1': 30 })
    expect(next.work.bee).toBeUndefined()
  })

  it('speed up and finish with Speed Tickets from the wallet, which the Warehouse never lists', () => {
    const state = withWallet(ok(start(workshop(), { outfitId: 'ace', slot: QUARRY, request: job('gather', 'stone-1', 3) }, T0, ENV)).state, { timeTickets: 6 })
    const sped = ok(speedUp(state, { outfitId: 'ace', startedAt: T0, tickets: 2 }, T0 + minutes(10), ENV))
    expect(sped.receipt).toMatchObject({ tickets: 2, savedMinutes: 60, endsAt: T0 + minutes(120), movements: [] })
    expect(sped.state.wallet.timeTickets).toBe(4)
    // 110 minutes left take ⌈110 ÷ 30⌉ = 4.
    expect(finish(withWallet(sped.state, { timeTickets: 3 }), { outfitId: 'ace', startedAt: T0 }, T0 + minutes(10), ENV)).toMatchObject({ code: 'tickets', data: { n: 4, have: 3 } })
    const done = ok(finish(sped.state, { outfitId: 'ace', startedAt: T0 }, T0 + minutes(20), ENV))
    expect(done.receipt).toMatchObject({ tickets: 4, endsAt: T0 + minutes(20) })
    expect(done.state.wallet.timeTickets).toBe(0)
  })

  it('upgrade with Laurels and refined items: 3, 4 then 5 slots, speed at Lv 3 for new work only, no ledger', () => {
    const rich = withWallet(stocked(workshop(), { 'block-2': 1, 'plank-2': 1, 'block-5': 2, 'plank-5': 2 }), { laurels: 650 })
    expect(upgrade(withWallet(rich, { laurels: 149 }), { building: 'quarry' }, T0, ENV)).toMatchObject({ code: 'money', data: { n: 150, have: 149 } })
    const working = ok(start(rich, { outfitId: 'ace', slot: QUARRY, request: job('gather', 'stone-1', 1) }, T0, ENV)).state
    const two = ok(upgrade(working, { building: 'quarry' }, T0, ENV))
    expect(two.receipt).toMatchObject({ from: 1, to: 2, money: 150, slotsPerRoom: 4, speed: 1, charge: { id: 'upgrade:quarry:2', delta: -150 } })
    const three = ok(upgrade(two.state, { building: 'quarry' }, T0, ENV))
    expect(three.receipt).toMatchObject({ to: 3, money: 500, slotsPerRoom: 5, speed: 1.25 })
    expect(three.state.wallet.laurels).toBe(0)
    expect(three.state.items).toEqual({})
    expect(slotsOf(three.state, 'quarry', WORKSHOP_BUILDINGS)).toHaveLength(5)
    expect(upgrade(three.state, { building: 'quarry' }, T0, ENV)).toMatchObject({ code: 'top-level' })
    expect(three.state.work.ace!.entries[0]).toMatchObject({ speed: 1, seconds: [GATHER_MINUTES * 60] })
    const fast = ok(start(three.state, { outfitId: 'bee', slot: { building: 'quarry', slot: 4 }, request: job('gather', 'stone-1', 1) }, T0, ENV)).state
    expect(fast.work.bee!.entries[0]).toMatchObject({ speed: 1.25, seconds: [GATHER_MINUTES * 48] })
  })

  it('refuse an Uma the game has not unlocked', () => {
    expect(start(workshop(), { outfitId: 'zed', slot: QUARRY, request: job('gather', 'stone-1', 1) }, T0, ENV)).toMatchObject({ code: 'unknown-worker' })
  })
})
