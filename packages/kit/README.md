# @luismlorenzana/uma-kit

The app around both Uma games, coded once (uma-platform [P48](../../docs/decisions.md),
[sibling plan](../../docs/sibling/README.md)): the shared theme, primitives, shell and Hub map of uma-rpg and uma-racer.
The games stay their own: rules, screens, saves and which places exist.

| Import | What |
|---|---|
| `@luismlorenzana/uma-kit/theme.css` | Tokens in light and dark (the same names in both), base styles, utilities |
| `@luismlorenzana/uma-kit/ui` | Icons, `UiMark`/`TierCrest`, `Button`, `Chip`, `Tabs`, `Panel`, `BottomSheet`/`Sheet`, `HelpButton`, `AnimatedNumber`, `MotionRoot`, appearance and device preferences, `KitArtProvider` |
| `@luismlorenzana/uma-kit/shell` | `AppFrame`, `AccountBar`, `BottomBar`, `PlaceMenu`, `PeekPanel`, `PlaceHeader`, `FloatingPill`, nav helpers |
| `@luismlorenzana/uma-kit/hub` | `HubMap` (canvas, place links, swipe), `HubCanvas`, `PlaceTargets`, `Pips`, the grid, terrain, palettes and markers |
| `@luismlorenzana/uma-kit/roster` | Pure album queries, level/work ordering, master-data row projection and device preferences |
| `@luismlorenzana/uma-kit/album` | Injected Uma art, `FaceTile`/`UmaBust`/`UmaChibi`, `AlbumChrome`, the virtual `AlbumGrid`, album preferences and `UmaPicker` |
| `@luismlorenzana/uma-kit/auth` | Google sign-in through Firebase, loaded only by `import()`: `AuthProvider`, `useAuth`, `loadAuth`, `idToken`, `signIn`, `signOut` (0.5.0, SD2) |
| `@luismlorenzana/uma-kit/places` | The screens around the game, as frames: `BootGates`, `UpdateNotice` and the update lifecycle, `AccountPage`, `ShelfView`, `ExchangeRows`, `ProfileFrame`, `UnlockConfirm` (0.5.0, SD2) |
| `@luismlorenzana/uma-kit/content` | Master data and art through the game's API: `createContentClient`, `ContentProvider`, `useContent`, `useArtUrl`, `usePackUrl`, `imagePath`, `AtlasSprite`, `contentProblem` (0.6.0, SE2) |

## Use it in a game

```css
/* index.css */
@import 'tailwindcss';
@import '@luismlorenzana/uma-kit/theme.css';
@source '../node_modules/@luismlorenzana/uma-kit/dist';
/* the game's @font-face rules for 'Outfit Variable' and 'Inter Variable' */
```

```tsx
// main.tsx
import { configureKit, initAppearance, KitArtProvider, MotionRoot } from '@luismlorenzana/uma-kit/ui'
import uiUrl from '@luismlorenzana/uma-art/ui/atlas.png?url'
import ui from '@luismlorenzana/uma-art/ui/atlas.json'
// … tiles and buildings the same way

configureKit({ storagePrefix: 'my-game:' })
initAppearance()
root.render(
  <MotionRoot>
    <KitArtProvider art={{ ui: { url: uiUrl, index: ui }, tiles: …, buildings: … }}>
      <App />
    </KitArtProvider>
  </MotionRoot>,
)
```

- **Peer dependencies:** React 19, react-router 7, Motion 12; Phaser 4.2.1 for `/hub` (loaded lazily when a map mounts).
- **No game state:** components take values, words and links as props. The game keeps its stores and its words.
- **Art:** uma-art's atlases come in through `KitArtProvider`, so the kit never imports image files. A mark or frame the
  atlas lacks falls back (a `fallback` node, or a code-drawn building).
- **Firebase** is an optional peer: only `/auth` uses it, and only through `import()`, so it never lands in the startup
  bundle and a game without sign-in never loads it.
- **Appearance:** `initAppearance()` applies the device's choice (System, Light or Dark: `setAppearance`) as
  `<html data-theme>`, and keeps the browser's theme colour on the page colour.

## One Uma album (`/roster`, `/album`)

The game owns its art loader and rows. The kit owns how they browse and draw:

```tsx
import { AlbumArtProvider, AlbumChrome, AlbumGrid, useAlbumPrefs, type AlbumArt } from '@luismlorenzana/uma-kit/album'
import { runAlbumQuery } from '@luismlorenzana/uma-kit/roster'

const art = {
  useUrl: (kind, outfitId) => useArtUrl(imagePath(master.art, familyFor(kind), outfitId)),
  Fallback: ({ outfitId, size }) => <OutfitIcon id={outfitId} size={size} />,
} satisfies AlbumArt

function Stable() {
  const prefs = useAlbumPrefs('stable', schema)
  const result = runAlbumQuery(rows, facets, prefs.query)
  return (
    <AlbumArtProvider art={art}>
      <AlbumChrome {...chrome} query={prefs.query} onQueryChange={prefs.setQuery} total={result.total} counts={result.counts}>
        <AlbumGrid rows={displayRows(result.rows)} view={prefs.query.view} columns={5} />
      </AlbumChrome>
    </AlbumArtProvider>
  )
}
```

