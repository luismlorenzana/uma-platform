# UA10 — Art: the townsfolk profile on three characters

**uma-platform's private `content/authoring/sprites/` · ChatGPT · S · Needs: UA7 (the field set and emotes proven) ·
Unblocks: uma-quest's Q12 (the slice's town)**

## Why

uma-quest's towns have townsfolk walking and speaking in scenes (CM12, CM22). They're the 70 characters with no
selected outfit, and each needs only about a third of a traveler's frames. This pilot draws the townsfolk profile on
three of them, enough for the slice's one town, and measures it ([format.md](../../sprites/format.md) §7.5, CR25).

## Context (read first)

- [format.md](../../sprites/format.md) §3, §5, §7.2, §7.4, §7.5, §8 and §11; [pipeline.md](../../sprites/pipeline.md)
  §5.
- UA7's revisions: their field set and emotes are the reference for drawing and timing.
- Each townsfolk outfit's master-data portrait, bust and chibis.

> **Changed on 2026-11-08 (P105): `walk-left` replaces the battle `walk`.** The three r2 revisions already hold a battle
> `walk`. Before verifying, replace it with `walk-left`: 6 frames at 110 ms, looping, drawn to match the left turnaround
> still the way `walk-right` matches the right one, with faces as drawn and `hold: back`. Add `walk-left` to the export
> config's `facingScales`. Check 1 now fails a townsfolk set without `walk-left`, and check 13 holds it to the left
> still. The profile stays at 45 frames. The reason: the owner played uma-quest's test room and found the battle walk
> wrong for walking left (format.md §3, §7.5).

## Decisions made

- **Batch T1 (P93):** these three are the first townsfolk batch; UA11's template draws T2–T8.
- **The three, chosen by the owner on 2026-11-08 (P104): 101401, 100103 and 109701**, all tier F.
  This overrides T1's default tier/roster picks. The middle choice uses a different outfit of its character. Queue order
  and optional `townsfolkOutfits` choices preserve roster rankings; all three remain in the 70 unselected characters.
- **Current step (2026-11-08, P106):** identities approved; all three r4 full profiles are verified and await the set gate. Each has 45 body frames, 2 blink patches and 12 actions, including the corrected independently drawn left-profile walk. [Compare directions](http://127.0.0.1:4318/field/?profile=townsfolk&batch=1#directions), [review sets](http://127.0.0.1:4318/gates?profile=townsfolk&batch=1). No new release yet.
- **The townsfolk profile, 45 frames each:**
  - the key, a battle-facing still;
  - `turnaround`;
  - `walk-front`, `walk-back`, `walk-right` and `walk-left` (P105: `walk-left` replaced the battle `walk`);
  - the six emotes;
  - both blink patches.

  There are no fight, run or `weary` frames.
- **The same gates as a traveler:** the key gate for each, then one set gate for the three.
- **Profile `townsfolk`** in each atlas.
- **The rendering reference** is batch 1, as for travelers.

## Do

1. Draw the three identity sheets, then stop for the key gate.
2. Draw, export and verify the three sets, and add them to the Studio's scene preview beside a traveler.
3. Stop for the set gate, then publish by UA5's steps.

## Done when

- Three townsfolk sets pass every applicable check and are approved at the set review.
- They're published with UA5's first release if they're approved by then, and with the next release otherwise.
- The README records minutes per townsfolk set, compared with pipeline.md §9's ~3 minutes of waits.

## Deliver

Delete this packet and move it to Done in [the handoff](../README.md), with the release. Back up `content/authoring/`.
Tell uma-quest that Q12 can cast the three.

## Pilot measurements

All 14 checks pass, with 48 runtime files per outfit reproduced byte for byte. The approved identity stills and identity checklists are unchanged; key receipts carry their original covered hashes. Earlier r1–r3 remain available. Scene preview pairs each NPC with a key-approved traveler.

Measured built-in generation duration across identities, profile drawing and the left-walk corrections: 101401, 8 calls / 11.83 minutes; 100103, 8 / 18.71; 109701, 7 / 21.43. These are summed tool durations including retries and overlapping queued calls, not active editing or elapsed wall-clock. The pilot is slower than pipeline.md §9’s estimated ~3 minutes. Private per-revision READMEs, prompts, masters and export recipes retain the evidence.
