# Sibling apps: one shell, two games

> **Status: approved 2026-10-16 (P48).** Phase 0 is dispatched to ChatGPT; Phase A is in progress, as one package,
> `@luismlorenzana/uma-kit` (P48 replaces the provisional `uma-ui` and `uma-scene` names below with its subpaths).
> **Before approval:** The owner asked for uma-rpg and uma-racer to
> become true siblings: the same core functions and the same app around them, with very different games inside. This
> folder plans that, with the app shell and the Hub first. Each page ends with recommendations; nothing is left as an
> open question. Decisions get P-numbers when the owner approves and the work starts.

| Page | What it answers |
|---|---|
| This page | The verdict: can UI and core functions be coded once? How, and what it costs |
| [structure.md](structure.md) | Both apps' full structure and features, row by row: same, variant or different |
| [kit.md](kit.md) | Every core element and function: who uses it, how it differs, how viable sharing it is, where it lives |
| [hub-rework.md](hub-rework.md) | The plan: a quick fix now, the Hub rework in detail, then the later phases in outline |

Read on 2026-10-16: uma-rpg `main` at `e681b48` (live), uma-racer `origin/main` at `ff8b95a` (live release `8caac6a`,
generation 2), uma-platform `main` at `e1258dd` (uma-art 2.8.0).

## 1. What the owner sees today

The two Home screens side by side (Town Hall in uma-racer, the Wilds in uma-rpg, iPhone 15):

| | uma-racer | uma-rpg |
|---|---|---|
| Theme | Light: blue-grey page `#edf1f6`, white panels, gold `#d39a2b` | Dark: slate page `#0f1620`, panels `#17202b`, gold `#d6a23e` |
| Top bar | Gold initial disc. Chips with uma-art pixel marks: Prize Money, Speed Tickets, Uma Tickets as `0 · 0/5` | Gold initial disc, trainer name and a "Tier 1" pill. Inline SVG icons: Unlock Tickets, Shards, Laurels |
| Bottom bar | A floating rounded panel: Town Hall · Training · **Race** (a raised gold disc) · Farm · Menu | A full-width strip: Wilds · Learning · Town · ☰ |
| Map | Phaser, procedural 16 px tiles, 48 px buildings, white name pills, a featured Uma standing on the plaza | The same engine and tiles, gold name pills with worker pips |
| Below the bar | An empty band | An empty band |

**The surprise:** the maps are already the same code. uma-racer copied uma-rpg's Hub file for file when it rebuilt its
app (racer D363, "one codebase's Hub on both games keeps the later extraction a move, not a rewrite"). The scene,
terrain, buildings, place buttons, swipe, side panel and place registry all match. Each game then built its own top
bar, bottom bar, menu and theme around it. That's why the screenshots look like two different products.

**Both stacks are identical** down to the minor version: React 19.3, react-router 7.18, Zustand 5, Tailwind 4.3.3
(CSS `@theme`, same token names), Vite 7.3, Phaser 4.2.1 pinned, Dexie 4.4.6, Firebase 12.19, NestJS 11.2, Outfit and
Inter fonts, vite-plugin-pwa 1.3. uma-rpg's theme file even says it is "in the family of uma-racer's Paddock system".
The only stack gaps are small: uma-racer also uses Motion (springs and taps) and TanStack Query; uma-rpg uses neither.

## 2. The verdict

**Yes: code it once and share it. That's viable for almost all of the app around the games, and for the pure core
functions such as listing, filtering and sorting Umas.** What stays per game is what makes each one a game: its rules,
its screens and its save.

| Area | Code once? | Why |
|---|---|---|
| Theme, fonts, primitives (buttons, chips, tabs, panels, sheets, help, bars, icons) | **Yes**, high viability | Same stack, same token names; both sides wrote the same things twice |
| App shell: frame, top bar, bottom bar, Menu, side panel, place header, update prompt, sync chip | **Yes**, high | The same pattern in both, with different labels and currencies: game config, not forks |
| Hub map: Phaser scene, terrain, buildings, place buttons, swipe, pips, Ready badges | **Yes**, high | Already the same code in both repos (D363) |
| Uma lists: portrait tiles, grid/list views, search, filters, sorts, saved views, pickers | **Yes**, high | uma-racer's album engine is pure and generic. Each game supplies its own rows and sort keys |
| Uma listing, filtering and sorting logic (the "backend" functions) | **Yes**, high | Pure TypeScript over the same master data and the same outfit ids, so it runs anywhere, client or server |
| Work UI: job rows, queues, speed-up, recall, batch sizes, targets strips | **Yes**, medium | Same rules (one job at a time, queues of 3, 30-minute tickets), different save shapes. The UI goes first, over view models |
| Work engine (timers, queues, collect, recall) | **Later**, medium–low now | Both engines are pure, but each is wired into its own save. Sharing it means moving one game's save first |
| Sign-in and the API's guard | **Yes**, high | The same Firebase plus allowlist in both |
| Master data and Uma art loading | **Yes**, after racer phase 5 | uma-rpg reads uma-data; uma-racer still runs its own pipeline until its planned phase 5 |
| Save, sync, economy, every game rule | **No** | Different shapes and games. Platform P2–P4 keep them apart, and nothing here changes that |
| Game screens: battles, the world map, races, careers, cards, Halls, the Forge, Lineage | **No** | This is the game |

**What it costs:** every shared change is a package release, then a version bump in two games. That's minutes with
Changesets and the standing publish authority (P29, P42), but it is a real step. It pays for itself because the owner
wants the two apps to stay identical, and only one copy can't drift. Section 4 has the rules that keep it cheap.

## 3. The owner's points, answered

