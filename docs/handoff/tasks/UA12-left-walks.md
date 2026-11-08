# UA12 — Art: batch 1's left field walks

**uma-platform's private `content/authoring/sprites/` · ChatGPT · S · Needs: UA7 ✓ (batch 1's field set), P105 ·
Unblocks: uma-quest's left walk (its D17)**

## Why

The owner played uma-quest's test room on 2026-11-08 and found the Umas walking left looked wrong. They walk left in the
battle `walk`, the three-quarter fight stance, while every other facing has its own field walk. P105 adds `walk-left`
and `run-left` to the traveler profile (118 → 130 frames). Batch 1's five need them as new revisions.

uma-quest is ready: from its commit e34792c it plays a set's `walk-left` and `run-left` when the set has them and stands
it on the left turnaround still. Until then it falls back to the battle walk, so nothing breaks in between.

## Context (read first)

- [format.md](../../sprites/format.md) §3 (the field's left facing), §7.2 (the field set, now 48 frames), §11 (checks 1,
  12 and 13) and CR4 and CR10.
- [pipeline.md](../../sprites/pipeline.md) §4 (revisions and gates) and §7 ("Publishing a batch").
- The five current revisions, all published in release `4757517816a0`: 106801 r4, 106701 r2, 112901 r4, 111501 r3 and
  113401 r2. In each one, `walk-right` and `run-right` are the reference for drawing and timing, and the left
  turnaround still is the reference for the pose.

## Decisions made

- **Two actions a traveler, 12 frames:**

  | Action | Frames | Times | Plays | Face | Held |
  |---|---|---|---|---|---|
  | `walk-left` | 6 | 110 each | Loop | Drawn | `back` |
  | `run-left` | 6 | 75 each | Loop | Drawn | `back` |

  Contact frames land on row 240, and run flight phases are `air`, as in the other facings.
- **Drawn, never mirrored (CR4, uma-quest DN25).** Match the left turnaround still: ornaments, parts and the bow stay on
  their own side, by the identity sheet's checklist. A flipped `walk-right` isn't allowed.
- **A new revision for each outfit** (r5, r3, r5, r4 and r3). Every other file carries over byte for byte, and check 12
  proves the approved frames are unchanged.
- **No key gate.** The key and the turnaround are approved and don't change (check 5). One **set gate** for the five
  covers the new revisions.
- **The export config** gains `facingScales` for `walk-left` and `run-left`. Check 13 holds both to the left still's
  standing height and to one scale across the cycle.
- **Publish sprite-only** after the set gate. If UA10's three townsfolk are approved by then, put them in the same
  release.
- **Order:** UA12 is ready now and comes before UA9. It can run while UA10 waits for the owner. UA9 draws batch 2 at
  130 frames from the start.

## Do

1. For each of the five, draw `walk-left` and `run-left` in a new revision to match the left turnaround still. Export,
   verify (all 14 checks) and repeat.
2. Show them in the Studio's animation desk and scene preview, walking in all four field facings.
3. Ask the owner for the set gate in one line, with the Studio link. Apply any changes as new revisions.
4. Publish by pipeline.md §7: `sprites:pack`, then `release:publish -- --sprites-only --channel candidate`, then
   `release:check -- --channel candidate --against latest`, then `--promote`. If your session can't reach the scoped
   gcloud, hand the publish to Claude.
5. Back up `content/authoring/` (`pnpm sprites:backup`).

## Done when

- Five new revisions, 130 frames and 7 patches each, pass all 14 checks and are approved at the set gate.
- `latest` holds them. `release:check` passes with no "drawn to the catalog before P105" notes, and every other release
  file is carried byte for byte.
- The Studio's progress shows the five as fully authored again.

## Deliver

Delete this packet and move it to Done in [the handoff](../README.md), with the release. Tell uma-quest's session that
batch 1 walks left in its own facing. It needs no pin, since it reads master data's `latest`.

## Current step — 2026-11-08 (P106)

The five new revisions are authored: 106801 r5, 106701 r3, 112901 r5, 111501 r4 and 113401 r3. Each has 130 frames / 7 patches / 29 actions and passes all 14 checks; 139 runtime files per set repeat exactly. All 630 prior PNGs and all 27 existing actions per traveler are unchanged. Nine built-in imagegen calls, 2,329.872 summed seconds, include four targeted accessory-side corrections; no art was mirrored.

[Direction comparison](http://127.0.0.1:4318/field/?profile=traveler&batch=1#directions) supports shared timing, frame stepping and 2× inspection. [Set gate](http://127.0.0.1:4318/gates?profile=traveler&batch=1) is pending. All existing key receipts remain valid by hash. Publish remains after the owner’s set approval; `latest` still contains the pre-P105 release `4757517816a0`.
