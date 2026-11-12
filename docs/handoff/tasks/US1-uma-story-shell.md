# US1 — Uma Story: the shell, the store, push and pull

**uma-platform `apps/web`, `apps/api`, `scripts/story` · Claude · L · Needs: the owner's go · Unblocks: US2, US3, US4**

> Written 2026-11-12 (P141) from [story.md](../../platform-app/story.md), calls AP53–AP64.

## Why

uma-quest and uma-farm each have a local Story Sandbox, built as siblings on the same cast. The owner wants one Story
App with a book for each game, while each game's story is still written in its own session. This packet builds the part
both books stand on, and already makes every draft readable from any device, judged in one place and backed up.

## Context (read first)

- [story.md](../../platform-app/story.md), whole. [The platform app](../../platform-app/README.md): AP1–AP7 (a sub-app's
  shape), AP9 and AP10 (the bucket, the generation precondition), AP42 (the order read fresh).
- The Ranker's sub-app as the model: `apps/api/src/apps/ranker/` (`blob-store.ts`, `ranker.store.ts`),
  `apps/web/src/apps/ranker/`, `scripts/ranker/` (`push`, `pull`), `scripts/check-sub-apps.test.mjs`.
- The two sandboxes, read only: `~/workspace/uma-quest/tools/story-sandbox/` and
  `~/workspace/uma-farm/tools/story-sandbox/` (their servers' safety rules and their Review panels).

## Decisions made

1. **The sub-app:** id `story`, the tile **Uma Story**, routes `/story`, `/story/cast`, `/story/quest`, `/story/farm`;
   code in `apps/web/src/apps/story/{shell,cast,quest,farm}/` and `apps/api/src/apps/story/`. `check-sub-apps` gains
   the rule: a book imports the shell and `cast`, never the other game's book (AP53).
2. **The store** is the Ranker's blob store on `story/<book>/…` in `gs://uma-platform-content`. Run locally it reads
   the drafts folders in place: `STORY_CAST_DIR` (default `content/authoring/story/cast`), `STORY_QUEST_DIR`
   (`../uma-quest/content/stories`), `STORY_FARM_DIR` (`../uma-farm/content/story`) (AP56, AP61).
3. **The API,** owner guard on every route:
   - `GET /api/story/summary`: the tile's numbers;
   - `GET /api/story/:book/index`: the files with their hashes, the check report if there is one, the verdicts;
   - `GET /api/story/:book/file/*`: one file, only `.json` and `.md` inside that book, the path checked;
   - `PUT /api/story/:book/reviews`: the verdicts, with the generation precondition; a conflict is a 409.
4. **`pnpm story:push <book>`** (`scripts/story`, built like `scripts/ranker`): uploads the text files that changed
   (`.json`, `.md`), never a picture, an archive, `packs/`, `pack/` or `export/`, and never deletes: a file gone locally
   is listed and kept. When the book has a `checks.json`, its hashes must match the files or the push is refused; a book
   with no check yet pushes as it is, and US3 and US4 make the check required (AP57).
5. **`pnpm story:pull <book>`** always brings `reviews.json` down. With `--drafts` it also brings the drafts, for
   another machine, and never overwrites a newer local file: it lists the conflicts (AP58, AP68).
6. **The report's shape,** for the games' own checks to write: `{ schemaVersion: 1, book, checkedAt, files: { path:
   sha256 }, findings: [{ level: 'error' | 'todo' | 'note', file, where, message }], layers: { itemId: layer }, counts:
   { group: { label: ids[] } } }`. A parser with tests lives in the shell.
7. **A verdict:** `{ status: 'liked' | 'rework' | 'question', note, at }`, keyed by an item id (a file's path, or
   `path#anchor`). Neither sandbox has saved one yet, so nothing is migrated.
8. **The pages:** `/story` (the three books, each with its numbers); **Cast** (the Ranker's 100 by batch, pictures from
   master data, a sister under her own name, each Uma showing which books hold her); and for each game's book a plain
   **Files** page: every pushed file, JSON as a tree and markdown as text, with a Review panel on each. US3 and US4
   replace Files with the real pages.
9. **Nothing private in git:** tests use invented records (9000001–9000003), and the private-content check covers the
   new folders.

## Do

1. The API module, the store and its tests (an allowed file served, a path outside the book refused, the precondition).
2. `scripts/story` with `push` and `pull`, tested on a temporary folder and a fake store.
3. The shell, the home, the Cast page and the Files pages.
4. Run it locally on this machine's real drafts; then push both books' drafts and check them on the live site.
5. Message the two story sessions with the push and pull commands.

## Done when

- `pnpm lint`, `pnpm test` and `pnpm build` pass; `check-sub-apps` and the private-content check pass.
- Live: the tile shows; Cast lists 100 Umas in ten batches; both books' files read on a phone; a verdict saved on the
  site comes down with `pnpm story:pull`.
- The drafts in the bucket match the local folders' text files, by hash.

## Deliver

Commit and push to `main` (`feat(story): …`), watch CI and the deploy. Delete this packet, mark its rows Done in
[the handoff](../README.md) and [story.md](../../platform-app/story.md), log the P-decision, and check back with the
owner before US2 and US4.
