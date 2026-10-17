# @luismlorenzana/uma-server

## 0.2.0

### Minor Changes

- 5aaeb93: `/content` (SE2, P57): `ReleaseProxyModule.forRoot({ route, bucket, dir })` serves uma-platform's master data release,
  and `PrivatePackModule.forRoot({ route, bucket, dir, allow })` a game's allowlisted, hash-named private files, both
  behind `AuthGuard`, from the bucket in production and a local folder in development. `AuthGuard` no longer checks a
  token twice when the global guard already let the request in.

## 0.1.0

### Minor Changes

- 1824879: New package: the NestJS pieces both Uma game APIs share (SD1, P54). `/auth` has the guard both APIs ran:
  `AuthModule.forRoot({ mode, allowedEmail, projectId? })` or `forRootAsync` guards every route with a Firebase ID token
  and the owner allowlist (401 without a valid token, 403 for anyone else), `mode: 'disabled'` passes as `local-dev`,
  `@Public()` opts a route out, and `CurrentUid` reads the uid. CommonJS, with firebase-admin loaded on the first token.
