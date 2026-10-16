# SD1 — `@luismlorenzana/uma-server`: the shared NestJS auth guard

**uma-platform · Either · M · Needs: nothing · Unblocks: SD3, SD4, SE2.**

## Why

Both APIs repeat the same guard:
- verify the Firebase ID token;
- check the owner allowlist;
- skip both locally with `AUTH_MODE=disabled`.

The plan puts server-side shared code in its own package, because a React kit shouldn't carry NestJS and the APIs
shouldn't install React (`docs/sibling/phases.md`, "What carries over"). This packet creates that package with its
first module. SE2 adds content, and SE5, if ever, push.

## Context (read first)

- `docs/sibling/phases.md`: "What carries over" (`uma-server`) and the Phase D table.
- **uma-rpg:**
  - `apps/api/src/auth/auth.guard.ts` (50 lines: `AuthGuard`, `CurrentUid`), and `app.module.ts` (how it's
    registered);
  - `main.ts`;
  - the env vars in `docs/game/architecture.md` § API (`AUTH_MODE`, `ALLOWED_EMAIL`);
  - its tests under `apps/api/src`.
- **uma-racer `origin/main`:** `apps/api/src/auth/auth.guard.ts`, and how its controllers use the uid.
  - Compare the two guards line by line: token parsing, the error codes (401 vs 403), the allowlist, the local mode's
    uid (`local-dev`), and caching of Firebase Admin.
- **The package pattern:** `packages/data`'s dual build. Both APIs build with `nest build` to CommonJS, so the package
  must at least ship CJS.
- **Releases:** `.github/workflows/release-packages.yml` and the queue README's release rules.

## Decisions made

- **Package:** `@luismlorenzana/uma-server` in `packages/server`, with subpath exports, starting with `./auth`.
  - **Peer dependencies:** `@nestjs/common`, `@nestjs/core`, `firebase-admin`, `rxjs`, at the ranges both APIs already
    use; check both `apps/api/package.json`.
  - **Builds:** CJS, plus ESM if it costs nothing. Built with `tsc`, with decorators on: `experimentalDecorators` and
    `emitDecoratorMetadata`, matching the APIs' tsconfig.
- **The module:** `AuthModule.forRoot({ mode, allowedEmail, projectId? })` provides a global `AuthGuard` and exports
  `CurrentUid`.
  - Options come from the game, not from reading `process.env` inside the package. Each API passes its env in.
- **Behaviour:** the union of both games' guards. Where they differ, keep the stricter, and note the difference under
  Decisions.
  - **Codes:** 401 for a missing or invalid token; 403 for a valid token whose email isn't allowed.
  - **Local mode:** `mode: 'disabled'` sets uid `local-dev` without calling Firebase.
  - **Opt-out:** a `@Public()` decorator for routes that skip the guard (`/api/health`, and the scheduler's tick, which
    has its own OIDC guard).
- **Out of scope:** both APIs' adoption (SD3, SD4), and the scheduler OIDC guard (stays in uma-rpg until SE5).

## Do

1. **Scaffold** `packages/server`, with a README, a tsconfig with decorators on, the build, Vitest and lint.
2. **Port the guard** into `src/auth/`: `auth.guard.ts`, `current-uid.ts`, `public.ts`, `auth.module.ts` and
   `index.ts`. Lazy-load and cache `firebase-admin`, as the games do.
3. **Tests (Vitest)**, with Firebase Admin mocked:
   - a valid token for the allowed email passes, and sets the uid;
   - a valid token for another email gives 403;
   - a missing token, and a malformed header, give 401;
   - `disabled` mode passes as `local-dev`;
   - a `@Public()` route skips the guard.
4. **Prove it in uma-rpg's API without committing there.** Build the package, copy its `dist` into
   `apps/api/node_modules/@luismlorenzana/uma-server` in a uma-rpg worktree, swap the import in `app.module.ts`, and
   run the API's tests and a local request with and without a token (`AUTH_MODE=disabled` and enabled with a bad
   token). Revert.
5. **Release** `0.1.0`: a changeset; version and publish. Log a P-decision.
6. **In your reply, remind the owner** to grant uma-rpg and uma-racer **Read** access to the new package (Package
   settings → Manage Actions access).

## Done when

- [ ] `pnpm lint && pnpm test && pnpm build` pass in uma-platform. `require('@luismlorenzana/uma-server/auth')` works
      in plain Node from a scratch folder.
- [ ] The step 4 proof was run and described (the API's tests pass; 401, 403 and local mode behave).
- [ ] `0.1.0` is published, the owner was asked for the access grant, and the P-decision is logged.

## Deliver

- Claude: commit to `main`, `feat(server): @luismlorenzana/uma-server with the shared auth guard (SD1)`.
- ChatGPT: branch `sib/sd1-uma-server-auth`, a pull request with the same title.
- Reply with the version and the `forRoot` options as shipped. Flag it done.
