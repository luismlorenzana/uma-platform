# Uma Games — Architecture

How the Uma games fit together. **This doc is the source of truth for anything shared between repos.** Each game repo
owns its own design docs for everything else. Decisions referenced as `P#` are in [decisions.md](decisions.md); the
order of work is in [roadmap.md](roadmap.md).

## 1. Repos

| Repo | Role | Owns |
|---|---|---|
| `uma-platform` | Shared foundation | Master data pipeline and releases, shared packages, original art, this cross-game plan |
| `uma-racer` | Game | Racing, training, cards, collection, Farm |
| `uma-rpg` | Game | Party battles and chapter maps, its own farm, loop and goals |
| `uma-puzzle` | Game | Puzzle battles (design to come) |

All four are private under `github.com/luismlorenzana`. Everything is personal and never distributed (P1).

**Each game stands alone** (P2, P3): its own GCP/Firebase project, save format, game rules, game-only content, docs,
decisions and release cycle. Games never import from each other, never read each other's saves, and share no economy.
New games start with fresh saves; nothing carries over from uma-racer (P4).

`uma-planner` is **not part of this initiative** (P12). It may be used once as a source for initial loads into
uma-platform. It never consumes uma-platform.

## 2. Master data

### 2.1 Scope

Master data describes the original game faithfully. It's imported once and reused by every game (P5).

| Set | Source today (GameTora dataset) | Holds |
|---|---|---|
| Characters | `characters` | Identity and real-horse facts |
| Outfits (trainee cards) | `character-cards` | Base stats, growth rates, aptitudes, rarity, skills, release dates |
| Support cards | `support-cards` | Type, rarity, effects, unique effects, granted skills, how obtained |
| Skills | `skills` | Kind, conditions, costs, icons |
| Scenarios | `scenarios` | Release order, identity, icons |
| Races and courses | `races`, `racetracks` | Grade, surface, distance, venue, course layout |
| Career objectives | `ura-objectives` | Per character |
| Art | GameTora and wiki images | Uma icons, busts, faces, chibis, dresses, card art, icon atlases |

**Not master data.** Each game owns its interpretations and authored overlays:

| Game | Owns |
|---|---|
| uma-racer | Flair overlay, card-focus overrides, Spark Rival rosters, release eras as tiers, card effects mapped to its training model |
| uma-rpg | Chapters, class catalog, Princess Connect enemy art |
| uma-puzzle | Cast, catalog, monster atlases |

**Rule: master data stays neutral.** A field that only makes sense inside one game's rules belongs in that game's
adapter (§2.4). uma-racer's current normalizers import racer types (`UmaTemplate`, `eraOf`, `sourceCardEffect`), so
Phase 0 replaces them with neutral master types instead of moving them as they are.

### 2.2 Pipeline and releases

```text
GameTora + owner overrides ─ pnpm data:import ─▶ normalized packs ─┐
image sources ───────────── pnpm assets:import ─▶ WebP art + atlases ─┴─ pnpm release:publish ─▶ private bucket
```

- **Original-game content never goes in git or on a public host** (P6). Packs, images and caches live only in the
  gitignored `/content/` folder locally and in the private bucket in production. Test fixtures are small and synthetic.
- A release is a **content-addressed manifest**, as in uma-racer today: every file is named by its hash, the manifest
  lists them, files upload before the manifest, and old files are kept.
- Bucket layout (final, P23; every set and field is in [master-data.md](master-data.md)):

  ```text
  files/data/<set>.<hash16>.json        one per master set, plus the art index (data/art.<hash16>.json)
  files/atlases/<family>-<n>.<hash16>.webp
  files/art/<family>/<key>.<hash16>.webp
  manifests/v<major>/<version>.json     one per release, immutable
  channels/v<major>/latest.json         points at the newest release for that schema major
  ```

  Files and manifests are never overwritten or deleted; moving the channel is the only replace. The release client in
  `uma-data` reads channel → manifest → files and checks every hash.
- Each game's API service account gets **read-only** access to the bucket. Games serve master data to their web app
  through their own logged-in API, exactly as uma-racer's `/api/content/*` does now.

### 2.3 Versioning: import once, available everywhere

- `@luismlorenzana/uma-data` carries the schema (types and runtime validators) and the release client. Its major
  version is the **schema major** (P7).
- **Games follow `latest` automatically within the schema major they were built for.** New characters, cards, skills
  and scenarios are additive, so they reach every game without a code change.
- A breaking schema change bumps the major. A game picks it up only when it upgrades the package. Until then it keeps
  the last release of its old major.
- A game may pin a specific release for testing or rollback.

### 2.4 Stable IDs and adapters

- Games refer to master records **only by stable IDs**: character, outfit, card, skill, scenario and race. These are
  the original game's IDs (P8).
- Saves store IDs plus the game's own progress, never copies of master records. A save stays valid when a release
  corrects a record.
- Each game has **one adapter module** that turns master records into its own shapes. Uma levels, classes, stats and
  unlocks are per game: leveling an Uma in uma-rpg changes nothing in uma-racer.
- Games handle IDs they don't know (new release, old client) and IDs that vanish (record removed) without crashing.

## 3. Shared code

