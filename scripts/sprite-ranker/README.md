# Uma Sprite Studio

A tiny local HTML app for deciding which outfits to author as 2D sprites. No framework, external image hosts,
accounts or browser-storage dependency. It reads the private local master release and saves your choices to disk.

From the repo root, with Node 22 and dependencies installed:

```sh
pnpm rank:umas
```

Open **http://127.0.0.1:4318**. Stop the server with Ctrl+C. A local `content/release/manifest.json`, its character
and outfit sets, and its art index/images must already exist (see [new Umas](../../docs/new-umas.md)). This tool does
not fetch or publish content.

- Review one outfit at a time and click SS, A1, A2, B or F. Keys 1–5 do the same; arrow keys browse.
- The default queue is unranked outfits. Search, filter buckets, show originals only, or review any tier.
- All variants are independent outfits. Their own best running-style grades determine their bucket.
- Click any small board portrait to revisit it and change its tier. Remove rank returns it to the unsorted queue.
- Undo restores the most recent individual edit. Turn off “Next after ranking” to stay on an outfit.
- Each successful edit is atomically saved to **`content/review/sprite-ranker/rankings.json`** (gitignored).
  Reloading the page or restarting the server keeps the board. Two tabs cannot silently overwrite one another:
  a stale tab must reload. Run one server per JSON file.
- Export JSON downloads a backup. Import validates a complete file and asks before replacing the board.
  Unavailable outfit IDs are retained in the file. Known IDs get their bucket and character ID from the current release.

The file contains `schemaVersion: 1`, a revision and timestamp, and `rankings` entries with `outfitId`, `characterId`,
`tier` and `bucket`. It contains no copied names or art. Unranked outfits have no entry. This planning schema is
independent of the master-data schema; the tool changes neither games nor packages.

The bucket mapping is a local adapter of **uma-rpg Classes v3 §5 / CV19**: highest running-style grade, ties included;
Front first, then pure Pace, then Pace with a closer, then End, then pure Late. Thus pure End also belongs in
“Late + End”, and Pace + End belongs in “Pace + Late”. SS is the first-pass baseline; A1/A2 are authoring variants,
unrelated to the RPG's class tiers.

For an isolated worktree, point at the main checkout's private content, or choose another port:

```sh
UMA_RANKER_CONTENT_DIR=/absolute/path/to/uma-platform/content UMA_RANKER_PORT=4319 pnpm rank:umas
```

The server binds only to `127.0.0.1` and serves just the app and catalog portraits. Content and rankings stay local;
never commit the JSON, copied datasets, images, or generated packs.
