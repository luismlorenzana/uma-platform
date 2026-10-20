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
| `@luismlorenzana/uma-kit/work` | `WorkProvider`, engine selectors, compact `SlotRow`/`PeekRow`, queues, speed-up and recall, `FacilityHeader`, `TargetsStrip`, `StoppedQueueCard`, `SizeChips` and `JobSheet` (SC2) |
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

## Work (`/work`)

Install the optional peer `@luismlorenzana/uma-work@0.1.0` when using this subpath. It reads the game's engine state
directly; a game supplies its `WorkEnv`, callbacks, names and art, rather than filling a separate set of view models.

```tsx
import {
  WorkProvider, WorkArtProvider, FacilityHeader, SlotRow, JobSheet, readJobQuery,
} from '@luismlorenzana/uma-kit/work'

<WorkArtProvider art={{ Item: ({ id, size }) => <ItemIcon id={id} size={size} /> }}>
  <WorkProvider state={state} now={now} env={workEnv} actions={workActions}
    names={{ uma: umaName, item: itemName, place: placeName }}
    words={{ workLevel: 'Craft Level', workLevelLabel: 'Craft Lv {level}' }}
    renderMoney={amount => <Money amount={amount} />}>
    <FacilityHeader building={building} />
    {slots.map(slot => <SlotRow key={slot.slot} slot={slot} repeat
      onStart={() => openJobLink(slot)} onQueue={outfitId => openQueueLink(slot, outfitId)} />)}
    <JobSheet query={readJobQuery(searchParams)} building={building} title={title} rows={candidateRows}
      request={(item, count) => ({ kind: workKind, item, count })}
      initialJob={firstRecipe} sizeRule={{ mode: 'count', sizes: [1, 4, 8, 20, 40] }}
      renderWhat={({ outfitId, job, onChange }) => <RecipePicker outfitId={outfitId} value={job} onChange={onChange} />}
      onClose={closeJobLink} />
  </WorkProvider>
</WorkArtProvider>
```

- **`WorkProvider`** takes `state`, integer-millisecond `now`, `env`, `actions`, optional `names`, `words`,
  `describeRequest`, `formatRefusal`, `renderMoney` and `ticketOffer(state, count)`. Wrap it in the existing
  `AlbumArtProvider` and `MotionRoot`; faces are SB3's `FaceTile`. `WorkArtProvider.Item` receives `{ id, size }`.
  `useWorkView()` exposes selectors built once for that state/clock/env. Queue projection settles all workers in the
  engine's order, without collecting their outputs, so warnings account for competing stock.
- **`actions`** can supply `collect({ outfitId })`, `repeat({ outfitId })`, `speedUp({ outfitId, startedAt, tickets })`,
  `finish({ outfitId, startedAt })`, `buyAndFinish({ outfitId, startedAt, tickets, quote })`, `recall({ outfitId })`,
  `start({ outfitId, slot, request })`, `queue(engineQueueInput)`, `unqueue({ outfitId, index })`,
  `upgrade({ building })`, `restart({ outfitId })` and `dismiss({ outfitId })`. Missing actions are unavailable.
  Repeat owns its Collect + Repeat sequence; restart owns restoring the complete dropped queue. The callbacks go
  through the game's real operation port, which must recheck against current state. Request builders use the same
  kinds registered in `env`; a game's typed adapter narrows the neutral `WorkRequest` at its operation boundary.
- A callback returns `void` or `{ kind: 'done', message? }` on success, an engine `Refusal` or
  `{ kind: 'say', message }` without success, or `{ kind: 'ask', message, confirm }` to ask again with new numbers.
  `confirm` returns the same answer shape. A rejected callback shows its error message (or the default failure
  sentence). `useTap` prevents concurrent taps across the provider; `TapNoteLine` draws the answer and confirmation.
- **`SlotRow` props:** `slot`, optional `what: { name, icon? }`, `startTo`/`onStart`, `queueTo`/`onQueue`,
  `startLabel`, and `repeat`. It reads its own card from the provider. `PeekRow` has the same props at the smaller
  side-panel size. Links use the game's router; callbacks allow another navigation scheme. A new entry closes the
  previous entry's controls, including when Finish immediately starts a queue. Collect counts span every entry.
- **`JobSheet` props:** `query: JobQuery | null`, `building`, optional `room`, `title`, `rows`, `request(job, count)`,
  `renderWhat({ outfitId, job, count, onChange })`, `onClose`, and optional `onDone`, `initialJob(outfitId)`,
  `sizeRule`, `maxCount`, `disabled(row)`, `picker`, `renderPreview(preview, selection)` and `empty`.
  `picker` accepts the album's facets, sorts, order, descriptions, badges, chips and words. It uses `UmaPicker` with
  `workOrder` by default. The game supplies candidates and any additional eligibility rule (e.g. Free only); a queue
  fixes its named worker. Recipe choices are a render prop. Planning, stock, inputs, EXP and start/queue refusals
  come from the engine. EXP stays in the game's units; `renderPreview` can format it and add shortfall links.
  Selection survives clock ticks; another link opens a fresh selection.
