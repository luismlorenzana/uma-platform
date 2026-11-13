# Enemy keys: the format (v1)

> **Status: 2026-11-12, the format every enemy is drawn, checked and published to (uma-quest Q16 part A, P152).** It
> writes down the owner's three enemy tiers from uma-quest's
> [enemy art review](https://github.com/luismlorenzana/uma-quest/blob/main/docs/design/enemy-art-review.md) (EN1–EN13,
> D33) as a contract any game can read: the poses a tier has, the canvas, the anchors, a boss's layers, the checks,
> the `enemies` roster and the `enemy-keys` family in master data's private release, and the tools that build and
> publish them. It sits beside [format.md](format.md) (the Umas' sprite sets) and mirrors
> [pipeline.md](pipeline.md) §3–§7. Visual page: [previews/enemy-keys.html](previews/enemy-keys.html).
>
> **No names appear here, or anywhere in git.** An enemy is an opaque numeric id; her name, franchise and tier are in
> master data's private `enemies` set, read at run time. Enemy art derives from original characters, so it's private
> like an Uma's: authored in `content/authoring/enemies/`, published only to master data's private release.

## The short answer

- **Three tiers** (EN1): a **Regular** draws `battle`; a **Key** enemy `battle` and `action`; a **Boss** `battle`,
  `attack`, `skill` and `break`. Each may add one optional pose: `break` for a Regular or a Key, `phase` for a Boss.
- **A key pose is one still**, not an animation: the game times every motion in code from the fight's cues (a
  breathe-bob, a lunge, a recoil, a sink). A Boss's battle pose also comes apart in **3–5 layers** that drift on their
  pivots.
- **One canvas per tier:** Regular 512 × 768, Key 640 × 768, Boss 768 × 768 (up to 1024 × 1024 for wide rigging),
  with a clear border of at least 8 px. Facing **right**, never mirrored; effects are never baked in.
- **The roster** is master data's new optional set `enemies`: every unit on the owner's enemy boards, by a stable id
  from **700001**, with her franchise code, tier and name. The ids live in a private ledger, so a unit keeps hers when
  she moves boards.
- **The art** is the new family `enemy-keys`: one manifest per published enemy (her poses, anchors, layers and display
  targets) and her images as lossless WebP, listed in the art index's `enemyKeys` map. Both arrive in **uma-data
  1.6.0**, a minor: older clients skip them.
- **The tools:** `pnpm enemies:pack` builds both into the local release; `pnpm release:publish -- --enemies-only`
  publishes them on top of `latest` to the candidate channel, carrying every other file byte for byte; `--promote`
  moves `latest`; `pnpm release:check` reads them back like a game.

## 1. What an enemy key is

An **enemy key** is one enemy's art at one revision: a still for each of her tier's poses, all on her tier's canvas,
with each pose's anchors, a Boss's battle layers and her display targets. It's keyed by her enemy id. A newer revision
is a new key in a newer release; a published one never changes.

The tier on a key is the one **her art was drawn to**. The `enemies` set's tier is where the boards cast her when the
set was generated (§8); the two agree when the art is drawn, and the key's own tier is what a game draws by.

## 2. Tiers and poses

| Tier | Required poses | Optional | Who she is in a fight (EN1, EN9) |
|---|---|---|---|
| `regular` | `battle` | `break` | A random fight's foe, up to three on the field; her role in the pool (guard, skirmisher, caster) sets her stats |
| `key` | `battle`, `action` | `break` | She escorts a boss and leads a regular group; a sub-boss or a captain |
| `boss` | `battle`, `attack`, `skill`, `break` | `phase` | A dungeon's resident: the big right-facing image, with her two Keys before her |

- **`battle`** is her stance, held through the fight. A game breathes it (a slow bob), or for a Boss drifts her layers.
- **`action`** (a Key) and **`attack`** / **`skill`** (a Boss) are what she swaps to for an attack or a cast, with a
  lunge or a pull-back in code. A Regular attacks from her battle pose.
- **`break`** is her staggered pose when her guard breaks; without one the game tints and shakes her battle pose.
- **`phase`** is a Boss's second-phase stance, when her fight has one.

