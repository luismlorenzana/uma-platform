// Skills, including inherited and evolved versions (docs/master-data.md#skills).

import { parseLocalText, parseServer, type LocalText, type OutfitId, type ScenarioId, type Server, type SkillId } from '../common.js'
import {
  arrayOf,
  fail,
  fields,
  finite,
  id,
  idList,
  integer,
  nonNegativeInteger,
  nullable,
  string,
  text,
  type Parser,
} from '../parse.js'

/**
 * The original's skill rarity. 3 and 4 are the unique skills of outfits that start below 3★ (4 once raised to 3★).
 * Inherited versions take 1 (or 6 for an evolved unique). Kept as a number so a new rarity doesn't break older
 * clients.
 */
export const SKILL_RARITIES: Readonly<Record<number, string>> = {
  1: 'normal',
  2: 'rare',
  3: 'unique (outfit below 3★)',
  4: 'unique (outfit raised to 3★)',
  5: 'unique (3★ outfit)',
  6: 'evolved',
}

export interface SkillEffect {
  /** The original's effect type id. */
  type: number
  /** Raw value in the original's units (speeds and ratios ×10000). */
  value: number
  /** Who it's aimed at when that isn't the user (rivals, teammates…); null for the user. */
  target: number | null
  targetDetails: number | null
  valueScale: number | null
  additionalActivation: number | null
}

export interface SkillConditionGroup {
  /** The original's condition expression that must hold before `condition` is checked; null when none. */
  precondition: string | null
  /** The original's activation expression, e.g. `phase_random==1&order<=3`. */
  condition: string
  /** Duration in 1/10000 s at the reference distance; 0 or negative for instant effects. */
  baseTime: number
  /** Cooldown in 1/10000 s; null when it fires once. */
  cooldown: number | null
  timeScale: number | null
  effects: SkillEffect[]
}

/** One step of an evolution requirement as the source lists it, e.g. `["stat", 2, 600]`. */
export type SkillEvolutionRequirement = readonly (string | number | null | readonly (string | number | null)[])[]

export interface SkillEvolution {
  /** The outfit that evolves it, or null for a scenario evolution. */
  outfitId: OutfitId | null
  scenarioId: ScenarioId | null
  /** The evolved skills it can become. */
  skillIds: SkillId[]
}

export interface Skill {
  id: SkillId
  rarity: number
  /** `en` is GameTora's translation of the Japanese name; `global` is the official Global name. */
  name: LocalText
  description: LocalText
  /** Skill points to learn it; null when it can't be bought. */
  costSp: number | null
  iconId: number
  /** 0 always activates when its condition holds; 1 rolls the original's Wit check. */
  activation: number
  /** GameTora's category tags, e.g. `run`, `mil`, `cor` (docs/master-data.md#skill-tags). */
  tags: string[]
  /** Japan's mechanics. */
  conditionGroups: SkillConditionGroup[]
  /** Global's mechanics where they differ from Japan's; null when the same. */
  globalConditionGroups: SkillConditionGroup[] | null
  globalIconId: number | null
  globalTags: string[] | null
  /** The inherited (gene) version of this skill, a separate record. */
  inheritedSkillId: SkillId | null
  /** On an inherited version: the skills it's inherited from. Empty otherwise. */
  parentSkillIds: SkillId[]
  /** Related versions: the ○/◎/× steps of a white and its gold, in the source's order. */
  versionIds: SkillId[]
  evolutions: SkillEvolution[]
  /** On an evolved skill: what it evolves from. */
  evolvedFrom: { skillId: SkillId; outfitId: OutfitId | null; scenarioId: ScenarioId | null } | null
  /** On an evolved skill: the requirements, as alternatives of steps (`[[step, …], …]`). */
  evolutionRequirements: SkillEvolutionRequirement[][]
  /** Scenarios whose events teach it. */
  scenarioEventIds: ScenarioId[]
  /** Servers that don't have it yet. */
  unreleasedIn: Server[]
}

const parseEffect: Parser<SkillEffect> = (value, path) => {
  const f = fields(value, path)
  return {
    type: f('type', integer),
    value: f('value', finite),
    target: f('target', nullable(integer)),
    targetDetails: f('targetDetails', nullable(integer)),
    valueScale: f('valueScale', nullable(integer)),
    additionalActivation: f('additionalActivation', nullable(integer)),
  }
}

export const parseSkillConditionGroup: Parser<SkillConditionGroup> = (value, path) => {
  const f = fields(value, path)
  return {
    precondition: f('precondition', nullable(text)),
    condition: f('condition', string),
    baseTime: f('baseTime', integer),
    cooldown: f('cooldown', nullable(integer)),
    timeScale: f('timeScale', nullable(integer)),
    effects: f('effects', arrayOf(parseEffect)),
  }
}

const scalar = (value: unknown, path: string): string | number | null =>
  value === null || typeof value === 'string' || (typeof value === 'number' && Number.isFinite(value))
    ? value
    : fail(path, 'a string, number or null')

const parseRequirement: Parser<SkillEvolutionRequirement> = arrayOf((value, path) =>
  Array.isArray(value) ? arrayOf(scalar)(value, path) : scalar(value, path),
)

export const parseSkill: Parser<Skill> = (value, path) => {
  const f = fields(value, path)
  return {
    id: f('id', id),
    rarity: f('rarity', integer),
    name: f('name', parseLocalText),
    description: f('description', parseLocalText),
    costSp: f('costSp', nullable(nonNegativeInteger)),
    iconId: f('iconId', id),
    activation: f('activation', integer),
    tags: f('tags', arrayOf(text)),
    conditionGroups: f('conditionGroups', arrayOf(parseSkillConditionGroup)),
    globalConditionGroups: f('globalConditionGroups', nullable(arrayOf(parseSkillConditionGroup))),
    globalIconId: f('globalIconId', nullable(id)),
    globalTags: f('globalTags', nullable(arrayOf(text))),
    inheritedSkillId: f('inheritedSkillId', nullable(id)),
    parentSkillIds: f('parentSkillIds', idList),
    versionIds: f('versionIds', idList),
    evolutions: f(
      'evolutions',
      arrayOf((entry, at) => {
        const e = fields(entry, at)
        return { outfitId: e('outfitId', nullable(id)), scenarioId: e('scenarioId', nullable(id)), skillIds: e('skillIds', idList) }
      }),
    ),
    evolvedFrom: f(
      'evolvedFrom',
      nullable((entry, at) => {
        const e = fields(entry, at)
        return { skillId: e('skillId', id), outfitId: e('outfitId', nullable(id)), scenarioId: e('scenarioId', nullable(id)) }
      }),
    ),
    evolutionRequirements: f('evolutionRequirements', arrayOf(arrayOf(parseRequirement))),
    scenarioEventIds: f('scenarioEventIds', idList),
    unreleasedIn: f('unreleasedIn', arrayOf(parseServer)),
  }
}
