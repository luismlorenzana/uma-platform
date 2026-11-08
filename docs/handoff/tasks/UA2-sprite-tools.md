# UA2 — `scripts/sprites`: export, checks, repeat and progress, in git

**uma-platform · Either · L · Needs: UA1 · Unblocks: UA5, UA9**

## Why

The export and the checks exist as several copies of ChatGPT's scripts inside `content/review/`, one per study. Nothing
in git tests them, and each batch would copy them again. A hundred outfits need one tested tool
([pipeline.md](../../sprites/pipeline.md) §6, CR23).

## Context (read first)

- [format.md](../../sprites/format.md):
  - §2 (the cell), §5 (faces), §6 (fields and events) and §7 (the catalog);
  - §11 (the 14 checks) and §12 (the atlas).
- [pipeline.md](../../sprites/pipeline.md) §3 (the layout) and §6 (tools).
- ChatGPT's scripts, the logic to port:
  - `content/review/sprite-baseline/combat/`: `export-full.cjs`, `verify.cjs`, `verify-repeat.cjs`,
    `verify-timing.mjs` and `timeline.mjs`;
  - `roster-batch/`: `export.cjs`, `verify.cjs`, `keys.cjs`, `config.cjs` and `progress.cjs`;
  - `style-revision-v2/`, its locomotion preparation.
- `scripts/assets/` for this repo's conventions: the package layout, sharp, and tests next to the code.
- UA1's `content/authoring/sprites/`, the input.

## Decisions made

- **A workspace package `@uma-platform/sprite-pipeline` in `scripts/sprites/`.** TypeScript strict, Vitest, sharp. The
  root `package.json` gets `sprites:export`, `sprites:verify`, `sprites:repeat` and `sprites:progress`.
- **A revision's `config.json` drives the export.** It holds:
  - the master each action is cut from;
  - the grid, cut boxes and pivots;
  - offsets, face alignments and the reuse map;
  - the scale of wide falls and the hand crops.

  The schema lives in code and is validated. The configs live in `content/` beside their masters, because they belong to
  one outfit.
- **Port, don't redesign.** For each of batch 1's revisions, `sprites:export` must rebuild its frames, faces and atlas
  byte for byte from its masters and a reconstructed `config.json`. A frame that can't be rebuilt, such as a hand
  composite, is recorded in the config as `literal`: it's copied from the revision and listed in the report. That's
  allowed, but it's counted.
- **The 14 checks are pure functions** over decoded RGBA plus the atlas, each with a synthetic test: shapes drawn in
  code, never Uma art. Thresholds are format.md's. Checks 12 (approved frames kept) and 13 (facings agree) are new; 12
  reads `reviews.json` hashes.
- **`sprites:verify`** writes `verification.json` in the revision and exits non-zero on any failure. `--all` runs every
  outfit's current revision.
- **`sprites:repeat`** exports into a temp folder and compares every byte.
- **`sprites:progress`** rebuilds `content/authoring/sprites/progress.json` from the roster, the folders and
  `reviews.json`. Its stages are pipeline.md §4's, by tier, Way and profile.
- **Prompt templates without names** go in `scripts/sprites/templates/`, one per master:
  - the identity sheet, locomotion, swing, cast, reactions, and arms with victory;
  - the field facings, `weary` with the emotes, townsfolk, and the rival add-on.

  They come from batch 1's prompts, with every name and identity detail replaced by `{identity}`, `{outfit}` and
  similar slots.
- **A names guard.** It's a local-only test, skipped when `content/release/` is absent, as in CI. It fails if any
  tracked file under `scripts/sprites/`, `tools/studio/` or `docs/sprites/` contains a character name from the local
  master release. CI keeps its private-content check, which is extended to fail on any tracked PNG or WebP under
  `scripts/sprites/`.
- **The old scripts in `content/review/` stay** as history. Nothing new calls them.

## Do

1. Build the package with the four commands and their tests.
2. Reconstruct batch 1's `config.json` files, then run `sprites:export`, `sprites:verify --all`, `sprites:repeat` and
   `sprites:progress` on them.
3. Write the prompt templates.
4. Document the commands in `scripts/sprites/README.md` and in pipeline.md §6, if anything changed.

## Done when

- CI passes with the package's tests.
- Locally, `pnpm sprites:verify --all` passes on batch 1, and `pnpm sprites:repeat` is byte-identical.
- `pnpm sprites:export` rebuilds batch 1's revisions byte for byte, with every `literal` frame listed.
- `progress.json` matches UA1's.
- The names guard passes. `git status` shows no art, configs or prompts with names.

## Deliver

A pull request (ChatGPT) or `main` (Claude), Conventional Commits (`feat(sprites): …`). Log one P-decision for the tool
and anything you decided (fetch `main` first; from P93). Delete this packet and move UA2 to Done in
[the handoff](../README.md), with the commit and the count of `literal` frames.
