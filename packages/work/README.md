# @luismlorenzana/uma-work

The work engine both Uma games run (uma-platform SC1, P53). One job is the same code in uma-rpg and uma-racer: 1–10
items one after another, a queue of 3, Collect part-way, Recall, Repeat, 30-minute Speed Tickets and Finish, and
building levels that add slots and speed. Each game keeps its content (what is gathered and made), its levels and its
economy, and plugs them in through `WorkEnv`.

- **Pure TypeScript,** with no runtime dependencies. Only the `now` you pass is read: no `Date.now`, no randomness, no
  I/O. The same state, input and `now` give the same result on any device.
- **ESM and CommonJS:** `import` and `require` both work, so a game's web app and its NestJS API run the same rules.
- **Built from uma-racer's engine** (`packages/domain/src/work/`), its behaviour unchanged, with uma-rpg's
  requirements netting beside it (`planRequirements`).

Private; personal use only. Published to GitHub Packages: each game needs **Read** access to this package (Package
settings → Manage Actions access) for its CI to install it.

## The model

Everything an Uma does lives in her own **work row**, so she is in one place at most.

```ts
interface WorkState<R> {
  items: Record<string, number>                    // the Warehouse's free stock
  buildings: Record<string, { level: number }>     // no row: Lv 1
  work: Record<outfitId, WorkRow<R>>
}
interface WorkRow<R> {
  outfitId: string
  slot: SlotRef | null       // { building, room?, slot } while her entries hold it
  entries: Entry<R>[]        // started requests, oldest first; only the last can still run
  queue: R[]                 // up to 3 behind it, at the same place; nothing reserved yet
  last: LastWork<R> | null   // where and what she last finished, for Repeat; cleared by Recall
  dropped: DroppedQueue<R> | null // a queue that couldn't start: restart it or dismiss it
}
```

- **An entry is frozen when it starts:** each item's `seconds` (at the building's speed then), `inputs` (reserved, out
  of the free stock), `outputs` and `exp`. Upgrading later speeds up only new entries.
- **Status:** Free (no entries), Working (the last entry runs) or Ready (everything finished, waiting for Collect).
  `start` on a Ready Uma collects her first; a Working one is refused with `busy` and her `freeAt`.
- **Settle on read:** every operation first runs `settle(state, now)`, which starts each due queue at the exact moment
  the entry before it ended, in time order, then by building, room and slot. A queue whose next request the free stock
  can't cover (or its kind refuses) becomes `dropped`, with the shortfall. Finished outputs nobody collected aren't
  stock yet, so the result never depends on which card was collected first or how often the app was open.
- **Speed Tickets** move every unfinished item of the running entry 30 minutes earlier (`SPEED_TICKET_MS`), never past
  `now`. `finish` spends ⌈remaining ÷ 30 minutes⌉ and starts the queue at once.
- **Recall** collects what's made, returns the inputs of every unmade item (the one in progress included), drops the
  queue without a record and clears `last`.
