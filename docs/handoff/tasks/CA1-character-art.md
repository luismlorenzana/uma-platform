# CA1 — Uma Character Art: uma-quest's Album, moved here

**uma-platform's `apps/web/src/apps/art` and `apps/api/src/apps/art` · Claude · M · Needs: SH2 · Unblocks: CA2, and
uma-quest removing its Album**

## Why

The owner checks finished character art in uma-quest's Album and wants it in the Uma Platform app instead, as **Uma
Character Art** ([platform-app/README.md](../../platform-app/README.md), AP20–AP23, P129).

## Context (read first)

- [platform-app/README.md](../../platform-app/README.md) AP25–AP36 and P131: the plan's schema 2 and the sisters.
- uma-quest at `47ca16d`: [album.md](https://github.com/luismlorenzana/uma-quest/blob/main/docs/game/album.md),
  `apps/web/src/album/` (`AlbumScreen.tsx`, `data.ts`, `keyCanvas.ts`), `apps/web/src/sprites/keys.ts`, `keySets.ts`,
  `cache.ts`, and the key pack's allowlist (`PACK_ALLOW` in its `app.module.ts`); its D45–D47.
- `gs://uma-quest-content/traveler-keys/` (`index.json`, `sets/`, `pages/`, `stills/`), read only (AP11).

## Decisions made

- **Copied from uma-quest at `47ca16d`,** with the commit in each file's header, and changed only where the app
  differs: routes (`/art`, `/art?o=<outfitId>`), the content client, and the kit's chrome.
- **Laid out by the Ranker** (P131, AP32; the owner: "the Ranked Umas should be the way the Uma Album should be
  organized"): **Every Uma** opens on the ten batches in order (T1 first), each Uma in ranking order by her best-ranked
  outfit, then the unranked by name. A sister is her own entry, with her name, her relation and age, and her profile; her
  sister's entry lists the outfits that are still hers. The art API reads the plan from the platform's own bucket
  (`ranker/plan.json`, schema 2: `identities`, `batches`), a file, never the Ranker's code (AP1); the profiles' names
  come with it. A re-rank shows on the next load.
- **Two tabs, as the Album has them:** **Adult travelers** (standing baseline, Standing, Head and Face stills, twelve
  battle keys put together with the weapon, ten faces, set revision and personality) and **Every Uma** (272 outfits
  by name, with the Adult badge, searchable, and her portrait, bust, face, glass window, chibis A and B, her character's
  face and four dresses).
- **The key pack** is served at `/api/art/keys/…` through uma-server's `PrivatePackModule`, with uma-quest's allowlist,
  from `QUEST_CONTENT_BUCKET` in production and `../uma-quest/content` in dev.
- **Each file is hash-checked and kept on the device,** so a second visit is offline, as the Album does.
- **The home tile** shows the outfit count and the adult set count (`GET /api/art/summary`).
- **uma-quest keeps its Album until CA1 is live,** then its session removes it (AP23): ask it in one message, or write
  the request into its handoff if no session is running.

## Do

1. `apps/api/src/apps/art`: the key pack route, `GET /api/art/plan` (the Ranker's plan, read from the bucket) and `summary`.
2. `apps/web/src/apps/art`: the copied Album, laid out by the plan, registered in the app's registry.
3. Tests: the copied ones from uma-quest, on its invented fixtures; the allowlist refuses anything else.
4. Docs: the platform-app doc and uma-quest's request.

## Done when

- `uma-platform.web.app/art` shows all ten adult travelers and all 272 outfits, with the same pictures as uma-quest's
  Album, checked side by side on desktop, in the Ranker's order: moving an outfit to another tier moves it in the album.
- `pnpm lint`, `pnpm test`, `pnpm build` pass; deploy is green.
- uma-quest's session has the request to replace its Album.
- A Done row, and P129's state updated.
