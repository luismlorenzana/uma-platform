---
'@luismlorenzana/uma-server': minor
---

`/content` (SE2, P57): `ReleaseProxyModule.forRoot({ route, bucket, dir })` serves uma-platform's master data release,
and `PrivatePackModule.forRoot({ route, bucket, dir, allow })` a game's allowlisted, hash-named private files, both
behind `AuthGuard`, from the bucket in production and a local folder in development. `AuthGuard` no longer checks a
token twice when the global guard already let the request in.
