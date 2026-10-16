# The plan: the Hub first, then the rest

> Part of the [sibling apps plan](README.md). Proposal, 2026-10-16.
> - **Phase 0** is two quick fixes each game can make on its own, today.
> - **Phase A** reworks the shell and the Hub of both games onto shared packages, in detail.
> - **Phases B–E** follow with less detail.

| Phase | What | Size | Needs |
|---|---|---|---|
| [0](#phase-0) | The iPhone band, and the level rule for every Uma list | S per game | — |
| [A](#phase-a-one-shell-and-one-hub) | One theme, one shell, one Hub map, the same five tabs | L | 0 |
| [B](#phase-b-one-uma-album) | One Uma album: portraits, 5 columns, search, filters, sorts, one picker | M–L | A |
| [C](#phase-c-one-work-ui) | One work UI: job rows, queues, speed-up, recall, sizes | M | A, B |
| [D](#phase-d-places-profile-and-getting-in) | Places, the profile frame, Account, boot gates, sign-in | M | A |
| [E](#phase-e-platform-plumbing) | Content and art loading on platform data, the work engine, push | L | uma-racer's phase 5 |

## Phase 0

Each game makes these changes in its own repo, with no package. Phase A then keeps them.

### 0.1 The empty band under the bottom bar

**What it is.** Measured on the owner's two iPhone 15 screenshots (393 × 852 pt):
- **Both apps end 59 pt above the bottom of the screen**, at 793 pt. Below that is the page background: dark in
  uma-rpg, plain white in uma-racer.
- 59 pt is the iPhone 15's top safe-area inset. With `apple-mobile-web-app-status-bar-style` set to
  `black-translucent`, a Home Screen app draws under the status bar. In that mode `h-dvh` (both shells use it) comes
  out shorter than the screen by about that inset on recent iOS versions.
- **In uma-rpg, the bar adds the whole home-indicator inset** (34 pt, `pb-safe`) under a 56 pt row whose dot and label
  sit in the middle. That makes about 50 pt of empty panel under the labels.
- **In uma-racer, the floating panel sits 8 pt plus the full inset above** where the frame ends.

**The fix, in both apps:**
- **The frame:** `position: fixed; inset: 0` instead of `h-dvh`, so it always covers the whole screen. Give `html` the
  page colour as well, so no gap can ever show white.
- **uma-rpg's strip, a native-style bar:**
  - icons and labels in the top 49–56 pt;
  - the safe-area inset under it, which the home indicator sits on.
- **uma-racer's floating panel:**
  - lift it by `max(env(safe-area-inset-bottom) − 12px, 8px)`, about 22 pt on an iPhone 15;
  - the page shows around it.
- **Check:** the owner's phone, in the Home Screen app, both games. The bar should sit at the bottom with nothing below
  it but the home indicator. The size budget and tests are unchanged.

### 0.2 The level rule for Uma lists

**The rule:**
1. Every Uma list and picker opens sorted by **Uma Level, highest first**. In uma-racer that is the lifetime level,
   50(t − 1) + Racing Level, as its Stable already does.
2. Every work picker opens on **free Umas first, then that work's level, highest first**: Farm Level at uma-racer's
   Farm, Craft Level in uma-rpg's Wilds.
3. Umas who can't be picked go last, each with her reason.
4. Ties go to release date (newest first), then name.
5. A picker's own context order, such as "most unlocks left here", stays one tap away in its sort menu but is never
   the default.

| Game | Place | Today | Change |
|---|---|---|---|
| uma-rpg | Stable | Release, newest first | Uma Level |
| uma-rpg | Stable, ascending | Locked Umas come first (the "owned before locked" comment isn't enforced) | Owned always before locked |
| uma-rpg | Party Hall slot picker | Name A → Z | Uma Level |
| uma-rpg | Observatory Uma tabs | Release, oldest first; opens on the first | Uma Level; opens on the highest, or on the Uma it was opened for |
| uma-rpg | Exchange, Manuals | Release, oldest first | Uma Level |
| uma-rpg | Facility picker | Free, then Craft Level | Already the rule |
| uma-rpg | Halls of Heroes picker | Uma Level | Already the rule |
| uma-racer | Farm job sheet | Free, suited first, then Farm Level | Free, Farm Level, then suited as the tie-break |
| uma-racer | Training session | "Left here" (unlocks left) | Uma Level; "Left here" stays in the menu |
| uma-racer | Lineage slot | "Adds" (grades and skills gained) | Uma Level; "Adds" stays in the menu |
| uma-racer | Race strip | Open career goals first, then lifetime level | Lifetime level; "Open goals" becomes a filter chip |
| uma-racer | Stable, Feature, Card Library, Bond, Gate, Trophy Hall | Lifetime level | Already the rule |

## Phase A: one shell and one Hub

**Goal:** the owner's two screenshots become the same app with different places in it. Same theme, top bar, bottom
bar, menu, panels, sheets and map, all from shared code. Only labels, icons, currencies and places differ.

### A1. Foundations (`uma-kit/ui`, `uma-kit/theme.css`)

- **Theme:** one `theme.css` with the token names both games already use.
  - **Light** keeps uma-racer's values: page `#edf1f6`, panel `#fff`, sunken `#e4eaf2`, ink `#101a24`, gold `#d39a2b`.
  - **Dark** keeps uma-rpg's: page `#0f1620`, panel `#17202b`, raised `#1f2a37`, ink `#e9eef4`, gold `#d6a23e`.
  - Status, currency, stat and tier colours are defined for both modes.
  - Canvas stages (battle, race) stay dark in both modes, as uma-racer's `stage` token already does.
- **Appearance:** System by default (`prefers-color-scheme`), with Light, Dark and System in Account, stored per device.
  The owner's phone then shows both apps in the same mode.
- **Fonts:** Outfit for display and numerals, Inter for UI, at 15 px body, 16 px inputs (no iOS zoom).
- **Primitives:** Button, Chip, Tabs, Panel, BottomSheet (stacking, focus trap, drag handle), HelpButton, Bar,
  AnimatedNumber, UpdateNotice, the time helpers, device preferences, uma-racer's icon set, and `UiMark` for uma-art
  marks.
- **Clean-up in each game:** hard-coded colours (such as uma-rpg's `bg-[#3a3026]` tiles) become tokens, so both modes
  work.

### A2. The shell

**The frame:** Phase 0's fixed full-screen frame holds the top bar, the page and the bottom bar, plus the sheet host
and the side panel. A full-screen flow hides both bars: a fight, a race, a ceremony or a map.

**The top bar** is the same in both, with game slots:

| Slot | uma-racer | uma-rpg | Shared behaviour |
|---|---|---|---|
| Left: a 32 pt gold disc with the initial and a small tier crest | Initial, tier crest | Initial, tier crest (today a name and a Tier pill) | Opens Account. The name moves to Account |
| Chip 1: main currency | Prize Money (`currency/prize-money`) | Laurels (a new `currency/laurel` mark) | Opens the Exchange |
| Chip 2: time tickets | Speed Tickets | Speed Tickets, renamed from Time Tickets (the same 30 minutes) | Opens the Exchange's ticket row |
| Chip 3: unlocks | Uma Tickets `N · s/5`, shards gold when a ticket can be made | Uma Tickets `N · s/5`, renamed from Unlock Tickets and Shards | Opens the Stable's Locked tab |
| Sync chip | Only when not synced | The same | Offline, Sync paused, waiting, failing |

uma-rpg's renames are labels only; its save keys stay (`unlockTickets`, `shards`, `timeTickets`), so there's no
migration.

**The bottom bar** is uma-racer's floating panel in both games, with five slots and the same order:

| Slot | Role | uma-racer | uma-rpg | Badge |
|---|---|---|---|---|
| 1 | Home | **Town Hall** (house) | **Town Hall** (house) | — |
| 2 | Grow | **Training** (stats) | **Learning** (book) | Ready counts |
| 3, raised gold disc | Play | **Race** → the Racing page | **Battle** → the Battle page | — |
| 4 | Work | **Farm** (carrot) | **Wilds** (pickaxe) | Ready jobs |
| 5 | Menu | **Menu** → "Every place" | **Menu** → "Every place" | — |

- The active tab shows a duotone icon and a gold underline; the others show line icons.
- A swipe on the map moves between pages 1–4 in bar order.
- `/` opens the last page, as today.

**The rest of the shell:**
- **Menu:** every place by page (in bar order) in a 2-column grid with counters and locks, then Account. uma-racer adds
  "Needs of every Uma".
- **Side panel, place header, sheets and routing:** uma-racer's versions (`?peek=`, `?sheet=`, back or replace).
- **The floating pill:** Collect all · N in both; uma-racer adds Check-in.

### A3. The Hub map (`uma-kit/hub`)

1. **Converge, then extract.** Diff the two copies (uma-rpg's `hub/` and `scene/`; uma-racer's `hub/`, which names
   each file's uma-rpg source).
   - Start from uma-racer's: it adds road lanes around on-road buildings, the odd-column centred grid, palettes in a
     Phaser-free file, and markers drawn through a `Pen` interface (also usable as SVG).
   - Bring over anything uma-rpg has that it lacks, such as the hall seat pips.
2. **Generic types, with content owned by each game:**
   - `HubPlace { id, page, kind, name, slots, at, frame?, direct?, hidden? }`
   - `HubPageConfig { id, label, tiles, palette, props, plaza? }`
   - Each game keeps its place list and page configs; the package holds the code.
3. **The plaza:** a page can name a featured Uma.
   - uma-racer keeps its Town Hall plaza.
   - uma-rpg gets one too, on its Town Hall. Its sheet offers Fight (with the active party), Profile and Feature
     another Uma.
   - Until Phase B the Uma's art comes through a small provider each game fills in.
4. **Done when:** both games draw their pages from the package and the old copies are deleted.

### A4. Pages and places

**uma-racer** keeps its pages and places as they are.

**uma-rpg** rearranges into the same five slots. Each page lines up with uma-racer's:

| Page | Tiles | Places | Was |
|---|---|---|---|
| **Town Hall** | `town` | Stable, Party Hall, Warehouse, Exchange in the four corners, the featured Uma on the plaza | Town held seven places |
| **Learning** | `learning` | The five Halls of Heroes, the Observatory | The Observatory was in Town; Armory and Jeweler were locked placeholders |
| **Battle** | `town` with its own palette, until a `battle` tile page exists | Scenario Gate (opens the world map at once, like uma-racer's Racecourse), Tier Finale (locked) | Both were in Town |
| **Wilds** | `wilds` | The eight sites; Workbench, Lapidary and Forge | Unchanged |

- **The Armory and the Jeweler go.** They have been locked placeholders since ranks moved to fights (uma-rpg D102), and
  nothing opens them.
- **Old links still work.** Links into the old pages (`/town/scenario-gate`, push notification URLs) redirect to the
  place's new page, so nothing breaks.

### A5. Art

One small packet, for ChatGPT, in uma-platform:
- **`currency/laurel`:** a 16 pt uma-art mark for uma-rpg's top bar, drawn like A02's marks.
- **Optional, a `battle` tile page:** ground, path masks and props such as banners, weapon racks and training dummies,
  so the Battle page has its own ground.

No new buildings are needed: every place above already has a frame.

### A6. Rollout

1. **uma-platform:**
   - create `uma-ui` and `uma-scene`, from uma-racer's code plus the A1–A3 changes;
   - a kit page per game shows every component with that game's config;
   - publish under P29 and P42.
2. **uma-racer adopts first.** It's the smaller change, since it already has the five-slot bar. It swaps its own
   shell, sheets and Hub for the packages and gains dark mode.
3. **uma-rpg adopts:**
   - the new shell and its five tabs;
   - the rearranged places and the plaza;
   - light mode, the renames and the old-link redirects.
4. **The check, in each game:**
   - Screenshots on the owner's iPhone 15 in light and dark show the same chrome.
   - The 180 KB entry budget holds.
   - Every test passes.
   - Both deploys are watched.
   - Each game's manual (sections, architecture) is updated, and the decisions are logged: platform P-numbers for the
     kit, game D-numbers for each adoption.

### A7. Risks

| Risk | What keeps it small |
|---|---|
| Releases slow down changes in two repos | Batch the changes into one release per phase. Use `pnpm link` while developing. P42 lets agents publish |
| Tailwind classes inside a package aren't generated | Each game's CSS adds `@source` for the package. The kit page shows a missing class at once |
| The games pull the shell in different directions | Options in the package, never copies. A game asks for an option; it never forks a component |
| The entry bundle grows | Packages are side-effect free and tree-shake. Phaser and scenes stay lazy. The budget check runs in both CIs |
| Dark and light double the visual check | Tokens only, no hard-coded colours. The kit page renders both modes side by side |
| ChatGPT works in a game while the kit changes | Packets name the kit version they build on. A kit change lands between packets, not during one |

### A8. Who does what (P48)

| Work | Who | Where |
|---|---|---|
| Phase 0, uma-rpg half | ChatGPT, packet H30 | uma-rpg |
| Phase 0, uma-racer half | ChatGPT, a packet uma-racer's session writes in its own handoff | uma-racer |
| The `currency/laurel` mark and the `battle` tile page | ChatGPT, packet H31 (uma-rpg's handoff) | uma-platform |
| A1–A3: `@luismlorenzana/uma-kit` (`/theme.css`, `/ui`, `/shell`, `/hub`), from uma-racer's `origin/main` at `ff8b95a` | Claude, uma-rpg session | uma-platform |
| A4, A6.3: uma-rpg on uma-kit | Claude, uma-rpg session | uma-rpg |
| A6.2: uma-racer on uma-kit | Claude, uma-racer session | uma-racer |

**The contract between the two sessions:**
- The kit starts as a move of uma-racer's shell and Hub code. Until uma-racer adopts it, uma-racer's session tells the
  uma-rpg session about changes to `hub/`, `ui/` (BottomSheet, Sheet, Button, Chip, Tabs, Panel, PlaceHeader, icons,
  UiMark) or the theme in `index.css`, so the kit carries them.
- Kit releases are announced to the other session with what changed.
- A game that needs a new option asks for it rather than copying a component back.

## Phase B: one Uma album

- **The packages:**
  - **`uma-roster`:** uma-racer's pure album engine (rows, facets, sorts with nulls last, presets, counts, hints), the
    preferences (per device, saved views, the seen set) and Phase 0's level rule. It also holds a shared row builder for
    everything that comes from master data: name, title, rarity, aptitudes, release, art keys.
  - **`uma-ui/album`:** the Uma portrait (the bust, the icon until it loads, corner badges, dimmed when locked), the face
    token, chibi art, the album chrome (search, sort sheet, filter tray, quick picks, tabs) and the virtual grid.
- **Views:** icons (**5 columns** on a phone, about 68 pt tiles), cards (3 columns), list (1 column). Icons is the
  default.
- **If the bust isn't close enough at 5 columns,** add an `outfit-faces` family to uma-data's art: a tighter crop from
  the same portraits. That's an additive minor release.
- **One `UmaPicker`:** candidates, why one can't be picked, a context sort, multi-select. It replaces uma-rpg's six
  pickers and uma-racer's ad hoc strips where a list is better.
- **Art provider:** a game hands the album its art source. uma-racer uses its private content until its phase 5, then
  uma-data; uma-rpg uses uma-data. The components never know which.
- **Each game declares its album:**
  - **uma-racer:** tier, ready, target, new, aptitudes A+.
  - **uma-rpg:** rarity, aptitudes, sex, new, free, class.
  - **Sorts:** the shared level sort plus each game's own (Racing and Farm; Craft and Class Rank).
- **Adoption:** both Stables, every picker, the Observatory's Uma choice, the Halls, Manuals and party slots.

## Phase C: one work UI

- **`uma-ui/work`**, built on uma-racer's compact rows (D366) over a view model each game fills:
  - the job row and the side-panel row;
  - queue chips;
  - speed-up (−30m, Finish · N, Buy N and finish);
  - recall with a preview;
  - batch size chips (by count or by duration, set by the game);
  - the facility header with upgrade;
  - the job sheet frame (who, what, how many);
  - the targets strip.
- **uma-rpg's facility page** moves to compact rows; its Forge and Lapidary icon pickers plug into the job sheet as the
  "what" step.
- **The rules stay in each game.** Only the words and controls are shared. Both use the same names: Collect, Repeat,
  Speed up, Recall, Queue next.

## Phase D: places, profile and getting in

- **Shared frames:**
  - the Warehouse's shelf view (tabs, grade chips, the sell sheet) and the Exchange's rows;
  - the Account page (wallet, appearance, notifications, info rows, sign out);
  - the Uma profile's header and tab bar.
- **Boot gates:** splash → sign-in → boot → first launch → start page. Each game supplies its first-launch step and
  start rule.
- **`uma-auth`:** the lazy Firebase client and the NestJS guard (token and allowlist), in both games.

## Phase E: platform plumbing

- **uma-racer's phase 5:** it moves to uma-data and its art families (`racer-mapping.md`), deleting its own pipeline.
  That's already on its plan.
- **`uma-content`:** the release client wrapper, authenticated art fetch, the blob and Cache Storage cache, and atlas
  sprites, with the API's content proxy as a Nest module.
- **`uma-idle`, only if a game decides its save may move:**
  - the work engine (a timeline, queues of 3, collect, recall, tickets) and requirements netting;
  - uma-racer's engine is the more general start, with job kinds plugged in.
  - Until then each game keeps its engine behind Phase C's view models.
- **Push, if uma-racer wants it:** uma-rpg's subscription, server tick and badge become a shared `uma-push`.

## How it fits the plans already in place

| Plan | Fit |
|---|---|
| uma-racer's phases 5–7 (platform data and the kit, the Hub, the Farm and Training scenes) | Phase A is its "the Hub" step done for both games at once. Phase E holds its platform data step. Its scenes come after Phase C |
| uma-rpg's open work (W4 field effects, the Tier Finale) | Unaffected: game screens and rules stay in the game |
| Platform P11 ("extract on second use") | Kept: every package has two users from its first release |
| Platform architecture §3.2 | Changes on approval, as [README §5](README.md#5-what-changes-in-the-platform-rules-once-approved) says |

## What the owner approves

1. **Phase 0:**
   - the frame and bar fix in both games;
   - the level rule and its table of changes.
2. **The kit approach:**
   - packages in uma-platform, used by both games;
   - configuration over forks;
   - "converge, then extract".
3. **Phase A's choices:**
   - **Theme:** light and dark, following the phone.
   - **Top bar:** the disc with a tier crest and three chips.
   - **Renames in uma-rpg:** Uma Tickets, Uma Shards, Speed Tickets.
   - **Bottom bar:** Town Hall · Grow · Play · Work · Menu, with uma-rpg's Battle in the raised centre.
   - **uma-rpg's pages:** the rearrangement, without the Armory and the Jeweler.
   - **uma-rpg's plaza:** the featured Uma.
4. **Phase B's choices:**
   - bust portraits, 5 columns by default;
   - one picker;
   - an `outfit-faces` crop only if busts aren't close enough.

Once approved: the platform decisions, the architecture §3.2 change and the roadmap line are logged, Phase 0 starts
in both games, and Phase A starts in uma-platform.
