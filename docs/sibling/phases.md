# The remaining phases: B to E

> Part of the [sibling apps plan](README.md). Brief, 2026-10-16, after Phase A shipped (uma-kit 0.2.0 in both games:
> uma-rpg D147–D149, uma-racer D367–D369). It replaces the short outlines at the end of [hub-rework.md](hub-rework.md).
> Each phase is approved on its own.

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
| Portrait tile | The bust, with the icon until it loads; corner badges; dimmed when locked | Badges: class mark, working, target crosshair | Badges: tier, ready, target |
| Face token | One face, used in pips, slots and strips | Replaces outfit icons in pips and party rows | `UmaFace` moves |
| Chibi art | One component | Plaza, fights | Plaza, races |
| Views | Icons at **5 columns** (default), cards at 3, list at 1, on a virtual grid | Was a 4–5 column grid or a list | Was 3 columns of icons |
| Album chrome | Search, quick picks, tabs (All, Owned, Locked) with counts | The Stable's header counter | The reveal ceremony stays racer-only |
| `UmaPicker` | Candidates, why one can't be picked, a context sort, multi-select | Replaces six pickers: party slot, facility job, Observatory, Hall seat and Learner, Manuals, active party | Replaces the strips where a list is better: Farm job, race entry, training |
| Art source | An `AlbumArt` provider, so the components never know where art comes from | uma-data art families | Its private content until Phase E, then uma-data |

- **Art:** if busts don't read as faces at 5 columns, add an `outfit-faces` family to uma-data: a tighter crop of the
  same portraits.
  - It is an additive release, made in uma-platform's asset pipeline.
  - It lands in the private bucket, never in git, so it is not a ChatGPT packet.
  - **Recommendation:** check busts first in the Simulator, and crop only if the face is under about half the tile.
- **Done when:**
  - both Stables run on the kit album, with 5 columns by default;
  - uma-rpg's six pickers and uma-racer's list-type strips use `UmaPicker`;
  - both games open every list on the level rule;
  - the engine's tests live in the kit.
- **Size:** large. This is the biggest shared win after the Hub.

## Phase C: one work UI

**Goal:** a job looks and behaves the same in both games. The same rows, buttons, speed-ups, recall and job sheet, over
each game's own rules.

| Element | Common (`uma-kit/work`) | uma-rpg | uma-racer |
|---|---|---|---|
| View model | `JobView` and `FacilityView`, and the actions as callbacks; the kit never reads a save | Fills it from `work.ts` | Fills it from its `/work` engine |
| Job row | uma-racer's compact 56 pt row (D366): a face ring with progress, the item, `×10 · 3/10`, time left, Collect · Repeat · Speed · ⋯ | Replaces its job cards | `SlotRow` moves |
| Side-panel row | The same row, smaller, in the quick look | Facilities' quick looks | `PeekRow` moves |
| Queues | Queue chips and the queue list (3 deep) | `QueueList` retires | Moves |
| Speed-up | −30m, Finish · N, Buy N and finish | `TimeCut` retires; Speed Tickets come from the Exchange | `SpeedUpControls` moves; Speed Up All stays with check-ins |
| Recall | A sheet previewing what comes back | Its Recall button gains the preview | `RecallSheet` moves |
| Batch size | One chip row; the game supplies the rule | 1–10, or ×1–×40 when refining | By duration, marking the size that fits the next check-in |
| Facility header | Level, slots, speed, and the upgrade button and sheet | Levels 1–3: 3/4/5 slots, speed at 3 | `PlaceStats` and `Upgrade` move |
| Job sheet frame | Who, then what, then how many, opened by link (`?job=…`) | Its three-step sheet; the Forge and Lapidary icon pickers become the "what" step | Its job sheet; the Pantry and Kitchen pickers become the "what" step |
| Item icon | One component over uma-art | Gear, materials, gems | Items, dishes |
| Targets strip | The strip and the crosshair mark | "For your targets" at each facility | Target strips and the Needs tab |
| Words | Collect, Repeat, Speed up, Recall, Queue next | Renamed where they differ | Already these |
| Rules and engine | Not shared | `work.ts`, Craft Level, its prices | `/work`, Farm Level with aptitude EXP, check-ins and suggestions (racer-only) |

- **Art:** none expected; both item atlases exist in uma-art.
- **Done when:**
  - uma-rpg's Wilds and uma-racer's Farm both run on the kit's rows, queues, speed-up, recall and job sheet;
  - one set of words is used in both games.
- **Size:** medium.

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
| Work engine (`uma-idle`) | A timeline, queues of 3, collect, recall, tickets, requirements netting | **Recommendation: not now.** Both saves stay as they are; Phase C's view models already share everything the player sees | — |
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
| B | A (done) | Large | Busts at 5 columns by default (faces cropped only if needed); one picker everywhere; saved views and New in uma-rpg |
| C | B (pickers inside the job sheet) | Medium | uma-racer's compact rows in uma-rpg; one set of words |
| D | A | Medium | One boot sequence; the `uma-server` package |
| E | uma-racer's phase 5 | Large (racer) | Moving uma-racer to uma-data; no shared work engine for now |

D can run alongside B or C, since it touches different screens.
