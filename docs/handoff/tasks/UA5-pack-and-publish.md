# UA5 — Pack and publish: batch 1 in the release

**uma-platform, the private master-data bucket · Claude · M · Needs: UA2, UA4, and the owner's set approval of batch 1 ·
Unblocks: uma-quest's Q6, and every later batch's publish**

## Why

No game can draw a set until it's in a release. This packet builds the `outfit-sprites` family from approved revisions
and publishes batch 1. It changes nothing else in the release, and it writes the steps down so ChatGPT can publish later
batches itself ([pipeline.md](../../sprites/pipeline.md) §7, CR21, CR27 and CR29).

## Context (read first)

- [format.md](../../sprites/format.md) §13; [pipeline.md](../../sprites/pipeline.md) §7 and §10.
- [new-umas.md](../../new-umas.md): the publish steps, `--channel candidate`, `--dry-run` and `--rollback`.
- `scripts/data`'s publish, and UA4's types and client.
- UA2's tools, and `content/authoring/sprites/reviews.json`.
- [architecture.md](../../architecture.md) §2.2 and §6. Every gcloud command is scoped with
  `CLOUDSDK_ACTIVE_CONFIG_NAME=default CLOUDSDK_CORE_PROJECT=uma-platform-lm`, and never uses `gcloud config set`.

## Decisions made

- **`pnpm sprites:pack`** reads each outfit's current revision. It skips any outfit whose set gate isn't approved, or
  whose files no longer match the approved hashes, and says why. Then it:
  1. trims each frame to its `bounds`;
  2. packs frames into WebP pages of at most 4096 px a side, with 2 px of padding;
  3. writes each sprite set file, with page rectangles and trim offsets.

  The output goes to `content/release/` like the other families. It's deterministic: a second pack gives the same bytes.
- **The encoding is chosen from batch 1's numbers.** Build both lossless WebP and lossy WebP at quality 90 with alpha
  quality 100.
  - Use lossless if a traveler's battle set is at most 3 MB.
  - Otherwise, use lossy, after a side-by-side at 1× and 2× in the Studio.

  Record the numbers and the choice in format.md §13.
- **`pnpm release:publish -- --sprites-only`:**
  1. download and verify the latest published manifest;
  2. carry every one of its files byte for byte;
  3. add the sprite files and a new art index (the old one plus `sprites`);
  4. write the new manifest.

  It runs `--channel candidate` first, then reads the candidate back with the release client, then moves `latest`. A
  GameTora refresh is never mixed in.
- **The go:** the owner's set approval of batch 1 is the go to publish it (CR21). Say in one line what moves before
  moving `latest`.
- **The steps stay written** in a "Publishing a batch" section of pipeline.md §7, with the commands. Later batches
  follow them, and ChatGPT runs them when its session can reach the scoped gcloud.

## Do

1. Build `sprites:pack` and `--sprites-only`, with tests on a memory release, by UA4's helpers. The tests check:
   - the old files carried byte for byte;
   - an unapproved outfit skipped;
   - a changed hash skipped.
2. Pack batch 1, measure both encodings, choose one, and record it.
3. Publish to `candidate`, read it back and check it: every file's hash, five sets, and every page loading.
4. Move `latest`. Read it back.
5. Check that uma-rpg is unaffected: its `/api/health` answers, and its content still loads (busts and faces).
6. Write "Publishing a batch" in pipeline.md §7.

## Done when

- `latest` holds batch 1's five sets, and the client's `spriteSet` returns each one with all 27 entries.
- It also holds UA10's three townsfolk sets if the owner approved them before the publish (P93).
- The release's other files match the previous release byte for byte.
- uma-rpg's site and API behave as before.
- The encoding numbers are recorded, and pipeline.md has the steps.

## Deliver

Commit to `main`, `feat(sprites): …`. Log a P-decision with the release version and the encoding numbers (from P94,
after fetching `main`). Delete this packet and move UA5 to Done in [the handoff](../README.md) with the release version.
Tell uma-quest in its handoff that Q6 can load batch 1 from master data.
