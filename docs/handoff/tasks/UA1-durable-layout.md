# UA1 — The durable layout: one folder a revision

**uma-platform's private `content/authoring/` · Either (ChatGPT knows these files best) · S · Needs: — · Unblocks:
UA2, UA3, UA7**

## Why

Batch 1's five sets live as two whole packs (`uma-sprites/` v1 and `uma-sprites-v2/`), with a pack-level pointer.
Approvals are prose and flags, and nothing is tied to a file hash. A hundred outfits will progress on their own, so each
needs its own immutable revisions and a recorded owner decision ([pipeline.md](../../sprites/pipeline.md) §3 and §4,
CR20 and CR22). This packet moves what exists into that layout **without changing a byte of art**.

## Context (read first)

- [pipeline.md](../../sprites/pipeline.md) §3 (the layout) and §4 (gates and revisions); [format.md](../../sprites/format.md)
  §8 (the identity sheet) and §12 (the atlas).
- `content/authoring/README.md`, `uma-sprites-current.json`, `uma-sprites/manifest.json`,
  `uma-sprites-v2/manifest.json` and `README.md`, and `uma-sprite-progress.json`.
- `content/review/sprite-baseline/`:
  - `refinement/owner-approval.json` (the 2026-11-06 key approval) and `refinement/identity-*.md`;
  - `roster-batch/README.md`;
  - `style-revision-v2/README.md`.

## Decisions made

- **Revisions, per outfit:**
  - `r1` is the v1 pack's files for that outfit;
  - `r2` exists only for 106801 and 112901, which version 2 re-authored;
  - `current.json` points at `r2` for those two and at `r1` for 106701, 111501 and 113401.

  The v2 pack's files for the other three are byte-identical to v1, so they need no new revision.
- **Copy, never move or delete.** Every copied PNG's SHA-256 must equal its pack manifest's entry.
  - The old packs stay as they are, and each pack README gets one line: "Superseded by `content/authoring/sprites/`
    (UA1)".
  - `uma-sprites-current.json` stays, so the current Studio keeps working until UA3.
- **The atlas** of each revision is format.md §12's:
  - add `"revision"` and `"profile": "traveler"`;
  - paths become relative to the revision folder (`frames/…`, `faces/…`);
  - `name` is dropped.

  Frame and face PNGs keep their bytes; only their file names may change to `frames/<action>-<n>.png` and
  `faces/<patch>.png`.
- **`masters/`, `sources/` and `prompts.json`:**
  - split from the pack's shared folders by outfit: each revision keeps the generation masters its frames were cut
    from, and its rejected generations;
  - shared prompts are split by the outfit they serve;
  - shared props go to `content/authoring/sprites/shared/`.
- **`identity.md`:** copy `refinement/identity-106801.md` for 106801 `r1`. Write the missing ones from each outfit's key,
  turnaround and master-data art, following format.md §8. These are the key gate's inputs.
- **`reviews.json`, seeded from the record:**
  - 106801 `r1`: key approved 2026-11-06, with the owner's words from `owner-approval.json` and the hashes of its key and
    turnaround;
  - every other key and every set gate: pending.

  100701 is a study outside the roster (tier F). It stays in `content/review/` and isn't migrated.
- **`reviews.json` shape:**

  ```json
  { "schemaVersion": 1, "outfits": { "106801": { "r1": {
    "key": { "decision": "approved", "at": "2026-11-06", "note": "…", "hashes": { "key.png": "<sha256>" } },
    "set": { "decision": null } } } } }
  ```

  `decision` is `approved`, `changes` or null. `hashes` holds every file the decision covered.
- **`progress.json`** is regenerated from the folders and `reviews.json` by a one-off script in `content/review/ua1/`.
  UA2 makes it a tool. `uma-sprite-progress.json` stays as a compatibility copy until UA3.
- **The roster is untouched.**
- **Batch 1's revisions must pass the existing checks** (`verify.cjs`) from their new folders before the packet is
  done.

## Do

1. Write `content/authoring/sprites/` as above: `<outfitId>/r<n>/…`, `<outfitId>/current.json`, `shared/`,
   `reviews.json`, `progress.json`.
2. Compare hashes: every PNG against its pack manifest.
3. Run the existing checks on each revision from its new folder.
4. Add the "superseded" line to each old pack's README, and a paragraph to `content/authoring/README.md` describing the
   new layout.
5. Record what you did in `content/authoring/sprites/README.md`: the file counts, the hash comparison, and anything
   you couldn't place.

## Done when

- `content/authoring/sprites/` holds the five outfits, each with `current.json` and its revisions.
- Every copied PNG matches its pack's hash, and each revision passes the checks.
- No atlas carries a name, and `reviews.json` and `progress.json` parse.
- The old packs and the roster are unchanged, apart from the README lines.
- `git status` in uma-platform shows nothing from `content/`.

## Deliver

Only the handoff row changes in git. Delete this packet and move UA1's row to Done in
[the handoff](../README.md), with what moved (file counts) and the hash result. No P-decision is needed unless you
changed a call; if you did, log it from P92 (fetch `main` first).
