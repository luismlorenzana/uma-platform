# SC1 — `@luismlorenzana/uma-work`: one work engine for both games

**uma-platform · Claude (a careful extraction across two codebases) · L · Needs: nothing · Unblocks: SC2, SC3, SC5.**

## Why

Both games run the same job rules, written twice:
- 1–10 items one after another;
- queues of 3;
- Collect part-way, Recall, Repeat;
- 30-minute Speed Tickets and Finish;
- facility levels that add slots and speed.

The owner asked for one engine (2026-10-16). Phase C makes it uma-racer's, the more general and better tested of the
two, as a pure package each game's web app and API both run. The comparison and the reasons are in
`docs/sibling/phases.md` § Phase C.

## Context (read first)

- `docs/sibling/phases.md` § Phase C: "Why one engine, and why uma-racer's", and the common / per-game table.
- **uma-racer's engine (`origin/main`): `packages/domain/src/work/`.** Read all of it, tests included:
  - `types.ts`: `SlotRef`, `WorkRequest`, `Entry` (frozen per-item seconds, inputs, outputs and EXP), `WorkRow` (per
    Uma: `entries`, `queue` of up to 3, `last`, `dropped`), `WorkState`, `WorkContent`, `ItemMovement`;
  - `kinds.ts`: `WorkKindRules` (`plan`, `pay`), `PlanContext`, `WorkEnv`, and the registry `WORK_KINDS`;
  - `timeline.ts`: `SPEED_TICKET_MS` (30 min), `endsAt`, `finishedCount`, `applyTickets`, `chainTimes`;
  - `state.ts`, `settle.ts` (queue starts, dropped queues), `collect.ts` (`payWork`), `activity.ts` (`statusOf`,
    `freeAt`, `reservedStock`), `operations.ts` (start, queue, collect, recall, speed up, upgrade), `refusals.ts`;
  - the tests: `operations.test.ts`, `settle.test.ts`, `timeline.test.ts`, `edge-cases.test.ts`, `examples.test.ts`,
    `purity.test.ts`, `activity.test.ts`.
- **Its coupling to uma-racer,** which must become injected:
  - `ReworkState` (`state/types.ts`: the profile, umas, ledger, operations log);
  - `writeLedger` and `assertNow` (`tiers/ledger`), and `tierRefusal`;
  - `SPEED_TICKET_ID`: Speed Tickets are a Warehouse item there;
  - `addFarmExp` (`farm/level`) and `highestOpenGrade` (`items/grades`);
  - `ItemId`, `RecipeInput`, `BuildingId`, `RoomId` and `buildingSpeed`;
  - `WorkContent` (Uma aptitudes, cards), and `collectBeforeRace`.
- **uma-rpg's engine,** to cover its rules: `packages/domain/src/save/work.ts` and `economy/jobs.ts`.
  - gather, refine, craft and cut;
  - refine batches up to ×40;
  - `FACILITY_SLOTS` [3, 4, 5], and speed at Lv3;
  - Craft EXP per base minute;
  - grade gates by Craft Level;
  - `cutJobTime` with Time (now Speed) Tickets in the wallet.
  - Also read `economy/requirements.ts`: `planRequirements`, the target netting that moves here.
- **The package pattern to copy:** `packages/data`, a pure dual ESM and CJS build (`tsconfig.build.json`,
  `tsconfig.cjs.json`, `scripts/write-cjs-package.mjs`), published by `.github/workflows/release-packages.yml`.

## Decisions made

- **Package:** `@luismlorenzana/uma-work` in `packages/work`.
  - Pure TypeScript, with no dependencies at runtime.
  - Dual ESM and CJS, because uma-rpg's API loads its domain as CJS.
  - NodeNext with `.js` imports, like the kit.
- **The model is uma-racer's, unchanged in behaviour:**
  - per-Uma `WorkRow`s, so an Uma is in one place at most;
  - frozen per-item plans;
  - a queue of 3, kept as dropped when it can't start;
  - `last` for Repeat;
  - settle on read;
  - typed refusals.