- **Refusals** are `{ refused: true, code, message, data }` from one table, `WORK_REFUSALS`. A malformed input (an
  unknown building, a negative ticket count, a `now` that isn't integer milliseconds) is a caller's bug and throws.

The operations are `start`, `queue` (add, remove, move), `collect`, `recall`, `speedUp`, `finish` and `upgrade`, each
`(state, input, now, env) → { state, receipt } | Refusal`. Every receipt lists its Warehouse `movements` (reserve,
return, output, cost, ticket) for an item ledger, and the queue starts and drops its settles made. The readers are
`statusOf`, `workState`, `freeAt`, `chainEnd`, `chainTimes`, `reservedStock`, `isFree`, `progress` and `itemProgress`.

## What the game supplies: `WorkEnv`

```ts
interface WorkEnv<S extends WorkState> {
  kinds: Record<string, WorkKindRules<S>>   // required; no built-in registry
  buildings: BuildingRules                  // order, rooms, slots and speed per level, upgrade costs
  tickets: TicketRules<S>                   // balance(state), spend(state, n), item?
  exp: ExpRules<S>                          // grant(state, outfitId, exp, now), gradeOpen(state, outfitId, kind, grade)
  money?: MoneyRules<S>                     // balance(state), spend(state, amount): upgrades that cost money
  ledger?: LedgerRules<S>                   // record(state, charge): after money.spend, for an audit log
  isWorker?(state: S, outfitId: string): boolean // refuse `unknown-worker` for an Uma she hasn't unlocked
}

interface WorkKindRules<S> {
  plan(state, outfitId, request, now, { slot, speed, earlier, env }): PlannedItem[] | Refusal
  pay(state, outfitId, outputs, { now, env }): { state, detail? }
  count?(request): number   // default: request.count, or request.unlocks.length
  maxItems?: number         // default 10
}
interface PlannedItem { seconds: number; inputs: ItemQty[]; output: { item } | { unlock }; exp: number }
```

- **A kind** plans a request into items and pays finished outputs. It never checks stock: the engine reserves what the
  items name. It checks its own place (`workRefusal('not-here')`) and the grade gate (`env.exp.gradeOpen`, then
  `workRefusal('grade', { level })`). `payItems` is a ready `pay` for outputs that go into the Warehouse.
- **`buildingTable({ id: { rooms?, slots: [lv1, lv2, …], speed: [...], upgrades: [{ money, items }, …] } })`** builds
  `BuildingRules` from data; the table's order is the tie-break order.
- **`warehouseTickets(itemId)`** is the `tickets` hook for Speed Tickets kept as a Warehouse item.
- **`exp.grant`** runs once per Collect that paid anything, with the sum of the items' EXP (maybe 0). Its `detail`
  lands on the receipt as `expDetail` (levels crossed, grades opened).
- **Typed requests:** a game's state names its request union (`WorkState<FarmRequest | SessionRequest>`), and the
  operations, kinds and receipts take it from there (`RequestOf<S>`).

### uma-racer's adapter (SC5)

```ts
const env: WorkEnv<RacerState> = {
  kinds: { gather, craft, cook, session },                  // domain/src/work/kinds/*.ts
  buildings: buildingTable(/* SLOTS, BUILDING_SPEED, UPGRADES as rows */),
  tickets: warehouseTickets(SPEED_TICKET_ID),
  exp: { grant: farmLevelGrant /* addFarmExp + gradesOpened */, gradeOpen: (s, id, _k, g) => canWorkGrade(s.umas[id]!.farm.level, g) },
  money: { balance: (s) => s.profile.prizeMoney, spend: (s, n) => ({ ...s, profile: { ...s.profile, prizeMoney: s.profile.prizeMoney - n } }) },
  ledger: { record: (s, c) => ({ ...s, ledger: [...s.ledger, { id: c.id, resource: 'prize-money', delta: c.delta, reason: 'upgrade', at: c.at }] }) },
  isWorker: (s, id) => s.umas[id] !== undefined,
}
```

### uma-rpg's adapter (SC3)

```ts
const env: WorkEnv<TierWorld> = {
  kinds: { gather, refine /* maxItems: 40 */, craft /* pays into gear */, cut /* pays into gems */ },
  buildings: buildingTable(/* every facility: slots FACILITY_SLOTS, speed FACILITY_SPEED, upgrades from FACILITY_UPGRADE */),
  tickets: { balance: (w) => w.wallet.timeTickets, spend: (w, n) => ({ ...w, wallet: { ...w.wallet, timeTickets: w.wallet.timeTickets - n } }) },
  exp: { grant: (w, id, exp) => /* grantProfessionExp on umas[id].craft */, gradeOpen: (w, id, _k, g) => w.umas[id]!.craft.level >= gradeUnlockLevel(g) },
  money: { balance: (w) => w.wallet.laurels, spend: (w, n) => ({ ...w, wallet: { ...w.wallet, laurels: w.wallet.laurels - n } }) },
  isWorker: (w, id) => w.umas[id] !== undefined,
  // no ledger
}
```

The tests carry a working copy of each: `test/fixtures/farm.ts` (uma-racer-like) and `test/fixtures/workshop.ts`
(uma-rpg-like), run end to end by `src/fit-racer.test.ts` and `src/fit-rpg.test.ts`.

## Embedding `WorkState` in a save

A game's state extends `WorkState` and keeps everything else beside it; every operation returns the same wider type
with the other parts untouched.

```ts
interface TierWorld extends WorkState<RpgRequest> { wallet: Wallet; umas: Record<string, OwnedUma>; gear: …; gems: … }
const world = { ...oldWorld, ...newWorkState(env.buildings, oldWorld.items) }   // every building at Lv 1, no work
```

Store the three parts as they are: plain JSON, integer milliseconds, no class instances. A save that round-trips
through JSON gives the same results (the tests check it).

## Notes for the games

**SC3, uma-rpg (save v22):**
- Facility slots go; each Uma's work is her row. Map each facility's level to `buildings[placeId]`.
- **The migration finishes running jobs into the Warehouse:** a running job's remaining items go to `items` (or gear
  and gems), with their Craft EXP; queued jobs are dropped (they reserved nothing); every Uma starts Free with no
  `last`. The owner accepts losing in-flight state.
- Refining keeps ×1–×40 as 40 items: the refine kind sets `maxItems: 40`, so no batch items are needed.
- `planRequirements` comes from here now; `economy/requirements.ts` can go.
- New on uma-rpg: Repeat (`last`), the stopped queue (`dropped`), tickets that never overspend (a count above what
  finishes the entry spends only what finishes it), and Recall dropping the queue without a record.

**SC5, uma-racer:**
- The state shape is the same, with two renames to migrate on read: `Entry.farmExp` → `Entry.exp`; building levels are
  plain numbers.
- Receipts: `CollectReceipt.farmExp`, `farmLevel` and `gradesOpened` become `exp` plus `expDetail` (whatever
  `exp.grant` returns); `UpgradeReceipt.prizeMoney` and `ledger` become `money` and `charge`.
- Refusals carry `message` (was `reason`). Codes: `prize-money` is `money`, `unknown-uma` is `unknown-worker` (from
  `isWorker`); `count` and `grade` have neutral words (`Make 1 to {max} at a time.`, `Needs Lv {level}.`) for the
  game to map.
- `slotsOf`, `speedAt`, `slotExists` and `slotOrder` take the building rules; `newWorkState(rules, items)` returns only
  the work parts.
- Stays in uma-racer: `WORK_KINDS`, `SESSION_KIND`, `collectBeforeRace` (built on `settle`, `payWork(…, only)` and
  `joinSettles`; `src/activity.test.ts` shows it), tier rules and the planner.
