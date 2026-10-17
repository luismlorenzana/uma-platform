# @luismlorenzana/uma-data

## 1.1.0

### Minor Changes

- 1a6c43b: Add the `outfit-faces` per-record art family for small Uma tiles.

## 1.0.0

### Major Changes

- Schema major 1: neutral master data for every Uma game.

  - Types and runtime parsers for characters, outfits (full stats per star level, growth rates, aptitudes, skills),
    support cards (raw effect tables, unique effects, hints, event skills), skills (Japan and Global mechanics, inherited
    and evolved versions), scenarios, races, tracks, courses, career objectives and the art index.
  - Release manifests and channels for the private bucket layout (`files/`, `manifests/v1/`, `channels/v1/`).
  - `createReleaseClient` reads channel → manifest → files through an injected source, checks every byte and SHA-256,
    and validates each set. `createFetchSource` reads through a game's own endpoint.
  - `@luismlorenzana/uma-data/testing`: synthetic master records and an in-memory release for game tests.
