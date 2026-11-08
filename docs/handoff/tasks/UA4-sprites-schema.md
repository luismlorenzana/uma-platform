# UA4 — uma-data 1.4.0: the `outfit-sprites` family

**uma-platform `packages/data` · Either · M · Needs: — · Unblocks: UA5, uma-quest's Q6**

## Why

Games read every piece of master data through `@luismlorenzana/uma-data`'s types and its checked release client. Sprite
sets need the same: a type, a parser, a place in the art index, and fixtures, so a game can load one by outfit id
([format.md](../../sprites/format.md) §13, CR18 and CR26).

## Context (read first)

- [format.md](../../sprites/format.md) §6 (per-frame fields and events), §12 (the authoring atlas) and §13 (the release
  family).
- [master-data.md](../../master-data.md): Art, Releases, Release client and Schema changes.
- `packages/data/src/art.ts`, `client.ts`, `release.ts`, `testing.ts` and `parse.ts`, and their tests.

## Decisions made

- **A minor version (1.4.0) with a changeset:** everything is additive and optional. Older clients drop the new
  `sprites` key, and the new client reads releases without it.
- **Types:**

  | Type | Holds |
  |---|---|
  | `SpriteSet` | `outfitId`, `revision`, `profile`, `cell`, `logicalCell`, `foot`, `headBox`, `faceBox`, `hit`, `pages`, `faces`, `actions` |
  | `SpritePage` | `path`, `width`, `height` |
  | `SpriteRect` | `page`, `x`, `y`, `w`, `h`, `dx`, `dy`: the trimmed rectangle on its page and the trim's offset in the cell |
  | `SpriteFace` | A `SpriteRect` plus its place in the cell |
  | `SpriteAction` | `loop`, `events` (`impact`, `release`, `hold`, `repeat`), `frames` |
  | `SpriteFrame` | A `SpriteRect` plus `ms`, `headLocked`, `headOffset`, `grip`, `off`, `cast`, `hold`, `air`, `hit`, `bounds`, `handOcclusion`, `view` |

  Action names, profiles and patch names are **open strings**, since format.md's catalog grows additively. Fields
  format.md marks as conditional are optional.
- **The art index:** an optional top-level `sprites: Record<string, string>`, from outfit id to the sprite set file's
  release path. `artPaths` includes those paths.
- **`parseSpriteSet`** checks:
  - every page index is in range;
  - every rectangle sits inside its page;
  - every event points at a real frame;
  - every anchor sits inside the cell.
- **The client:** `client.spriteSet(manifest, art, outfitId)` returns the parsed set or null. Pages load through the
  existing `client.file`.
- **Testing:**
  - `syntheticSpriteSet()` makes a two-action set with invented numbers;
  - `buildMemoryRelease()` accepts sprite sets, so games' tests can load one without real art.
- **Paths:**
  - sprite set files at `files/art/outfit-sprites/<outfitId>.<hash16>.json`;
  - pages at `files/atlases/outfit-sprites-<outfitId>-<n>.<hash16>.webp`.

## Do

1. Add the types, the parser, the art-index key, the client method and the testing helpers, with tests:
   - an old index with a new client;
   - a new index with the old parser, from a fixture;
   - each rejection.
2. Add a **Sprites** section to master-data.md (the family, the file shapes, the client call) and a row to its Art
   table.
3. Add a changeset, release 1.4.0 through the release workflow, and check the version is listed.

## Done when

- CI passes.
- `gh api /user/packages/npm/uma-data/versions --jq '.[].name'` lists 1.4.0.
- master-data.md documents the family.

## Deliver

A pull request (ChatGPT) or `main` (Claude), `feat(data): …`. Log a P-decision (from P93, after fetching `main`).
Delete this packet and move UA4 to Done in [the handoff](../README.md). No game needs a new Actions grant: uma-data is
already shared.
