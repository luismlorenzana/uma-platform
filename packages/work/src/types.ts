// The work engine's state and shapes (uma-platform SC1, docs/sibling/phases.md § Phase C). One engine runs every timed
// thing an Uma does in either game: 1–10 items one after another in one slot, with up to three requests queued behind.
// Only timestamps are stored. The model is uma-racer's (`packages/domain/src/work/`), generalized: ids are strings, a
// building's level is a number, and what is made, how long it takes and what it pays come from the game's kinds.
import type { Refusal } from './refusal.js'

/** One slot: a building, its room where it has rooms (absent elsewhere), and the slot index from 0. */
export interface SlotRef {
  readonly building: string
  readonly room?: string
  readonly slot: number
}

/** Any request a kind plans: its kind, and the kind's own fields. The state stores requests as given. */
export interface WorkRequest {
  readonly kind: string
}

/** The common request: 1–10 of one item. */
export interface ItemRequest<K extends string = string> extends WorkRequest {
  readonly kind: K
  readonly item: string
  readonly count: number
}

/** One unlock a request makes: what it opens (`kind`, e.g. a node) and which one (`target`, e.g. `n6`). */
export interface UnlockRef {
  readonly kind: string
  readonly target: string
}

/** A request for 1–10 unlocks in order (uma-racer's Training Hub sessions). */
export interface UnlockRequest<K extends string = string> extends WorkRequest {
  readonly kind: K
  readonly unlocks: readonly UnlockRef[]
}

/** What one finished item pays: an item, or an unlock. The kind's `pay` decides where it goes. */
export type WorkOutput = { readonly item: string } | { readonly unlock: UnlockRef }

/** An item and how many: a recipe's input, a shortfall, a cost. */
export interface ItemQty {
  readonly item: string
  readonly qty: number
}

/** One started request: its items' frozen plan and its clock. */
export interface Entry<R extends WorkRequest = WorkRequest> {
  readonly request: R
  /** Each item's seconds at the frozen speed. */
  readonly seconds: readonly number[]
  /** Each item's inputs, reserved when the entry started. */
  readonly inputs: readonly (readonly ItemQty[])[]
  /** Each item's output. */
  readonly outputs: readonly WorkOutput[]
  /** Each item's EXP, in the game's units, fixed at the start (0 where the kind pays none). */
  readonly exp: readonly number[]
  /** When it started, integer milliseconds since the epoch. */
  readonly startedAt: number
  /** Milliseconds taken off by Speed Tickets: every item's end moves this much earlier. */
  readonly acceleratedMs: number
  /** Items already paid by Collect; never falls. */
  readonly collected: number
  /** The building's speed when it started (frozen into the entry). */
  readonly speed: number
  /** True when a queue started it. */
  readonly fromQueue: boolean
}

/** Her last finished work, for Repeat: where and what. Cleared by Recall. */
export interface LastWork<R extends WorkRequest = WorkRequest> {
  readonly slot: SlotRef
  readonly request: R
}

/** A queue that couldn't start its next entry: kept until the owner restarts or dismisses it. */
export interface DroppedQueue<R extends WorkRequest = WorkRequest> {
  /** When the entry would have started. */
  readonly at: number
  readonly slot: SlotRef
  /** The entry that couldn't start and every one behind it, in order. */
  readonly requests: readonly R[]
  /** What the free stock lacked for the first one, item by item; empty when its plan was refused instead. */
  readonly short: readonly ItemQty[]
  /** The plan's refusal when it was refused for another reason (a kind's own rule), else null. */
  readonly refused: Refusal | null
}

/** One Uma's work: her started entries, oldest first, her queue, her last work and a dropped queue. */
export interface WorkRow<R extends WorkRequest = WorkRequest> {
  readonly outfitId: string
  /** The slot her entries hold; null once Collect or Recall frees it. */
  readonly slot: SlotRef | null
  /** Started entries, oldest first; only the last can still be running. Empty when she is Free. */
  readonly entries: readonly Entry<R>[]
  /** Up to three requests behind the running entry, at the same place. Nothing is reserved for them. */
  readonly queue: readonly R[]
  readonly last: LastWork<R> | null
  readonly dropped: DroppedQueue<R> | null
}

/** The Warehouse's free stock: reserved inputs have left it and sit in work entries. */
export type ItemStock = Readonly<Record<string, number>>

/** Each building's level; a building with no row is at Lv 1. Slots are held by work rows, never by buildings. */
export type BuildingLevels = Readonly<Record<string, { readonly level: number }>>

/**
 * The three parts of a save the engine reads and writes. A game embeds them in its own state, and every operation is
 * generic over that wider state (`S extends WorkState`), carrying every other part through untouched.
 */
export interface WorkState<R extends WorkRequest = WorkRequest> {
  readonly items: ItemStock
  readonly buildings: BuildingLevels
  readonly work: Readonly<Record<string, WorkRow<R>>>
}

/** The request type a state's rows hold. */
export type RequestOf<S extends WorkState> = S['work'][string]['entries'][number]['request']

/** One movement of Warehouse stock, so a game can write an item ledger from a receipt. */
export interface ItemMovement {
  readonly kind: 'reserve' | 'return' | 'output' | 'cost' | 'ticket'
  readonly item: string
  readonly qty: number
  /** Whose work moved it; null for an upgrade's cost. */
  readonly outfitId: string | null
  /** When it applied: a queued start's moment, else the operation's `now`. */
  readonly at: number
}

/** A queued entry that started during a settle. */
export interface QueueStart<R extends WorkRequest = WorkRequest> {
  readonly outfitId: string
  readonly slot: SlotRef
  readonly at: number
  readonly request: R
}

/** What settling did: queue starts and drops in time order, and the stock they reserved. */
export interface SettleReport<R extends WorkRequest = WorkRequest> {
  readonly started: readonly QueueStart<R>[]
  readonly dropped: readonly (DroppedQueue<R> & { readonly outfitId: string })[]
  readonly movements: readonly ItemMovement[]
}

/** An operation that never refuses: Collect and Recall. */
export interface Done<R, S> {
  readonly state: S
  readonly receipt: R
}

/** What one operation gives back: the new state and its receipt, or a refusal. */
export type OpResult<R, S> = Done<R, S> | Refusal