- **Links:** `jobQuery`, `readJobQuery`, `withoutJobQuery`, `inAppPath` and `JOB_QUERY_KEYS` support
  `?job=…&uma=…&count=…&queue=1&slot=…&back=…`. A present, empty `job` opens an unselected sheet. Back handling
  stays in `onClose`/`onDone`; closing preserves unrelated query fields such as `peek`. Return paths must be in-app.
- **`SizeChips`** takes `start`, `itemSeconds`, `max`, `value`, `onChange`, optional `heading` and `rule`.
  `rule.mode` is `count` or `duration`; `sizes` can be sparse, including ×40. A duration rule may supply
  `recommend(start, cappedItemSeconds, max) → { size, label, overnight?, idleMs? }`. The game calculates fitting to
  check-ins; the kit displays the chosen mark, duration and idle time. Keyboard arrows move among the radio chips.
- **Buying tickets:** `ticketOffer` returns `{ price, label, refusal? }`, or null when the game does not sell them.
  `buyAndFinish` must recheck the entry's `startedAt`, the price and stock before charging; the kit never performs an
  economy operation itself. Finish uses the callback named `finish`, or `speedUp` with the required count. Wasting
  part of a ticket and buying tickets both require an explicit confirmation.
- **Other pieces:** `QueueChips` edits order/removes requests; `QueueLine` and `QueueCount` only show them.
  `RecallSheet` and `RecallPreviewLines` read the engine's real recall receipt. `FacilityHeader` combines
  `PlaceStats` and `UpgradeButton`, using the game's building table and money renderer. `TargetsStrip` takes authored
  `{ id, item, short, label, locked?, to?, onPick? }[]`; target planning stays in the game. `StoppedQueueCard` takes
  `outfitId`, optional `onDone` and `children` for game-owned recovery suggestions such as buying or making inputs.
- **Pure exports:** `workView`, `projectWork`, `heldCard`, `slotCards`, `speedUpModel`, `recallPreview`, `queueChips`,
  `sizeChipsView`, `upgradeView`, `chooseSlot`, `shortItems`, `durationText`, `workWords` and `itemsList`.
  The work subpath loads in Node without Phaser, Firebase, or uma-data. jsdom is a development-only dependency for
  testing real React actions, confirmation flows, and the entry-change safeguard.

### Adoption notes (SC4 and SC5)

SC4 wraps the RPG's existing SC3 state/`WorkEnv`; its callback adapter maps wallet tickets, Laurels and the four kinds.
Its gear and gem grids fill `renderWhat`; refining passes count sizes up to ×40. SC5 first adopts `uma-work` and maps
the old `farmExp` entry/plan field to `exp`; it can then replace its local work pieces with these exports. Check-ins,
suggestions, Speed Up All, the planner and purchase rules stay in the racer. Both use their existing album art
provider, injected item art, and the provider's words for their own level labels. Adoption/deploys remain separate
game packets.

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
- **Complete offline boot (SE4):** `createContentRuntime({ ...clientOptions, store, readMetadata, parseMetadata,
  prepare })` prepares a pinned release with game-owned metadata/shapes. Only a complete preparation is saved;
  failures try the last complete snapshot, except 401/403. `load()` returns `{ value, client, origin }`, and `clear()`
  cancels pending loads and revokes URLs without deleting persistent bytes or the snapshot. `contentSnapshotStore(key)`
  tolerates unavailable localStorage; `metadataKey`, `cacheName` and `cacheKey(hash)` preserve a game's existing cache.
- **Every set, atlas and image** uses the same size/full-SHA-256 verified cache, including disk hits. Required private
  data calls `client.pack(path, { path, bytes, sha256 })` for the same guarantee. Unenveloped private indexes stay fresh;
  existing hash-named `packUrl` caching is not a full-hash verification contract.
- **URL lifetime:** `useArtUrl(pathOrFallbackPaths, optionalSource)` holds while displayed, clears a previous identity
  immediately and ignores late completions. Imperative/canvas consumers call `client.hold(path)` before `artUrl`, release
  after playback and `dispose()` at session end. The bounded LRU never revokes held or just-returned images; released
  excess is trimmed. `urlLimit` configures the in-memory window. `AtlasFrame` draws an already-loaded responsive atlas
  asset, with the same crop as `AtlasSprite`; neither copies a game component.
- **`contentProblem(error)`** names what went wrong (`signed-out`, `not-allowed`, `missing`, `damaged`, `offline`,
  `failed`); the game says it in its own words.

## Changing it

The kit changes here, in a uma-platform session, and ships as a new version; each game pins it exactly. Try a change in a
game with `pnpm link` (never committed). A game that needs a new behaviour adds an option here instead of copying a
component.
