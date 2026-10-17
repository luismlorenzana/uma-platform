---
'@luismlorenzana/uma-kit': minor
---

`/auth` and `/places` (SD2, P56). `/auth`: Google sign-in through Firebase, loaded only by `import()` with the game's
config (`AuthProvider`, `useAuth`, `loadAuth`, `idToken`, `signIn`, `signOut`; `firebase` is an optional peer).
`/places`: the frames around both games, filled by each: `BootGates` (splash → sign-in → boot → first launch → start
page), `UpdateNotice` with the update lifecycle and `criticalAction`, `AccountPage`, `ShelfView`, `ExchangeRows`,
`ProfileFrame` and `UnlockConfirm`. Every word is a prop with an English default.
