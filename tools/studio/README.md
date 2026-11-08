# Sprite Studio

Run `pnpm studio` at the workspace root and open **http://127.0.0.1:4318**.
It binds only to loopback. `UMA_CONTENT_DIR` selects another private content folder; `UMA_STUDIO_PORT` is available
for isolated verification. The client builds before startup; the server loads private data at runtime.

Four pages:

- **Ranker** (`/`): the existing roster board. Only this page writes the roster.
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

UA8 adds `/props`, the package gallery for 16 held textures and eight emote bubbles. The desk reads uma-art's atlas rectangles, grips, display scale and drawn-bow nock; the scene uses the tail anchors overhead. Hold an emote to inspect a bubble without timing the animation. The old private placeholders remain historical inputs only.
