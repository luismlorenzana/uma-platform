# UA11 — Art: a townsfolk batch of ten (the template for T2–T8)

**uma-platform's private `content/authoring/sprites/` and the master-data release · ChatGPT · M · Needs: UA10's set gate
and UA2 (and UA5, to publish) · Unblocks: uma-quest's towns (CM12, CM22)**

## Why

uma-quest's towns are peopled by the 70 characters with no selected outfit: the townsfolk (CM12). They never fight or
explore, so their profile is about a third of a traveler's. They stand, walk in four facings and emote when they speak:
45 frames, with no fight, run or `weary` frames ([format.md](../../sprites/format.md) §7.5).

P93 draws them **ahead, in batches of ten**, so a town can cast from a ready pool instead of waiting on art. UA10's
pilot is batch T1; this packet draws the next.

**This packet is the template.** For each batch, copy it as the next free UA id, put in that batch's ten, and change
nothing else unless a measured number says to.

## Context (read first)

- [format.md](../../sprites/format.md) §3, §5, §7.2, §7.4, §7.5, §8 and §11.
- [pipeline.md](../../sprites/pipeline.md) §4, §5 and §7.
- UA10's three revisions and README. Their drawing, timing and measured minutes are this batch's baseline.
- Each outfit's master-data portrait, bust and chibis.
- UA2's tools and prompt templates.

## Decisions made

- **The batches (P93):** ten each, in CR25's order: tier B before F, then roster order. At roster revision 335 they
  are:

  | Batch | Outfits | Tier |
  |---|---|---|
  | T1 (UA10) | 103301, 112001, 109801 | B |
  | **T2 (this packet)** | 103801, 111201, 111901, 104001, 109901, 106301, 110401, 113201, 102401, 110301 | B |
  | T3 | 108001, 107301, 104701, 110701, 107901, 111301, 107801, 101501, 100201, 106401 | B |
  | T4 | 101103, 109501, 110901, 109201, 104503 (B); 101901, 103201, 105301, 105401, 102301 (F) | B, F |
  | T5 | 108901, 101401, 112701, 113101, 105201, 102801, 101201, 103401, 103901, 105501 | F |
  | T6 | 105601, 106201, 105801, 102701, 104901, 106001, 105101, 109601, 103001, 104201 | F |
  | T7 | 104301, 110201, 100101, 113501, 109701, 104401, 108301, 102101, 100301, 104801 | F |
  | T8 | 106601, 109101, 100801, 103501, 110001, 107201, 102901 | F |

  If the roster changes, `sprites:progress` recomputes the order. Approved sets stay approved.
- **Profile `townsfolk`, 45 frames:**
  - the key, a battle-facing still;
  - `turnaround`;
  - the battle `walk`, plus `walk-front`, `walk-back` and `walk-right`;
  - the six emotes;
  - both blink patches.
- **Two reviews a batch:**
  1. one key review, with the ten identity sheets on one page;
  2. one set review.

  Each decision goes in `reviews.json` per outfit, tied to file hashes, as for travelers.
- **The checks are format.md §11's,** wherever the profile has the frames. The face lock and check 11 run on the
  battle-facing walk against the key; check 13 compares each field walk with its turnaround still.
- **The rendering reference** is batch 1's approved sets and UA10's.
- **Order with travelers (P93):** a townsfolk batch follows each traveler batch, unless the Studio's queue says
  otherwise.
- **Changes at a review** make a new revision. They never edit the old one.
- **Publish after the set review**, sprite-only, by "Publishing a batch" in pipeline.md §7.
  - A townsfolk batch may share a release with a traveler batch.
  - If your session can't reach the scoped gcloud, hand the publish to Claude.

## Do

1. Draw the ten identity sheets. Ask for the key review in one line, with the Studio link.
2. After approval, draw the 45 frames for each. Export, verify and repeat.
3. Ask for the set review in one line. Apply any changes as new revisions.
4. Publish, and read the release back.

## Done when

- Ten more townsfolk sets are published, with every applicable check passing. The client's `spriteSet` returns each
  one.
- `progress.json` counts townsfolk on their own, out of 70.
- The README records calls, rejections and minutes per set, compared with pipeline.md §9's ~3 minutes of waits.

## Deliver

Delete this packet (or its copy) and move it to Done in [the handoff](../README.md), with the release version. Back up
`content/authoring/`. Tell uma-quest in its handoff that the batch is live. If the measured minutes differ from §9's
estimate by more than half, update §9.