### 3.1 Distribution

- Packages publish privately to **GitHub Packages** under `@luismlorenzana/*` (GitHub Packages requires the scope to
  match the account), versioned with **Changesets** (P9).
- Each game depends on exact versions and upgrades on its own schedule.
- Shared code changes in a uma-platform session and ships as a new version. To try a change in a game before
  publishing, link it locally (`pnpm link`) and never commit the link.
- Game CI installs packages with a token that has `read:packages`.

### 3.2 Shared vs owned

| Shared: one implementation, same behavior everywhere | Owned by each game: expected to diverge |
|---|---|
| Master data schema, validators, release client | Game rules and balance numbers |
| Content loading: manifest, IndexedDB cache, sprite and atlas loading | Game screens: battles, races, maps of play, careers |
| React ↔ canvas scene host, and the Hub map: terrain, buildings, place buttons, swipe (P48) | Which pages and places exist, and their content |
| Passive-generator math: rates, caps, offline accrual, timers | Farm content: what's produced, buildings, recipes |
| Login (Firebase + owner allowlist), save sync, app update prompt | Leveling curves and per-Uma progression |
| Design tokens (light and dark), primitives and the app shell: top bar, bottom bar, menu, side panel, sheets (P48) | Save format and economy |
| Uma lists: portraits, album engine, filters, sorts, pickers; the work UI (P48, phases B–C) | Game-only content packs |
| Original art from `assets/` | |

### 3.3 Extract on second use

All three games get a similar Hub, farm-like passive generators and per-game Uma leveling (P10). These are built
first in uma-rpg (Phase 2), kept in clearly separated folders, and extracted into uma-platform when uma-racer becomes
the second user (Phase 3). No shared package is created before a game needs it, except `uma-data` (P11).

The shared app code ships as **one package, `@luismlorenzana/uma-kit`**, with subpath exports (P48): `/theme.css`,
`/ui`, `/shell` and `/hub` first, then `/album`, `/roster` and `/work`. `uma-content`, `uma-idle` and `uma-auth` may
join it as subpaths too; the [sibling plan](sibling/README.md) orders the work.

## 4. Game baseline

New games start from the uma-racer stack, which already runs well on the owner's iPhone (P13).

| Layer | Choice |
|---|---|
| Tooling | pnpm 10, Node 22, Turbo, TypeScript strict with `noUncheckedIndexedAccess`, Vitest |
| Web | React 19, Vite, Tailwind 4, Motion (`LazyMotion strict`), Zustand + Dexie, TanStack Query for network data only, PWA |
| Canvas scenes | **Phaser 4** for new scenes: maps, battles, Hub (P14). uma-racer's PixiJS scenes stay until they're reworked |
| API | NestJS on Cloud Run: `AuthGuard` (Firebase token + owner allowlist), save and sync, content proxy |
| Hosting | Firebase Hosting (classic), one Firebase/GCP project per game |
| Deploy | GitHub Actions with keyless Workload Identity Federation |

Rules that carry over from uma-racer (`docs/research/game-web-tech.md` there):

- Mobile first at 390×844 portrait: 44 pt touch targets and safe-area padding.
- Main JS ≤ 180 KB gzip. Engines, Firebase and scenes are lazy-loaded.
- One canvas engine alive at a time, destroyed when its screen closes and paused when hidden.
- Game rules are pure and tested. Scenes only play back the events the rules produce.
- Text-heavy UI (menus, HUD, forecasts) stays in React, layered over the canvas.
- Every animation uses elapsed time, never frame counts.

## 5. Original art

- `assets/` holds art made for these games: tilesets, Hub and farm maps (Tiled or LDtk), buildings, crops, UI frames,
  icons and effects. It's original, so it lives in git (P15).
- Every asset comes from a **generator script**, so it can be regenerated and edited. `scripts/pixel-art` draws
  from code with no dependencies (`pnpm art:draw`; P35): hue-shifted six-tone ramps, dome and facet lighting, a
  selective outline and seeded detail.
- Uma characters use the original chibi and bust art from master data, animated with code. Original art never
  contains copied game art.

## 6. Infrastructure (set up in Phase 0, runbook in `infra/README.md`)

| Thing | Value |
|---|---|
| GCP project | `uma-platform-lm` (`uma-platform` was taken, P34) |
| Bucket | `gs://uma-platform-master-data`: private, `us-central1`, uniform access, public access prevention on |
| Read access | Each game's Cloud Run service account: `roles/storage.objectViewer` on the bucket |
| Publishing | From the owner's machine, with gcloud scoped by environment variables |

**Local gcloud has two accounts, and the active one is the owner's work account. Never change it.** Scope every command
with `CLOUDSDK_ACTIVE_CONFIG_NAME` and `CLOUDSDK_CORE_PROJECT`, never `gcloud config set`.

## 7. Working across repos

- A session works inside one repo. Each repo has `README.md`, `AGENTS.md` (all agents) and `CLAUDE.md`.
- Cross-game architecture, roadmap and platform decisions live here in `docs/`. Game decisions live in each game's own
  `docs/decisions.md`.
- A game session that needs a shared change writes it down for a uma-platform session instead of editing shared code
  in place.
