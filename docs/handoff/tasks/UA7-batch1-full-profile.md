# UA7 — Art: batch 1's full traveler profile (field set, `weary`, emotes)

**uma-platform's private `content/authoring/sprites/` · ChatGPT draws · M · Needs: UA1 · Unblocks: uma-quest's Q6, Q11
and Q12; UA9; UA10**

## Why

Batch 1's five battle sets are drawn, and the owner likes them. uma-quest also walks its party every way in towns and
dungeons (DN24, DN25), carries HP between fights (DN12), and stages scenes with emotes (CM17). This packet draws the
rest of the traveler profile for the five, so batch 1 becomes uma-quest's complete wave 1. It also proves the profile
before batch 2 is drawn to it whole ([pipeline.md](../../sprites/pipeline.md) §2, CR33).

## Context (read first)

- [format.md](../../sprites/format.md), all of it, in particular:
  - §3 (facings), §5 (faces, including `weary`) and §7.2–§7.4 (the field set, `weary`, the emotes);
  - §8 (identity) and §11 (checks 12 and 13 are new).
- [pipeline.md](../../sprites/pipeline.md) §3 and §4.
- UA1's revisions for 106801, 106701, 112901, 111501 and 113401, and `content/review/sprite-baseline/style-revision-v2/`.
  Version 2's face definition is the bar.
- Each outfit's master-data portrait, bust and chibis, and its approved key and turnaround. The turnaround's front,
  back and right stills are the reference for each new facing.

## Decisions made

- **One new revision for each outfit.** It holds the battle set unchanged, byte for byte (check 12), plus:
  - `walk-front`, `walk-back`, `walk-right`, `run-front`, `run-back` and `run-right`: 36 frames;
  - `weary` (4 frames) and the `weary` patch;
  - `nod`, `surprise`, `laugh`, `sad`, `angry` and `wave`: 16 frames, front facing.

  That's 118 frames and 7 patches.
- **Suggested masters, three for each Uma:**
  1. walking and running, front and back;
  2. walking and running, right;
  3. `weary` with the emotes.

  Split or merge them as the drawing needs, and record each call and its wait in `prompts.json`.
- **Field facings carry no patches** and keep their drawn faces (format.md §5). Contact frames sit on row 240, and run
  flight phases are `air`. Each facing's standing height matches its turnaround still within 4 px (check 13).
- **`weary` is locked**, with the face box exact apart from the patch. Shoulders drop, the breathing slows, and the
  weapon is lowered (`hold: back`).
- **Emotes show no held item.** `surprise` frame 1 is `air`. Bubbles are the game's, from UA8, so draw none.
- **Prompts:** start from UA2's templates if they've landed. Otherwise use batch 1's prompts, with the same identity
  text.
- **The viewer**, in the Studio if UA3 has landed, otherwise beside the batch, gets two previews:
  - **Field:** the five in single file on a plain floor, walking a loop through all four facings, in an 844 × 390
    landscape phone frame at the phone's scale.
  - **Scene:** two Umas facing each other, then one turning to the camera to play each emote.
- **Keys:** if a key gate is still pending, draw against the current key. A key change later is a new revision anyway.
- **Findings** go in each revision's `README.md`:
  - generations and rejections per master;
  - waits;
  - reuse;
  - anything that failed a check, and its fix.

## Do

1. Draw, export and verify the five new revisions. Point each `current.json` at its new revision.
2. Build both previews, and check them at the phone's scale.
3. Ask the owner for the set gate on batch 1 in one line. Their approval covers the battle sets too, which closes uma-rpg's
   H168 (CR30).

## Done when

- Each of the five has a current revision with 118 frames and 7 patches.
- All 14 checks pass, and a repeat export is byte-identical.
- The battle set's frames are unchanged from the earlier revision.
- Both previews play, and `progress.json` shows the five as profile-complete.
- The owner has been asked for the set gate.

## Deliver

Nothing goes in git but the handoff row. Delete this packet and move UA7 to Done in [the handoff](../README.md), with
the revision numbers, the calls and the waits. Back up `content/authoring/` (`pnpm sprites:backup`) if UA6 has landed.
When the owner approves the set:
- record it in `reviews.json` (or in the Studio);
- mark uma-rpg's H168 done there, with a Done row and a one-line commit;
- if UA5 has already published batch 1's battle sets, publish the new revisions by its steps.