A key has exactly its tier's required poses and any of its optional ones, and nothing else: an unknown pose name is
an error.

## 3. The canvas

| Tier | Canvas | Figure at display (EN3) | Envelope |
|---|---|---|---|
| Regular | 512 × 768 | 112 px | — |
| Key | 640 × 768 | about 140 px | — |
| Boss | 768 × 768, up to 1024 × 1024 | about 180 px | up to 300 px |

- **Every pose of an enemy is on the same canvas,** her tier's. A Boss may widen hers, keeping at least 768 × 768 and at
  most 1024 × 1024 (a sweeping cape, wings, a long weapon); all her poses and layers then share the wider size.
- **A clear border of at least 8 px** on every side: no pixel with any alpha within 8 px of an edge.
- **Facing right**, toward the party on the right of the stage, drawn that way. Never mirrored: a mirrored figure moves
  her parting, her weapon hand and her insignia.
- **No effects baked in:** no glow, aura, flash, slash or particles. The game draws those at her anchors, so they can be
  timed, coloured by element and turned down with reduced motion.
- **Full colour, clean antialiased edges.** Masters are PNG; the release is lossless WebP.

**Display targets** are in each key's manifest (`display: { figure, envelope? }`), in pixels at uma-quest's 844 × 390
reference stage: the figure's height from her foot to the top of her head, and for a Boss the envelope, the height her
widest pose and layers may reach. The parser holds the figure to at most 300 and the envelope between the figure and
300. A game scales the canvas so the figure matches its target (with linear filtering and mipmaps, EN4).

## 4. Anchors

Each pose carries its own anchors, in canvas pixels from the top left:

| Anchor | Required | What it's for |
|---|---|---|
| `foot` | one of `foot` or `hover` | Where she stands: the point the game puts on the ground line |
| `hover` | | For a floating figure instead of `foot`: the point the game holds above the ground, bobbing |
| `hit` | yes | Where hits land: the flash, the damage number, the recoil's centre |
| `face` | yes | Her face: a bubble, a status icon, the camera's focus in a boss scene |
| `cast` | where she casts from | The hand, staff or focus a cast leaves from (`release` bursts here) |
| `muzzle` | where she shoots from | The barrel a shot leaves from |

Every anchor lies on the canvas. A pose has `foot` or `hover`, never both and never neither.

## 5. A Boss's layers

A Boss's **battle pose also comes as 3–5 layers**, back to front, each the full canvas, so her idle can drift: the cape
sways, the front arm breathes, the rear wing lifts. They're named from this list, in this order where used:

| Layer | Holds |
|---|---|
| `rear` | What sits behind her whole figure: a cape's far side, wings, a rear weapon or rigging |
| `behind` | What sits behind her body but in front of `rear`: a far arm, hair behind the shoulders |
| `body` | Her body, head and costume |
| `front` | What crosses in front of her body: a near arm, a weapon held across, a cape's near side |
| `over` | One more if needed: what overlaps all of the above (a shield, a sleeve, a ribbon) |

- **They re-composite exactly to the battle pose:** the layers composited source-over, back to front, give the battle
  image (§6, check 4). A layer may hold pixels the whole pose hides, so it can move without opening a gap.
- **Each layer has a `pivot`:** the point it turns or sways about (a shoulder, the cape's clasp, the waist).
- **Layers are only on a Boss's battle pose.** Her other poses are single stills; the game swaps to them whole.

## 6. Checks

Three tools apply the same checks, from `scripts/data/src/enemy-images.ts`:

| # | Check | `enemies:pack` (masters) | `release:check` (release) | Part B's script |
|---|---|---|---|---|
| 1 | Every pose and layer is the tier's canvas size (or a Boss's widened one) | ✓ | ✓ | ✓ |
| 2 | A clear border of at least 8 px | ✓ | ✓ | ✓ |
| 3 | The tier's poses, anchors on the canvas, `foot` or `hover`, layers only on a Boss's battle pose, 3–5 of them, uniquely named, pivots on the canvas | ✓ (the parser) | ✓ (the parser) | ✓ |
| 4 | A Boss's layers re-composite to her battle pose | ✓ | ✓ (decoded WebPs) | ✓ |
| 5 | The lossless WebP decodes to the master's pixels | ✓ | | |
| 6 | Alpha bounds against the display targets; anchors inside the figure | | | ✓ |
| 7 | Every image is a WebP, listed in the manifest, and its hash matches | | ✓ (the client) | |

