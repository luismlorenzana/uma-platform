# US2 — The Cast book: who the 100 Umas are, and how they're tied

> **Parked 2026-11-12 (P150, local first).** The owner authors and reviews stories in the games' local Story
> Sandboxes: uma-quest's Q58 and Q59 write this content locally, in its own private folder, and uma-farm's story session reads it there. Don't take this packet unless the owner asks to
> read stories away from the Windows PC. Its text below is as first written (P141).

**uma-platform · Claude, the cast session · L (private content, then pages) · Needs: US1 · Unblocks: uma-quest's Q58
and Q59, uma-farm's F59**

> Written 2026-11-12 (P141) from [story.md](../../platform-app/story.md), calls AP63–AP66 and AP69. It takes the shared
> half of uma-quest's Q58 (the personalities) and Q59 (the eras, the circles and the real relationships).

## Why

Both games write the same Umas, and both draw their relationships from the same real careers: uma-quest has 25
crossings, the farm 31 ties. Researched twice, they drift. The Cast book holds what's true of an Uma in any world, once,
and each game tells it in its own.

## Context (read first)

- [story.md](../../platform-app/story.md), "The cast book". uma-quest's
  [story-cast.md](https://github.com/luismlorenzana/uma-quest/blob/main/docs/design/story-cast.md): SC8 and §2.2 (the 43
  personalities and their eight faces), SC11–SC16 and §3 (the eras, the circles, a relationship's fields).
- The Ranker's plan and profiles (`pnpm ranker:pull`): the 100 Umas, the sisters' profiles, the NPC board.
- What's already written, private, read only: the crossings in `~/workspace/uma-quest/content/stories/bundles/`, and
  `~/workspace/uma-farm/content/story/ties.json`.

## Decisions made

1. **Where it lives:** private drafts in the ignored `content/authoring/story/cast/`, pushed with `pnpm story:push cast`.
2. **`people.json`,** one entry an Uma, keyed as the Ranker keys her (a character id, or `s<outfitId>` for a sister):
   her **personality** (one of the 43; a second only where she clearly needs it) with a one-line reason; a **career
   card**: her classic year and era, her field, three to five races that made her under their real names, each fact with
   its source. A sister's comes from her profile and her sibling's career.
3. **`relationships.json`:** the eight eras; the circles inside them (a house, a crop, a stable, a field, sisters; three
   to eight Umas; one home circle each; every move to fill a hole logged with its reason); and the **real**
   relationships: a kind, one line, a weight (major or minor), the fact and where it was checked. Inside the circle
   first, then across for family and famous rivalries: some 250–300. A real tie that runs through a non-cast Uma is
   noted on the relationship, not drawn.
4. **Every relationship has a stable id,** so a game can point at it (`from`, AP66). The games' own invented ties are
   not in this book.
5. **Its check** (`pnpm story:check cast`, in `scripts/story`): every cast Uma has a person, one era and one home
   circle; every tag is in its vocabulary; every relationship joins two cast Umas once. It writes the report, with the
   counts.
6. **The pages:** an Uma (her pictures, profile, personality, career card, relationships, and her layer in each game's
   book); Relationships (a board an era, a graph a circle); Counts (per personality, face, era and circle; every Uma
   ranked by her relationships, the least connected flagged; personalities no face carries).
7. **No game's world here:** nothing medieval, nothing of the farm.

## Do

1. The vocabularies and `people.json`, a batch at a time, T1 first.
2. Eras and circles; then the relationships, starting from the 25 crossings and the 31 ties already written.
3. The check and its tests on invented records; the three pages.
4. Push; message both story sessions that the ids are there to point at.

## Done when

- All 100 Umas have a person, an era and a circle; the check reports no error; the counts show.
- No name, tag or relationship in git; `pnpm test` passes.

## Deliver

Code to `main`; content private, in the bucket. Delete this packet, mark its rows Done, log the P-decision, and ask the
owner in one line to read the Cast book's Counts.
