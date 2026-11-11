# @luismlorenzana/uma-data

## 1.5.0

### Minor Changes

- 834b88e: Add the `outfit-renders` image family: each outfit's full-body 3D render, head to toe (768 × 1024, transparent,
  lossless WebP). Additive: an older reader skips the family and reads the rest of the art index as before (P137).

## 1.4.0

### Minor Changes

- Add optional outfit sprite sets, validated packed pages and frame metadata, a checked client loader, and synthetic release helpers. Existing releases and clients remain compatible.

## 1.3.0

### Minor Changes

- fc7906f: The `outfit-glass-order` image family: each window's pane map, for lighting it pane by pane (P84). A game on 1.2.0 drops
  it when parsing.

## 1.2.0

### Minor Changes

- Add the `outfit-glass` art family: each outfit's bust as a 512 px stained-glass window, keyed by outfit id. Additive: a game on an older uma-data drops the family when it parses the art index, and keeps working.

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
