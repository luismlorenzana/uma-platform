// The kinds of work and what the game supplies (uma-platform SC1). A kind plans a request into items (seconds, inputs,
// output and EXP each) and pays finished outputs. The engine owns everything else: slots, reserving, the clock,
// queues, collect, recall and Speed Tickets. Each game registers its own kinds and fills the other hooks of `WorkEnv`
// from its own rules: its buildings, where its Speed Tickets live, how its Umas level, and its money.
import type { Refusal } from './refusal.js'
import type { ItemQty, RequestOf, SlotRef, WorkOutput, WorkRequest, WorkState } from './types.js'

/** One planned item. */
export interface PlannedItem {
  /** Its seconds at the building's speed now (the kind divides by `context.speed`). */
  readonly seconds: number
  /** What it takes from the Warehouse, reserved when its entry starts. */
  readonly inputs: readonly ItemQty[]
  readonly output: WorkOutput
  /** EXP in the game's units, fixed now; 0 where the kind pays none. */
  readonly exp: number
}

/** What the engine tells a kind about the request it plans. */
export interface PlanContext<S extends WorkState = WorkState> {
  /** The slot it would run in: its building (and room) decide what is made there. */
  readonly slot: SlotRef
  /** The building's speed now (frozen into the entry when it starts). */
  readonly speed: number
  /**
   * Her requests ahead of this one, oldest first: her started entries, made or not, then the queued requests before
   * it. A kind counts them as made, so a queued unlock continues in order.
   */
  readonly earlier: readonly RequestOf<S>[]
  readonly env: WorkEnv<S>
}

export interface PayContext<S extends WorkState = WorkState> {
  readonly now: number
  readonly env: WorkEnv<S>
}

export interface WorkKindRules<S extends WorkState = WorkState> {
  /**
   * Plans `request` for `outfitId` at `now`: its items, or a refusal (`not-here`, `grade`, or the kind's own). It never
   * checks stock; the engine reserves what the items name.
   */
  plan(state: S, outfitId: string, request: RequestOf<S>, now: number, context: PlanContext<S>): readonly PlannedItem[] | Refusal
  /** Pays finished outputs, oldest first: items into the Warehouse (`payItems`), gear, gems or unlocks elsewhere. */
  pay<T extends S>(state: T, outfitId: string, outputs: readonly WorkOutput[], context: PayContext<S>): { readonly state: T; readonly detail?: unknown }
  /** How many items `request` makes. Default: its `count`, or its `unlocks`' length. */
  count?(request: RequestOf<S>): number
  /** The most items one request may make. Default 10 (uma-rpg's refining takes up to 40). */
  readonly maxItems?: number
}

export type WorkKinds<S extends WorkState = WorkState> = Readonly<Record<string, WorkKindRules<S>>>

/** What raising a building one level costs: Warehouse items, which the engine takes, and the game's money. */
export interface UpgradeCost {
  /** In the game's money (Prize Money, Laurels); 0 for none. */
  readonly money: number
  readonly items: readonly ItemQty[]
}

/** The game's buildings: their order, rooms, slots, speed and upgrade costs. `buildingTable` builds one from data. */
export interface BuildingRules {
  /** Every building, in tie-break order: queues due at the same moment start in this order, then by room and slot. */
  readonly ids: readonly string[]
  /** A building's rooms in order; empty where it has none. */
  rooms(building: string): readonly string[]
  /** Slots in each room (or the building, where it has no rooms) at `level`. */
  slots(building: string, level: number): number
  /** Speed at `level`: a kind divides an item's time by it. */
  speed(building: string, level: number): number
  /** Its top level. Every building starts at Lv 1. */
  maxLevel(building: string): number
  /** What raising it to `level` (2 or more) costs. */
  upgradeCost(building: string, level: number): UpgradeCost
}

