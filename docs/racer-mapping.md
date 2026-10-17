# uma-racer → master data mapping

How every field of uma-racer's current content packs (`origin/main`, `packages/domain/src/content.ts`, written by
`scripts/data` and `scripts/assets`) comes from master data. Phase 3 replaces uma-racer's GameTora pipeline with one
adapter module that reads a master release and produces these shapes (architecture §2.4). Field-level detail of the
master sets is in [master-data.md](master-data.md).

**Coverage check.** Every field below has a master source or is a racer-only overlay that stays in uma-racer. Nothing
uma-racer reads today is lost. Master data also carries what uma-racer drops (other rarities, star-level stats,
evolved skills, full course geometry, objective details, Global mechanics side by side…).

## Conventions for the adapter

- **Ids**: master ids are numbers; uma-racer's are strings. `String(id)` everywhere (`templateId`, `charaId`,
  `familyId`, `courseId`, `venueKey`…). The values are identical, so saves keep working.
- **Server preference**: uma-racer shows Global where it exists. Text: `global ?? en ?? ja`. Lists and mechanics:
  `global… ?? …` (e.g. `skills.globalAwakening ?? skills.awakening`).
- **Filters** uma-racer applies today, now in the adapter: SSR support cards only (`rarity === 3`); skills without
  rarity 6 (and inherited versions only of retained parents); races with grade 100/200/300/400/700 on tracks with a
  name; courses on those tracks.
- **Art**: uma-racer's `imageSource` URLs disappear. Art comes from the release's art index; the content API serves
  release files by path.

## `UmaTemplate` (pack `umas`) ← `outfits` + `characters` + `objectives` + `races`

| uma-racer field | Master source | Adapter rule |
|---|---|---|
| `id` | `outfit.id` | `String` |
| `charaId` | `outfit.characterId` | `String` |
| `name` | `characters[characterId].name.en` | uma-racer read the outfit's `name_en`; it equals the character's English name for every outfit |
| `outfit` | `outfit.title` | `title.global ?? title.en` (same as `title_en_gl ?? title`, brackets included on Global titles) |
| `jpRelease` | `outfit.release.jp` | |
| `globalRelease` | `outfit.release.global` | |
| `starter` | `outfit.release.jp` | `=== '2021-02-24'` (racer rule) |
| `baseStats` | `outfit.stats.star5` | |
| `growthRates` | `outfit.growthRatePercents` | each × 0.01 |
| `aptitudes` | `outfit.aptitudes` | same shape |
| `uniqueSkillId` | `outfit.skills.unique[0]` | `?? null` |
| `awakeningSkillIds` | `outfit.skills.globalAwakening ?? outfit.skills.awakening` | |
| `innateSkillIds` | `outfit.skills.innate` | already deduplicated |
| `eventSkillIds` | `outfit.skills.event` | already deduplicated |
| `realHorseSex` | `characters[characterId].realHorseSex` | same mapping (1 male, 2 female) |
| `signatureRaceFamilyIds` | `objectives` (by `characterId`) | objectives in `order`; each `races[].familyId` in order; keep ids whose family has a race uma-racer retains; distinct |
| `imageSource` | — | replaced by art: `outfit-icons` atlas, `outfit-portraits`, `outfit-busts`, `outfit-faces` |

## `SupportCardTemplate` (pack `cards`) ← `support-cards` (+ `scenarios` for eras)

