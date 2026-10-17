# @luismlorenzana/uma-server

The NestJS pieces both Uma game APIs repeat (uma-platform SD1, P54). A React kit shouldn't carry NestJS and the APIs
shouldn't install React, so server code ships here, one subpath per area:

| Subpath | What | Since |
|---|---|---|
| `/auth` | The Firebase ID token and owner allowlist guard, `CurrentUid`, `@Public()` | 0.1.0 (SD1) |
| `/content` | The master data and content proxy | SE2 |

CommonJS (both APIs build with `nest build` to CommonJS), with types. Peer dependencies: `@nestjs/common` and
`@nestjs/core` 11, `firebase-admin` 13, `rxjs` 7, the ranges both APIs already use.

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

### Moving an API onto it (SD3, SD4)

1. Pin `@luismlorenzana/uma-server` (exact version) in `apps/api`, and import `AuthModule.forRootAsync` in `AppModule`
   as above.
2. Swap `from '../auth/auth.guard'` for `from '@luismlorenzana/uma-server/auth'`, and delete `src/auth/auth.guard.ts`.
3. Mark `HealthController`'s route and any route with its own guard `@Public()`.
4. Drop `@UseGuards(AuthGuard)` and `AuthGuard` in module providers (optional: they still work, and run the same
   check twice).

**What changed from the games' guards:** a valid token for someone else was 401 there and is **403** here; the bearer
header must be exactly `Bearer <token>`; a Firebase start-up failure is a 500 instead of a 401. Everything else is the
same (uma-rpg's and uma-racer's guards were identical).
