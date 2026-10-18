// Invented work for SC2's offline tests. Excluded from the published build.
import {
  buildingTable, isRefusal, newWorkState, payItems, refuse, warehouseTickets,
  type ItemRequest, type WorkEnv, type WorkState,
} from '@luismlorenzana/uma-work'

export type TestRequest = ItemRequest<'gather' | 'make' | 'refine'>
export interface TestState extends WorkState<TestRequest> { readonly coins: number; readonly workers: readonly string[] }
export const MINUTE = 60_000
export const AT = Date.UTC(2026, 0, 1, 8)
const buildings = buildingTable({
  grove: { slots: [2, 3, 3], speed: [1, 1, 1.25], upgrades: [{ money: 20, items: [{ item: 'twig', qty: 2 }] }, { money: 50, items: [] }] },
  studio: { slots: [2], speed: [1], upgrades: [] },
  hall: { rooms: ['east', 'west'], slots: [1, 2], speed: [1, 2], upgrades: [{ money: 0, items: [] }] },
})
export const ENV: WorkEnv<TestState> = {
  buildings, tickets: warehouseTickets('ticket'),
  money: { balance: (state) => state.coins, spend: (state, n) => ({ ...state, coins: state.coins - n }) },
  exp: { grant: (state) => ({ state }), gradeOpen: () => true },
  isWorker: (state, id) => state.workers.includes(id),
  kinds: Object.fromEntries((['gather', 'make', 'refine'] as const).map((kind) => [kind, {
    maxItems: kind === 'refine' ? 40 : 10,
    plan: (_state: TestState, _outfitId: string, request: TestRequest, _now: number, context: { speed: number }) => request.item === 'blocked'
      ? refuse('grade', 'Needs Lv {level}.', { level: 5 })
      : Array.from({ length: request.count }, () => ({
        seconds: (kind === 'gather' ? 20 : 10) * 60 / context.speed,
        inputs: kind === 'gather' ? [] : [{ item: 'twig', qty: 1 }], output: { item: request.item }, exp: 2,
      })),
    pay: payItems,
  }])),
}
export function fresh(items: Record<string, number> = {}): TestState {
  return { ...newWorkState(buildings, items), work: {}, coins: 100, workers: ['ada', 'bee', 'cal'] }
}
export function done<T>(result: { readonly state: T } | { readonly refused: true }): T {
  if (isRefusal(result)) throw new Error(result.message)
  return (result as { readonly state: T }).state
}
