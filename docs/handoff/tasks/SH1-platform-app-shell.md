# SH1 — The Uma Platform app, local

**uma-platform's `apps/web`, `apps/api` and `packages/tiers` · Claude · M · Needs: nothing · Unblocks: SH2, then RK1
and CA1**

## Why

The owner wants one signed-in website for the platform's tools, with the games' shell, where each sub-app opens from a
tile ([platform-app/README.md](../../platform-app/README.md), AP1–AP7, P127). This packet builds it locally, with no
sub-app yet, so SH2 only adds the cloud.

## Context (read first)

- [platform-app/README.md](../../platform-app/README.md): the app (AP1–AP7) and the order of the packets.
- uma-quest at `47ca16d` (its `origin/main` on 2026-11-11): `apps/web` (Vite, React 19, react-router 7, Firebase, uma-kit's
  `AuthProvider`, `AppFrame`, `AccountBar`, `ContentProvider`) and `apps/api` (`app.module.ts`: uma-server's
  `AuthModule`, `ReleaseProxyModule` and `PrivatePackModule`; `main.ts`; the health controller), its
  `scripts/check-private-content.test.mjs` and `.claude/launch.json`.
- `tools/studio/src/tier-model.ts` and its tests: the model that moves to `packages/tiers`.

## Decisions made

- **Copied, never imported,** from uma-quest at `47ca16d`, with the commit named in each copied file's header. Keep only
  what a non-game app needs: no save, measurements, farm check, stage or three.js.
- **Names:** `@uma-platform/web` and `@uma-platform/api`, private. `pnpm-workspace.yaml` adds `apps/*`.
- **Ports:** API 8111 (`AUTH_MODE=disabled` in dev), web 5204 with `/api` proxied. `.claude/launch.json` gains
  `platform-api` and `platform-web` beside the Studio.
- **Master data:** `ReleaseProxyModule` at `/api/master/…`, from `MASTER_BUCKET` in production and `content/release` in
  dev, as uma-quest does.
- **Sub-apps:** `apps/web/src/apps/<id>/` with a lazy route, and `apps/api/src/<id>/` with a module under `/api/<id>/…`.
  A registry (`apps/web/src/apps/index.ts`) lists each sub-app's id, title, route and summary call, and the home draws a
  tile for each one registered. SH1 registers none; the home shows the account bar, the master data release it reads
  and an empty state.
- **One rule, tested:** a file under `apps/web/src/apps/<a>/` never imports from `apps/<b>/`, and the same goes for the
  API. A test walks the imports.
- **`packages/tiers`:** `@uma-platform/tiers`, private, not published. `tier-model.ts` and its tests move in unchanged.
  The Studio imports it and serves its built file where it served `dist/tier-model.js`, so the Studio's pages don't
  change.
- **Privacy:** the private-content check covers `apps/`, `packages/tiers` and `infra/`. No name, art or board goes in
  git.

## Do

1. `packages/tiers`, with the Studio pointed at it; `pnpm test` still runs the model's tests.
2. `apps/api`: `main.ts`, `app.module.ts` (auth, master proxy), `/api/health` (`@Public()`, with the commit), and the
   sub-app registry module (empty).
3. `apps/web`: the shell on uma-kit (`AppFrame`, `AccountBar`, sign-in through `AuthProvider`, local user when Firebase
   isn't configured), the home with the tile grid (wide on desktop, one column on a phone), the registry and the router.
4. The private-content check, the import rule's test, `.claude/launch.json`, and README's "Develop" section.

## Done when

- `pnpm lint`, `pnpm test` and `pnpm build` pass at the root.
- Both dev servers start; the home renders signed in as the local user and shows the master data release id from
  `/api/master/…`, checked in the preview with no console errors.
- The Studio (`pnpm studio`) still opens every board unchanged.
- A Done row in the handoff, and P127's state updated.
