# Master data — sets and fields

Every set in a master data release, field by field, with its GameTora source. The types and runtime parsers live in
`packages/data` (`@luismlorenzana/uma-data`, schema major 1); the importer is `scripts/data`, the art pipeline
`scripts/assets`. Architecture is in [architecture.md](architecture.md) §2; Phase 0's decisions start at P18 in
[decisions.md](decisions.md); how uma-racer's packs map onto these sets is in [racer-mapping.md](racer-mapping.md).

## Contents

- [Principles](#principles)
- [Shared shapes](#shared-shapes)
- [Characters](#characters) · [Outfits](#outfits) · [Support cards](#support-cards) · [Skills](#skills) ·
  [Scenarios](#scenarios) · [Races](#races) · [Tracks and courses](#tracks-and-courses) · [Objectives](#objectives)
- [Art](#art)
- [Releases](#releases) · [Release client](#release-client) · [Schema changes](#schema-changes)
- [Not imported](#not-imported)

## Principles

- **Faithful and neutral.** Records describe the original game as GameTora gives it. Game interpretations (eras as
  tiers, card effects mapped to a training model, card focus, starter flags, display terms) stay in each game's adapter
  (architecture §2.1, AGENTS.md).
- **Everything, every rarity.** All outfits, all support-card rarities, every skill including evolved and inherited
  versions, every race grade and venue (P22). Games filter in their adapter.
- **Original ids** (P8), as JSON integers (P19). An id never changes meaning; a record that disappears from GameTora
  disappears from the next release, and games must handle unknown ids.
- **Japan is the base, Global overrides on top** (P20). `release`/`startsAt` give per-server dates for Japan, Global,
  Korea and Taiwan; text and mechanics carry Japan's version plus a `global…` variant where GameTora lists one.
- **Codes stay codes** (P21). The original's numeric codes (race grade, season, effect types…) are kept as numbers
  with exported label tables; only vocabularies fixed by game design are words.
- **References are kept as given.** `findReferenceIssues` lists ids that point outside the release; the first release
  has none.

## Shared shapes

| Shape | Fields | Notes |
|---|---|---|
| `Stats` | `speed`, `stamina`, `power`, `guts`, `wit` | Numbers. GameTora's arrays are in this order |
| `Aptitudes` | `surface.{turf,dirt}`, `distance.{sprint,mile,medium,long}`, `strategy.{front,pace,late,end}` | Grades `S`…`G`. GameTora's `aptitude` array is turf, dirt, sprint, mile, medium, long, front, pace, late, end |
| `LocalText` | `ja`, `en`, `global` | `ja` always present. `en` is GameTora's English (usually its translation of the Japanese; per set below). `global` is the official Global text when GameTora lists it separately; null doesn't mean "not on Global" |
| `ServerDates` | `jp`, `global`, `kr`, `tw` | `YYYY-MM-DD`; `jp` always present; null where it isn't out. Source: `<field>`, `<field>_en`, `_ko`, `_zh_tw` |
| `ServerTimes` | same keys | UTC ISO timestamps from GameTora's Unix seconds (`start_ja`, `start_en`, …) |
| `ServerFlags` | same keys | Booleans or null |
| `Server` | `jp`, `global`, `kr`, `tw` | GameTora's `en` → `global`, `ko` → `kr`, `zh_tw` → `tw` |

Id aliases (`CharacterId`, `OutfitId`, `SupportCardId`, `SkillId`, `ScenarioId`, `RaceId`, `RaceFamilyId`, `TrackId`,
`CourseId`) are plain numbers.

## Characters

Set `characters`, from GameTora `characters`. One record per character: trainable Umas, other Umas, trainers and staff.

| Field | Type | Source | Notes |
|---|---|---|---|
| `id` | number | `char_id` | |
| `name` | LocalText | `name_ja`, `name_en` | `en` is the official English name; `global` is null |
| `fullNameJa` | string \| null | `name_ja_real` | The full name when the display name is a title |
| `colors` | `{ main, sub }` \| null | `color_main`, `color_sub` | Uppercase `RRGGBB` |
| `fictional` | boolean | `fictional` | True for characters made up by the original |
| `realCounterpart` | LocalText \| null | `rl_counterpart` | The real horse a fictional character is modelled on |
| `kind` | string \| null | `race` | `uma`, `human`, `unknown`; null where GameTora leaves it unset |
| `realHorseSex` | `male` \| `female` \| null | `sex` (1, 2) | The real horse's sex. Non-horse characters still carry GameTora's value (P33) |
| `birthday` | `{ month, day, year }` | `birth_month`, `birth_day`, `birth_year` | `year` null where unknown |
| `heightCm` | number \| null | `height` | |
| `threeSizes` | `{ bust, waist, hip }` \| null | `three_sizes.b/w/h` | |
| `playable` | ServerFlags | `playable`, `playable_en`, … | Trainable on that server |
| `active` | ServerFlags | `active`, `active_en`, … | Appears on that server |
| `voiceActor` | `{ ja, en }` | `va_ja`, `va_en` | |
| `realHorse` | RealHorse \| null | `rl` | Null when GameTora has no record |

`RealHorse`: `activeYears` (`rl.active`, e.g. `1997-1999`, may be null), `country`, `death` (date or null),
`earnings` (yen), `otherEarnings` (`[{ amount, currency }]` from `earnings_other`), `races`, `wins`, `record`
(`wins-2nd-3rd-other`), `winStats` (`win_stats`: four counts GameTora doesn't document, kept as given).

## Outfits

Set `outfits`, from GameTora `character-cards`. One record per trainee card: a character in one outfit.

| Field | Type | Source | Notes |
|---|---|---|---|
| `id` | number | `card_id` | The outfit id, e.g. 100101 |
| `characterId` | number | `char_id` | → `characters` |
| `costumeId` | number | `costume` | The original's dress id; wiki art files are named by it |
| `talentGroupId` | number | `talent_group` | Awakening talent group |
| `rarity` | number | `rarity` | Stars the outfit starts at (1–3) |
| `variant` | string \| null | `version` | Outfit-variant tag, e.g. `summer`, `wedding`; null for an original outfit |
| `obtain` | string | `obtained` | Today always `gacha` |
| `premium` | boolean | `premium` | GameTora's flag, kept as given |
| `previewId` | number \| null | `preview_id` | Kept as given |
| `eventStatusIds` | number[] | `event_statuses` | Ids of conditions (statuses) the outfit's events can give |
| `title` | LocalText | `title_ja`, `title`, `title_en_gl` | `ja` and `global` keep the source's brackets, e.g. `[Special Dreamer]`; `en` has none |
| `release` | ServerDates | `release`, `release_en`, `release_ko`, `release_zh_tw` | |
| `stats` | OutfitStats | `base_stats`, `two_star_stats`, `three_star_stats`, `four_star_stats`, `five_star_stats` | Base stats per star level, see below |
| `growthRatePercents` | Stats | `stat_bonus` | Whole percent: 20 means +20% |
| `aptitudes` | Aptitudes | `aptitude` | |
| `skills.unique` | number[] | `skills_unique` | Usually one |
| `skills.innate` | number[] | `skills_innate` | Known at the start of a career |
| `skills.awakening` | number[] | `skills_awakening` | Japan's awakening order |
| `skills.globalAwakening` | number[] \| null | `skills_awakening_en` | Global's list where it differs; null when the same |
| `skills.event` | number[] | `skills_event` | Taught by the outfit's own story events (numeric strings in the source are read as ids) |
| `skills.evolutions` | `{ from, to }[]` | `skills_evo` | `from` evolves into the evolved skill `to` |

`OutfitStats` has `star1`…`star5`. `base_stats` is the starting rarity's level; levels below the starting rarity are
null, and 4★ and 5★ always exist. uma-racer's "base stats" are `star5`.

Every skill list is in source order with repeats removed.

## Support cards

Set `support-cards`, from GameTora `support-cards`. Every rarity.

| Field | Type | Source | Notes |
|---|---|---|---|
| `id` | number | `support_id` | |
| `characterId` | number | `char_id` | → `characters`; a group card points at the group's own record |
| `characterName` | LocalText | `name_ja`, `char_name`, `name_en_gl` | `en` is the character or group name; `global` is a group's Global name where it differs |
| `title` | LocalText | `title_ja`, `title_en` | Both keep the source's brackets; `global` is null |
| `type` | `speed`…`wit` \| `friend` \| `group` | `type` | GameTora's `intelligence` is `wit` |
| `rarity` | number | `rarity` | 1 R, 2 SR, 3 SSR |
| `obtain` | string | `obtained` | `gacha`, `story_event`, `promo`, `limited_quest`, `shop` (open vocabulary) |
| `release` | ServerDates | `release…` | |
| `effects` | `{ type, values }[]` | `effects` | The raw effect table, see below |
| `uniqueEffect` | object \| null | `unique`, `unique_desc` | `{ level, description, effects: [{ type, value, params }] }` |
| `hints.skillIds` | number[] | `hints.hint_skills` | Skills the card can hint |
| `hints.others` | `{ type, value, minLevel }[]` | `hints.hint_others` | Non-skill hint rewards; `minLevel` when GameTora gates them by card level |
| `eventSkillIds` | number[] | `event_skills` | The card's event chain (Japan) |
| `globalEventSkillIds` | number[] \| null | `event_skills_en` | Global's list where it differs |

### Support-card effect tables

Each GameTora effect row is `[type, v1, v5, v10, …, v50]`: the effect type id, then its value at card levels
`SUPPORT_CARD_EFFECT_LEVELS` = 1, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50. The source writes `-1` for "no value given at
this level"; master data writes null. A card holds the last value given at or below its level. Max levels by rarity
are in `SUPPORT_CARD_MAX_LEVELS` (R 40, SR 45, SSR 50).

### Support-card effect types

The ids are the original's. The ones uma-racer maps today: 1 friendship bonus, 3–7 speed…wit stat bonus,
8 training effectiveness, 9–13 speed…wit initial stats, 15 race bonus, 18 hint frequency, 19 specialty priority,
30 skill-point bonus. Unique effects use the same ids plus conditional types (≥100) whose extra values are `params`
(GameTora's `value_1`…`value_4`, in order).

## Skills

Set `skills`, from GameTora `skills`. Every rarity, plus each inherited (gene) version as its own record.

| Field | Type | Source | Notes |
|---|---|---|---|
| `id` | number | `id` (or `gene_version.id`) | |
| `rarity` | number | `rarity` | See `SKILL_RARITIES` below |
| `name` | LocalText | `jpname`, `enname`, `name_en` | `en` is GameTora's translation; `global` the official Global name |
| `description` | LocalText | `jpdesc`, `endesc`, `desc_en` | Whitespace collapsed to single spaces |
| `costSp` | number \| null | `cost` | Null when it can't be bought |
| `iconId` | number | `iconid` | Key into the `skill-icons` atlas |
| `activation` | number | `activation` | 0 always fires when its condition holds; 1 rolls the Wit check |
| `tags` | string[] | `type` | GameTora's category tags, see below |
| `conditionGroups` | SkillConditionGroup[] | `condition_groups` | Japan's mechanics |
| `globalConditionGroups` | … \| null | `loc.en.condition_groups` | Global's mechanics where they differ |
| `globalIconId` | number \| null | `loc.en.iconid` | |
| `globalTags` | string[] \| null | `loc.en.type` | |
| `inheritedSkillId` | number \| null | `gene_version.id` | The inherited version's record |
| `parentSkillIds` | number[] | `gene_version.parent_skills` | Only on inherited versions: what they're inherited from |
| `versionIds` | number[] | `versions` | Related ○/◎/× steps and gold/white pairs |
| `evolutions` | `{ outfitId, scenarioId, skillIds }[]` | `evo` | What this skill can evolve into, through an outfit or a scenario |
| `evolvedFrom` | `{ skillId, outfitId, scenarioId }` \| null | `pre_evo` | On an evolved skill |
| `evolutionRequirements` | step[][] | `evo_cond` | Alternatives of steps, each step as the source writes it, e.g. `["stat", 2, 600]` |
| `scenarioEventIds` | number[] | `sce_e` | Scenarios whose events teach it |
| `unreleasedIn` | Server[] | `unreleased` | Servers that don't have it yet |

`SkillConditionGroup`: `precondition` (string or null), `condition` (the original's expression, e.g.
`phase_random==1&order<=3`), `baseTime` and `cooldown` (1/10000 s; cooldown null when it fires once), `timeScale`,
and `effects: [{ type, value, target, targetDetails, valueScale, additionalActivation }]`. `target` is null when the
effect is the user's own.

**Rarity** (`SKILL_RARITIES`): 1 normal (white), 2 rare (gold), 3 unique of an outfit that starts below 3★, 4 the
same outfit's unique once raised to 3★, 5 unique of a 3★ outfit, 6 evolved. Inherited versions take 1 (6 for an
evolved unique).

**Inherited versions.** GameTora nests them in `gene_version` without Japanese text, because the original shows the
parent's name. Master data gives them their own record: `name.ja`/`name.en` and `description.ja`/`description.en`
come from the parent; `name.global`, `description.global`, `costSp`, `iconId`, `activation` and mechanics are the
gene's own; `tags` are the parent's.

**Tags** (GameTora's, open vocabulary): `run`/`ldr`/`btw`/`cha` running styles (front, pace, late, end);
`sho`/`mil`/`med`/`lng` distances; `tur`/`dir` surfaces; `l_0`…`l_3` race phase; `cor`, `str`, `slo` corners,
straights, slopes; `dbf` debuff; others as GameTora adds them.

## Scenarios

Set `scenarios`, from GameTora `scenarios`.

| Field | Type | Source | Notes |
|---|---|---|---|
| `id` | number | `id` | GameTora's id; not the release order (Trackblazer is 4, Grand Live 3) |
| `order` | number | `order` | Release order in Japan, from 1 |
| `name` | LocalText | `name_ja`, `name_en_old`, `name_en` | `en` is GameTora's English name, `global` the official Global name |
| `globalFullName` | string \| null | `name_en_full` | e.g. `The Beginning: URA Finale` |
| `startsAt` | ServerTimes | `start_ja`, `start_en`, `start_ko`, `start_zh_tw` | |
| `color` | string | `bg_color` | Uppercase `RRGGBB` |
| `hardCaps` | number[] | `hard_caps` | Source order: the five stats, then skill points |
| `stats` | Stats | `stats` | GameTora's per-stat values for the scenario, kept as given (GameTora doesn't document them) |
| `specialProgram` | number | `special_program` | GameTora's code |
| `linkedCharacters` | `{ id, characterId, name }[]` | `scenario_linked_characters` | Scenario trainers and rivals |

## Races

Set `races`, from GameTora `races`. One record per program instance; every grade and venue.

| Field | Type | Source | Notes |
|---|---|---|---|
| `id` | number | `id` | Instance id, e.g. 100101 |
| `familyId` | number | `race_id` | The race's own id, shared by its instances; objectives point at it |
| `name` | LocalText | `name_ja`, `name_en` | `en` is GameTora's English name |
| `grade` | number | `grade` | Code, `RACE_GRADES`: 100 G1, 200 G2, 300 G3, 400 OP, 700 Pre-OP, 800 Maiden, 900 Debut |
| `group` | number | `group` | GameTora's code |
| `terrain` | number | `terrain` | `TERRAINS`: 1 turf, 2 dirt |
| `distance` | number | `distance` | Metres |
| `direction` | number | `direction` | `DIRECTIONS`: 1 right, 2 left, 4 straight |
| `trackId` | number | `track` | → `tracks` |
| `courseId` | number | `course_id` | → `courses` |
| `courseCode` | number | `course` | Inner/outer layout code |
| `season` | number | `season` | `SEASONS`: 1 spring, 2 summer, 3 autumn, 4 winter; 0 and 5 also occur, meaning unconfirmed |
| `timeOfDay` | number | `time` | GameTora's code |
| `entries` | number | `entries` | Field size as the source gives it (up to 20) |
| `bannerId` | number | `banner_id` | |
| `factor` | `{ effect1, effect2 }` \| null | `factor` | The race's spark effects as written (a stat, or a Japanese skill or venue name) |
| `programIds` | string[] | `list_ura` | GameTora's program ids |
| `alternatives` | RaceAlternative[] | `alts` | Venues or layouts used in some periods: `{ id, familyId, trackId, courseId, direction, distance, entries, didNotExist }` |
| `didNotExist` | string \| null | `did_not_exist` | The period it didn't exist in, e.g. `pre_nar` |
| `unreleasedIn` | Server[] | `unreleased_servers` | |

A few races appear twice in GameTora; the first row wins, as in uma-racer.

## Tracks and courses

Sets `tracks` and `courses`, from GameTora `racetracks`.

**Track**: `id` (the original's track id), `name` (English venue name, null when unknown), `courseIds`. GameTora has no
venue names; they come from the importer's table (uma-racer's list plus Santa Anita Park, P32). Track 10203 has courses
but no races and no name yet.

**Course**:

| Field | Type | Source | Notes |
|---|---|---|---|
| `id`, `trackId` | number | `courses[].id`, track `id` | |
| `terrain` | number | `terrain` | `TERRAINS` |
| `distanceCategory` | number | `distance` | The original's category code (1 sprint … 4 long), not metres |
| `length` | number | `length` | Metres |
| `turn` | number | `turn` | `DIRECTIONS` |
| `inout` | number | `inout` | Inner/outer layout code |
| `corners` | `{ start, end, number }[]` | `corners` | Metres from the start |
| `straights` | `{ start, end, frontType }[]` | `straights` | |
| `slopes` | `{ start, end, slope }[]` | `slopes` | |
| `phases` | `{ id, start, end }[]` | `phases` | 0 opening … 3 last spurt |
| `laps` | `{ lap, start, end }[]` | `laps` | |
| `noMansLand` | `{ start, end }[]` | `noMansLand` | |
| `overlaps` | string[] | `overlaps` | |
| `positionKeepEnd` | number | `positionKeepEnd` | Metres |
| `spurtStart` | `{ lap, location, meters }` | `spurtStart` | |
| `statThresholds` | number[] | `statThresholds` | Stat ids the course checks for its threshold bonus |
| `terrainChanges` | `{ start, terrain }[]` | `terrainChanges` | |

## Objectives

Set `objectives`, from GameTora `ura-objectives`. One record per character's objective set (the URA career).

| Field | Type | Source |
|---|---|---|
| `id` | number | `obj_id` |
| `characterId` | number | `char_id` |
| `objectives` | CareerObjective[] | `objectives`, sorted by `order` |

`CareerObjective`: `order`, `turn` (career turn it's due by), `conditionId`, `conditionType`, `conditionValue`,
`conditionValue2`, `raceChoice`, `raceChoiceDetails`, `raceType`, `targetType` (the original's codes, from `cond_id`,
`cond_type`, `cond_value`, `cond_value_2`, `race_choice`, `race_choice_details`, `race_type`, `target_type`), and
`races`: the race(s) it names, empty for a non-race objective.

`ObjectiveRace`: `familyId` (`id`, a `Race.familyId`; debut races have no `races` record), `name`, `grade`, `group`,
`terrain`, `distance`, `trackId`, `iconId`, `fansGained`, `fansNeeded`, `nar` (a local race), `unreleasedIn`.

## Art

The art index is one JSON file per release (`manifest.art`), parsed by `parseArtIndex`:
`{ atlases: { <family>: Atlas }, images: { <family>: { <key>: { path, width, height } } } }`. Paths are release file
paths. A missing family or key means the release has no art for it; games fall back to their own drawing.

| Family | Kind | Key | Source | Size |
|---|---|---|---|---|
| `outfit-icons` | atlas | outfit id | GameTora stand thumbnail | 128 px frames |
| `support-card-icons` | atlas | support card id | GameTora `support_card_s_<id>` | 128 px frames |
| `skill-icons` | atlas | skill icon id | GameTora `utx_ico_skill_<id>` (every `iconId` and `globalIconId`) | 128 px frames |
| `scenario-icons` | atlas | scenario id | GameTora scenario crest | 128 px frames |
| `outfit-portraits` | images | outfit id | GameTora full stand | ≤512 px, transparent |
| `outfit-busts` | images | outfit id | Cut from the portrait (head band centroid; private pins in `content/overrides/bust-crops.json`) | 256 px square |
| `outfit-faces` | images | outfit id | Tight crop derived from the outfit's bust (private pins in `content/overrides/face-crops.json`) | 192 px square |
| `support-card-art` | images | support card id | GameTora `tex_support_card_<id>` | ≤600 px, opaque |
| `outfit-chibis` | images | `<outfitId>-a`, `<outfitId>-b` | Wiki `Game_Asset_petit_chr_<chara>_<costume>_0010/0011` | ≤256 px |
| `character-dresses` | images | `<characterId>-gym\|summer\|winter\|casual` | Wiki `Game_Asset_chara_stand_<chara>_…` | ≤512 px |
| `character-faces` | images | character id | Cut from the first of the summer, winter, gym, casual stands | 128 px square |

`Atlas`: `frameWidth`, `frameHeight` (128), `pages: [{ path, width, height }]` (WebP, ≤4096 px), and
`frames: { <key>: { page, x, y, width, height } }`. Frames sit on a 132 px grid with 2 px transparent padding.

Wiki art comes from the owner's local folder (`pnpm assets:import -- --source dir:<path>`), never fetched. GameTora
sources are downloaded at most 8 at a time (6 for full-size art) and cached; missing sources are skipped with a
warning.

## Releases

Bucket layout (architecture §2.2, P23):

```text
files/data/<set>.<hash16>.json          one per set: { "set": "<name>", "items": [...] }, items sorted by id
files/data/art.<hash16>.json            the art index
files/atlases/<family>-<page>.<hash16>.webp
files/art/<family>/<key>.<hash16>.webp
manifests/v1/<version>.json             one per release, immutable
channels/v1/latest.json                 the newest release for schema major 1
```

`<hash16>` is the first 16 hex characters of the file's SHA-256. Files are immutable and shared across releases.

**Manifest** (`ReleaseManifest`): `schemaMajor` (1), `schemaVersion` (the uma-data version that wrote it),
`version`, `createdAt`, `sources` (`gametora/<dataset>` → GameTora's dataset version), `sets` (set name → file path),
`art` (art index path or null), `files` (`[{ path, bytes, sha256 }]`, sorted by path).

**Version**: the first 12 hex characters of the SHA-256 over the sorted file hashes, concatenated. The same content
always gets the same version, so republishing identical content is a no-op.

**Channel** (`ReleaseChannel`): `schemaMajor`, `channel` (`latest`), `version`, `manifest`
(`manifests/v1/<version>.json`), `updatedAt`.

**Publish order** (`pnpm release:publish`): verify the local release like a client (every byte and hash, every set,
the art index), upload missing files (`--no-clobber`), upload the manifest if the bucket lacks it (an existing one
must list exactly the same files), then move the channel and read it back. Nothing is ever deleted.

## Release client

```ts
import { createFetchSource, createReleaseClient } from '@luismlorenzana/uma-data'

const client = createReleaseClient({ source })   // source.read(path) → Uint8Array
const { manifest, data, art } = await client.load()        // latest
const pinned = await client.load('d9bbb52a9cd7')           // a specific release
const outfits = await client.set(manifest, 'outfits')       // one set
const portrait = await client.file(manifest, art!.images['outfit-portraits']!['100101']!.path)
const face = await client.file(manifest, art!.images['outfit-faces']!['100101']!.path)
```

The client reads channel → manifest → files, checks the channel points at its own manifest, checks the manifest's
version against its files, checks each file's length and SHA-256, and parses every set and the art index. Errors are
`MasterDataError` (with the JSON path of the first bad value) or `ReleaseSourceError` (the source failed).

Sources: a game's API reads the private bucket with its own credentials and implements `read`; its web app uses
`createFetchSource({ baseUrl, init })` against the API's logged-in endpoint. `@luismlorenzana/uma-data/testing`
provides `syntheticMasterData()`, `buildMemoryRelease()` and `createMemorySource()` for game tests.

## Schema changes

- Parsers ignore keys they don't know, so a newer minor release passes an older client (P7, P18). Additive changes
  (a new optional field, a new set, a new art family) are a **minor** version; new fields are optional (`optional()`)
  so older releases still parse.
- Removing, renaming or changing the meaning of a field, or adding a value to a closed vocabulary (stats, grades,
  servers, card types), is a new **major**: a new `channels/v2/`, a Changeset and a decision entry.
- GameTora renames fields from time to time (P27); the normalizers read the current name first and older names after
  it, so a rename never reaches the schema.

## Not imported

| What | Why |
|---|---|
| Korean and Taiwanese text and server-specific lists (`name_ko`, `skills_awakening_ko`, `skills_evo_zh_tw`, …) | No game uses those servers' text; their release dates and flags are kept (P20) |
| `tid`, `url_name`, `va_link` | GameTora's own site ids and links |
| Skills' reverse indexes `char`, `char_e`, `sup_e`, `sup_hint` (and their `loc.en` copies) | Derivable from outfits and support cards |
| Support cards' `rare_stuff` | GameTora-internal flags with no documented meaning |
| Race alternatives' `tid` | GameTora id |
