# RK1 — Uma Ranker: the boards online

**uma-platform's `apps/web/src/apps/ranker`, `apps/api/src/ranker`, `scripts/ranker` and `tools/studio` · Claude · L ·
Needs: SH2 · Unblocks: RK2**

## Why

The owner ranks Umas and enemies in the local Studio today. The Ranker puts the same eleven boards in the Uma Platform
app, so ranking works from any device, with the bucket as the source of truth
([platform-app/README.md](../../platform-app/README.md), AP14–AP18, P128).

## Context (read first)

- [authoring/tiers.md](../../authoring/tiers.md) (TS1–TS22, [page](../../authoring/previews/tiers.html)) and P113–P125:
  every rule the boards follow.
- `packages/tiers` (SH1): the model. `tools/studio/src/tier-store.ts` (the atomic, serialized, revision-checked store),
  `tier-catalog.ts`, `tier-sources.ts`, `tier-import.ts`, `tier-app.ts`, `public/board.html` and `home-app.ts`.
- `content/authoring/tiers/` (eleven boards and `plan.json`), `content/authoring/enemies/` (`catalog.json`,
  `imports/`, `assets/`, 169 MB).

## Decisions made

- **As it is (AP14):** every board, rule, key, note, undo, drag, bulk action, Left out, default outfit, import, export,
  flow-down and number the Studio has on the day RK1 starts. Rewritten in React on uma-kit; taps on a phone (a tier bar
  under the card), keys on desktop.
- **The store (AP16):** `ranker/boards/<board>.json` in `gs://uma-platform-content`, written with
  `ifGenerationMatch` and the board's own revision; a lost race answers 409 with what's stored, and the page reloads that
  board and keeps the user's undo. Every save rewrites `ranker/plan.json` from `packages/tiers`. Versioning is the
  history; a restore is a copy of an older generation, never a delete.
- **The catalog:** the API builds it once a start from master data (through the release proxy's client) and
  `ranker/imports/` and the enemy catalog, as `tier-catalog.ts` does locally.
- **Images:** Uma art through `/api/master/…`; franchise art through `/api/ranker/assets/<file>`, hash-named files
  only, from `ranker/assets/`.
- **Moving over (AP16):** `pnpm ranker:push --boards` uploads the eleven local boards once at their current revisions,
  only where the bucket has none.
- **Local copies (AP17):** `pnpm ranker:pull` writes the online boards and plan into `content/authoring/tiers/`. After
  the move, the Studio's board pages open read only, with a banner linking to the Ranker, and its board writes answer
  410. The Studio's sprite pages are unchanged.
- **Imports (AP18):** `pnpm tiers:import` is unchanged; `pnpm ranker:push` uploads new images (`--no-clobber`) and the
  import lists. The API reloads its catalog when `ranker/imports/` changes, or on a restart.

## Do

1. `apps/api/src/ranker`: catalog, store, `GET /api/ranker`, `GET`/`PUT /api/ranker/boards/<board>`,
   `GET /api/ranker/plan`, `GET /api/ranker/assets/…`, `GET /api/ranker/summary` (for the home tile).
2. `apps/web/src/apps/ranker`: the Ranker's home (the Studio's numbers), the board page, the card, the tier list, the
   filters, undo, drag and drop, import and export; registered in the app's registry.
3. `scripts/ranker`: `ranker:push` (boards once, assets, imports) and `ranker:pull`.
4. The Studio: read-only boards and the banner, after the move.
5. Tests: the store's preconditions and 409 on invented boards; the API's guard; the page's model glue. The model's own
   tests stay in `packages/tiers`.
6. Docs: tiers.md's storage section, the platform-app doc, the Studio's README.

## Done when

- The owner ranks on the phone at `uma-platform.web.app/ranker`, and `pnpm ranker:pull` brings the same plan to this Mac.
- Every board's state online matches the local files at the move (revision and entries), checked by a script.
- Two tabs saving the same board: the second gets 409 and recovers without losing an edit.
- `pnpm lint`, `pnpm test`, `pnpm build` pass; deploy is green.
- A Done row, and P128's state updated.
