# The remaining phases: B to E

> Part of the [sibling apps plan](README.md). Brief, 2026-10-16, after Phase A shipped (uma-kit 0.2.0 in both games:
> uma-rpg D147–D149, uma-racer D367–D369). It replaces the short outlines at the end of [hub-rework.md](hub-rework.md).
> Each phase is approved on its own. **The packets for every phase, with parallel tracks and states, are in
> [docs/handoff/](../handoff/README.md)** (P51).

**How to read the tables.** Each row is one element of a phase:
- **Common:** what goes in the shared package, coded once.
- **uma-rpg** and **uma-racer:** what each game supplies, configures or keeps for itself.

A dash means the game has nothing of its own there.

## What carries over from Phase A

- **One web package.** Shared web code lives in `@luismlorenzana/uma-kit`, with one subpath per area: `/roster` (pure
  TypeScript, no React), `/album`, `/work`, then `/places`, `/auth` and `/content`. There is one version to bump and
  one access grant per game.
- **One server package (new, recommended).** The NestJS pieces both APIs repeat go in
  `@luismlorenzana/uma-server`, with subpaths `/auth`, `/content` and later `/push`:
  - the token-and-allowlist guard;
  - the content proxy;
  - later, push.

  A React kit shouldn't carry NestJS, and the APIs shouldn't install React.
- **Who does what** ([change protocol](../change-protocol.md), P50):
  - A uma-platform session builds the shared part, tests it inside both games, releases it, and moves uma-rpg onto it.
  - uma-racer's session moves uma-racer.
  - ChatGPT takes any pixel-art packet.
- **Done means seen on the phone.** Every phase is checked in the iOS Simulator's Home Screen app, in light and dark,
  as well as by each game's tests.
- **No forks.** A game that needs a different behaviour gets an option in the kit.

## Phase B: one Uma album

**Goal:** every list of Umas in both games is the same code. That covers the Stable, every picker and every Uma
chooser, with the same tiles, search, filters, sorts and level rule. Face-focused portraits at 5 columns.

| Element | Common (`uma-kit/roster`, `uma-kit/album`) | uma-rpg | uma-racer |
|---|---|---|---|
| Album engine | uma-racer's `album/query.ts`: rows, facets (choice, range, yes/no), sorts with nulls last, presets, counts, empty-state hints. Pure, so it is tested once | Its `roster/query.ts` retires | Its copy retires |
| The level rule | One comparator: Uma Level first, then newest release, then name. Work pickers sort free Umas first, then the work level | Uma Level; Craft Level in work pickers | Lifetime level; Farm Level in work pickers |
| Level label | "Lv 7", or "T2 · Lv 7" once a tier is above 1 | Tier 1 for now, so "Lv 7" | "T2 · Lv 13" |
| Rows from master data | One builder for what both games read from uma-data: name, title, rarity, aptitudes, release, art keys | Uses it now | Maps its own data until Phase E, then uses it |
| Facets | The facet types and the filter tray | Rarity, aptitudes, sex, new, free, class | Tier, ready, target, new, aptitudes A+ |
| Sorts | The sort sheet and the shared level sort | Release, name, Craft Level, Class Rank | Release, name, tier, Racing, Farm |
| Device preferences | View, sort and filters per device; up to 20 saved views; the "seen" set behind New | Gains saved views and New | Keeps its own (`albumPrefs` moves) |
| Face tile (owner, 2026-10-16) | The outfit's face crop (`outfit-faces`), with the icon until it loads; corner badges; dimmed when locked. Used wherever an Uma is small: the Stable's icon view, every picker, work slots and pips, and party and hall seats | Badges: class mark, working, target crosshair. Faces replace outfit icons in the Stable, the pickers, the Wilds' slots and pips, party rows, the Halls and the Observatory's tabs | Badges: tier, ready, target. Faces in the Stable, the pickers, the Farm's slots and pips; `UmaFace`'s per-character faces retire |
| Bust | The bust, for an Uma shown large: the cards view, the profile header, the featured Uma's sheet | The same | The same |
| Fights and races (owner, 2026-10-16) | **No chibis in fights or races: busts there** | The battle stage's party draws busts instead of idle and cheer chibis; the Limit Break cut-in already uses the bust | Its race screen draws busts wherever it draws chibis today |
| Chibi art | Kept only for the plaza's featured Uma | Plaza | Plaza |
| Views | Icons at **5 columns** of faces (default), cards at 3 (busts), list at 1, on a virtual grid | Was a 4–5 column grid or a list | Was 3 columns of icons |
| Album chrome | Search, quick picks, tabs (All, Owned, Locked) with counts | The Stable's header counter | The reveal ceremony stays racer-only |
| `UmaPicker` | Candidates, why one can't be picked, a context sort, multi-select | Replaces six pickers: party slot, facility job, Observatory, Hall seat and Learner, Manuals, active party | Replaces the strips where a list is better: Farm job, race entry, training |
| Art source | An `AlbumArt` provider, so the components never know where art comes from | uma-data art families | Its private content until Phase E, then uma-data |

