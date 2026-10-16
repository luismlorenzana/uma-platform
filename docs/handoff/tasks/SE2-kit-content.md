# SE2 — `uma-kit/content` and `uma-server/content`: art loading and the content proxy

**uma-platform · Either · M · Needs: SD1 released (the `uma-server` package exists) · Unblocks: SE3, SE4 (SE4 also
needs SE1).**

## Why

Both games load master data and art the same way:
- they read uma-platform's release through their own authenticated API;
- they fetch images with the user's token;
- they cache blobs, and draw atlas frames.

Each has its own copy, on the web side and the API side. Phase E shares both halves.

## Context (read first)

- `docs/sibling/phases.md` § Phase E, and `docs/master-data.md` (releases, manifests, channels, the art index).
- **uma-rpg:**
  - web: `apps/web/src/master/master.ts` (the release client over `/api/master/`, loading the view), and
    `apps/web/src/master/art.tsx` (`artUrl`, `useArtUrl`, `imagePath`, `AtlasSprite`: an authenticated fetch, a blob
    cache, atlas frames);
  - API: `apps/api/src/master/` (`master-source.ts`, `master.controller.ts`, `master.module.ts`, with tests) and
    `apps/api/src/content/` (private packs: `content-source.ts` with an allowlist, `content.controller.ts`);
  - the service worker's caching in `vite.config.ts`.
- **uma-racer `origin/main`:**
  - web: `apps/web/src/content/runtime.ts` (522 lines: `ContentRuntime`, `ContentTransport`, `ManifestStore`,
    `LoadedAtlas`, `ArtKind`, `getContentAsset`), `ContentProvider.tsx`, `parse.ts`, `errors.ts`, `diagnostics.ts`;
    `apps/web/src/app/content.ts`, `app/art.ts`; and `apps/web/src/ui/album/useArt.ts`;
  - API: `apps/api/src/content/` (`content.service.ts`, `content.controller.ts`, `content.module.ts`).
- uma-data's release client: `@luismlorenzana/uma-data`, `createReleaseClient`.
- **After SE1,** uma-racer reads only uma-data releases plus private packs. The shared runtime targets that world, not
  racer's retired GameTora content.

## Decisions made

- **Web: `@luismlorenzana/uma-kit/content`.**
  - `ContentClient`, built from `{ base: '/api', token: () => Promise<string | null> }`. It wraps uma-data's release
    client for `/api/master/` and fetches private packs at `/api/content/`.
  - `useArtUrl(path)`, `imagePath(index, family, key)` and `<AtlasSprite>`: uma-rpg's API, which already reads
    uma-data's art index.
  - **Caching:** a blob-URL cache in memory, plus Cache Storage keyed by content hash, so art survives restarts.
  - `ContentProvider` and `useContent()`.
- **Server: `@luismlorenzana/uma-server/content`.**
  - `ReleaseProxyModule.forRoot({ route: 'master', bucket, dir })` serves release files, manifests and channels, from
    the bucket in production and a local folder in development, behind SD1's guard.
  - `PrivatePackModule.forRoot({ route: 'content', bucket, dir, allow })` serves allowlisted, hash-named private files.
    That's uma-rpg's enemy packs, and any of uma-racer's after SE1.
  - Options come from the API, not `process.env` inside the package.
- **Kept per game:** what is loaded and when (uma-rpg's `MasterView` adapter, uma-racer's content adapter); the PWA
  service worker config; the enemy packs' content.

## Do

1. **Web:** build `src/content/` from uma-rpg's `art.tsx` and `master.ts`, adding racer's Cache Storage and
   diagnostics where they're better. Note each choice under Decisions.
2. **Server:** build `packages/server/src/content/` from uma-rpg's `master/` and `content/` modules, with their tests,
   checking racer's `content.service.ts` for anything missing.
3. **Tests:** the cache keying, `imagePath`, the allowlist (a non-allowlisted or non-hashed path gives 404), the local
   folder source and the bucket source (mocked).
4. **Wire the subpaths:** the kit's `/content` (exports, `check-dist.mjs`, README) and the server's `/content`
   (exports, README).
5. **Prove it in uma-rpg before releasing,** on scratch changes in a worktree:
   - its web app loads the Stable's icons and a battle's enemy art through `uma-kit/content`;
   - its API serves `/api/master/` and `/api/content/` through `uma-server/content`;
   - API tests pass. Revert.
6. **Release** both packages (minor changesets). Log a P-decision.

## Done when

- [ ] `pnpm lint && pnpm test && pnpm build` pass in uma-platform. Both subpaths load in plain Node; the kit's without
      a DOM.
- [ ] The step 5 proof was run and described.
- [ ] Both versions are published, and the P-decision is logged.

## Deliver

- Claude: commit to `main`, `feat(kit,server): shared content loading and proxy (SE2)`.
- ChatGPT: branch `sib/se2-content`, a pull request with the same title.
- Reply with both versions and the module options as shipped. Flag it done.
