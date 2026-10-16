# SB2 — `uma-kit/roster`: the album engine, the level rule, the level label, rows and preferences

**uma-platform · Either · M · Needs: nothing · Unblocks: SB3 (and through it SB4, SB6, SC2).**

## Why

Both games list and filter Umas with their own code: uma-racer's album engine and uma-rpg's simpler roster query.
Phase B makes every Uma list the same code. This packet moves the pure part, with no React, into the kit:
- filtering, sorting and presets;
- the one level rule;
- the level label;
- device preferences.

SB3 builds the screens on it.

## Context (read first)

- `docs/sibling/phases.md` § Phase B (the table), and `docs/sibling/kit.md` §4 (the album engine rows).
- **The source to port, uma-racer `origin/main`.** Read it with `git -C ~/workspace/uma-racer show origin/main:<path>`.
  The local checkout may be on another branch.
  - `apps/web/src/ui/album/query.ts` (247 lines): `AlbumRow`, `FacetDef`, `SortDef`, `AlbumQuery`, `AlbumPreset`,
    `runAlbumQuery`, `filterRows`, `sortRows`, `emptyStateHint`, `ALBUM_VIEWS`. Its tests are beside it, if present.
  - `apps/web/src/ui/albumPrefs.ts` (141 lines): `sanitizeQuery`, `loadAlbumPrefs`, `saveAlbumPrefs`, `markSeen`,
    `MAX_SAVED_VIEWS` (20), `MAX_SEEN_IDS` (4000), and the React hook `useAlbumPrefs`.
- **uma-rpg's side**, which the engine must cover:
  - `packages/domain/src/roster/query.ts`: `RosterQuery`, `runRosterQuery`, and `byUmaLevel`, the level rule from D146;
  - its tests, `query.test.ts`;
  - the sort keys release, name, rarity, statTotal, level, craft and classRank.
- The level rule in both games: uma-rpg D146 and uma-racer D368 (A03). Every list opens on Uma Level, highest first,
  then newest release, then name. Work pickers open on free Umas first, then the work level, highest first.
- The kit: `packages/kit/package.json` (exports, peer deps), `src/ui/prefs.ts` (`kitKey`, `readPref`, `writePref`;
  the game's storage prefix comes from `configureKit`), `scripts/check-dist.mjs` (every entry must load in plain Node),
  `README.md` (the subpath table). The kit uses NodeNext: relative imports end in `.js`.

## Decisions made

- **Subpath:** `@luismlorenzana/uma-kit/roster`, at `src/roster/`.
  - Pure TypeScript: it imports neither React nor `motion`.
  - It may use `src/ui/prefs.ts` for storage. If importing it drags React in, move `prefs.ts` to `src/core/` and
    re-export it from `/ui`.
- **The engine is uma-racer's**, with its names: `AlbumRow`, `FacetDef`, `SortDef`, `AlbumQuery`, `AlbumPreset`,
  `runAlbumQuery`. uma-rpg's `RosterQuery` retires in SB4.
- **The level rule:**
  - `byLevel(a, b)`: level descending (`null`, not owned, last), then `releasedAt` descending, then `name` ascending,
    then `id`.
  - `workOrder(a, b)`: free first, then `workLevel` descending, then `byLevel`.
  - Both read a small `LevelRow` shape (`id`, `name`, `releasedAt`, `level`, and optionally `free` and `workLevel`), so
    any game row fits.
- **The level label:** `formatLevel(level, tier = 1)` returns `"Lv 7"`, or `"T2 · Lv 7"` when the tier is above 1. A
  null level returns `"—"`.
- **Rows from master data:** `outfitRowBase(outfit, character?)` returns what both games read from uma-data:
  - `id`, `name`, `title`, `rarity`, `releasedAt`, the aptitude grades, and the art keys (`icon`, `bust`, `face`,
    `chibi`).
  - It types against `@luismlorenzana/uma-data` with `import type` only. Add uma-data as an **optional peer
    dependency**.
  - uma-racer maps its own data to the same shape until SE1.
- **Preferences:**
  - The pure functions move here: `sanitizeQuery`, `loadAlbumPrefs`, `saveAlbumPrefs`, `markSeen`, the limits.
  - Storage keys come from `kitKey('album:' + album)`, not racer's hard-coded prefix.
  - `useAlbumPrefs`, a React hook, goes to SB3.
- **Out of scope:** any game change, and any UI.

## Do

1. Create `src/roster/`:
   - `query.ts`: the port of racer's, unchanged in behaviour;
   - `level.ts`: `byLevel`, `workOrder`, `formatLevel`, `LevelRow`;
   - `rows.ts`: `outfitRowBase`;
   - `prefs.ts`: the pure preferences;
   - `index.ts`.
2. **Tests,** in `src/roster/*.test.ts` (Vitest, Node):
   - port racer's query tests;
   - add cases from uma-rpg's `roster/query.test.ts` for the level rule (ties on level, release and name; unowned
     last; work pickers free first);
   - `formatLevel` at tiers 1 and 2;
   - `sanitizeQuery` against junk input;
   - `markSeen`'s cap.
3. **Wire the subpath:** add `./roster` to `package.json` exports, add `'roster'` to `scripts/check-dist.mjs`'s entry
   list, and add a row to the README's table.
4. **Release:** a changeset (minor: a new subpath). Version and publish as the queue README says.
5. **Log** a P-decision in `docs/decisions.md`: the subpath, the level rule as the kit's, and the names kept from
   uma-racer.

## Done when

- [ ] `pnpm lint && pnpm test && pnpm build` pass in uma-platform. `check-dist` loads `/roster` in plain Node.
- [ ] Nothing under `src/roster/` imports `react`, `react-dom`, `motion` or `phaser`. A test greps the files to prove
      it.
- [ ] The new uma-kit version is published and listed by `gh api /user/packages/npm/uma-kit/versions`.
- [ ] Both games still build against it unchanged: try it in each as the master prompt says.
- [ ] The P-decision is logged.

## Deliver

- Claude: commit to `main`, `feat(kit): uma-kit/roster, the album engine and level rule (SB2)`.
- ChatGPT: branch `sib/sb2-kit-roster`, a pull request with the same title.
- Reply with the version published, and flag it done as the queue README says.
