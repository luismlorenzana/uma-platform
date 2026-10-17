// `@luismlorenzana/uma-work` exports the engine both games build on: uma-racer's names, kept where they still make
// sense, plus the hooks' helpers and uma-rpg's requirements netting.
import { describe, expect, it } from 'vitest'
import * as work from './index.js'

describe('the package entry', () => {
  it('exports the engine', () => {
    for (const name of [
      'itemEnds', 'finishedCount', 'endsAt', 'remainingMs', 'progress', 'itemProgress', 'chainTimes', 'ticketsToFinish', 'applyTickets', 'assertNow',
      'settle', 'joinSettles', 'payWork', 'start', 'queue', 'collect', 'recall', 'speedUp', 'finish', 'upgrade', 'upgradeLedgerId',
      'statusOf', 'workState', 'chainEnd', 'freeAt', 'isFree', 'reservedStock',
      'newWorkState', 'buildingLevel', 'speedAt', 'slotExists', 'slotOrder', 'slotsOf', 'totalSlots', 'slotHolder', 'withRow', 'emptyRow',
      'sumInputs', 'stockOf', 'shortfall', 'largestCoverable', 'moveStock', 'movements', 'payItems', 'warehouseTickets', 'buildingTable',
      'kindRules', 'requestCount', 'countAllowed', 'refuse', 'isRefusal', 'workRefusal', 'planRequirements',
    ] as const) expect(typeof work[name], name).toBe('function')
    expect(work.SPEED_TICKET_MS).toBe(1_800_000)
    expect([work.MIN_ITEMS_PER_ENTRY, work.MAX_ITEMS_PER_ENTRY, work.MAX_QUEUE]).toEqual([1, 10, 3])
    expect(Object.keys(work.WORK_REFUSALS)).toHaveLength(13)
  })
})
