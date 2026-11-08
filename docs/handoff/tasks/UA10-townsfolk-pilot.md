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

## Decisions made

- **The three, by CR25's rule:** the first three characters without a selected outfit, each in her best-ranked outfit.
  They are **103301, 112001 and 109801**, all tier B.
- **The townsfolk profile, 45 frames each:**
  - the key, a battle-facing still;
  - `turnaround`;
  - the battle `walk`, plus `walk-front`, `walk-back` and `walk-right`;
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

- Three townsfolk sets are published, with all checks passing.
- The README records minutes per townsfolk set, compared with pipeline.md §9's ~3 minutes of waits.

## Deliver

Delete this packet and move it to Done in [the handoff](../README.md), with the release. Back up `content/authoring/`.
Tell uma-quest that Q12 can cast the three.
