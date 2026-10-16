# Both apps, side by side

> Part of the [sibling apps plan](README.md). Proposal, 2026-10-16. Every feature of both live apps, row by row, with a
> verdict:
> - **Same:** one implementation serves both, with at most a label or icon set.
> - **Variant:** one shared implementation with game configuration (places, currencies, sort keys, columns).
> - **Different:** each game owns it; it is the game.
>
> "Today" columns describe the live apps: uma-racer's generation 2 at `8caac6a` and uma-rpg at `e681b48`.

## 1. Getting in and the app around the game

| Feature | uma-racer today | uma-rpg today | Verdict | Proposed |
|---|---|---|---|---|
| Sign-in | Firebase Google redirect, owner allowlist | The same | **Same** | Shared client and guard (`uma-auth`) |
| Boot gates | `StartRoute` rules: a new account opens the Stable's Locked tab; a pending tap opens the Farm; else the last page | Splash, sign-in, booting, first launch (trainer name, 20 tickets), then the last page | **Variant** | One gate sequence (splash → sign-in → boot → first launch → start page); each game supplies its first-launch step and start rule |
| Update prompt | `UpdateNotice` under the top safe area | `UpdateNotice` toast | **Same** | Shared |
| Offline and sync state | A Sync chip in the top bar: Offline, Sync paused, waiting, failing | "Offline" or "Sync paused" under the name | **Same** | uma-racer's chip, shared |
| App frame | `h-dvh` column: top bar, outlet, bottom bar, sheet host | `h-dvh` column: top bar, map, tabs | **Same** | One fixed full-screen frame that also fixes the iPhone band ([hub-rework](hub-rework.md#phase-0)) |
| Top bar | Initial disc; chips with uma-art marks: Prize Money, Speed Tickets, Uma Tickets `N · s/5` | Initial disc, name, Tier pill; SVG icons: Unlock Tickets, Shards, Laurels | **Variant** | One bar: disc with tier crest, three currency chips in fixed slots, the sync chip |
| Bottom bar | Floating panel: Town Hall · Training · **Race** (raised) · Farm · Menu, with count badges | Full-width strip: Wilds · Learning · Town · ☰, ready badges | **Variant** | One five-slot bar, uma-racer's style and order: Town Hall · Grow · [Play] · Work · Menu |
| Menu | "Every place": each page's places in a 2-column grid with counters, then Account and "Needs of every Uma" | Every place by page in a 2-column grid with locks, then Account | **Variant** | One sheet; each game adds its extra rows |
| Side panel ("Peek") | 88% wide panel on the right, Enter at the bottom (copied from uma-rpg) | The same | **Same** | Shared |
| Place pages | Scroller with a sticky header: Back, title, (i) | Full-screen page: ← and an optional counter | **Same** | uma-racer's `PlaceHeader`, shared |
| Bottom sheets | Motion spring, drag handle, stack over each other through a portal, 92% high | Portal, no animation, 85% high | **Same** | uma-racer's, shared |
| Routes and overlays | `/:page`, `/:page/:place/*`, `?peek=`, `?sheet=` | `/:page`, `/:page/:place/*`, `?peek=` | **Same** | uma-racer's routing helpers (`nav.ts`), shared |
| Floating action | Collect all / Check-in pill | Collect all · N ready pill | **Variant** | One pill; each game sets its actions |
| Account | Rename, wallet, info rows, sign out | Rename, wallet, notifications, info rows, sign out | **Same** | One page frame with game rows |
| Push notifications | Not built (optional, its phase 4) | Server tick every 5 minutes, "Work done", app badge | **Variant** | uma-rpg's, shared later if uma-racer wants it |
| Appearance | Light only | Dark only | **Same** | Light and dark palettes, following the phone, with an Account setting |

## 2. The Hub

| Feature | uma-racer today | uma-rpg today | Verdict | Proposed |
|---|---|---|---|---|
| Map engine | Phaser 4, lazy, paused under sheets: uma-rpg's scene copied (racer D363) | Phaser 4 | **Same** | `uma-scene/hub`, from uma-racer's newer copy |
| Terrain | Procedural 16 px tiles, one trunk road, a branch per door, lanes around on-road buildings, odd-column centred grid | The same without lanes or centring | **Same** | uma-racer's version |
| Buildings and ambient | 48 px uma-art frames, smoke, glows, clouds | The same | **Same** | Shared |
| Place buttons | Name pill, counter, pips, Ready badge (uma-rpg's D33 layer) | Name pill, worker pips with progress rings, Ready badge | **Same** | Shared |
| Page swipe | Swipe > 60 px changes page | The same | **Same** | Shared |
| Pages | Town Hall, Training, Racing, Farm | Wilds, Learning, Town | **Variant** | Five tabs (four pages and the Menu) in both: Town Hall, Grow, Play, Work, Menu |
| Places | Town: Stable, Card Library, Warehouse, Exchange. Training: Observatory, Lineage Hall, Gym, Dojo. Racing: Scenario Gate, Trophy Hall, Expedition Map, Racecourse. Farm: 8 sites, Pantry, Kitchen | Wilds: 8 sites, Workbench, Lapidary, Forge. Learning: 5 Halls of Heroes, Armory and Jeweler (locked). Town: Stable, Party Hall, Scenario Gate, Warehouse, Exchange, Observatory, Tier Finale | **Different** (content), **Same** (mechanism) | Each game's own places, in parallel spots. uma-rpg's move to match is in [hub-rework](hub-rework.md#a4-pages-and-places) |
| Featured Uma | One Uma on the Town Hall plaza; tap for Train, Race, Profile, Feature another | None | **Variant** | Shared; uma-rpg's sheet offers Fight, Profile, Feature another |
| Page colours | Per page (town earth, training slate, racing turf, farm green) | Per page | **Variant** | Each page's palette in its config |

## 3. Umas

| Feature | uma-racer today | uma-rpg today | Verdict | Proposed |
|---|---|---|---|---|
| Uma art in lists | `UmaSquare`: the outfit icon, then the bust (head and shoulders, 256 px, cropped at build) | Full-stand outfit icons in the grid (4 across on an iPhone 15); busts in the list and profile | **Same** | One Uma portrait tile: the bust, the icon until it loads |
| Small Uma tokens | `UmaFace`: the character's face, 128 px | Outfit icons in pips, slots and party rows | **Same** | One face token |
| Stable views | Icons (3 columns), cards (2), list (1); virtual grid. Before 2026-10-15 it was 5 columns of busts | Grid (4–5 columns) or list | **Same** | Icons at **5 columns** by default on a phone, cards at 3, list at 1 |
| Search, filters, sorts | Album engine: facets (tier, ready, target, new, aptitudes A+), sorts (level, release, name, tier, racing, farm), quick picks, up to 20 saved views, per device | Query model: facets (rarity, aptitudes, sex, new, free), 7 sorts, remembered per device | **Variant** | uma-racer's engine and chrome, shared; each game declares its facets and sorts |
| Default order | Stable: lifetime level, highest first. Pickers: mostly level, a few by context | Stable: newest release first. Pickers: by name, release order, Craft Level or Uma Level, depending on the picker | **Same** (the rule) | Uma Level first everywhere, work level in work pickers ([the rule](hub-rework.md#phase-0)) |
| Uma pickers | One `UmaPicker` over the album; strips for the Farm and Race | Six separate pickers (party slot, facility, Observatory, Hall, Manuals, active party) | **Same** | One picker with a context: candidates, why one can't be picked, and its own sort |
| Level shown | "T2 · Lv 13" (tier and Racing Level; sorts on lifetime level) | "Lv 7" (Uma Level, tier 1) | **Same** (format) | "Lv 7", and "T2 · Lv 7" once a tier is above 1, in both |
| Profile | Header with tier, scenario, Racing and Farm Levels; sections | Header with Uma Level, class, Craft Level; tabs Skills, Battle, Gear, Work, Racing | **Variant** | One header and tab frame; each game's tabs |
| Unlocking | Uma Tickets and Shards (5 → 1 ticket), reveal ceremony, multi-unlock | Unlock Tickets and Shards (5 → 1), unlock button | **Variant** | Same names (Uma Tickets, Uma Shards) and the same chip; the ceremony stays racer-only |
| Targets | Planner targets (five, or automatic), a Needs tab, target strips | Five targets, "For your targets" at each facility | **Variant** | Shared marking and strip; each game's planner |
| Parties | None | 20 parties of 5, an active party | **Different** | uma-rpg only |

## 4. Work

| Feature | uma-racer today | uma-rpg today | Verdict | Proposed |
|---|---|---|---|---|
| Facilities | Farm: 8 sites, Pantry, Kitchen | Wilds: 8 sites, Workbench, Forge, Lapidary | **Different** (content), **Same** (mechanism) | Shared facility page frame |
| Job rules | 1–10 items one after another, queues of 3, Collect (also part-way), Recall, 30-minute Speed Tickets, Finish | The same, with 30-minute Time Tickets | **Same** (rules) | One set of words and controls |
| Job UI | Compact 56 pt rows: face ring, item, `×10 · 3/10`, time, Collect / Repeat / Speed / ⋯ (D366) | Job cards with progress, Collect / Repeat / −30m / Finish / Recall, a queue list | **Same** | uma-racer's rows, shared |
| Starting a job | Job sheet by link (`?job=&uma=…`), Umas suited first then Farm Level | A three-step sheet (who, what, how many); icon pickers at the Forge and Lapidary | **Variant** | One job sheet frame; each facility supplies its item picker |
| Batch sizes | Durations, marking the size that fits the next check-in | 1–10, or ×1–×40 when refining | **Variant** | One chip row with a game rule |
| Profession | Farm Level per tier, aptitude-boosted EXP | Craft Level, one curve | **Variant** | Same display, game rules |
| Upgrades | Facility levels, slots and speed | Levels 1–3: 3/4/5 slots, speed at 3 | **Variant** | Same header and sheet |
| Check-ins | Check-in times, size planning, Collect all, suggestions | None | **Different** | uma-racer only, for now |
| Work engine | Pure `/work` engine with pluggable job kinds, on the racer's state | Pure `work.ts` on uma-rpg's save | **Different** (today) | Shared later as `uma-idle`, once one save can move to it |

## 5. Progression and play

| Feature | uma-racer today | uma-rpg today | Verdict |
|---|---|---|---|
| Uma Level | Racing Level 1–50 per tier; lifetime level 50(t − 1) + Racing Level | Uma Level 1–50 (tier 1) | **Variant**: one "level" sort key and label |
| Tiers and promotion | Three tiers of five scenarios, Hall of Fame | Tier 1; the Tier Finale is locked | **Variant** |
| Extra Stats | An Observatory in Training, funded by meals | The Observatory in Town, opened with Star Gems | **Variant**: same name and idea, different maps; share the map view later if the shapes line up |
| Skills and inheritance | Training Hub sessions; the Lineage Hall | Class Ranks earned in fights, skill trees, the Halls of Heroes | **Different** |
| Cards | Card Library and bonds | None | **Different** |
| The play | Races (PixiJS, then Phaser in its phase 8), careers, scenarios, World Expeditions | Battles (Phaser), a five-continent world map, Sweeps, Springs | **Different** |
| Results | A ceremony | A result screen with rank bars | **Different** |

## 6. Economy places

| Feature | uma-racer today | uma-rpg today | Verdict | Proposed |
|---|---|---|---|---|
| Warehouse | Items (uma-rpg's former farm half), dishes | Materials, Star Gems, gear; a grade filter; sell | **Variant** | One shelf view: tabs, grade chips and the sell sheet; each game's shelves |
| Exchange | Buy items and tickets, sell; the Daily Purse | Buy raw items and tickets, Manuals, sell | **Variant** | One frame; each game's rows |
| Currencies | Prize Money, Speed Tickets, Uma Tickets and Shards | Laurels, Time and Sweep Tickets, Unlock Tickets and Shards, Gear and Class Marks | **Variant** | Three chips in the bar: main currency · Speed Tickets · Uma Tickets. Same names where the thing is the same |

## 7. Platform plumbing

| Feature | uma-racer today | uma-rpg today | Verdict |
|---|---|---|---|
| Master data | Its own GameTora pipeline into private content; platform data in its phase 5 | `uma-data` through the API | **Same** (target): both on `uma-data` |
| Outfit ids | GameTora card ids, `'100101'` | uma-data outfit ids, `'100401'` | **Same**: the same numbers |
| Uma art | Private content files: icons, bust, chibi, dress, face | uma-data art families: `outfit-icons`, `outfit-busts`, `outfit-chibis`, `character-faces` … | **Same** (target): uma-racer's mapping is in `racer-mapping.md` |
| Pixel art | uma-art 2.7.0: buildings, tiles, ui, items, dishes | uma-art 2.8.0: buildings, tiles, ui, items, gear, gems, world, fx | **Same** |
| Save | Documents per kind (`saves/{uid}/{kind}/{id}`), Dexie `uma-racer-g2` | One revisioned snapshot, schema v21, Dexie | **Different** |
| API | NestJS: save, sync, content proxy | NestJS: save, push, master data proxy | **Variant**: shared guard and content modules |
| Hosting and deploy | Firebase Hosting, Cloud Run, GitHub Actions, its own projects | The same pattern, its own projects | **Same** pattern, separate infrastructure |
| Live manual from code, 180 KB entry budget | Both | Both | **Same** pattern; nothing to share in code |

## 8. The count

| Verdict | Rows | What it means |
|---|---|---|
| **Same** | 29 | One implementation in the kit |
| **Variant** | 23 | One implementation with game config |
| **Different** | 10 | Stays in the game |

Of the 62 rows, 52 can be one implementation.
- **Two of the ten Different rows are only content:** which places and which facilities exist. They sit on shared
  mechanisms.
- **The other eight are the games themselves:** the play and its results, skills and inheritance, cards, parties,
  check-ins, the save and the work engines.

So everything a player touches on the way to the game can be the same code.
