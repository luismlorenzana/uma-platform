import { collect, endsAt, queue, recall, settle, start } from '@luismlorenzana/uma-work'
import { describe, expect, it } from 'vitest'
import { recallLines, speedUpQuestion } from './controls.js'
import { AT, done, ENV, fresh, MINUTE } from './work.fixtures.js'
import { projectWork, queueChips, recallPreview, sizeChipsView, slotCards, speedUpModel, upgradeView } from './model.js'
import { chooseSlot, workView } from './view.js'
import { durationText, itemsList, workWords } from './words.js'

const slot = { building: 'grove', slot: 0 }
const making = () => done(start(fresh({ twig: 8, ticket: 10 }), { outfitId: 'ada', slot, request: { kind: 'make', item: 'toy', count: 4 } }, AT, ENV))

describe('work selectors', () => {
  it('reads slots and rooms from the supplied building rules at every level', () => {
    for (const level of [1, 2, 3]) {
      const state = { ...fresh(), buildings: { grove: { level } } }
      expect(slotCards(state, 'grove', AT, ENV.buildings)).toHaveLength(level === 1 ? 2 : 3)
    }
    expect(slotCards(fresh(), 'hall', AT, ENV.buildings).map((card) => card.slot)).toEqual([
      { building: 'hall', room: 'east', slot: 0 }, { building: 'hall', room: 'west', slot: 0 },
    ])
  })
  it('shows partial collect across the frozen entry and never mutates the input', () => {
    const state = making()
    const before = JSON.stringify(state)
    const view = workView(state, AT + 25 * MINUTE, ENV)
    expect(view.cards('grove')[0]).toMatchObject({ made: 2, count: 4, waiting: 2, running: true, leftMs: 15 * MINUTE, progress: 0.5 })
    const paid = collect(state, { outfitId: 'ada' }, view.now, ENV).state
    expect(workView(paid, view.now, ENV).cards('grove')[0]).toMatchObject({ made: 2, waiting: 0 })
    expect(workView(state, AT + 40 * MINUTE, ENV).cards('grove')[0]).toMatchObject({ running: false, waiting: 4, leftMs: 0 })
    expect(JSON.stringify(state)).toBe(before)
  })
  it('distinguishes hidden, ready, waste, buy and unavailable-purchase states', () => {
    const state = making()
    expect(speedUpModel(fresh(), 'ada', AT, ENV).state).toBe('hidden')
    expect(speedUpModel(state, 'ada', AT, ENV)).toMatchObject({ state: 'ready', finish: 2, have: 10 })
    const waste = speedUpModel(state, 'ada', AT + 28 * MINUTE, ENV)
    expect(waste).toMatchObject({ state: 'waste', finish: 1, wastedMinutes: 18 })
    expect(speedUpQuestion(waste, workWords())).toContain('18 of the ticket')
    const short = { ...state, items: { twig: 4 } }
    expect(speedUpModel(short, 'ada', AT, ENV).state).toBe('short')
    const buy = speedUpModel(short, 'ada', AT, ENV, (n) => ({ price: n * 7, label: `${n * 7} tokens`, refusal: 'Need more tokens.' }))
    expect(buy).toMatchObject({ state: 'buy', buy: 2, offer: { price: 14, refusal: 'Need more tokens.' } })
    expect(speedUpQuestion(buy, workWords())).toContain('14 tokens')
    expect(speedUpModel(state, 'ada', AT + 40 * MINUTE, ENV).state).toBe('hidden')
  })
  it('uses the real recall receipt for outputs, returned inputs, lost progress and queue loss', () => {
    const state = done(queue(making(), { outfitId: 'ada', add: { request: { kind: 'make', item: 'toy', count: 2 }, building: 'grove' } }, AT, ENV))
    const now = AT + 15 * MINUTE
    const preview = recallPreview(state, 'ada', now, ENV)
    const receipt = recall(state, { outfitId: 'ada' }, now, ENV).receipt
    expect(preview).toMatchObject({ paid: [{ item: 'toy', qty: 1 }], returned: receipt.returned, lostMinutes: 5, droppedQueue: 1, recalled: true })
    expect(recallLines(preview, workWords(), (rows) => itemsList(rows, (id) => id))).toEqual(['1 toy collected', '3 twig come back', '5 minutes of progress lost', '1 queued job dropped'])
  })
  it('projects competing queues in engine order and warns at the exact dropped entry', () => {
    let state = fresh({ twig: 3 })
    for (const [index, outfitId] of ['ada', 'bee'].entries()) {
      state = done(start(state, { outfitId, slot: { building: 'studio', slot: index }, request: { kind: 'make', item: 'toy', count: 1 } }, AT, ENV))
      state = done(queue(state, { outfitId, add: { building: 'studio', request: { kind: 'make', item: 'toy', count: 1 } } }, AT, ENV))
    }
    const before = JSON.stringify(state)
    const projection = projectWork(state, AT, ENV)
    expect(queueChips(projection, 'ada')[0]).toMatchObject({ endsAt: AT + 20 * MINUTE, ms: 10 * MINUTE, short: [] })
    expect(queueChips(projection, 'bee')[0]).toMatchObject({ endsAt: null, ms: null, short: [{ item: 'twig', qty: 1 }] })
    expect(projection.ahead).toEqual(settle(state, Number.MAX_SAFE_INTEGER, ENV).state)
    expect(JSON.stringify(state)).toBe(before)
  })
  it('warns on a kind refusal and leaves unknown workers with no queue chips', () => {
    const state = making()
    const row = state.work.ada!
    const blocked = { ...state, work: { ada: { ...row, queue: [{ kind: 'make' as const, item: 'blocked', count: 1 }] } } }
    expect(workView(blocked, AT, ENV).queues('ada')[0]?.refusal?.code).toBe('grade')
    expect(workView(blocked, AT, ENV).queues('missing')).toEqual([])
  })
  it('supports sparse ×40 batches and game-owned duration fitting without check-in rules', () => {
    const seconds = Array.from({ length: 40 }, () => 60)
    const counts = sizeChipsView(AT, seconds, 40, { mode: 'count', sizes: [1, 4, 8, 20, 40] })
    expect(counts.chips.map((chip) => chip.size)).toEqual([1, 4, 8, 20, 40])
    expect(counts.chips.at(-1)?.duration).toBe('40m')
    const fitted = sizeChipsView(AT, seconds, 4, { mode: 'duration', recommend: () => ({ size: 3, label: 'fits next visit', overnight: true, idleMs: { 1: MINUTE } }) })
    expect(fitted).toMatchObject({ marked: 3, fit: 'fits next visit', overnight: true })
    expect(fitted.chips[0]).toMatchObject({ ms: MINUTE, idleMs: MINUTE })
    expect(sizeChipsView(AT, seconds, 0).chips).toHaveLength(1)
    expect(sizeChipsView(AT, [], 0).chips).toEqual([])
    const recommend = (start: number, offered: readonly number[]) => ({ size: offered.length, label: 'fits stock' })
    expect(sizeChipsView(AT, seconds, 3, { mode: 'duration', recommend })).toMatchObject({ marked: 3, fit: 'fits stock' })
    expect(sizeChipsView(AT, seconds, 3, { mode: 'duration', recommend: () => ({ size: 9, label: 'invalid fit' }) }).fit).toBeNull()
  })
  it('reads upgrade costs and new slots/speed from the game; max level hides the upgrade', () => {
    const state = fresh({ twig: 2 })
    expect(upgradeView(state, 'grove', AT, ENV)).toMatchObject({ to: 2, money: 20, haveMoney: 100, slots: 3, slotsNow: 2, refusal: null })
    expect(upgradeView({ ...state, coins: 0 }, 'grove', AT, ENV)?.refusal?.code).toBe('money')
    expect(upgradeView(fresh(), 'grove', AT, ENV)?.refusal?.code).toBe('short')
    expect(upgradeView({ ...state, buildings: { grove: { level: 3 } } }, 'grove', AT, ENV)).toBeNull()
  })
  it('builds a job preview from the registered kind and checks actual start/queue rules', () => {
    const view = workView(fresh({ twig: 6 }), AT, ENV)
    const request = { kind: 'refine', item: 'toy', count: 40 }
    expect(view.plan({ outfitId: 'ada', slot, request, mode: 'start' })).toMatchObject({ max: 6, exp: 80, ms: 400 * MINUTE, inputs: [{ item: 'twig', need: 40, have: 6 }] })
    expect(view.check({ outfitId: 'ada', slot, request, mode: 'start' })?.code).toBe('short')
    expect(view.check({ outfitId: 'ada', slot, request: { ...request, count: 6 }, mode: 'start' })).toBeNull()
    expect(chooseSlot(view, 'grove', 'ada', 1)).toEqual({ building: 'grove', slot: 1 })
    expect(chooseSlot(view, 'hall', 'ada', null, 'west')).toEqual({ building: 'hall', room: 'west', slot: 0 })
    const running = workView(making(), AT, ENV)
    expect(running.check({ outfitId: 'ada', slot, request, mode: 'start' })?.code).toBe('busy')
    expect(running.plan({ outfitId: 'ada', slot, request: { ...request, count: 1 }, mode: 'queue' }).start).toBe(endsAt(making().work.ada!.entries[0]!))
  })
  it('rounds durations up without displaying end-clock times', () => {
    expect([0, 30_000, 3_600_000, 3_660_000].map(durationText)).toEqual(['0m', '1m', '1h', '1h 1m'])
  })
})