- **Art: an `outfit-faces` family in uma-data** (owner, 2026-10-16: face crops in the Uma list and on assigned workers).
  - One square face crop per outfit, cut from its bust. A crop box is computed per outfit, with a short override list
    for outliers (tall hats, ears, odd poses).
  - Per outfit rather than per character, so two outfits of one Uma still look different in a list of 268.
  - It is an additive uma-data release, made in uma-platform's asset pipeline. It lands in the private bucket, never in
    git, so it is not a ChatGPT packet.
- **Done when:**
  - both Stables run on the kit album, with 5 columns of faces by default;
  - faces show wherever an Uma is small, and busts in fights and races;
  - uma-rpg's six pickers and uma-racer's list-type strips use `UmaPicker`;
  - both games open every list on the level rule;
  - the engine's tests live in the kit.
- **Size:** large. This is the biggest shared win after the Hub.

## Phase C: one work system, engine and screens

**Goal:** a job is the same code in both games, from the rule that times it to the row that shows it. Each game keeps
its content (what is gathered and made), its levels and its economy.

**Changed 2026-10-16:** the owner asked whether `work.ts` and `/work` should be one. They should, so the work engine
moves here from Phase E. Its package is renamed from `uma-idle` to `uma-work`.

### Why one engine, and why uma-racer's

The two engines run the same rules today, written twice:
- 1–10 items one after another;
- queues of 3;
- Collect part-way;
- Recall;
- Repeat;
- 30-minute Speed Tickets and Finish;
- facility levels that add slots and speed.

| | uma-rpg `save/work.ts` | uma-racer `domain/src/work/` | Pick |
|---|---|---|---|
| Size | About 400 lines with `economy/jobs.ts` | About 60 KB, with 70 KB of tests (timeline, settle, edge cases, purity) | racer |
| Where a job lives | In a facility's slot | In the Uma's own work row, so an Uma can only ever be in one place | racer |
| Kinds of work | Hard-coded: gather, refine, craft, cut | Plugged in: a kind plans items and pays outputs; the engine owns slots, reserving, the clock, queues, collect, recall and tickets. It already runs two systems: the Farm and the Training Hub's sessions | racer |
| A job's plan | Speed and EXP fixed per job | Each item's seconds, inputs, output and EXP frozen when it starts | racer |
| A queue that can't start | — | Kept as a dropped queue to restart or dismiss | racer |
| Requirements netting for targets | `planRequirements`, pure and generic | The planner cascade | rpg's, as a module beside the engine |

**The structure:** uma-racer's engine. **The rules:** neither game's wins. Where the two games already agree, that
becomes the one rule; where they differ, each keeps its own (the table below).

### What is common and what each game keeps

| Element | Common (`uma-work` engine, `uma-kit/work` screens) | uma-rpg | uma-racer |
|---|---|---|---|
| Work state | Per Uma: started entries, a queue of 3, last work, a dropped queue. Facility levels and the free stock beside them | Its save moves jobs from facility slots to these rows (a save step; running jobs finish into the Warehouse) | Already this shape |
| Kinds | The kind interface: plan items, pay outputs | Gather, refine, craft (the Forge), cut (the Lapidary) | Gather, craft (the Pantry), cook (the Kitchen), Training sessions |
| Job rules | 1–10 items, queue 3, Collect part-way, Recall, Repeat, Speed Tickets of 30 minutes, Finish | The same | The same |
| Facility levels | Levels add slots and speed; the cost comes from the game | 3/4/5 slots, speed at Lv3, paid in Laurels and items | Its own table and Prize Money |
| Worker levels and EXP | A hook: the kind says what EXP an item pays, and the game levels the Uma | Craft Level: one curve, the same for every Uma (D139) | Farm Level per tier, with aptitude-boosted EXP |
| Grade gates | A hook: the kind refuses a grade above the Uma's level | Craft Level opens grades | Farm Level opens grades |
| Batch size | The engine takes 1–10; the screens' chips take a game rule | By count; ×1–×40 when refining | By duration, fitted to the next check-in |
| Targets | `planRequirements` netting (targets → items → raw) | "For your targets" at each facility | Feeds its planner and Needs tab |
| Check-ins | — | — | Its own: check-in times, suggestions, Speed Up All |
| Push "work done" | A tick reads the engine's finish times (Phase E's `uma-server/push`) | Has it | If the owner wants it |
| Job row, queues, speed-up, recall, facility header, job sheet, item icon, words | One set of screens (`uma-kit/work`) over the engine's state, with no per-game view model | Its job cards, `QueueList` and `TimeCut` retire; the Forge and Lapidary icon pickers become the job sheet's "what" step | `SlotRow`, `PeekRow`, `SpeedUpControls`, `RecallSheet`, `PlaceStats` and `Upgrade` move; the Pantry and Kitchen pickers become the "what" step |

- **The package:**
  - `uma-work` is pure TypeScript, built for both ESM and CJS like uma-data, because each game's API runs it to
    accept a save.
  - It stays separate from uma-kit, which is React.