/** Where the game keeps Speed Tickets: uma-racer as a Warehouse item (`warehouseTickets`), uma-rpg in its wallet. */
export interface TicketRules<S extends WorkState = WorkState> {
  balance(state: S): number
  /** Takes `n`; the engine checked the balance. */
  spend<T extends S>(state: T, n: number): T
  /** The Warehouse item they are, when they are one, so receipts list their movement. */
  readonly item?: string
}

/** How the game levels an Uma from work: each game keeps its own work level and its grade gates. */
export interface ExpRules<S extends WorkState = WorkState> {
  /**
   * Pays `exp` (the sum of the items collected, maybe 0) to `outfitId`. `detail` is what the game wants on the receipt,
   * such as the levels crossed and the grades they opened.
   */
  grant<T extends S>(state: T, outfitId: string, exp: number, now: number): { readonly state: T; readonly detail?: unknown }
  /** Whether her level opens `grade` of `kind`. Kinds call it from `plan` and refuse with `workRefusal('grade')`. */
  gradeOpen(state: S, outfitId: string, kind: string, grade: number): boolean
}

/** The game's money for upgrades: uma-racer's Prize Money, uma-rpg's Laurels. */
export interface MoneyRules<S extends WorkState = WorkState> {
  balance(state: S): number
  /** Takes `amount`; the engine checked the balance. */
  spend<T extends S>(state: T, amount: number): T
}

/** An upgrade's money row, once-only by its id (`upgrade:<building>:<level>`). */
export interface UpgradeCharge {
  readonly id: string
  readonly reason: 'upgrade'
  readonly building: string
  readonly level: number
  /** Negative: the money taken. */
  readonly delta: number
  readonly at: number
}

/** A game's audit log of money (uma-racer's ledger). uma-rpg passes none. */
export interface LedgerRules<S extends WorkState = WorkState> {
  record<T extends S>(state: T, entry: UpgradeCharge): T
}

/** What every operation and settle read beyond the state. */
export interface WorkEnv<S extends WorkState = WorkState> {
  /** The game's kinds, by request kind. There is no built-in registry. */
  readonly kinds: WorkKinds<S>
  readonly buildings: BuildingRules
  readonly tickets: TicketRules<S>
  readonly exp: ExpRules<S>
  /** Needed when an upgrade costs money. */
  readonly money?: MoneyRules<S>
  /** Called after `money.spend` with the upgrade's row. */
  readonly ledger?: LedgerRules<S>
  /** Whether `outfitId` may work at all (unlocked); absent, everyone may. A refusal names `unknown-worker`. */
  isWorker?(state: S, outfitId: string): boolean
}

/** The rules for `kind`, or undefined when nothing registered it. */
export const kindRules = <S extends WorkState>(env: WorkEnv<S>, kind: string): WorkKindRules<S> | undefined =>
  Object.prototype.hasOwnProperty.call(env.kinds, kind) ? env.kinds[kind] : undefined

/** A job makes 1–10 items, unless its kind says otherwise. */
export const MIN_ITEMS_PER_ENTRY = 1
export const MAX_ITEMS_PER_ENTRY = 10

/** How many items or unlocks a request makes: the kind's `count`, else its `count` field or its unlocks. */
export function requestCount<S extends WorkState>(request: WorkRequest, rules?: WorkKindRules<S>): number {
  if (rules?.count !== undefined) return rules.count(request as RequestOf<S>)
  const fields = request as { readonly count?: unknown; readonly unlocks?: unknown }
  if (typeof fields.count === 'number') return fields.count
  if (Array.isArray(fields.unlocks)) return fields.unlocks.length
  return Number.NaN
}

/** Whether `n` items is a size the kind allows: a whole 1 to its `maxItems` (10 by default). */
export const countAllowed = (n: number, rules?: { readonly maxItems?: number }): boolean =>
  Number.isInteger(n) && n >= MIN_ITEMS_PER_ENTRY && n <= (rules?.maxItems ?? MAX_ITEMS_PER_ENTRY)
