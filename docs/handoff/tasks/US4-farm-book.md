# US4 — The Farm book: uma-farm's Story Sandbox, moved here, with the release's state

**uma-platform `apps/*/story/farm`, then uma-farm · Claude · L · Needs: US1 · Unblocks: uma-farm's sandbox retiring,
and F56's pack reaching the machine that publishes**

> Written 2026-11-12 (P141) from [story.md](../../platform-app/story.md), calls AP57, AP59, AP60, AP62 and AP67–AP71.

## Why

The farm's romance core is built and dark, and its go-live (F56) waits for the story pack. The owner reads each layer
before the next is written. Moved here, the layers are read on any device, and one page says what the game would ship
today.

## Context (read first)

- [story.md](../../platform-app/story.md), "Publishing" and "The mirror". uma-farm's
  [F40](https://github.com/luismlorenzana/uma-farm/blob/main/docs/handoff/tasks/F40-story-authoring.md) (the files, the
  format and every "Landed" note) and
  [F56](https://github.com/luismlorenzana/uma-farm/blob/main/docs/handoff/tasks/F56-story-delivery.md) (decisions 3, 4
  and 12: the release, the publish, what the pack must hold).
- `~/workspace/uma-farm/tools/story-sandbox/` (`lib/model.mjs`, `public/people.js`, `bonds.js`, `player.js`) and the
  validator it reads in place, `packages/domain/src/story/authored.ts`.

## Decisions made

1. **The pages, as the sandbox has them:** Characters (the cast in arrival order, and by the Ranker's batch); an Uma
   (her paragraph, her bible, her route as the 27-rung ladder with each event's layer, her ties, her chats and
   keepsake); Relationships (the ties as a ring and a table); World; Chapters, Town, Bonds and Farm (the original
   drafts uma-farm keeps in git, pushed with the book); Format; and the player with the farm's steps on the shell's
   stage, choices with their gains and a play as a card (AP60).
2. **Placeholders:** a cast Uma without a bible shows every section "to write"; the Ranker's other 80 show as "not in
   the farm yet", with no sections (AP59, AP71).
3. **Counts** (F60's page, AP69): Umas per work line, season, festival and loved gift; arrivals by kind; ties an Uma,
   the least tied flagged; pair conversations written against RS12's two an Uma; events scripted of 27 an Uma.
4. **Release** (AP67): F56's gate, Uma by Uma (her bible, her arrival scene), and the receipt's state: in the pack,
   changed since, not shipped. With no receipt yet it says "Nothing published".
5. **Pictures** from master data by the outfit her cast entry names (AP64). The copied pack is not read.
6. **The code is copied from uma-farm's sandbox at a recorded commit** and rewritten in React on uma-kit. The validator
   is not copied: the app reads the report (AP57).
7. **The uma-farm steps this packet names,** done there by its story session or by this one, following its CLAUDE.md:
   `pnpm story:check` (the domain's strict report, with layers and counts); `pnpm story:publish` leaving its receipt in
   the platform's bucket (a line in F56); `pnpm stories` opening the local app on its drafts; and the sandbox removed
   once the owner has read a layer here.

## Do

1. Ask uma-farm for `pnpm story:check` (or write it there), and push the book with its report.
2. The pages, Counts, Release and the player, with tests on the stand-in pack (9000001–9000003).
3. Compare each page with the sandbox on the real drafts, side by side, locally.
4. The request to retire the sandbox, written as uma-farm's next F packet.

## Done when

- Every sandbox page has its page here; Counts and Release show; the stand-in route plays through on a phone.
- A verdict saved here reaches uma-farm's story session with `pnpm story:pull farm`; `--drafts` rebuilds the drafts in
  an empty folder, and the farm's check passes on them.
- `pnpm lint`, `pnpm test` and `pnpm build` pass; nothing private in git.

## Deliver

Commit and push to `main`, watch CI and the deploy. Delete this packet, mark its rows Done, log the P-decision, and ask
the owner in one line to read the farm's newest layer on the site.
