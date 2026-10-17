---
'@luismlorenzana/uma-kit': minor
---

`/content` (SE2, P57): master data and art through the game's API. `createContentClient({ base, token })` wraps
uma-data's release client and fetches private packs; release art is checked against the manifest's SHA-256 and kept
in memory and in Cache Storage under that hash. `ContentProvider`, `useContent`, `useArtUrl`, `usePackUrl`,
`imagePath`, `AtlasSprite` and `contentProblem`. uma-data loads on first use.
