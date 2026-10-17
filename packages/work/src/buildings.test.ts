// A game's buildings as data: the table's order is the tie-break order, levels index from 1, Lv 1 is free, and a
// malformed table throws once, when it's built.
import { describe, expect, it } from 'vitest'
import { buildingTable } from './buildings.js'
import { countAllowed, requestCount, type WorkKindRules } from './kinds.js'
import { newWorkState, slotsOf, totalSlots } from './state.js'

const RULES = buildingTable({
  yard: { slots: [3, 4, 5], speed: [1, 1, 1.25], upgrades: [{ money: 150, items: [{ item: 'block', qty: 1 }] }, { money: 500, items: [] }] },
  hall: { rooms: ['east', 'west'], slots: [1, 2], speed: [1, 1.5], upgrades: [{ money: 0, items: [{ item: 'plank', qty: 2 }] }] },
})

describe('buildingTable', () => {
  it('reads slots, speed, top level and costs per level, in the table order', () => {
    expect(RULES.ids).toEqual(['yard', 'hall'])
    expect([RULES.slots('yard', 1), RULES.slots('yard', 3), RULES.speed('yard', 3), RULES.maxLevel('yard'), RULES.maxLevel('hall')]).toEqual([3, 5, 1.25, 3, 2])
    expect(RULES.upgradeCost('yard', 1)).toEqual({ money: 0, items: [] })
    expect(RULES.upgradeCost('yard', 2)).toEqual({ money: 150, items: [{ item: 'block', qty: 1 }] })
    expect(RULES.rooms('yard')).toEqual([])
    expect(RULES.rooms('hall')).toEqual(['east', 'west'])
    expect(totalSlots('hall', 2, RULES)).toBe(4)
    const state = newWorkState(RULES, { block: 1 })
    expect(state).toEqual({ items: { block: 1 }, buildings: { yard: { level: 1 }, hall: { level: 1 } }, work: {} })
    expect(slotsOf(state, 'hall', RULES)).toEqual([{ building: 'hall', room: 'east', slot: 0 }, { building: 'hall', room: 'west', slot: 0 }])
  })

  it('throws on an unknown building or level, and on a malformed table', () => {
    expect(() => RULES.slots('moon', 1)).toThrow(RangeError)
    expect(() => RULES.speed('yard', 4)).toThrow(RangeError)
    expect(() => RULES.upgradeCost('yard', 0)).toThrow(RangeError)
    expect(() => buildingTable({ x: { slots: [1, 2], speed: [1], upgrades: [{ money: 0, items: [] }] } })).toThrow(/one value per level/)
    expect(() => buildingTable({ x: { slots: [1, 2], speed: [1, 1], upgrades: [] } })).toThrow(/one value per level/)
    expect(() => buildingTable({ x: { slots: [1.5], speed: [1], upgrades: [] } })).toThrow(/whole numbers/)
    expect(() => buildingTable({ x: { slots: [1], speed: [0], upgrades: [] } })).toThrow(/above 0/)
    expect(() => buildingTable({ toString: { slots: [1], speed: [1], upgrades: [] } }).slots('constructor', 1)).toThrow(RangeError)
  })
})

describe('request sizes', () => {
  it("count an item request's `count` or an unlock request's unlocks, unless the kind counts", () => {
    expect(requestCount({ kind: 'gather', item: 'x', count: 4 } as never)).toBe(4)
    expect(requestCount({ kind: 'session', unlocks: [{ kind: 'node', target: 'n1' }] } as never)).toBe(1)
    expect(requestCount({ kind: 'odd' })).toBeNaN()
    const byWeight = { count: (request: { weight?: number }) => request.weight ?? 0 } as unknown as WorkKindRules
    expect(requestCount({ kind: 'heavy', weight: 7 } as never, byWeight)).toBe(7)
  })

  it('allow 1–10 by default, and up to a kind’s own most', () => {
    expect([0, 1, 10, 11, 2.5].map((n) => countAllowed(n))).toEqual([false, true, true, false, false])
    expect([10, 40, 41].map((n) => countAllowed(n, { maxItems: 40 }))).toEqual([true, true, false])
  })
})