- **Generic types:** `ItemId`, `BuildingId` and `RoomId` become `string`, and `BuildingLevel` a `number`.
- **What the game supplies,** through `WorkEnv`:
  - **`kinds`:** required, with no built-in registry. Each game registers its own: uma-rpg gather, refine, craft, cut;
    uma-racer gather, craft, cook, session.
  - **`buildings`:** for each building, its slots and speed at a level, and its upgrade cost. That replaces
    `buildingSpeed` and the racer's tables.
  - **`tickets`:** `balance(state)` and `spend(state, n)`. uma-racer keeps them as a Warehouse item, uma-rpg in
    `wallet.timeTickets`.
  - **`exp`:** `grant(state, outfitId, exp)` and `gradeOpen(state, outfitId, kind, grade)`. Farm Level and Craft Level
    stay each game's.
  - **`ledger`:** optional, `record(state, entry)`. uma-racer writes its ledger; uma-rpg passes nothing.
  - **Refusals:** the package's own `Refusal { code, message, data? }`. A game maps them to its words.
- **What leaves the engine:**
  - `collectBeforeRace`, and any tier and race logic, stay in uma-racer, built on the package's exports.
  - `WorkContent`'s aptitudes and cards go to uma-racer's kinds, which read them from their own closure.
  - The Speed Ticket span stays 30 minutes, exported as `SPEED_TICKET_MS`.
- **What the package's state holds:** `{ items, buildings, work }` (`WorkState`), generic over the game's wider state
  (`S extends WorkState`). Each game embeds these three parts in its save.
- **Netting comes along:** `planRequirements` from uma-rpg, as `requirements.ts`.

## Do

1. **Scaffold** `packages/work`, copying `packages/data`'s build, test and lint scripts and its tsconfigs. Add a
   README.
2. **Port** `work/*.ts` from uma-racer with the generalizations above. Keep every exported name that still makes sense
   (`settle`, `payWork`, `statusOf`, `chainTimes`, `applyTickets`, and the operations). Rename `farmExp` to `exp`.
3. **Port the tests.**
   - Rewrite them against synthetic kinds and a synthetic building table, like the racer's tests' synthetic session
     kind. Keep every scenario: edge cases, examples, settle, timeline and operations.
   - Keep `purity.test.ts`: no `Date.now`, no randomness, no I/O.
4. **Add `planRequirements`** with uma-rpg's tests (`save/targets.test.ts` exercises it; port the relevant cases).
5. **Prove both games' rules fit,** with two tests:
   - one composes uma-rpg-like kinds: gather, refine ×40, craft with a grade gate, and tickets from a wallet;
   - one composes uma-racer-like kinds: gather, craft, cook, and a session that unlocks.

   Each runs start, queue 3, settle a dropped queue, collect part-way, recall, speed up, finish and upgrade.
6. **README:** the model (rows, entries, queue, dropped, last); the `WorkEnv` hooks, with a sketch of each game's
   adapter; how to embed `WorkState` in a save; the migration advice for SC3 (a running job finishes into the
   Warehouse; the owner accepts losing in-flight state).
7. **Release** `0.1.0`: a changeset, then version and publish as the queue README says. Log a P-decision.
8. **In your reply, remind the owner** to grant uma-rpg and uma-racer **Read** access to the new package (Package
   settings → Manage Actions access). Otherwise their CI can't install it.

## Done when

- [ ] `pnpm lint && pnpm test && pnpm build` pass in uma-platform. The package builds ESM and CJS, and both load in
      plain Node: `node -e "require('@luismlorenzana/uma-work')"` and an ESM import, from a scratch folder.
- [ ] No file in `packages/work/src` imports from a game, or names Farm, Kitchen, Wilds, Forge or Lapidary outside
      tests and the README.
- [ ] Every racer test scenario is ported and passes, and both "fit" tests pass.
- [ ] `0.1.0` is published, the owner was asked for the access grant, and the P-decision is logged.

## Deliver

- Claude: commit to `main`, `feat(work): @luismlorenzana/uma-work, one work engine for both games (SC1)`.
- Reply with the version, the `WorkEnv` interface as shipped, and notes for SC3 and SC5. Flag it done.