**"Re-composite exactly"** means to 8-bit rounding: composite the layers source-over, back to front, in straight
alpha, round to 8 bits, and compare with the battle pose. Each pixel's **alpha** must be within **1** level and its
**colour weighted by alpha** within **1.5** levels of 255 (so a fully clear pixel's colour never counts, and a nearly
clear one counts little). `recomposites(layers, pose)` is the reference; a layer moved by one pixel fails it.

Check 6, the alpha bounds and where the anchors sit, is one of Part B's authoring checks (Q16 part B; Q39 keeps the script):
it needs the drawn figure, so it belongs to drawing, not to packing.

## 7. Masters, reviews and the pack

```text
content/authoring/                              durable, gitignored, backed up (pnpm sprites:backup)
  tiers/
    plan.json                                   the owner's tier boards (the Ranker writes it)
    enemy-ids.json                              the id ledger (enemies:pack writes it; §8)
  enemies/
    assets/  imports/  catalog.json             the units' imported faces, figures and splashes (TA4)
    keys/
      reviews.json                              the owner's two reviews per revision (below)
      <enemyId>/
        current.json                            { "revision": 1 }: the revision the pack uses
        r<n>/                                   one revision: written once, never changed
          key.json                              the master manifest (below)
          battle.png  attack.png  …             one PNG a pose
          battle-rear.png  battle-body.png  …   a Boss's layers
          sources/  prompts.json  README.md     the authoring record (Part B's, free form)
```

**`key.json`** is the release manifest with files for paths:

```json
{
  "enemyId": 700123, "revision": 1, "tier": "boss",
  "canvas": { "width": 768, "height": 768 },
  "display": { "figure": 180, "envelope": 280 },
  "poses": {
    "battle": {
      "file": "battle.png",
      "anchors": { "foot": { "x": 346, "y": 728 }, "hit": { "x": 346, "y": 383 }, "face": { "x": 350, "y": 196 }, "cast": { "x": 421, "y": 290 } },
      "layers": [
        { "name": "rear", "file": "battle-rear.png", "pivot": { "x": 328, "y": 240 } },
        { "name": "body", "file": "battle-body.png", "pivot": { "x": 346, "y": 728 } },
        { "name": "front", "file": "battle-front.png", "pivot": { "x": 356, "y": 383 } }
      ]
    },
    "attack": { "file": "attack.png", "anchors": { "foot": { "x": 374, "y": 728 }, "hit": { "x": 374, "y": 389 }, "face": { "x": 378, "y": 202 } } }
  }
}
```

**`reviews.json`** records the owner's two reviews (Q16 part B) for each revision, as the Uma sprites' gates do
(CR20): the **key** review (her battle pose at display scale and enlarged) and the **set** review (every pose and the
boss's layers on the 844 × 390 stage mock beside the party). Each records the decision and the hash of every file it
covered, so a changed file voids it:

```json
{ "schemaVersion": 1, "enemies": { "700123": { "r1": {
  "key": { "decision": "approved", "at": "…", "hashes": { "battle.png": "…" } },
  "set": { "decision": "approved", "at": "…", "hashes": { "key.json": "…", "battle.png": "…", "battle-rear.png": "…" } }
} } } }
```

**`pnpm enemies:pack`** packs an enemy when her current revision's **set** review is approved against `key.json` and
every PNG it names as they are now; it prints why it skips any other. It runs checks 1–5, encodes each image lossless,
and writes the roster and the packed keys into the local release (`content/release/`). The same roster and images
always write the same bytes. It prints counts and ids, never a name.

## 8. The roster: the `enemies` set

```json
{ "set": "enemies", "items": [ { "id": 700001, "franchise": "azurlane", "tier": "boss", "name": "…" } ] }
```

- **Every unit on the enemy boards** of the private tier plan, whatever her rank: the seven boss boards
  (`<franchise>-bosses`), Key enemies and Regular enemies. A unit's id never depends on a ranking.
- **Ids are numeric, opaque and stable,** from **700001** up (to 799999), clear of every outfit, card and character id.
  The private ledger `content/authoring/tiers/enemy-ids.json` (`{ schemaVersion, next, ids: { <unit key>: <id> } }`)
  keeps them: a unit keeps her id when she moves boards or ranks; a new unit takes `next`, which only counts up, so an
  id is never reused; a unit who leaves every board keeps her ledger entry (and leaves the set). New units are numbered
  in board order (the boss boards as the plan lists them, then Key enemies, then Regular enemies; each board's ranked
  order, then its unranked), so the first pack is reproducible.
- **Her tier is the board group that casts her** (SS, S or A), cascading as the boards do: a boss board's cast is
  `boss`; else Key enemies' cast is `key`; else `regular`. (A boss board's B, F and unranked flow into Key enemies' pool,
  and Key enemies' into Regular enemies', so every unit ends on some board.)
