# SD2 — `uma-kit/auth` and `uma-kit/places`: boot gates, Account, Warehouse, Exchange and the profile frame

**uma-platform · Either · L · Needs: nothing · Unblocks: SD3, SD4.**

## Why

The screens around each game are the same frames filled with different content:
- getting in;
- the Account;
- the Warehouse's shelves;
- the Exchange's rows;
- the Uma profile's header and tabs.

Phase D makes them kit code, so both games look and behave alike there too.

## Context (read first)

- `docs/sibling/phases.md` § Phase D (the table), and `docs/sibling/structure.md` §1 and §6.
- **uma-rpg:**
  - getting in: `apps/web/src/app/Root.tsx` (splash, sign-in, booting, first launch), `UpdateNotice.tsx`,
    `update-lifecycle.ts` (and its test), `register-updates.ts`;
  - sign-in: `apps/web/src/auth/firebase.ts` (`loadAuth`, `firebaseEnabled`), `AuthProvider.tsx`;
  - the Account: `places/account/AccountPage.tsx` (rename, wallet grid, `AppearanceCard`, notifications, info rows,
    sign out);
  - shelves and rows: `places/warehouse/WarehousePage.tsx`, `places/exchange/ExchangePage.tsx`;
  - the profile header and tabs: `places/stable/OutfitProfile.tsx`.
- **uma-racer `origin/main`:**
  - getting in: `apps/web/src/app/boot.ts`, `start.ts` (`startPath`), `UpdateNotice.tsx`; `save/boot.ts`;
  - sign-in: `auth/firebase.ts`, `AuthProvider.tsx`;
  - the Account: `places/account/Page.tsx`, `model.ts`;
  - shelves and rows: `places/warehouse/Page.tsx`, `Peek.tsx`, `model.ts`; `places/exchange/Page.tsx`, `Peek.tsx`,
    `model.ts`;
  - the profile: `places/stable/Profile.tsx`.
- **The kit:** `src/shell/PlaceHeader.tsx`, `src/ui/Tabs.tsx`, `BottomSheet.tsx`, `UiMark.tsx`, `Button.tsx`,
  `appearance.ts`, `prefs.ts`.

## Decisions made

- **Two subpaths.**
  - **`@luismlorenzana/uma-kit/auth`:** the lazy Firebase client and a provider.
    - `firebase` is an optional peer, loaded only by `import()`.
    - The game passes its Firebase config: no `import.meta.env` inside the kit.
    - Exports `loadAuth(config)`, `<AuthProvider config={…}>`, `useAuth()` (the user, `signIn()` by Google redirect,
      `signOut()`, `idToken()`).
  - **`@luismlorenzana/uma-kit/places`:** the frames below.
- **`BootGates`:** the order is fixed:
  1. splash;
  2. sign-in (when auth is on and no user);
  3. boot (the game's promise);
  4. first launch (the game's component, or none);
  5. start page (the game's `startPath()`).

  The game passes each step's content and words.
  - **uma-rpg:** first launch is a trainer name and 20 Uma Tickets; the start page is the last page.
  - **uma-racer:** a new account starts on the Stable's Locked tab; a pending tap opens the Farm; otherwise the last
    page.
- **`UpdateNotice`:** "Update ready · Restart", never forced mid-action. Port uma-rpg's `update-lifecycle` with its
  test, and make the words a prop.
- **`AccountPage`:**
  - **Sections:** rename (max length from a prop), a wallet grid (`{ icon, value, label }[]`), Appearance (move
    uma-rpg's `AppearanceCard` here; it already uses the kit's `Tabs` and `setAppearance`), a notifications slot
    (`ReactNode`), info rows (`{ label, value }[]`), and sign out.
  - The game fills each section; empty sections are left out.
- **`ShelfView`:** shelf tabs, grade chips (G1–G10, with a "highest only" option), and an item grid with counts.
  Tapping an item opens a stock sheet with Sell ×1, 10 or All. Items draw through SC2's `WorkArtProvider` `Item`
  component if it has landed; if not, through a `renderItem` prop. The prop works either way.
- **`ExchangeRows`:** rows of `{ icon, name, detail, price: { mark, amount }, disabled? }`, and a confirm sheet with
  the quantity and the total.
- **`ProfileFrame`:**
  - **Header:** a `portrait` slot (`ReactNode`, so the game passes SB3's `UmaBust` once it lands), the name, the title,
    `formatLevel` from SB2 (or a plain string until then), and chips.
  - **Body:** a tab bar (`{ key, label }[]`, the active key, `onTab`) and the active tab's body.
- **`UnlockConfirm`:** the Uma Tickets chip with `N → N−1`, "Unlocking is final.", and Confirm. uma-racer's reveal
  ceremony stays in uma-racer.
- **Words:** every string comes from props, with English defaults.

## Do

1. **Build `src/auth/`.** Port and merge both games' `firebase.ts` and `AuthProvider.tsx`, keeping whichever handles
   the redirect result and token refresh better. Note the choice under Decisions.
2. **Build `src/places/`** with the frames above, porting markup and behaviour from the files in Context, and using
   the kit's tokens, so light and dark both work.
3. **Tests (Node):** `update-lifecycle` (ported), the boot step order as a pure state machine (`nextGate(state)`),
   wallet and shelf helpers (grade chips, the sell quantity), and the exchange total.
4. **Wire both subpaths:** exports, `check-dist.mjs` (`'auth'`, `'places'`; `/auth` must not load `firebase` at
   import), and the README's table and a usage sketch.
5. **Prove it in uma-rpg before releasing.** Build the kit and copy it into a uma-rpg worktree. Swap the Account page
   and the boot gates onto the kit on a scratch change, and check in the iOS Simulator's Home Screen app, light and
   dark: sign-in is skipped locally, first launch shows on a fresh save, the Account's sections render. Revert.
6. **Release:** a minor changeset; version and publish. Log a P-decision.

## Done when

- [ ] `pnpm lint && pnpm test && pnpm build` pass. `check-dist` loads `/auth` and `/places`, and importing `/auth`
      doesn't load `firebase`.
- [ ] The Simulator check in step 5 was done and described.
- [ ] No string in `src/places/` or `src/auth/` is one game's words, outside defaults.
- [ ] The new uma-kit version is published, and the P-decision is logged.

## Deliver

- Claude: commit to `main`, `feat(kit): uma-kit/auth and uma-kit/places (SD2)`.
- ChatGPT: branch `sib/sd2-kit-places`, a pull request with the same title.
- Reply with the version and each frame's props as shipped. Flag it done.
