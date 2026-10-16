# SB3 — `uma-kit/album`: faces, busts, the album chrome, views, the virtual grid and `UmaPicker`

**uma-platform · Either · L · Needs: SB2 released · Unblocks: SB4, SB6, SC2.**

## Why

Phase B's screens: one Uma list in both games, with face crops at 5 columns, busts where an Uma is large, and one
picker for every "choose an Uma". The engine is SB2's. This packet is the React half.

## Context (read first)

- `docs/sibling/phases.md` § Phase B: the table and the owner's decisions of 2026-10-16.
  - **Faces** wherever an Uma is small: lists, pickers, workers, pips, seats.
  - **Busts** where she's large: cards, the profile header, fights and races.
  - **Chibis** only on the plaza.
- SB2's `@luismlorenzana/uma-kit/roster`: the engine, the level rule, `formatLevel`, the pure preferences.
- **The source to port, uma-racer `origin/main`** (`git -C ~/workspace/uma-racer show origin/main:<path>`):
  - `apps/web/src/ui/album/AlbumChrome.tsx`, `FilterTray.tsx`, `SortSheet.tsx`, `VirtualGrid.tsx`, `useArt.ts`;
  - `apps/web/src/ui/albumPrefs.ts` (its `useAlbumPrefs` hook);
  - `apps/web/src/ui/UmaPicker.tsx` (172 lines: `UmaPickerProps`, `UmaPickerSort`);
  - `apps/web/src/ui/UmaArt.tsx` (`UmaFace`, `UmaArt`);
  - `apps/web/src/ui/ArtSquare.tsx`, `ArtTile.tsx`, `ContentArt.tsx`;
  - `apps/web/src/places/stable/Page.tsx` and `model.ts` (how the Stable composes them).
- **uma-rpg's side:**
  - the Stable: `apps/web/src/places/stable/StablePage.tsx`, `FiltersSheet.tsx`, `stable-prefs.ts`;
  - its picker: `places/party-hall/UmaPicker.tsx`;
  - art: `apps/web/src/master/art.tsx` (`useArtUrl`, `imagePath`, `AtlasSprite`: authenticated fetch of uma-data
    art, atlas frames for `outfit-icons`).
- **The kit:** `src/ui/BottomSheet.tsx` (`Sheet`), `src/ui/Tabs.tsx`, `Chip.tsx`, `Button.tsx`, the icons
  (`src/ui/icons`), `src/ui/art.tsx` (`KitArtProvider`, the pattern to copy for art injection), and `theme.css`'s
  tokens.

## Decisions made

- **Subpath:** `@luismlorenzana/uma-kit/album`, at `src/album/`. React; peers as the kit's.
- **Art injection:** the kit never fetches art. A game wraps its app in `<AlbumArtProvider art={…}>`:
  ```ts
  export type UmaArtKind = 'face' | 'bust' | 'chibi' | 'icon'
  export interface AlbumArt {
    /** A hook, called once per tile render: the URL when loaded, null while loading or when the outfit has none. */
    useUrl(kind: UmaArtKind, outfitId: string): string | null
    /** What a tile shows while its URL is null: in uma-rpg an atlas icon. Optional. */
    Fallback?: (props: { outfitId: string; size: number }) => ReactNode
  }
  ```
  uma-rpg implements `useUrl` with `useArtUrl(imagePath(art, family, key))`, and uma-racer with its content runtime's
  `useArt`. SB1's `outfit-faces` is the `face` kind. Until it lands, a game maps `face` to the icon.
- **Components:**
  - `FaceTile`: square, or `round` for pips and slots. Props: `outfitId`, `size`, corner `badges` (four optional
    `ReactNode`s), `locked` (dimmed, with a lock), `selected` (an accent ring), `label` (its accessible name).
  - `UmaBust`, and `UmaChibi` (for the plaza; a game uses it nowhere else, by the owner's decision).
  - `AlbumChrome`: the search field, quick picks (presets), tabs (All, Owned, Locked, with counts), the sort sheet, the
    filter tray, and the view switch. These are ports of racer's, with every string from a `words` prop whose English
    defaults are racer's.
  - `AlbumGrid` on the ported `VirtualGrid`. Views:
    - `icons`: `FaceTile`s, **5 columns** on a phone (about 68 pt). The default.
    - `cards`: busts with name and `formatLevel`, 3 columns.
    - `list`: a face, name, level and the game's chips, 1 column.
    - A row's badges and chips come from a `renderBadges(row)` / `renderChips(row)` prop.
  - `useAlbumPrefs(album, schema)`: the hook over SB2's pure preferences (saved views, the seen set, the last view and
    sort).
  - `UmaPicker`: the port of racer's, opened in a kit `Sheet`.
    - **Props:** `rows`, `title`, a compact chrome (search, sort, filter), and `order` (`byLevel` by default; a work
      picker passes `workOrder`).
    - **Unpickable rows:** `disabled(row)` returns a reason string or null. A disabled row shows dimmed with its
      reason.
    - **Picking:** `max` (1, or up to n for multi-select); `onPick(ids)`; and `onClose`.
- **Words:** every user-facing string comes from props, with English defaults. The two games' words differ (uma-rpg
  says "Craft Level", uma-racer "Farm Level").
- **Out of scope:** any game change (SB4, SB6). The data crop is SB1.

## Do

1. **Port** the five album files and `UmaPicker` into `src/album/`, replacing racer's content and art calls with
   `AlbumArt`, and racer's words with `words` props. Keep behaviour: virtualization, the filter tray's counts, presets,
   saved views (up to 20), and the New badge driven by the seen set.
2. **Add** `FaceTile`, `UmaBust` and `UmaChibi`, and `AlbumGrid` with the three views and 5 columns by default.
   Columns come from a prop with that default, so a tablet can pass more.
3. **Tests (Node):** the pure helpers you add (column math, picker ordering with `disabled`, multi-select caps). The
   components are proved in the games.
4. **Wire the subpath:** exports, `check-dist.mjs` (`'album'`), and the README table, with a short usage snippet
   showing `AlbumArtProvider` and a Stable composed of `AlbumChrome` and `AlbumGrid`.
5. **Prove it in a game before releasing.** Build the kit and copy it into uma-rpg locally, as the master prompt says.
   Mount `AlbumGrid` in the Stable on a scratch change you don't commit, and check in the iOS Simulator's Home Screen
   app, light and dark:
   - 5 columns of tiles (icons standing in for faces until SB1);
   - search, sort and filters work;
   - a 268-outfit list scrolls smoothly.
   Revert the scratch change.
6. **Release:** a minor changeset; version and publish as the queue README says. Log a P-decision.

## Done when

- [ ] `pnpm lint && pnpm test && pnpm build` pass. `check-dist` loads `/album`.
- [ ] The Simulator check in step 5 was done, and is described in your reply (views, scrolling, both themes).
- [ ] No string in `src/album/` is hard-coded to one game's words; grep for "Farm", "Craft" and "Race".
- [ ] The new uma-kit version is published, and the P-decision is logged.

## Deliver

- Claude: commit to `main`, `feat(kit): uma-kit/album, one Uma list and one picker (SB3)`.
- ChatGPT: branch `sib/sb3-kit-album`, a pull request with the same title.
- Reply with the version, the `AlbumArt` interface as shipped, and anything SB4 or SB6 must know. Flag it done.