- **The franchise code** is the boards' own: `azurlane`, `nikke`, `genshin`, `wuwa`, `hsr`, `zzz`, `hi3`, `pgr`; a
  lowercase code of 2–16 characters.
- **Names live only here,** in master data's private release. A game keeps ids in git and reads names at run time (as
  uma-quest's `story/cast.ts` reads outfits'). uma-rpg's frozen roster keeps its own units; its PriConne units stay out.

The first pack (2026-11-12) gave **1006 units: 325 boss, 105 key, 576 regular, from 8 franchises**, ids 700001–701006.

## 9. The release

| What | Where | Parsed by |
|---|---|---|
| The `enemies` set | `files/data/enemies.<hash16>.json`; the manifest's `sets.enemies` | `parseOptionalSet('enemies', …)`, `client.enemies(manifest)` |
| One manifest per published enemy | `files/art/enemy-keys/<enemyId>.<hash16>.json` | `parseEnemyKey`, `client.enemyKey(manifest, art, enemyId)` |
| Her images | `files/art/enemy-keys/<enemyId>-<pose>[-<layer>].<hash16>.webp` | `client.file(manifest, path)` |
| The map | the art index's `enemyKeys: { <enemyId>: <manifest path> }` | `parseArtIndex` |

The release manifest is `EnemyKey`: `{ enemyId, revision, tier, canvas, display, poses }`, each pose
`{ path, width, height, anchors, layers? }` and each layer `{ path, width, height, name, pivot }`.

```ts
import { createReleaseClient } from '@luismlorenzana/uma-data'   // 1.6.0

const { manifest, art } = await client.load()
const enemies = await client.enemies(manifest)               // Enemy[], or null before the set was published
const key = await client.enemyKey(manifest, art!, 700123)    // EnemyKey, or null when she has no published art
const battle = await client.file(manifest, key!.poses.battle!.path)
```

`client.enemyKey` checks the id matches and every image is listed in the manifest; `client.file` checks each image's
length and SHA-256. An id with no key yet, or no `enemies` set at all, is a normal state: the game draws its stand-in.

**Compatibility.** `enemies` is an *optional* set (`OPTIONAL_SET_NAMES`) and `enemyKeys` an optional key: a release
without them parses as before, and uma-data before 1.6.0 reads only the sets and art it knows. The dry run's release was
parsed by every uma-data the games have installed (1.1.0–1.4.0): each skips both. `pnpm data:import`, `pnpm
assets:import` and `pnpm sprites:pack` keep the enemies set and the `enemyKeys` map as they are.

## 10. Publishing

Approving an enemy's set review is the go. From the workspace root, on the owner's machine (`--channel candidate` is
the default for `--enemies-only`):

1. **Pack:** `pnpm enemies:pack`. Check the roster line and each packed key.
2. **Plan:** `pnpm release:publish -- --enemies-only --dry-run`. It builds on `latest`, carries every one of its files
   byte for byte except the art index, and adds the enemies set, the packed keys and a new art index (the old one plus
   `enemyKeys`). Earlier enemy keys stay unless a newer revision replaces them.
