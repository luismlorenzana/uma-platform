// Outfits (trainee cards): one character in one outfit, with full stats (docs/master-data.md#outfits).

import {
  parseAptitudes,
  parseLocalText,
  parseServerDates,
  parseStats,
  type Aptitudes,
  type CharacterId,
  type LocalText,
  type OutfitId,
  type ServerDates,
  type SkillId,
  type Stats,
} from '../common.js'
import { arrayOf, boolean, fields, id, idList, nullable, positiveInteger, text, type Parser } from '../parse.js'

/**
 * Base stats at each star level. An outfit starts at `rarity` stars, so levels below it are null; 4★ and 5★ always
 * exist.
 */
export interface OutfitStats {
  star1: Stats | null
  star2: Stats | null
  star3: Stats | null
  star4: Stats
  star5: Stats
}

export interface OutfitSkills {
  /** The outfit's unique skill(s). Usually one. */
  unique: SkillId[]
  /** Skills the trainee starts a career with. */
  innate: SkillId[]
  /** Skills unlocked by awakening levels, in order (Japan). */
  awakening: SkillId[]
  /** Global's awakening list where it differs from Japan's; null when it's the same. */
  globalAwakening: SkillId[] | null
  /** Skills taught by the outfit's own story events. */
  event: SkillId[]
  /** Skills this outfit can evolve during a career: `from` becomes the evolved skill `to`. */
  evolutions: { from: SkillId; to: SkillId }[]
}

export interface Outfit {
  id: OutfitId
  characterId: CharacterId
  /** The original's dress id; art files are named by it. */
  costumeId: number
  /** The original's talent (awakening) group id. */
  talentGroupId: number
  /** Stars the outfit starts at, 1–3. */
  rarity: number
  /** GameTora's outfit-variant tag, e.g. `summer` or `wedding`; null for an original outfit. */
  variant: string | null
  /** How it's obtained, as GameTora names it (today always `gacha`). */
  obtain: string
  /** GameTora's `premium` flag. */
  premium: boolean
  /** GameTora's `preview_id`, kept as given; null when absent. */
  previewId: number | null
  /** Ids of the conditions (statuses) the outfit's events can give, GameTora's `event_statuses`. */
  eventStatusIds: number[]
  /** `ja` and `global` keep the source's brackets, e.g. `[Special Dreamer]`; `en` has none. */
  title: LocalText
  release: ServerDates
  stats: OutfitStats
  /** Stat growth bonuses in whole percent, e.g. 20 means +20%. */
  growthRatePercents: Stats
  aptitudes: Aptitudes
  skills: OutfitSkills
}

const parseOutfitStats: Parser<OutfitStats> = (value, path) => {
  const f = fields(value, path)
  return {
    star1: f('star1', nullable(parseStats)),
    star2: f('star2', nullable(parseStats)),
    star3: f('star3', nullable(parseStats)),
    star4: f('star4', parseStats),
    star5: f('star5', parseStats),
  }
}

const parseOutfitSkills: Parser<OutfitSkills> = (value, path) => {
  const f = fields(value, path)
  return {
    unique: f('unique', idList),
    innate: f('innate', idList),
    awakening: f('awakening', idList),
    globalAwakening: f('globalAwakening', nullable(idList)),
    event: f('event', idList),
    evolutions: f(
      'evolutions',
      arrayOf((entry, at) => {
        const e = fields(entry, at)
        return { from: e('from', id), to: e('to', id) }
      }),
    ),
  }
}

export const parseOutfit: Parser<Outfit> = (value, path) => {
  const f = fields(value, path)
  return {
    id: f('id', id),
    characterId: f('characterId', id),
    costumeId: f('costumeId', id),
    talentGroupId: f('talentGroupId', id),
    rarity: f('rarity', positiveInteger),
    variant: f('variant', nullable(text)),
    obtain: f('obtain', text),
    premium: f('premium', boolean),
    previewId: f('previewId', nullable(id)),
    eventStatusIds: f('eventStatusIds', idList),
    title: f('title', parseLocalText),
    release: f('release', parseServerDates),
    stats: f('stats', parseOutfitStats),
    growthRatePercents: f('growthRatePercents', parseStats),
    aptitudes: f('aptitudes', parseAptitudes),
    skills: f('skills', parseOutfitSkills),
  }
}