- **Codebase layout:** the parts that plug into shared code use the same names in both games:
  - `domain/src/work/kinds/`, one file per kind;
  - `domain/src/items/`;
  - `domain/src/hub/places.ts`.

  The saves keep their own layouts (uma-rpg's `save/`, uma-racer's `state/`), because they are different designs.
- **Who:** a uma-platform session extracts the engine from uma-racer's `origin/main` and moves uma-rpg onto it,
  including the save step. uma-racer's session swaps its import.
- **Done when:**
  - both games run every job through `uma-work` and show it with `uma-kit/work`;
  - the engine's tests live in the package;
  - uma-rpg's save step is in and tested.
- **Size:** large: the engine, the uma-rpg save step and the screens.

## Phase D: places, profile and getting in

**Goal:** the screens around the game are the same frames, each filled with its game's content. That means getting in,
the Account, the Warehouse, the Exchange and the Uma profile.

| Element | Common (`uma-kit/places`, `uma-kit/auth`, `uma-server/auth`) | uma-rpg | uma-racer |
|---|---|---|---|
| Boot gates | One sequence: splash, sign-in, boot, first launch, start page, plus the update prompt | First launch: a trainer name, then 20 Uma Tickets. Start: the last page | First launch opens the Stable's Locked tab. Start: a pending tap opens the Farm, else the last page |
| Sign-in client | Lazy Firebase, Google redirect | Moves | Moves |
| API guard | The NestJS guard: Firebase token and the owner allowlist | Moves | Moves |
| Account page | Rename, a wallet grid, Appearance, a notifications slot, info rows, sign out | Wallet: Uma Tickets, Uma Shards, Laurels. Notifications: push | Wallet: Prize Money, Speed Tickets, Uma Tickets. No push yet |
| Warehouse | The shelf view: tabs, grade chips, item grid, a stock sheet with Sell ×1, 10 or All | Shelves: Materials, Star Gems, Gear | Shelves: items, dishes |
| Exchange | Buy and sell rows, price chips, a confirm sheet | Raw items, Speed and Sweep Tickets, Manuals | Items, tickets, the Daily Purse |
| Uma profile | Header (portrait, name, level label, chips) and the tab bar | Tabs: Skills, Battle, Gear, Work, Racing | Sections: tier, scenario, Racing and Farm Levels |
| Unlocking | The Uma Tickets chip and the unlock confirm | The unlock button | Multi-unlock and the reveal ceremony stay racer-only |

- **Art:** none expected.
- **Done when:**
  - both games boot through the same gates;
  - both run the same guard on their APIs;
  - Account, Warehouse, Exchange and the profile frame come from the kit.
- **Size:** medium.

## Phase E: platform plumbing

**Goal:** the plumbing under both games is shared too: master data, art loading and the API's content routes.

| Element | Common | uma-rpg | uma-racer |
|---|---|---|---|
| Master data | uma-data, already shared | Already on it | **Its phase 5:** move to uma-data and its art families (`racer-mapping.md`), and delete its own GameTora pipeline |
| Art loading (`uma-kit/content`) | The release client wrapper, authenticated art fetch, a blob and Cache Storage cache, atlas sprites | Its `master/art.tsx` moves | Its content runtime retires |
| Content proxy (`uma-server/content`) | The API's master data and content routes as one NestJS module | Moves; its enemy packs stay its own content | Moves |
| Push (`uma-server/push` and a kit client) | Subscription, server tick, app badge | Moves | Only if the owner wants push in uma-racer |
| Saves, sync, Dexie | Never shared: the shapes differ | Its save | Its save |

- **Order:** uma-racer's phase 5 can start in parallel with Phase B. Phase B's art provider and row builder take
  uma-racer's own data until then, so nothing waits.
- **Done when:**
  - uma-racer reads only uma-data;
  - both games load art through `uma-kit/content`;
  - both APIs serve content through `uma-server/content`.
- **Size:** large on uma-racer's side, small on uma-rpg's.

## What never moves

The games themselves stay in each repo, under no phase:
- **uma-rpg:** battles and the world map, classes and skill trees, the Halls of Heroes, parties, Sweeps and Springs, the
  Forge's gear, Star Gems and the Observatory's map, the Tier Finale.
- **uma-racer:** races, careers and scenarios, World Expeditions, the Training Hub, the Lineage Hall, the Card Library,
  check-ins and the planner, the Pantry and Kitchen recipes, the reveal ceremony.
- **Both:** each save, its rules, its economy and its words.

## Order and approvals

| Phase | Depends on | Size | The owner approves |
|---|---|---|---|
| B | A (done) | Large | Face crops at 5 columns and on workers, busts in fights and races (decided 2026-10-16); one picker everywhere; saved views and New in uma-rpg |
| C | B (pickers inside the job sheet) | Large | One engine (`uma-work`, from uma-racer's), uma-rpg's save step, uma-racer's compact rows in uma-rpg, one set of words |
| D | A | Medium | One boot sequence; the `uma-server` package |
| E | uma-racer's phase 5 | Large (racer) | Moving uma-racer to uma-data |

D can run alongside B or C, since it touches different screens.