| uma-racer field | Master source | Adapter rule |
|---|---|---|
| (filter) | `card.rarity` | `=== 3` |
| `id`, `charaId` | `card.id`, `card.characterId` | `String` |
| `charName` | `card.characterName.en` | `?? ''` |
| `title` | `card.title.en` | `?? ''` |
| `type` | `card.type` | same vocabulary (`wit` for GameTora's `intelligence`) |
| `jpRelease` | `card.release.jp` | |
| `era` | `card.release.jp` | `eraOf(jpRelease)` (racer rule, from its scenario ladder) |
| `obtain` | `card.obtain` | `gacha` → `gacha`; `story_event` → `event`; `promo`, `limited_quest`, `shop` → `free`; else `unknown` |
| `starter` | (derived) | `obtain === 'event' \|\| obtain === 'free'` |
| `hintSkillIds` | `card.hints.skillIds` | |
| `eventSkillIds` | `card.globalEventSkillIds ?? card.eventSkillIds` | |
| `effectProfile` | `card.effects` | per row: max of non-null `values`, mapped by `sourceCardEffect(type, cardType)`; then the median weighting across retained SSRs, unchanged |
| `uniqueEffect` | `card.uniqueEffect` | `{ level, effects: effects.map(({ type, value }) => ({ type, value })) }`; `params` and `description` are extra |
| `imageSource` | — | replaced by art: `support-card-icons` atlas, `support-card-art` |
| `focus` | — | racer overlay (`content/overrides/card-focus.json`), stays in uma-racer |

## `SkillTemplate` (pack `skills`) ← `skills`

| uma-racer field | Master source | Adapter rule |
|---|---|---|
| (filter) | `skill.rarity`, `skill.parentSkillIds` | drop rarity 6; keep an inherited version (non-empty `parentSkillIds`) when a parent is retained |
| `id` | `skill.id` | `String` |
| `kind` | `skill.rarity` | inherited version → `inherited-unique`; otherwise 1 `white`, 2 `gold`, 3 `unique-upgraded`, 4 `inherited-unique`, 5 `unique` (racer names, kept as they are) |
| `name` | `skill.name` | `global ?? en ?? ja` (inherited versions already carry the parent's `ja`/`en`) |
| `description` | `skill.description` | `toGlobalTerms(global ?? en ?? ja)` (racer's term rewrite) |
| `costSp` | `skill.costSp` | |
| `iconId` | `skill.iconId` / `skill.globalIconId` | top-level skills: `iconId`; inherited versions: `globalIconId ?? iconId` (uma-racer merged the Global gene over the base) |
| `activation` | `skill.activation` | |
| `conditions` | `skill.globalConditionGroups ?? skill.conditionGroups` | each group `{ precondition, condition, baseTime, cooldown, effects }`; each effect `{ type, value }` plus `target` only when non-null |
| `inheritedSkillId` | `skill.inheritedSkillId` | `String` or null; null on inherited versions |
| `normalSkillId` | `skill.versionIds`, names, rarities | racer rule: a gold's first retained white version; a white ◎'s version named with ○ instead |

## `RaceTemplate` (pack `races`) ← `races` + `tracks`

| uma-racer field | Master source | Adapter rule |
|---|---|---|
| (filter) | `race.grade`, `tracks[trackId].name` | grades 100/200/300/400/700; tracks uma-racer names (its 15 venues) |
| `id`, `familyId` | `race.id`, `race.familyId` | `String` |
| `name` | `race.name.en` | |
| `grade` | `race.grade` | 100 `g1`, 200 `g2`, 300 `g3`, 400 `op`, 700 `pre-op` |
| `surface` | `race.terrain` | `TERRAINS` (1 turf, 2 dirt) |
| `distance` | `race.distance` | |
| `distanceCategory` | `race.distance` | `distanceCategory(distance)` (racer rule: ≤1400 sprint, ≤1800 mile, ≤2400 medium, else long) |
| `direction` | `race.direction` | `DIRECTIONS` (1 right, 2 left, 4 straight) |
| `venue` | `tracks[race.trackId].name` | |
| `venueKey` | `race.trackId` | `String` |
| `venueTags`, `series`, `seriesLegs` | — | racer flair overlay (`content/overrides/flair.json`), stays in uma-racer |
| `courseId` | `race.courseId` | `String` |
| `season` | `race.season` | same code |
| `fieldSize` | `race.entries` | `Math.min(entries, 18)` |

## `CourseTemplate` (pack `courses`) ← `courses`

| uma-racer field | Master source | Adapter rule |
|---|---|---|
| (filter) | `course.trackId` | tracks uma-racer names |
| `id`, `trackId` | `course.id`, `course.trackId` | `String` |
| `distance` | `course.distanceCategory` | same code (it was never metres) |
| `terrain`, `turn` | `course.terrain`, `course.turn` | |
| `corners` | `course.corners` | same shape |
| `straights` | `course.straights` | same shape |
| `slopes` | `course.slopes` | was `unknown`; now typed `{ start, end, slope }[]` |

## Scenarios (`SCENARIOS` in `packages/domain/src/scenarios.ts`) ← `scenarios`

uma-racer's ladder is a hand-written constant, not a pack. Master scenarios carry its raw facts:

| uma-racer field | Master source | Adapter rule |
|---|---|---|
| `tier` | `scenario.order` | uma-racer's tiers are the Japanese release order |
| `id` | — | racer slug (`ura-finale`…), kept in uma-racer as a map from master `scenario.id` |
| `name`, `jpName` | `scenario.name` | uma-racer's display names are its own; `name.global ?? name.en` and `name.ja` are available |
| `jpRelease` | `scenario.startsAt.jp` | first 10 characters (UTC date) |

The scenario-coverage guard (`scripts/data/src/scenario-coverage.ts`) moves to uma-racer's adapter: compare master
scenarios with its ladder to notice a new scenario.

## Manifest, packs and atlases

| uma-racer | Master | Notes |
|---|---|---|
| `content/manifest.json` (`ContentManifest`) | `manifests/v1/<version>.json` (`ReleaseManifest`) | `version` uses the same algorithm (12 hex of SHA-256 over sorted file hashes); `generatedAt` → `createdAt`; `source` → `sources` (keys `gametora/<dataset>`); `files` same shape |
| Remote `manifest.json` overwritten on publish | `channels/v1/latest.json` → immutable manifests | games follow `latest`, can pin a version |
| Pack `{ version, items }` | Set file `{ set, items }` | the dataset version moved to `manifest.sources`; items sorted by numeric id |
| `data/<pack>.<hash8>.json` found by name pattern | `manifest.sets[<name>]` | hashes in names are 16 hex characters |
| `atlases/<kind>.<hash8>.json` (`ContentAtlas`) | `art.atlases[<family>]` in the art index | `schemaVersion` and `kind` dropped; `frameWidth`, `frameHeight`, `pages`, `frames` same shape |
| `uma-icons` | `outfit-icons` | same keys (outfit ids) |
| `card-icons` | `support-card-icons` | every rarity |
| `skill-icons` | `skill-icons` | also every `globalIconId` |
| `scenario-icons` (keys: racer slugs) | `scenario-icons` (keys: scenario ids) | map through the slug table above |
| `art/uma/<id>` | `art.images['outfit-portraits'][id]` | |
| `art/bust/<id>` | `art.images['outfit-busts'][id]` | |
| small outfit face `<id>` | `art.images['outfit-faces'][id]` | per outfit; replaces character-level race faces in shared lists |
| `art/card/<id>` | `art.images['support-card-art'][id]` | every rarity |
| `art/chibi/<id>-a\|b` | `art.images['outfit-chibis']['<id>-a\|b']` | same keys |
| `art/dress/<chara>-<look>` | `art.images['character-dresses']['<chara>-<look>']` | same keys |
| `art/face/<chara>` | `art.images['character-faces'][chara]` | same keys |

## Stays in uma-racer

Game-only content and overlays (architecture §2.1): `flair.json` (venue tags, series, series legs), `card-focus.json`
and the card-focus report, `spark-rivals.json` and its pack, RPG and Puzzles packs and art (removed in Phase 3 anyway),
`bust-crops.json` pins if any (move them to uma-platform's `content/overrides/` instead, since busts are master art),
and every rule listed in the adapter columns above (`eraOf`, `sourceCardEffect`, `distanceCategory`, `toGlobalTerms`,
starter rules, the 18-runner cap, `normalSkillId`).