3. **Publish to `candidate`:** `pnpm release:publish -- --enemies-only`. `latest` doesn't move.
4. **Read it back:** `pnpm release:check -- --channel candidate --against latest`. It must end with `Check passed`: every
   file present, the enemies counted by tier, each enemy key loaded, every image decoded at its canvas inside the
   border, each Boss's layers re-composited, every file of `latest` carried byte for byte, the sets changed only by
   `enemies` and the art index only by `sprites` and `enemyKeys`, and no enemy key of `latest` gone.
5. **Move `latest`:** `pnpm release:publish -- --promote <version>`, then `pnpm release:check -- --channel latest`.
6. **Log it:** a P-decision, and the packet's row in uma-quest.

**Undo:** `pnpm release:publish -- --rollback <version>`. Nothing is ever deleted.

**A dry run that publishes nothing** (how Q16 part A proved the path, and how Q39 can rehearse one):

```bash
pnpm enemies:pack -- --fixture
pnpm release:publish -- --enemies-only --local <folder> --channel dry-run
pnpm release:check -- --local <folder> --channel dry-run --against latest
pnpm enemies:pack
```

- `--fixture` adds the **test enemy**, id **799999** (the top of the range, which the ledger never reaches): a Boss drawn
  in code from abstract shapes (`scripts/data/src/enemy-fixture.ts`), packed through the same approval and checks.
- `--local <folder>` writes the release into a folder in the bucket's layout (`channels/`, `manifests/`, `files/`),
  over the real bucket, which is **only read**; `release:check -- --local` reads the folder first, then the bucket.
- The last pack, without `--fixture`, leaves the local release with the roster only.

**Q16 part A's dry run (2026-11-12):** on `latest` `60cdac99d8ae`, the plan `069b6dafef9a` carried all 3456 files
byte for byte and added 10 (the set, a new art index, the test boss's 4 poses, 3 layers and manifest; 476 KB);
`release:check` passed (1007 enemies with the test boss, her layers re-composited exactly, the sets changed only by
`enemies`); the bucket gained nothing.

## 11. Calls

| Id | Call |
|---|---|
| EK1 | Three tiers and their poses: Regular `battle` (+`break`), Key `battle`, `action` (+`break`), Boss `battle`, `attack`, `skill`, `break` (+`phase`); nothing else |
| EK2 | One canvas per tier, shared by all of an enemy's poses: 512 × 768, 640 × 768, 768 × 768 (a Boss up to 1024 × 1024); a clear 8 px border |
| EK3 | Facing right, drawn that way, never mirrored; effects never baked in; full colour, clean antialiasing |
| EK4 | A Boss's battle pose in 3–5 layers, back to front, from `rear`, `behind`, `body`, `front`, `over`, each with a pivot, re-compositing to the pose to 8-bit rounding (alpha ±1, alpha-weighted colour ±1.5) |
| EK5 | Anchors per pose: `foot` or `hover`, `hit`, `face`, and `cast` or `muzzle` where she attacks from; all on the canvas |
| EK6 | Display targets in each key: figure 112 / ~140 / ~180, a Boss's envelope up to 300, at 844 × 390 |
| EK7 | Masters are PNG in `content/authoring/enemies/keys/<id>/r<n>/`; the release is lossless WebP, checked to decode to the master's pixels |
| EK8 | Two owner reviews per revision (key, set) with file hashes; the set approval is the go to pack and publish |
| EK9 | The `enemies` set: every unit on the enemy boards, numeric opaque stable ids from 700001 in a private ledger, never reused |
| EK10 | A unit's tier is the board group that casts her, cascading boss → Key enemies → Regular enemies; a key's own tier is the one it was drawn to |
| EK11 | The `enemy-keys` family: one manifest an enemy and her images under `art/enemy-keys/`, listed in the art index's `enemyKeys` map |
| EK12 | Both are additive in uma-data 1.6.0 (an optional set, an optional index key); older clients skip them |
| EK13 | `pnpm enemies:pack`; `pnpm release:publish -- --enemies-only` (candidate by default) carries every other file of `latest` byte for byte; `--promote`; `release:check` reads them back |
| EK14 | A dry run publishes into a local folder over the read-only bucket (`--local`), with the code-drawn test boss 799999 (`--fixture`) |
| EK15 | No name, image or ranking of an enemy in git; a test keeps the boards' names out of the tools, uma-data and these docs |
