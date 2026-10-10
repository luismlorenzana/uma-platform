// Support cards with their raw effect tables (docs/master-data.md#support-cards).

import {
  parseLocalText,
  parseServerDates,
  STATS,
  type CharacterId,
  type LocalText,
  type ServerDates,
  type SkillId,
  type StatKey,
  type SupportCardId,
} from '../common.js'
import { arrayOf, fields, finite, id, idList, integer, nullable, oneOf, positiveInteger, text, type Parser } from '../parse.js'

export const SUPPORT_CARD_TYPES = [...STATS, 'friend', 'group'] as const
export type SupportCardType = StatKey | 'friend' | 'group'

/** Card levels at which `SupportCardEffect.values` are given, in order. */
export const SUPPORT_CARD_EFFECT_LEVELS = [1, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50] as const

/** Highest card level per rarity: R 40, SR 45, SSR 50. */
export const SUPPORT_CARD_MAX_LEVELS: Readonly<Record<number, number>> = { 1: 40, 2: 45, 3: 50 }

export interface SupportCardEffect {
  /** The original's effect type id (docs/master-data.md#support-card-effect-types). */
  type: number
  /**
   * The effect's value at each level in `SUPPORT_CARD_EFFECT_LEVELS`. Null where the source gives no value at that
   * level; the card keeps the last value given before it.
   */
  values: (number | null)[]
}

export interface SupportCardUniqueEffect {
  /** Card level at which the unique effect switches on. */
  level: number
  /** The source's English description, where it has one. */
  description: string | null
  /** `params` holds the source's extra values (`value_1`…), used by conditional effect types. */
  effects: { type: number; value: number; params: number[] }[]
}

export interface SupportCardHints {
  /** Skills the card can hint. */
  skillIds: SkillId[]
  /** Non-skill hint rewards (stats, skill points) as the original's type id and amount; `minLevel` when level-gated. */
  others: { type: number; value: number; minLevel: number | null }[]
}

export interface SupportCard {
  id: SupportCardId
  /** For a group card, the group's own character record. */
  characterId: CharacterId
  /** `en` is the character or group name; `global` is a group's Global name where it differs. */
  characterName: LocalText
  /** `ja` and `en` keep the source's brackets. */
  title: LocalText
  type: SupportCardType
  /** 1 R, 2 SR, 3 SSR. */
  rarity: number
  /** As GameTora names it: `gacha`, `story_event`, `promo`, `limited_quest`, `shop`… */
  obtain: string
  release: ServerDates
  effects: SupportCardEffect[]
  uniqueEffect: SupportCardUniqueEffect | null
  hints: SupportCardHints
  /** Skills the card's event chain teaches (Japan). */
  eventSkillIds: SkillId[]
  /** Global's event skills where they differ from Japan's; null when the same. */
  globalEventSkillIds: SkillId[] | null
}

const parseEffect: Parser<SupportCardEffect> = (value, path) => {
  const f = fields(value, path)
  return { type: f('type', integer), values: f('values', arrayOf(nullable(finite))) }
}

const parseUniqueEffect: Parser<SupportCardUniqueEffect> = (value, path) => {
  const f = fields(value, path)
  return {
    level: f('level', positiveInteger),
    description: f('description', nullable(text)),
    effects: f(
      'effects',
      arrayOf((entry, at) => {
        const e = fields(entry, at)
        return { type: e('type', integer), value: e('value', finite), params: e('params', arrayOf(finite)) }
      }),
    ),
  }
}

const parseHints: Parser<SupportCardHints> = (value, path) => {
  const f = fields(value, path)
  return {
    skillIds: f('skillIds', idList),
    others: f(
      'others',
      arrayOf((entry, at) => {
        const e = fields(entry, at)
        return { type: e('type', integer), value: e('value', finite), minLevel: e('minLevel', nullable(positiveInteger)) }
      }),
    ),
  }
}

export const parseSupportCard: Parser<SupportCard> = (value, path) => {
  const f = fields(value, path)
  return {
    id: f('id', id),
    characterId: f('characterId', id),
    characterName: f('characterName', parseLocalText),
    title: f('title', parseLocalText),
    type: f('type', oneOf(SUPPORT_CARD_TYPES)),
    rarity: f('rarity', positiveInteger),
    obtain: f('obtain', text),
    release: f('release', parseServerDates),
    effects: f('effects', arrayOf(parseEffect)),
    uniqueEffect: f('uniqueEffect', nullable(parseUniqueEffect)),
    hints: f('hints', parseHints),
    eventSkillIds: f('eventSkillIds', idList),
    globalEventSkillIds: f('globalEventSkillIds', nullable(idList)),
  }
}
