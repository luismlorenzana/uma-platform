// The work engine's state helpers: a new save's work parts, slots and who holds them, building order, and the
// Warehouse's free stock. Pure; every helper returns new objects and never writes into its inputs.
import type { BuildingRules, PlannedItem, PayContext, TicketRules } from './kinds.js'
import type { Entry, ItemMovement, ItemQty, ItemStock, SlotRef, WorkOutput, WorkRequest, WorkRow, WorkState } from './types.js'

/** The work parts of a new save: every building at Lv 1, no work, and the Warehouse's opening stock. */
export function newWorkState(buildings: BuildingRules, items: ItemStock = {}): WorkState {
  return { items, buildings: Object.fromEntries(buildings.ids.map((id) => [id, { level: 1 }])), work: {} }
}

// --- Buildings and slots --------------------------------------------------------------------------------------------

export const buildingLevel = (state: Pick<WorkState, 'buildings'>, building: string): number => state.buildings[building]?.level ?? 1
export const speedAt = (state: Pick<WorkState, 'buildings'>, building: string, rules: BuildingRules): number =>
  rules.speed(building, buildingLevel(state, building))

/** Whether `slot` names a slot the building has at its current level; a malformed one throws (a caller's bug). */
export function slotExists(state: Pick<WorkState, 'buildings'>, slot: SlotRef, rules: BuildingRules): boolean {
  if (!rules.ids.includes(slot.building)) throw new RangeError(`No building ${String(slot.building)}`)
  const rooms = rules.rooms(slot.building)
  if (rooms.length > 0 ? slot.room === undefined || !rooms.includes(slot.room) : slot.room !== undefined) {
    throw new RangeError(`${slot.building} has no room ${String(slot.room)}`)
  }
  if (!Number.isInteger(slot.slot) || slot.slot < 0) throw new RangeError(`A slot index is a whole number ≥ 0: ${slot.slot}`)
  return slot.slot < rules.slots(slot.building, buildingLevel(state, slot.building))
}

export const samePlace = (a: SlotRef, b: { readonly building: string; readonly room?: string }): boolean =>
  a.building === b.building && a.room === b.room
export const sameSlot = (a: SlotRef, b: SlotRef): boolean => samePlace(a, b) && a.slot === b.slot

/** Tie-break order: the game's building order, then rooms in their order, then slot. */
export function slotOrder(a: SlotRef, b: SlotRef, rules: BuildingRules): number {
  const building = rules.ids.indexOf(a.building) - rules.ids.indexOf(b.building)
  if (building !== 0) return building
  const rooms = rules.rooms(a.building)
  const room = (a.room === undefined ? -1 : rooms.indexOf(a.room)) - (b.room === undefined ? -1 : rooms.indexOf(b.room))
  return room !== 0 ? room : a.slot - b.slot
}

/** Every slot of a building at its current level, in order (rooms in their order). */
export function slotsOf(state: Pick<WorkState, 'buildings'>, building: string, rules: BuildingRules): SlotRef[] {
  const level = buildingLevel(state, building)
  const rooms: readonly (string | undefined)[] = rules.rooms(building).length > 0 ? rules.rooms(building) : [undefined]
  return rooms.flatMap((room) => Array.from({ length: rules.slots(building, level) }, (_, slot) =>
    (room === undefined ? { building, slot } : { building, room, slot })))
}

/** Every slot in the building at `level`, all rooms together. */
export const totalSlots = (building: string, level: number, rules: BuildingRules): number =>
  rules.slots(building, level) * Math.max(1, rules.rooms(building).length)

/** A row is working a slot while it holds started entries. */
export const holdsSlot = (row: WorkRow): boolean => row.entries.length > 0 && row.slot !== null

/** The outfit whose work holds `slot`, if any. */
export function slotHolder(state: Pick<WorkState, 'work'>, slot: SlotRef): string | undefined {
  for (const row of Object.values(state.work)) if (holdsSlot(row) && sameSlot(row.slot!, slot)) return row.outfitId
  return undefined
}

// --- Rows -----------------------------------------------------------------------------------------------------------

