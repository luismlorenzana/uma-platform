# The shared kit: every core element and function

> Part of the [sibling apps plan](README.md). Proposal, 2026-10-16. Each element and function the two games need,
> with its verdict, which game's code it should start from, how viable sharing it is, the package it would live in and
> the phase of [hub-rework.md](hub-rework.md) that moves it.

**How to read the table:**
- **Both:** the same element in both games.
- **Variant:** shared, with game config.
- **Different:** owned by each game.
- **Viability:**
  - **High:** same stack, same behaviour, little or no coupling to a save.
  - **Medium:** needs an interface (view models, a data provider) before it can be shared.
  - **Low:** tied to each game's save or rules; not worth sharing now.

## 1. Foundations

| Element | Verdict | Today | Start from | Viability | Package | Phase |
|---|---|---|---|---|---|---|
| Theme tokens: surfaces, ink, accent, hairlines, status, radii, shadows, motion | Both | The same names in both (`page`, `panel`, `raised`, `sunken`, `ink-*`, `accent-*`, `hairline-*`): uma-racer's light values, uma-rpg's dark | uma-racer's names; light from uma-racer, dark from uma-rpg | High | `uma-ui` (`theme.css`) | A |
| Light / dark / system | Both | Each app has one mode | New | High | `uma-ui` | A |
| Fonts: Outfit (display), Inter (UI) | Both | The same in both | Either | High | `uma-ui` | A |
| Icon set: line, duotone, solid | Both | uma-racer has a full set; uma-rpg has ten inline SVGs | uma-racer | High | `uma-ui/icons` | A |
| Pixel marks: currencies, tier crests, classes, statuses | Both | uma-racer: `UiMark` over uma-art `ui`; uma-rpg: class and status marks from the same atlas, currencies as SVG | uma-racer's `UiMark`, plus new uma-art marks for uma-rpg's currencies | High | `uma-ui` and `uma-art` | A |
| Button, Chip, Tabs, Panel | Both | uma-racer has components; uma-rpg writes Tailwind inline | uma-racer | High | `uma-ui` | A |
| Bottom sheet, with stacking and a focus trap | Both | Both (uma-racer's springs on Motion) | uma-racer | High | `uma-ui` | A |
| Help button (i) with its sheet | Both | Both | uma-rpg's `HelpButton` | High | `uma-ui` | A |
| Progress bar, with tones | Variant | uma-rpg's `Bar` (HP, MP, EXP, Limit); uma-racer's bars | uma-rpg's API, uma-racer's look | High | `uma-ui` | A |
| Animated number | Both | uma-racer | uma-racer | High | `uma-ui` | A |
| Time display: `useNow`, durations ("2h 05m") | Both | Both (uma-racer's D366 durations) | uma-racer's words, uma-rpg's hook | High | `uma-ui/time` | A |
| Device preferences (remembered tabs, views) | Both | Both wrap `localStorage` with try/catch | Either | High | `uma-ui` | A |
| PWA update prompt | Both | Both | Either | High | `uma-ui` | A |

## 2. The app shell

| Element | Verdict | Today | Start from | Viability | Package | Phase |
|---|---|---|---|---|---|---|
| App frame: fixed full screen, safe areas | Both | `h-dvh` in both, which leaves the iPhone band | New (the Phase 0 fix) | High | `uma-ui/shell` | 0, then A |
| Top bar: disc, tier crest, three currency chips, sync chip | Variant | Different in each | uma-racer's chips and marks | High | `uma-ui/shell` | A |
| Bottom bar: five slots, raised centre, badges | Variant | uma-racer has it; uma-rpg has four tabs | uma-racer | High | `uma-ui/shell` | A |
| Menu sheet: every place by page, extra rows | Variant | Both | uma-racer's "Every place" | High | `uma-ui/shell` | A |
| Side panel (Peek) | Both | Both (copied, D363) | Either | High | `uma-ui/shell` | A |
| Place page frame and sticky header | Both | Both | uma-racer's `PlaceHeader` | High | `uma-ui/shell` | A |
| Overlay routing: `?peek=`, `?sheet=`, back or replace | Both | uma-racer's `nav.ts`; uma-rpg's `navigation.ts` | uma-racer | High | `uma-ui/shell` | A |
| Floating action pill (Collect all, Check-in) | Variant | Both | uma-racer | High | `uma-ui/shell` | A |
| Boot gates: splash, sign-in, first launch | Variant | Both | uma-rpg's gate order, uma-racer's start rule hook | Medium | `uma-ui/shell` + `uma-auth` | D |

## 3. The Hub map

| Element | Verdict | Today | Start from | Viability | Package | Phase |
|---|---|---|---|---|---|---|
| Phaser host: lazy load, pause under overlays, destroy | Both | Both | uma-racer's copy | High | `uma-scene` | A |
| Hub scene: terrain, roads and lanes, buildings, ambient | Both | Both (racer D363; uma-racer added lanes and centring) | uma-racer | High | `uma-scene/hub` | A |
| Place registry type: id, page, kind, slots, map spot, building frame | Variant | Both (the same shape) | uma-racer's `domain/hub` | High | `uma-scene/hub` (types); places stay in each game | A |
| Page config: tile page, palette, props | Variant | Both | uma-racer's palettes file | High | `uma-scene/hub` | A |
| Place buttons: pill, pips, progress rings, counters, Ready | Both | Both | Either, merged | High | `uma-scene/hub` | A |
| Page swipe | Both | Both | Either | High | `uma-scene/hub` | A |
| Fallback markers (no atlas frame yet) | Both | Both (uma-racer's `Pen` also draws them as SVG) | uma-racer | Medium | `uma-scene/hub` | A |
| Featured Uma on the plaza | Variant | uma-racer | uma-racer | High | `uma-scene/hub` | A |

## 4. Umas: lists, filters, sorts, pickers

| Element | Verdict | Today | Start from | Viability | Package | Phase |
|---|---|---|---|---|---|---|
| Uma portrait tile: bust, icon until it loads, corner badges, dimmed when locked | Both | uma-racer's `UmaSquare`; uma-rpg's sprites | uma-racer | High | `uma-ui/album` | B |
| Uma face token (pips, strips, slots) | Both | uma-racer's `UmaFace`; uma-rpg uses icons | uma-racer | High | `uma-ui/album` | B |
| Chibi art (plaza, fights, races) | Both | Both, from different sources | uma-racer's `UmaArt` | High | `uma-ui/album` | B |
| **Album engine:** rows, facets (enum, range, boolean), sorts with nulls last, presets, counts, empty-state hints | Variant | uma-racer's `ui/album/query.ts` (pure, no React); uma-rpg's `roster/query.ts` (simpler) | uma-racer | High | **`uma-roster`** | B |
| Album schemas: each game's facets, sorts and tie-breaks | Variant | Both | Each game | High (shape shared; content owned) | Each game, on `uma-roster` | B |
| **The level rule:** lists by Uma Level, work pickers by work level, free first | Both | Inconsistent in both | New | High | `uma-roster` | 0, then B |
| Level label ("Lv 7", "T2 · Lv 7") | Both | Both | uma-rpg's `formatLevel` | High | `uma-roster` | B |
| Album preferences: per device, saved views, seen set | Both | uma-racer's `albumPrefs`; uma-rpg's `stable-prefs` | uma-racer | High | `uma-roster` | B |
| Album chrome: search, sort sheet, filter tray, quick picks, tabs, views (icons 5 / cards 3 / list 1), virtual grid | Variant | uma-racer | uma-racer | High | `uma-ui/album` | B |
| **Uma picker:** candidates, disabled reasons, context sort, multi-select | Variant | uma-racer has one; uma-rpg has six | uma-racer's `UmaPicker` | High | `uma-ui/album` | B |
| Uma profile frame: header, tab bar | Variant | Both | Either | Medium | `uma-ui/album` | D |
| Targets: mark, crosshair, target strip | Variant | Both | uma-racer | Medium | `uma-ui/work` | C |

**On "code the listing and filtering once":**
- The engine takes plain rows and declared facets and sorts. It knows nothing about a game, a save or React, so both
  games run the same filtering and sorting code.
- It is pure TypeScript, so it could also run on the API if a list ever had to be built server-side. Nothing needs that
  today: both games list Umas on the device from master data plus their own save.
- What each game supplies is its row builder (Umas, their levels and flags), its facets and its sorts.
- Both games use the same master data and the same outfit ids, so the parts of a row that come from master data
  (name, rarity, aptitudes, release, art) can be one shared builder.

## 5. Work

| Element | Verdict | Today | Start from | Viability | Package | Phase |
|---|---|---|---|---|---|---|
| Job row: face ring, item, count, time left, Collect / Repeat / Speed / ⋯ | Both | uma-racer's `SlotRow` and `PeekRow`; uma-rpg's `JobCard` | uma-racer (over a view model) | High | `uma-ui/work` | C |
| Queue chips and queue list | Both | Both | uma-racer | High | `uma-ui/work` | C |
| Speed-up: −30m, Finish · N, Buy N and finish | Both | uma-racer's `SpeedUpControls`; uma-rpg's `TimeCut` | uma-racer | High | `uma-ui/work` | C |
| Recall, with a preview of what comes back | Both | uma-racer's `RecallSheet`; uma-rpg's button | uma-racer | High | `uma-ui/work` | C |
| Batch size chips | Variant | uma-racer by duration; uma-rpg by count | Both, as one component with a rule | Medium | `uma-ui/work` | C |
| Facility header: level, slots, speed, upgrade | Both | Both | uma-racer's `PlaceStats` and `UpgradeButton` | High | `uma-ui/work` | C |
| Job sheet frame: who, what, how many | Variant | uma-racer by link; uma-rpg in steps | uma-racer | Medium | `uma-ui/work` | C |
| Item icon from uma-art | Both | Both `ItemIcon` | uma-rpg (it covers gear and gems) | High | `uma-ui` | C |
| Requirements netting (targets → items → raw) | Both | uma-rpg's `planRequirements`; uma-racer's planner cascade | uma-rpg (pure, generic) | Medium | `uma-idle` | E |
| Work engine: timeline, queues, collect, recall, tickets | Different today | uma-racer's `/work` (pluggable kinds, racer state); uma-rpg's `work.ts` (its save) | uma-racer's (more general) | Medium–Low | `uma-idle` | E |

## 6. Platform functions

| Function | Verdict | Today | Start from | Viability | Package | Phase |
|---|---|---|---|---|---|---|
| Firebase sign-in client, lazy | Both | Both | uma-racer | High | `uma-auth` | D |
| API guard: Firebase token and owner allowlist | Both | Both | Either | High | `uma-auth/nest` | D |
| Master data release client and the game adapter | Both | uma-rpg on `uma-data`; uma-racer in its phase 5 | `uma-data` (exists) | High once uma-racer moves | `uma-data` | E |
| Art loading: authenticated fetch, blob cache, atlas sprites | Both | uma-rpg's `art.tsx`; uma-racer's content runtime | uma-rpg (it already reads uma-data's art index) | High once uma-racer moves | `uma-content` | E |
| API content proxy | Both | Both | Either | High | `uma-content/nest` | E |
| Push notifications: subscription, server tick, app badge | Variant | uma-rpg | uma-rpg | Medium | `uma-push` (later) | Later |
| Save store, Dexie, sync, conflicts | Different | Different shapes | — | Low | Each game | Never |
| Live docs renderer, size budget script | Both | Both | — | Low value | Each game | — |

## 7. Owned by each game

These stay in their game. The kit gives them the frame they sit in, but never their content or rules:
- **uma-rpg:** the battle engine and stage, the world map, classes and skill trees, the Halls of Heroes, parties,
  Sweeps and Springs, the Forge and gear, the Lapidary and Star Gems, the Observatory's map, the save.
- **uma-racer:** the race engine and scene, careers and scenarios, World Expeditions, the Training Hub, the Lineage
  Hall, the Card Library and bonds, check-ins and the planner, the Pantry and Kitchen, the reveal ceremony, the save.

## 8. Viability in one line

**High:** the foundations, the shell, the Hub map, and the Uma album with its engine (B). Each has a single source to
start from, often already copied between the games. **Medium:** the work UI, which needs a view model each game
fills. **Low or never:** the work engine and save until a game decides to move its save; everything in §7.
