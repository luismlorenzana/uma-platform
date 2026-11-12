# US3 — The Quest book: uma-quest's Story Sandbox, moved here

**uma-platform `apps/*/story/quest`, then uma-quest · Claude · L · Needs: US1 · Unblocks: uma-quest's sandbox retiring**

> Written 2026-11-12 (P141) from [story.md](../../platform-app/story.md), calls AP57, AP59, AP60, AP62 and AP69.

## Why

uma-quest's sandbox is the larger of the two: 20 stories at bible depth, a world pack, a scene player. Moved here, the
owner reads them on any device, in the Ranker's order, beside the farm's.

## Context (read first)

- [story.md](../../platform-app/story.md). uma-quest's
  [story-sandbox.md](https://github.com/luismlorenzana/uma-quest/blob/main/docs/design/story-sandbox.md) (the pages,
  SB1–SB24) and [story-cast.md](https://github.com/luismlorenzana/uma-quest/blob/main/docs/design/story-cast.md).
- `~/workspace/uma-quest/tools/story-sandbox/`: `lib/model.mjs` (the bundle model and its checks), `public/views.js`,
  `public/player.js`. Character Art (CA1) as the model for a move: copied at a recorded commit, rewritten on uma-kit.

## Decisions made

1. **The pages, as the sandbox has them:** Stories by batch (cards, filters for batch, layer, tag and circle); a story
   (Overview, The road, Relationships, Scenes, Review); World (the map, the powers, the towns, the circuit); Crossings;
   Format; and the player with uma-quest's 15 step kinds on the shell's stage (AP60).
2. **The pages its planned packets asked for land here instead:** Q57's batch view, Q58's Tags page, Q60's Counts
   (AP69). Q59's Relationships page is the Cast book's (US2); a story's Relationships tab shows her cast ties beside her
   bosses.
3. **Pictures:** Umas from master data; bosses from the Ranker's `ranker/assets/`, matched by the ids the bundles
   already use (AP64).
4. **The code is copied from uma-quest's sandbox at a recorded commit** and rewritten in React on uma-kit. The model's
   checks are not copied: the app reads the report (AP57).
5. **The uma-quest steps this packet names,** done there by its story session or by this one, following its CLAUDE.md:
   `pnpm story:check` (the checks of `lib/model.mjs`, writing the report with layers and counts), `pnpm stories` opening
   the local app on its drafts, and the sandbox's pages removed once the owner has read a story here.

## Do

1. Ask uma-quest for `pnpm story:check` (or write it there), and push the book with its report.
2. The pages and the player, with tests on invented bundles.
3. Compare each page with the sandbox on the real drafts, side by side, locally.
4. The request to retire the sandbox, written as uma-quest's next Q packet.

## Done when

- Every sandbox page has its page here, showing the same stories with no check the sandbox didn't show.
- A scene plays through on a phone; a verdict saved here reaches uma-quest's session with `pnpm story:pull quest`.
- `pnpm lint`, `pnpm test` and `pnpm build` pass; nothing private in git.

## Deliver

Commit and push to `main`, watch CI and the deploy. Delete this packet, mark its rows Done, log the P-decision, and ask
the owner in one line to open a story on the site.
