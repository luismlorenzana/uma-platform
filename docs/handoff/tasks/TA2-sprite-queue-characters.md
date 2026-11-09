# TA2 — The sprite queue reads the character boards

**uma-platform's `scripts/sprites` and `tools/studio` · Claude · M · Needs: the owner's first pass on Uma NPCs ·
Unblocks: traveler batches 2–20 and townsfolk T2 onward in the owner's new order (UA9, UA11)**

## Why

TA1 (P113, P114) moved Uma tiers from outfits to characters and froze the old outfit roster, because batches 1 and T1
were assigned from it and uma-quest's wave 1 plays them. Until the queue reads the new boards, later batches follow a
roster the owner no longer edits. This packet points the queue at the boards without moving an assigned batch.

## Context (read first)

- [authoring/tiers.md](../../authoring/tiers.md) (TS1–TS14), P113–P116.
- [pipeline.md](../../sprites/pipeline.md) §4–§7 (CR25: batches of five, one per Way, in tier order; townsfolk B before F).
- `scripts/sprites/src/queue.ts` (`queue`, `nextBatch`) and `tools/studio/src/sprite-review.ts`, which read
  `uma-art-roster.json` today; `content/authoring/sprites/batches.json`, the assigned batches.
- The plan: `content/authoring/tiers/plan.json` (`boards[].order`, each with `outfits` and `ways`).

## Decisions made

- **Travelers come from Playable Umas' cast,** SS, then S, then A, in the board's order. Each character contributes
  **her best-ranked outfit first** (her best tier on the old outfit board, then the original outfit, then the lowest id).
  Her other outfits follow, after every character's first, in the same order. Each outfit keeps her own Way, so CR25's
  one per Way still holds.
- **Townsfolk come from Uma NPCs**, SS to F, in the board's order, one outfit each (the original outfit). This replaces
  CR25's B-before-F rule.
- **Assigned batches never move.** `batches.json` stays the record. The queue skips their outfits, and a character
  whose outfit is in an assigned batch keeps it there.
- **The adapter reads the plan, not the board files,** so the queue sees exactly what the home shows. A missing plan
  falls back to the frozen roster with a warning, never silently.
- **No schema change in master data**; sprites still publish sprite-only (UA5).

## Do

1. `scripts/sprites`: a `rosterFromPlan(plan, catalog)` that produces the `Ranking[]` the queue already takes (outfit,
   character, tier mapped back to SS/A1/A2 for the queue's order, and Way). Tests on invented plans.
2. `queue.json`'s overrides still apply on top; the Studio's Queue page shows where each row came from (board and tier).
3. `pnpm sprites:progress` and the Gates page read the same adapter.
4. Update pipeline.md's CR25 row and the UA9 and UA11 templates' batch tables from the new order.

## Done when

- The Queue page's next traveler batch and townsfolk T2 come from the boards, and batch 1 and T1 are unchanged.
- `pnpm test` passes with the adapter's tests.
- The owner sees the new T2 and the next five travelers in the Studio before any art is drawn.
