# UA9 — Art: batch 2 in the full traveler profile (the template for batches 3–20)

**uma-platform's private `content/authoring/sprites/` and the master-data release · ChatGPT · L · Needs: UA2, UA3 and
UA7 (and UA5, to publish) · Unblocks: uma-quest's wave 2**

## Why

Batch 1 proves the method and the profile. From batch 2, every batch is drawn to the whole traveler profile at once and
goes through both gates. It's published as soon as the owner approves it, and it becomes uma-quest's next wave
([pipeline.md](../../sprites/pipeline.md) §4 and §5, CR24).

**This packet is the template.** For batch N, copy it as the next free UA id, put in the Studio's next five, and
change nothing else unless a measured number says to.

## Context (read first)

- [format.md](../../sprites/format.md) and [pipeline.md](../../sprites/pipeline.md), all of both.
- Batch 1's revisions and READMEs: their findings and measured waits are the baseline.
- The Studio's queue (UA3): its next batch, and any owner overrides in `queue.json`.
- UA2's prompt templates.

## Decisions made

- **Batch 2 by pipeline.md §5's rule**, unless the Studio's queue says otherwise:

  | Way | Outfit |
  |---|---|
  | Warrior | 108701 |
  | Spellblade | 113301 |
  | Mage | 111001 |
  | Healer | 111801 |
  | Summoner | 111401 |

- **The rendering reference** is batch 1's approved sets: their face definition, their proportions and their lighting.
  Each prompt includes batch 1's key frames as the style reference, beside the outfit's own master-data art.
- **Order, for each outfit:**
  1. the identity sheet;
  2. **stop for the key gate**;
  3. every master;
  4. export, verify and repeat.

  When all five are verified, **stop for the set gate**.
- **Changes at a gate** make a new revision. They never edit the old one.
- **Publish after the set gate** by UA5's steps ("Publishing a batch" in pipeline.md §7), with `--sprites-only`. If
  your session can't reach the scoped gcloud, hand the publish to Claude.

## Do

1. Draw the five identity sheets, and ask for the key gate in one line, with the Studio link.
2. After approval, draw the full profile for each: 130 frames and 7 patches, `walk-left` and `run-left` included (P105).
   Export, verify and repeat.
3. Ask for the set gate in one line. Apply any changes as new revisions.
4. Publish, and read the release back.

## Done when

- Five more sets are published with all 14 checks passing; the client's `spriteSet` returns each one.
- `progress.json` shows 10 of 100.
- Each README records generations, rejections, reuse and minutes per Uma, compared with pipeline.md §9's estimate.

## Deliver

Delete this packet and move it to Done in [the handoff](../README.md), with the release version. Back up
`content/authoring/`. Tell uma-quest in its handoff that wave 2's art is live. If the measured minutes differ from
§9's estimate by more than half, update §9.
