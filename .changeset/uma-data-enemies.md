---
'@luismlorenzana/uma-data': minor
---

The `enemies` set and the `enemy-keys` family (uma-quest Q16 part A, P152; docs/sprites/enemy-keys.md), both additive:

- `enemies`, an optional set (`OPTIONAL_SET_NAMES`): every unit on the owner's enemy boards by a stable id from 700001,
  with her franchise code, tier (`regular`, `key`, `boss`) and name. `parseEnemy`, `parseOptionalSet('enemies', …)`,
  and `client.enemies(manifest)`, null for a release without it.
- `enemy-keys`: one manifest per published enemy (her tier's poses, each pose's anchors, a boss's battle layers with
  pivots, her canvas and display targets) and her lossless WebP images, listed in the art index's new optional
  `enemyKeys` map. `parseEnemyKey`, `enemyKeyPaths`, `ENEMY_POSES`, `ENEMY_CANVAS`, `BOSS_LAYERS`, `ENEMY_BORDER`, and
  `client.enemyKey(manifest, art, enemyId)`, null for an enemy without published art.
- Testing: `syntheticEnemies()`, `syntheticEnemyKey(tier)`, and `buildMemoryRelease`'s `enemies` and `enemyKeys`.

Older clients ignore both; a release without them parses as before.
