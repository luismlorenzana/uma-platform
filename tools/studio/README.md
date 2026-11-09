# Uma Studio

Run `pnpm studio` at the workspace root and open **http://127.0.0.1:4318**.
It binds only to loopback. `UMA_CONTENT_DIR` selects another private content folder; `UMA_STUDIO_PORT` is available
for isolated verification. The client builds before startup; the server loads private data at runtime.

Pages:

- **Home** (`/`): a tile for each tier board and sprite tool, then the numbers: each board's cast, every board by
  tier, the career math (P116) and the sources.
- **Tier boards** (`/tiers/<board>`, P113): Playable Umas (`umas`), Uma NPCs (`npcs`), Azur Lane, Genshin Impact,
  Wuthering Waves, Honkai: Star Rail and Zenless Zone Zero bosses (`azurlane-bosses`, `genshin-bosses`, `wuwa-bosses`,
  `hsr-bosses`, `zzz-bosses`), Key enemies (`key-enemies`) and Regular enemies (`regular-enemies`). One scale, SS, S,
  A, B, F: SS to A are a board's cast; B, F and unranked flow to the board below (Playable → NPCs; the boss boards →
  Key → Regular, which also takes NIKKE). Umas rank per character (P114) on the old board's playstyle grid (P117):
  tiers down, the five playstyles across; a character's playstyle is her lead outfit's unless the card's pick says
  otherwise; every outfit is on her card with its grades, and her outfit count is on her portrait. Keys `1`–`5` rank, `0` unranks, arrows
  browse, `[` `]` move within a tier; notes, multi-level undo, drag and drop, a filtered bulk B or F, and board
  import and export. Each board saves to `content/authoring/tiers/<board>.json`; every save rewrites
  `content/authoring/tiers/plan.json`, the plan later tools read. A missing board is seeded once from the old rosters.
  The design: [docs/authoring/tiers.md](../../docs/authoring/tiers.md).
- **Queue** (`/queue`, with `/authoring` retained): travelers and townsfolk, tier/Way/stage filters, next batch,
  drag ordering and accessible up/down buttons. Reset clears that profile's override.
- **Animation desk** (`/sprites/`): stepping, speeds, holds/repeats/revive, face patches, held layers, anchors,
  backdrops, formations and the phone frame. **Field and scene** (`/field/`) show four drawn facings and front emotes.
- **Gates** (`/gates`): keys/turnarounds/checklists beside original portraits, busts and both chibis; key and batch
  set decisions with notes. A set approval requires a current key approval and fourteen verified checks.

The desk, previews and gates accept `?profile=traveler&batch=1` or `?profile=townsfolk&batch=1`.
`ids=<id>,<id>` selects a subset for inspection. Outfits and names come from the private roster/release, never a
bundled character list. Empty selections display a useful empty state.

`content/authoring/sprites/batches.json` preserves assigned batches as
`{ schemaVersion: 1, traveler: [{ batch: 1, outfits: [<id>, ...] }], townsfolk: [] }`.
Assign a batch there when authoring begins, so later ranking or queue edits cannot silently change an existing
wave's review group. Unassigned batches follow the tier/Way rule and `queue.json` overrides. Batch 1's original
assignment is preserved locally. The queue's next batch excludes complete profiles.

Reviews are atomic and serialized, with optimistic concurrency checks. Each decision stores a UTC time, note and
SHA-256 of every covered file; prior decisions remain in history. Keys cover the key, four stills and identity.md;
sets cover all runtime art and atlas. Older five-still key receipts remain valid as historical approvals.
Every load re-hashes; a changed file displays **Changed since approval** and loses publish eligibility.
A saved decision queues `sprites:backup` in the background; the gate page shows completion/failure. Backups serialize.

The Studio serves allowlisted release images and validated paths inside the authoring root, never arbitrary local
files. Writes require JSON, the loopback Host and a same-origin request. Realpath checks reject symlink escapes.
No original art, names, private configs or reviews are bundled or committed. The old app remains in `content/` as
history. Tests use invented records/bytes only; the sprite pipeline's local name/privacy guard covers this package.

## Tier board inputs

- **Umas:** the local master release (characters, outfits, art), grouped by character. The old outfit roster
  `content/authoring/uma-art-roster.json` is frozen (P114): the sprite queue still reads it until TA2, and each
  outfit's card shows its old tier.
- **Azur Lane and NIKKE:** `content/authoring/enemies/catalog.json`, the private schema-1 catalog imported from
  uma-rpg's enemy release (strict `assets/enemies/<id>-<kind>.<hash8>.webp` paths). The old enemy roster
  `content/authoring/enemy-art-roster.json` is history; its roles and tiers seeded the boards and show on each card.
- **Genshin Impact, Wuthering Waves, Honkai: Star Rail and Zenless Zone Zero** (P115, P118): `pnpm tiers:import
  <genshin|wuwa|hsr|zzz>` reads the public character lists (Project Amber, Encore, Project Yatta with StarRailRes, Enka),
  keeps the female characters (HSR by its stories' pronouns plus a by-id list checked by hand), download each one's face, portrait and
  splash once into the ignored `content/authoring/enemies/.cache/`, and write WebP references beside the others plus
  `content/authoring/enemies/imports/<franchise>.json`. Owner-supplied images go in `content/authoring/enemies/inbox/`
  with `inbox/<franchise>.json` (`{ "units": [{ "key", "name", "category", "face", "art", "splash" }] }`).
  `--offline` re-cuts from the cache. Restart the Studio after an import. The next franchises are ranked in
  [docs/authoring/franchises.md](../../docs/authoring/franchises.md).

The Studio serves only catalog images and release art, never arbitrary files. No tier, name or image is committed.

UA8 adds `/props`, the package gallery for 16 held textures and eight emote bubbles. The desk reads uma-art's atlas rectangles, grips, display scale and drawn-bow nock; the scene uses the tail anchors overhead. Hold an emote to inspect a bubble without timing the animation. The old private placeholders remain historical inputs only.

The field preview’s **Direction check** (`#directions`) plays left and right walk/run cycles on one clock, with pause, frame stepping and native/2× zoom. Townsfolk offer walking only. In a townsfolk batch, its character picker also offers batch 1’s key-approved travelers; the scene’s companion picker includes them while extended sets await their set gate. NPC desks hide combat equipment and the combat formation, and expression choices follow each set’s actual patches.
