# UA3 — Sprite Studio in git, with the two gates

**uma-platform · Either · M · Needs: UA1 · Unblocks: UA9 (and the owner's reviews)**

## Why

The owner ranks the roster, follows progress and reviews animations in ChatGPT's local app, which lives in `content/`.
That folder isn't versioned, and nothing records an approval against the files it covered. The pipeline's two owner
gates need one place, recorded and tied to hashes ([pipeline.md](../../sprites/pipeline.md) §4, CR20 and CR21).

## Context (read first)

- [pipeline.md](../../sprites/pipeline.md) §4 and §5; [format.md](../../sprites/format.md) §3–§8.
- The app today: `content/review/sprite-ranker/` (`README.md`, `app/` and `start.command`), served at
  `http://127.0.0.1:4318` with `/authoring` and `/sprites/`.
- The player: `content/review/sprite-baseline/combat/player.js`, `timeline.mjs`, `review.css` and `index.html`, with
  its stepping, speeds, layers, anchors, faces, backdrops, formations and phone frame.
- UA1's `content/authoring/sprites/`, `reviews.json` and `progress.json`. UA2's progress command, if it has landed.

## Decisions made

- **A workspace package `@uma-platform/studio` in `tools/studio/`, started with `pnpm studio`.** It listens on
  `127.0.0.1:4318` only and reads `content/` at run time. Names come from the local master release, and art from
  `content/authoring/` and `content/release/`. Nothing original is bundled or committed.
- **Four pages:**
  1. **Ranker:** as today, writing `uma-art-roster.json`.
  2. **Queue:** every outfit with its stage, filtered by tier, Way, stage and profile.
     - The next batch is shown by pipeline.md §5's rule.
     - The owner may drag an outfit up or down; that's saved in `content/authoring/sprites/queue.json` and overrides the
       rule.
  3. **Animation desk:** the player, extended to every facing and profile action in format.md §7, plus a field preview
     (five in single file on a plain floor) and a scene preview (two Umas, one turning to the camera to emote).
  4. **Gates.**
     - **Key gate:** one outfit's key, turnaround and `identity.md`, beside its master-data portrait, bust and chibis.
     - **Set gate:** a batch's five sets in the desk.
     - Each has **Approve** and **Changes** with a note.
- **Writing a decision:** `reviews.json` is written atomically, with the date and the SHA-256 of every file the decision
  covers. On load, the Studio re-hashes, and any file changed since approval shows "changed since approval".
  - For a set gate: every frame, face and the atlas.
  - For a key gate: the key, the turnaround and `identity.md`.
- **Short labels,** the owner's text rule. Desktop first. It never writes to the roster except from the Ranker.
- **The old app stays in `content/`**; nothing is deleted. Its `start.command` may start `pnpm studio` instead.

## Do

1. Port the ranker, the checklist and the player into `tools/studio/`.
2. Add the queue rule and its override, both previews, and the gates.
3. Test the parts that decide things: the queue rule, the review writer, the hash check and the stage derivation.
4. Write `tools/studio/README.md`, and add one line to pipeline.md §6 if a command changed.
5. Open the Studio on batch 1 and record a screenshot of each page, locally only (it shows Uma art).

## Done when

- `pnpm studio` serves all four pages on batch 1.
- Approving a key and a set writes `reviews.json` with hashes. Touching a file then shows "changed since approval".
- The queue shows batch 2 as pipeline.md §5 lists it, and a drag overrides it.
- CI passes, and the names guard from UA2 passes for `tools/studio/`.

## Deliver

A pull request (ChatGPT) or `main` (Claude), `feat(studio): …`. Log a P-decision (from P92, after fetching `main`).
Delete this packet and move UA3 to Done in [the handoff](../README.md). Then tell the owner in one line that reviews now
happen in the Studio, with the link `http://127.0.0.1:4318`.
