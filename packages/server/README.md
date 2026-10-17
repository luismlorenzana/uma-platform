# @luismlorenzana/uma-server

The NestJS pieces both Uma game APIs repeat (uma-platform SD1, P54). A React kit shouldn't carry NestJS and the APIs
shouldn't install React, so server code ships here, one subpath per area:

| Subpath | What | Since |
|---|---|---|
| `/auth` | The Firebase ID token and owner allowlist guard, `CurrentUid`, `@Public()` | 0.1.0 (SD1) |
| `/content` | The master data release proxy and a game's private packs | 0.2.0 (SE2) |

CommonJS (both APIs build with `nest build` to CommonJS), with types. Peer dependencies: `@nestjs/common` and
`@nestjs/core` 11, `firebase-admin` 13, `rxjs` 7, and optionally `@google-cloud/storage` 7 for `/content`'s bucket:
the ranges both APIs already use.

Private; personal use only. Published to GitHub Packages: each game needs **Read** access to this package (Package
settings → Manage Actions access) for its CI to install it.

## `/auth`

```ts
import { AuthModule, authMode } from '@luismlorenzana/uma-server/auth'

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    AuthModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        mode: authMode(config.get('AUTH_MODE')),          // 'disabled' turns it off; anything else keeps it on
        allowedEmail: config.get('ALLOWED_EMAIL') ?? '',  // the owner's email; empty lets nobody in
      }),
    }),
    SaveModule,
  ],
})
export class AppModule {}
```

- **Every route is guarded** once `AuthModule` is imported. `@Public()` on a route or a controller skips it: put it on
  `/api/health`, and on the push scheduler's tick, which keeps its own OIDC guard (`@Public() @UseGuards(SchedulerGuard)`).
- **`@CurrentUid() uid: string`** reads the signed-in uid. A route the guard didn't run on has none, and answers 401.
- **The answers:**
  - no `Authorization: Bearer <token>` header, a malformed one, or a token Firebase rejects: **401**;
  - a valid token whose email isn't `allowedEmail` (compared without case): **403**;
  - `mode: 'disabled'`: every request passes as uid `local-dev`, without calling Firebase (local development only);
  - Firebase Admin failing to start: **500**, so a broken server never looks like a bad token.
- **Options** come from the API, never from `process.env` inside the package. `forRoot({ mode, allowedEmail,
  projectId? })` takes them directly; `forRootAsync({ imports?, inject, useFactory })` builds them from the API's
  providers.
- **`projectId`** is only needed where the runtime doesn't name the project (Cloud Run does).
- **`global: false`** leaves the guard off routes until a controller asks for it with `@UseGuards(AuthGuard)`, for an
  API that moves over one controller at a time. The module is global either way, so `AuthGuard` resolves in any
  module.
- **firebase-admin loads on the first token** and the auth instance is kept; an app the API already initialized is
  reused. Tests pass `verifyIdToken: async (token) => ({ uid, email })` to replace Firebase.

## `/content`

```ts
import { PrivatePackModule, ReleaseProxyModule } from '@luismlorenzana/uma-server/content'

@Module({
  imports: [
    AuthModule.forRootAsync({ … }),   // required: both routes sit behind its guard
    ReleaseProxyModule.forRoot({
      bucket: process.env.MASTER_BUCKET,                                                     // production
      dir: resolve(process.cwd(), process.env.MASTER_DIR ?? '../../../uma-platform/content/release'), // development
    }),
    PrivatePackModule.forRoot({
      bucket: process.env.CONTENT_BUCKET,
      dir: resolve(process.cwd(), process.env.CONTENT_DIR ?? '../../content/enemies-release'),
      allow: ['enemies.json', /enemies\/[a-z0-9]+(-[a-z0-9]+)*-(face|art|splash)\.[a-f0-9]{8}\.webp/],
    }),
  ],
})
```

- **`ReleaseProxyModule.forRoot({ route = 'master', bucket?, dir?, source? })`** serves uma-platform's release at
  `/api/master/…`: `files/` (hash-named, cached for good), `manifests/` and `channels/` (revalidated). A local folder
  is served like the bucket: files at their manifest paths, and the manifest and `latest` channel made from
  `manifest.json` (P31).
- **`PrivatePackModule.forRoot({ route = 'content', bucket?, dir?, allow, source? })`** serves a game's private pack
  at `/api/content/…`. A string in `allow` is an exact index file (revalidated); a pattern must match the whole path,
  and the file must be hash-named (`<stem>.<8+ hex>.<ext>`, cached for good). Anything else is a 404.
- **The bucket wins** when named; otherwise the folder; one of them is required. `@google-cloud/storage` (an optional
  peer) loads on the first bucket read.
- **Both controllers carry `@UseGuards(AuthGuard)` themselves,** so a content route never goes out unguarded: an API
  without `AuthModule` fails at start. With the global guard on as well, the token is checked once (the guard skips a
  request it already let in).
- **No traversal,** no hidden or empty path segments, at most 300 characters. Types for JSON, WebP, PNG, AVIF, MP3
  and OGG.

### Moving an API onto it (SD3, SD4)

1. Pin `@luismlorenzana/uma-server` (exact version) in `apps/api`, and import `AuthModule.forRootAsync` in `AppModule`
   as above.
2. Swap `from '../auth/auth.guard'` for `from '@luismlorenzana/uma-server/auth'`, and delete `src/auth/auth.guard.ts`.
3. Mark `HealthController`'s route and any route with its own guard `@Public()`.
4. Drop `@UseGuards(AuthGuard)` and `AuthGuard` in module providers (optional: they still work, and the guard skips a
   request it already let in).

**What changed from the games' guards:** a valid token for someone else was 401 there and is **403** here; the bearer
header must be exactly `Bearer <token>`; a Firebase start-up failure is a 500 instead of a 401. Everything else is the
same (uma-rpg's and uma-racer's guards were identical).