| The owner said | The answer (details in [hub-rework.md](hub-rework.md)) |
|---|---|
| The same bottom menus, in the same order, some slightly different | One shared bottom bar with five slots: **Town Hall · Grow · [Play] · Work · Menu**. uma-racer keeps Town Hall · Training · Race · Farm · Menu. uma-rpg becomes Town Hall · Learning · **Battle** · Wilds · Menu. The raised centre disc opens its Battle page: Scenario Gate and Tier Finale |
| The same background, light or dark | One shared theme with both a light and a dark palette under the same token names. Both apps follow the phone's appearance by default, with Light / Dark / System in Account. So on one phone they always match |
| The empty band under the bar on an iPhone 15 | **A small fix, not a rework.** In both screenshots the app ends 59 pt above the screen's bottom. That is exactly the iPhone 15's top safe-area inset, the status-bar area: a known iOS quirk with `h-dvh` in a Home Screen app with a translucent status bar. On top of that, uma-rpg's bar pads its whole home-indicator inset under a half-empty row. A fixed full-screen frame and the native bar spacing fix both, in both apps. Phase 0 |
| The top bar shows different info and icons | One shared top bar: the initial disc with a tier crest, then three currency chips in the same style and slots: main currency · Speed Tickets · Uma Tickets `N · s/5`. uma-rpg's Unlock Tickets take uma-racer's name and pixel mark, and Laurels get a mark of their own |
| Different palettes, menu styles, top menus, navigation | All of it comes from the shared kit, so the chrome is the same code. Only labels, icons, places and currencies differ, as configuration |
| The Uma list is all over the place | One shared Uma album, with portrait tiles, views, search, filters, sorts, saved views and one picker, used by every list in both games |
| Lists don't default to Uma Level; Farm and Craft lists don't default to their level | One rule in the shared kit. Every Uma list and picker opens on **Uma Level, highest first**, and every work picker on **its work level** (Farm or Craft), highest first, with free Umas first. Contextual pickers may put eligible Umas first, then level. A list of every place that breaks the rule today is in [hub-rework.md](hub-rework.md#phase-0) |
| uma-rpg has no face portraits; uma-racer went to big 3-column ones | One shared **Uma portrait** tile: the head-and-shoulders bust (`outfit-busts`), five across on a phone by default, with 3-column cards and a 1-column list as other views. Both games used to have this: uma-racer's old Stable was busts at 5 columns, before generation 2 went to 3. uma-rpg's Stable shows full-stand icons 4 across on an iPhone 15 |

## 4. How the sharing works

- **Packages, not a merged repo.** Shared code lives in uma-platform and publishes as `@luismlorenzana/*` packages on
  GitHub Packages, pinned exactly in each game (P9). Merging the two games into one monorepo would share code more
  easily, but it would undo the separate deploys, saves and Firebase projects (P2–P4) and the ChatGPT branch workflow,
  for no gain the packages can't give.
- **The packages:** the roadmap's planned kit (phase 3), with two additions. Names are provisional.

  | Package | Holds |
  |---|---|
  | `uma-ui` | Theme tokens (light and dark), fonts, primitives, the app shell, icons and marks |
  | `uma-scene` | The Phaser host, plus `/hub`: the map, terrain, buildings, place buttons, swipe |
  | `uma-roster` *(new)* | The pure album engine (rows, facets, sorts, presets, saved views) and the Uma level sort rule |
  | `uma-ui/album` *(new)* | The Uma portrait, the album chrome, the virtual grid and the picker |
  | `uma-idle` | The work engine, later |
  | `uma-auth` | The Firebase client and the NestJS guard |
  | `uma-content` | The release client, art loading and cache |
- **Components take data, never stores.** A shared component gets its Umas, currencies, places and art URLs as props or
  through a small provider each game fills in. It never imports a game's save or store. That keeps the save per game
  and lets uma-racer use the album before it moves to platform data.
- **Configuration, not forks.** Where the games differ (labels, icons, the five tabs, the currencies, page palettes, a
  tab's badge), the shared component takes a config. A game that needs a new behaviour adds an option to the package;
  it never copies a component back into its own repo.
- **Converge, then extract.** uma-racer's D363 shows the cheap path: make the two copies the same in place, then move
  them into a package. A move is a safe change; a rewrite is not.
- **Build details:**
  - The packages ship ESM plus types and a `theme.css`. Each game's CSS imports the theme and adds an `@source` line so
    Tailwind sees the classes inside the package.
  - React, Phaser and Motion are peer dependencies. uma-rpg adopts Motion, which the shared stack lists anyway (P13).
  - The 180 KB entry budget still holds: Phaser and the scenes stay lazy, and packages are side-effect free so unused
    parts tree-shake.
- **Testing:**
  - Each package has its own tests.
  - A `kit` page in each game shows every shared component with that game's config, so a release is checked in both
    places before it's pinned.
- **Who changes what:**
  - Shared code changes in uma-platform (architecture §7). A game session that needs a change writes it down, or makes
    it in uma-platform when that repo is open in the session.
  - Releases follow P29 and P42.
  - ChatGPT packets can target the kit like any other repo.

## 5. What changes in the platform rules, once approved

- **Architecture §3.2:** the app shell, the Hub chrome, Uma lists and work UI move from "owned by each game" to
  "shared". What stays owned: game rules, game screens, save format and economy, and which places exist.
- **Architecture §3.3:** the kit is extracted in the order of [hub-rework.md](hub-rework.md), with the album and the
  Uma level sort rule added.
- **Roadmap phase 3:** the racer's phases 5–7 and uma-rpg's next phase take the steps of [hub-rework.md](hub-rework.md).
  Both games share the work, rather than the racer extracting alone.

Until then, nothing in either game or in the platform's rules changes.
