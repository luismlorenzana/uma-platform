# SC2 — `uma-kit/work`: rows, queues, speed-up, recall, the facility header and the job sheet

**uma-platform · Either · L · Needs: SC1 and SB3 released · Unblocks: SC4, SC5.**

## Why

With one engine (SC1), the screens that show a job can be one set too: the compact rows uma-racer built in D366, its
queue chips, speed-up, recall, upgrade and job sheet. They read the engine's state directly, so no game fills a view
model by hand.

## Context (read first)

- `docs/sibling/phases.md` § Phase C: the table's last row, and "the words".
- SC1's `@luismlorenzana/uma-work`: `WorkState`, `WorkRow`, `Entry`, `statusOf`, `chainTimes`, `applyTickets`,
  `ticketsToFinish`, `SPEED_TICKET_MS`, the refusals. And SB3's `uma-kit/album`: `UmaPicker`, `FaceTile`, `workOrder`.
- **The source to port, uma-racer `origin/main`:**
  - `apps/web/src/ui/work/`: `SlotRow.tsx`, `QueueChips.tsx`, `SpeedUpControls.tsx`, `RecallSheet.tsx`,
    `SizeChips.tsx`, `StoppedQueueCard.tsx`, `TapNote.tsx`, `Upgrade.tsx`, `PlaceStats.tsx`, `model.ts`
    (`slotCards`, `speedUpModel`, `recallPreview`, `queueChips`, `sizeChipsView`, `upgradeView`), `view.ts`,
    `stopped.ts`, `useTap.ts`, `words.ts`, `index.ts`;
  - the job sheet: `apps/web/src/places/farm/job-sheet/JobSheet.tsx`, `UmaStrip.tsx`, `model.ts`;
  - the building page: `apps/web/src/places/farm/building/BuildingPage.tsx`, `BuildingPeek.tsx`, `TargetStrip.tsx`;
  - its manual pages on these screens: `docs/game/07-farm.md` §10 and `docs/game/11-hub-and-places.md` §2.6.
- **uma-rpg's screens they replace:** `apps/web/src/places/work/FacilityPage.tsx`, `QueueList.tsx`, `TimeCut.tsx`,
  and the Forge and Lapidary icon pickers inside `FacilityPage.tsx`.
- **The kit:** `src/ui/BottomSheet.tsx`, `Chip.tsx`, `AnimatedNumber.tsx`, the icons, `src/shell/PeekPanel.tsx`
  (where the small rows live), and `theme.css`.

## Decisions made

- **Subpath:** `@luismlorenzana/uma-kit/work`, at `src/work/`. `@luismlorenzana/uma-work` becomes a peer dependency of
  the kit. Mark it optional, so a game without `/work` doesn't need it.
- **Selectors, not view models:** the ported `model.ts` reads `uma-work` state and returns what the rows draw. The
  game passes its state, `now`, its `WorkEnv`, and callbacks for every action (`collect`, `repeat`, `speedUp`,
  `recall`, `queue`, `unqueue`, `upgrade`, `start`).
- **Items:** a `WorkArtProvider` gives an `Item` component (`{ id, size }`). uma-rpg draws gear, gems and materials
  from uma-art; uma-racer draws items and dishes. A face uses SB3's `FaceTile`.
- **The job sheet frame:** who, then what, then how many, opened by link (`?job=…&uma=…`, uma-racer's scheme).
  - **Who:** `UmaPicker` with `workOrder` (free Umas first, then the work level).
  - **What:** a render prop the game fills: uma-rpg's Forge and Lapidary icon grids, uma-racer's Pantry and Kitchen
    lists.
  - **How many:** `SizeChips`, with the game's rule as a prop: by count (1–10, or ×1–×40 when refining) or by duration
    (fitted to the next check-in).
- **Words:** one set, with English defaults: Collect, Repeat, Speed up, Recall, Queue next, Finish · N, Buy N and
  finish, −30m. Any other string comes from a `words` prop.
- **Stays in uma-racer:** check-ins, suggestions and Speed Up All. `StoppedQueueCard` is shared: both games now have
  dropped queues.

## Do

1. **Port** `ui/work/*` into `src/work/`, replacing racer imports with `uma-work`, the kit's primitives and props.
   Keep the 48–56 pt rows, the face ring with progress, `×10 · 3/10`, the time left, and the actions with ⋯ for the
   rest.
2. **Port the job sheet** as `JobSheet` with the three steps above, and the building page's pieces as
   `FacilityHeader` (level, slots, speed, upgrade button and sheet) and `TargetsStrip` (with the crosshair mark).
3. **Tests (Node):** port `model.ts`'s tests if racer has them; otherwise write them for `slotCards`, `speedUpModel`,
   `recallPreview`, `queueChips` and `sizeChipsView`, using `uma-work`'s state.
4. **Wire the subpath:** exports, `check-dist.mjs` (`'work'`; it must load without Phaser), the README table and a
   usage sketch.
5. **Prove it in uma-racer before releasing,** whose engine already has this shape. Build the kit, copy it into a
   uma-racer worktree, and swap one building's page onto the kit's rows on a scratch change you don't commit. Check it
   locally in its dev server (a desktop browser at phone width; no iOS Simulator, P60): start, queue, collect, speed
   up, recall. Revert.
6. **Release:** a minor changeset; version and publish as the queue README says. Log a P-decision.

## Done when

- [ ] `pnpm lint && pnpm test && pnpm build` pass. `check-dist` loads `/work`.
- [ ] No string in `src/work/` names one game's places or levels ("Farm Level", "Craft Level", "Kitchen", "Forge")
      outside defaults in `words`.
- [ ] The local check in step 5 was done and described.
- [ ] The new uma-kit version is published, and the P-decision is logged.

## Deliver

- Claude: commit to `main`, `feat(kit): uma-kit/work, one set of work screens (SC2)`.
- ChatGPT: branch `sib/sc2-kit-work`, a pull request with the same title.
- Reply with the version, the props of `JobSheet` and `SlotRow` as shipped, and notes for SC4 and SC5. Flag it done.
