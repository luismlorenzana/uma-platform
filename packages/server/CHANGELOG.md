# @luismlorenzana/uma-server

## 0.1.0

### Minor Changes

- 1824879: New package: the NestJS pieces both Uma game APIs share (SD1, P54). `/auth` has the guard both APIs ran:
  `AuthModule.forRoot({ mode, allowedEmail, projectId? })` or `forRootAsync` guards every route with a Firebase ID token
  and the owner allowlist (401 without a valid token, 403 for anyone else), `mode: 'disabled'` passes as `local-dev`,
  `@Public()` opts a route out, and `CurrentUid` reads the uid. CommonJS, with firebase-admin loaded on the first token.
