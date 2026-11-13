# UA14 — Art: townsfolk batch T3, ten Uma NPCs

**uma-platform's private `content/authoring/sprites/` and the master-data release · ChatGPT · M · Needs: UA10's set gate
and UA2 (and UA5, to publish) · Unblocks: uma-quest's towns (CM12, CM22)**

## Why

uma-quest's towns are peopled by the Umas with no outfit on Playable Umas: the townsfolk (CM12), the Ranker's Uma
NPCs (60 since P131). They never fight or explore, so their profile is about a third of a traveler's. They stand, walk
in four facings and emote when they speak: 45 frames, with no fight, run or `weary` frames
([format.md](../../sprites/format.md) §7.5).

P93 draws them **ahead, in batches of ten**, so a town can cast from a ready pool instead of waiting on art. UA10's
pilot is batch T1; this packet draws T3.

**This is [UA11](UA11-townsfolk-batch.md)'s template for batch T3** (P153). uma-quest's Q23 casts band 1's five towns
from T2 and T3, four a town in this order, on code-drawn stand-ins until the sets are in `latest`. It's ChatGPT's next
character packet after Q16 part B, after UA13 (T2). **Draw these ten:** 110701, 104401, 103401, 101201, 103901, 113201, 105501, 105601, 106201, 105801.

## Context (read first)

- [format.md](../../sprites/format.md) §3, §5, §7.2, §7.4, §7.5, §8 and §11.
- [pipeline.md](../../sprites/pipeline.md) §4, §5 and §7.
- UA10's three revisions and README. Their drawing, timing and measured minutes are this batch's baseline.
- Each outfit's master-data portrait, bust and chibis.
- UA2's tools and prompt templates.

## Decisions made

- **The batches (P93, ordered by P153):** ten each, in the order of the Ranker's **Uma NPCs** board (TA2's rule):
  its tiers SSS to F, then its unranked, each Uma in her default outfit, skipping an Uma already drawn. Uma NPCs is
  every Uma none of whose outfits is on Playable Umas, so it's 60 since the Playable Umas reset (P123, P131), not
  P93's 70. At the plan of 2026-11-12 they are:

  | Batch | Outfits | Uma NPCs tiers | Packet |
  |---|---|---|---|
  | T1 | 100103, 101401, 109701 | SS | UA10, published (`7c34dbe2c8de`) |
  | T2 | 113501, 106301, 106001, 104701, 102301, 103301, 108001, 110201, 107201, 102401 | SS, S, A | [UA13](UA13-townsfolk-t2.md) |
  | **T3 (this packet)** | 110701, 104401, 103401, 101201, 103901, 113201, 105501, 105601, 106201, 105801 | A, F | [UA14](UA14-townsfolk-t3.md) |
  | T4 | 102701, 104901, 105101, 109601, 103001, 104201, 104301, 108301, 102101, 100301 | F | |
  | T5 | 104801, 107301, 106601, 109101, 100801, 103501, 110001, 102901, 101901, 105301 | F | |
  | T6 | 105401, 108901, 109801, 100903, 112701, 100503, 113101, 101103, 105201, 102801 | F | |
  | T7 | 112001, 110401, 108501, 103703, 106102, 105902, 104103 | F, unranked | |

  If the owner re-ranks Uma NPCs, or an Uma moves between the two Uma boards, the batches not yet started follow the
  board. The Studio's queue still reads the frozen outfit roster until TA2, so a batch packet's list is the one to
  draw. Approved sets stay approved: T1's 100103 stays her set although her default outfit is 100101.
- **Profile `townsfolk`, 45 frames:**
  - the key, a battle-facing still;
  - `turnaround`;
  - `walk-front`, `walk-back`, `walk-right` and `walk-left` (P105: `walk-left`, drawn as the left turnaround still,
    replaced the battle `walk`);
  - the six emotes;
  - both blink patches.
- **Two reviews a batch:**
  1. one key review, with the ten identity sheets on one page;
  2. one set review.

  Each decision goes in `reviews.json` per outfit, tied to file hashes, as for travelers.
- **The checks are format.md §11's,** wherever the profile has the frames. The face lock and check 11 run on the
  key; check 13 compares each field walk, left included, with its turnaround still.
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
- `progress.json` counts townsfolk on their own, out of 60.
- The README records calls, rejections and minutes per set, compared with pipeline.md §9's ~3 minutes of waits.

## Deliver

Delete this packet and move it to Done in [the handoff](../README.md), with the release version. Back up
`content/authoring/`. Tell uma-quest in its handoff that the batch is live. If the measured minutes differ from §9's
estimate by more than half, update §9.