- `AlbumArt.useUrl(kind, outfitId)` is a game hook; the kit never fetches art. `Fallback` is normally the outfit-icon
  atlas frame while a face, bust or chibi loads.
- `AlbumGrid` opens on five face columns, with three bust cards or a one-column list as the other views. Badges and
  chips are callbacks, so game state stays in the game.
- Every visible word has an English default in `ALBUM_WORDS`; pass `words` for game vocabulary such as a work-level
  name. `UmaPicker` uses `byLevel` unless a work picker passes `workOrder`.

## Getting in and the places (`/auth`, `/places`)

```tsx
// main.tsx: the game passes its Firebase config; without one (local dev) auth is off and the user is `local-dev`.
import { AuthProvider } from '@luismlorenzana/uma-kit/auth'
import { watchAppUpdates } from '@luismlorenzana/uma-kit/places'
import { registerSW } from 'virtual:pwa-register'

const firebase = { apiKey: import.meta.env.VITE_FIREBASE_API_KEY, authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN, projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID }
watchAppUpdates(registerSW)
root.render(<AuthProvider config={firebase}><RouterProvider router={router} /></AuthProvider>)

// Root.tsx: splash → sign-in → boot → first launch → start page, always in that order.
const auth = useAuth()
<BootGates
  auth={auth}
  boot={async ({ uid }) => ({ firstLaunch: await openDeviceSave(uid) === 'new' })}
  firstLaunch={(done) => <TrainerNameStep onDone={done} />}   // uma-rpg; uma-racer has none
  startPath={() => (umas === 0 ? '/town/stable?tab=locked' : lastPage())}
  words={{ name: 'Uma RPG', tagline: 'A party RPG for one trainer.' }}
>
  <UpdateNotice />
  <Outlet />
</BootGates>
```

- **`BootGates`** runs the game's `boot` once per user and attempt (StrictMode's second effect reuses it), shows the
  sign-in gate when auth is on and nobody is signed in (with "Sign-in didn't finish" after a failed redirect), a retry
  when the boot fails, the first-launch step only when the boot says so, then opens `startPath()` once, only when the
  app was opened at `/`.
- **`criticalAction(fn)`** holds an update's Restart until `fn` has committed; wrap every gameplay tap.
- **`AccountPage`** takes `rename` (`value`, `maxLength`, `normalize?`, `onSave`), `wallet` (`{ icon, value, label }[]`),
  `appearance` (default on), `notifications` and `sections` (`ReactNode`), `info` (`{ label, value }[]`) and
  `onSignOut`. A section left out isn't drawn.
- **`ShelfView`** takes `shelves`, `items` (`{ id, name, shelf, grade, count, group? }`), `renderItem`, and optionally
  `layout` (`grid` or `rows`), `rowDetail`, `details`, `price`, `sizes`, `ask` (a question before selling) and
  `onSell`. Grade chips offer every grade, one grade, or the highest held per `group`.
- **`ExchangeRows`** takes `rows` (`{ key, icon, name, detail?, price: { mark, amount }, disabled? }`), `balance` and
  `onBuy`; its sheet offers ×1, ×5, ×10, ×25 or a typed quantity, the total, and "Need N more" when short.
- **`ProfileFrame`** takes `portrait`, `name`, `title`, `level` (SB2's `formatLevel` once it lands), `chips`, `corner`,
  `summary`, `locked`, and `tabs` with `tab` and `onTab`; its children are the active tab's body.
- **`UnlockConfirm`** shows the Uma Tickets going N → N−1, "Unlocking is final." and Confirm.
- **Words:** every string is a prop with an English default (`ACCOUNT_WORDS`, `SHELF_WORDS`, …).

## Content (`/content`)

```tsx
import { ContentProvider, createContentClient, useArtUrl, AtlasSprite, imagePath } from '@luismlorenzana/uma-kit/content'

const content = createContentClient({ token: () => auth.idToken() })   // base '/api' by default
root.render(<ContentProvider client={content}>…</ContentProvider>)

const manifest = await content.manifest()                  // the channel's, once a session
const outfits = await (await content.release()).set(manifest, 'outfits')   // uma-data's client, for the game's sets
const bust = useArtUrl(imagePath(art, 'outfit-busts', outfitId))          // a blob URL, or null while loading
<AtlasSprite art={art} family="outfit-icons" frameKey={outfitId} size={48} />
const enemies = JSON.parse(new TextDecoder().decode(await content.pack('enemies.json')))
const face = usePackUrl(enemy.face.path)
```

- **Release files** (`atlases/…`, `art/…`) must be in the manifest; their bytes are checked against its SHA-256 and kept
  in memory for the session and in Cache Storage (`uma-kit-content`) under that hash, so art survives a restart. A
  damaged cached copy is downloaded again.
- **Private packs** come from `/api/content/`; hash-named files are kept in Cache Storage too, index files are fetched
  fresh.
- **uma-data loads on first use** (`import()`), never at import, so it stays out of the startup bundle.
- **`contentProblem(error)`** names what went wrong (`signed-out`, `not-allowed`, `missing`, `damaged`, `offline`,
  `failed`); the game says it in its own words.

## Changing it

The kit changes here, in a uma-platform session, and ships as a new version; each game pins it exactly. Try a change in a
game with `pnpm link` (never committed). A game that needs a new behaviour adds an option here instead of copying a
component.