export const emptyRow = (outfitId: string): WorkRow => ({ outfitId, slot: null, entries: [], queue: [], last: null, dropped: null })

/** The state with her row replaced; a row holding nothing at all is removed. */
export function withRow<S extends WorkState>(state: S, row: WorkRow): S {
  const idle = row.entries.length === 0 && row.queue.length === 0 && row.last === null && row.dropped === null
  const work: Record<string, WorkRow> = { ...state.work }
  if (idle) delete work[row.outfitId]
  else work[row.outfitId] = row
  return { ...state, work }
}

/** The entry started from a plan: the speed, inputs and EXP are frozen into it. */
export function entryFrom(request: WorkRequest, items: readonly PlannedItem[], startedAt: number, speed: number, fromQueue: boolean): Entry {
  return {
    request,
    seconds: items.map((item) => item.seconds),
    inputs: items.map((item) => item.inputs),
    outputs: items.map((item) => item.output),
    exp: items.map((item) => item.exp),
    startedAt,
    acceleratedMs: 0,
    collected: 0,
    speed,
    fromQueue,
  }
}

// --- The Warehouse --------------------------------------------------------------------------------------------------

/** Rows of item and quantity summed by item, in first-seen order. */
export function sumInputs(rows: readonly (readonly ItemQty[])[]): ItemQty[] {
  const total = new Map<string, number>()
  for (const row of rows) for (const { item, qty } of row) total.set(item, (total.get(item) ?? 0) + qty)
  return [...total].map(([item, qty]) => ({ item, qty }))
}

export const stockOf = (items: ItemStock, item: string): number => items[item] ?? 0

/** What the free stock lacks for `inputs`, item by item, in their order. */
export const shortfall = (items: ItemStock, inputs: readonly ItemQty[]): ItemQty[] =>
  inputs.flatMap(({ item, qty }) => (stockOf(items, item) < qty ? [{ item, qty: qty - stockOf(items, item) }] : []))

/** The most of `items` from the first, in order, whose inputs the free stock covers ("Only 3 left now"). */
export function largestCoverable(stock: ItemStock, items: readonly PlannedItem[]): number {
  let covered = 0
  for (let n = 1; n <= items.length; n += 1) {
    if (shortfall(stock, sumInputs(items.slice(0, n).map((item) => item.inputs))).length > 0) break
    covered = n
  }
  return covered
}

/** Moves stock: `sign` −1 takes (the caller checked it's there), +1 gives. A count that reaches 0 leaves the map. */
export function moveStock(items: ItemStock, rows: readonly ItemQty[], sign: 1 | -1): ItemStock {
  const next: Record<string, number> = { ...items }
  for (const { item, qty } of rows) {
    const count = (next[item] ?? 0) + sign * qty
    if (count < 0) throw new RangeError(`The Warehouse has no ${qty} ${item}`)
    if (count === 0) delete next[item]
    else next[item] = count
  }
  return next
}

export const movements = (kind: ItemMovement['kind'], rows: readonly ItemQty[], outfitId: string | null, at: number): ItemMovement[] =>
  rows.filter(({ qty }) => qty > 0).map(({ item, qty }) => ({ kind, item, qty, outfitId, at }))

/** A kind's `pay` for item outputs: each goes into the Warehouse's free stock. Throws on an unlock. */
export function payItems<S extends WorkState, T extends S>(state: T, _outfitId: string, outputs: readonly WorkOutput[], _context?: PayContext<S>): { readonly state: T } {
  const items: Record<string, number> = { ...state.items }
  for (const output of outputs) {
    if (!('item' in output)) throw new RangeError('This kind pays items only')
    items[output.item] = (items[output.item] ?? 0) + 1
  }
  return { state: { ...state, items } }
}

/** Speed Tickets kept as a Warehouse item (uma-racer): their balance is the stock, and spending one moves it. */
export function warehouseTickets(item: string): TicketRules {
  return Object.freeze({
    item,
    balance: (state: WorkState) => stockOf(state.items, item),
    spend: <T extends WorkState>(state: T, n: number): T => ({ ...state, items: moveStock(state.items, [{ item, qty: n }], -1) }),
  })
}
