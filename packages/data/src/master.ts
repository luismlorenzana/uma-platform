// The whole of master data: set registry, parsing by set name, and cross-reference checks.

import type { Parser } from './parse.js'
import { parseSetFile, type SetName } from './release.js'
import { parseCharacter, type Character } from './sets/characters.js'
import { parseCareerObjectives, type CareerObjectives } from './sets/objectives.js'
import { parseOutfit, type Outfit } from './sets/outfits.js'
import { parseRace, type Race } from './sets/races.js'
import { parseScenario, type Scenario } from './sets/scenarios.js'
import { parseSkill, type Skill } from './sets/skills.js'
import { parseSupportCard, type SupportCard } from './sets/support-cards.js'
import { parseCourse, parseTrack, type Course, type Track } from './sets/tracks.js'

/** The record type in each set. */
export interface SetItems {
  characters: Character
  outfits: Outfit
  'support-cards': SupportCard
  skills: Skill
  scenarios: Scenario
  races: Race
  tracks: Track
  courses: Course
  objectives: CareerObjectives
}

export const SET_PARSERS: { [N in SetName]: Parser<SetItems[N]> } = {
  characters: parseCharacter,
  outfits: parseOutfit,
  'support-cards': parseSupportCard,
  skills: parseSkill,
  scenarios: parseScenario,
  races: parseRace,
  tracks: parseTrack,
  courses: parseCourse,
  objectives: parseCareerObjectives,
}

/** Parses one set file by name and returns its records. */
export function parseSet<N extends SetName>(name: N, value: unknown): SetItems[N][] {
  return parseSetFile(value, name, SET_PARSERS[name] as Parser<SetItems[N]>).items
}

/** Every set of one release, keyed in camelCase. */
export interface MasterData {
  characters: Character[]
  outfits: Outfit[]
  supportCards: SupportCard[]
  skills: Skill[]
  scenarios: Scenario[]
  races: Race[]
  tracks: Track[]
  courses: Course[]
  objectives: CareerObjectives[]
}

export const MASTER_DATA_KEYS: { [N in SetName]: keyof MasterData } = {
  characters: 'characters',
  outfits: 'outfits',
  'support-cards': 'supportCards',
  skills: 'skills',
  scenarios: 'scenarios',
  races: 'races',
  tracks: 'tracks',
  courses: 'courses',
  objectives: 'objectives',
}

/** One id a record points at that the release doesn't hold. */
export interface ReferenceIssue {
  /** Where the reference is, e.g. `outfits[100101].skills.event`. */
  from: string
  /** The set the id should be in. */
  to: SetName
  id: number
}

/**
 * Lists references to records the release doesn't hold. The importer keeps references as the source gives them, so a
 * release can carry a few (a skill not yet in the skill list, say); games must handle unknown ids anyway (P8).
 */
export function findReferenceIssues(data: MasterData): ReferenceIssue[] {
  const ids = {
    characters: new Set(data.characters.map((item) => item.id)),
    outfits: new Set(data.outfits.map((item) => item.id)),
    skills: new Set(data.skills.map((item) => item.id)),
    scenarios: new Set(data.scenarios.map((item) => item.id)),
    tracks: new Set(data.tracks.map((item) => item.id)),
    courses: new Set(data.courses.map((item) => item.id)),
  }
  const issues: ReferenceIssue[] = []
  const check = (from: string, to: keyof typeof ids, values: readonly (number | null)[]) => {
    for (const value of values) if (value !== null && !ids[to].has(value)) issues.push({ from, to, id: value })
  }

  for (const outfit of data.outfits) {
    const at = `outfits[${outfit.id}]`
    check(`${at}.characterId`, 'characters', [outfit.characterId])
    const { unique, innate, awakening, globalAwakening, event, evolutions } = outfit.skills
    check(`${at}.skills`, 'skills', [...unique, ...innate, ...awakening, ...(globalAwakening ?? []), ...event])
    check(`${at}.skills.evolutions`, 'skills', evolutions.flatMap((evolution) => [evolution.from, evolution.to]))
  }
  for (const card of data.supportCards) {
    check(`support-cards[${card.id}].characterId`, 'characters', [card.characterId])
    check(`support-cards[${card.id}].skills`, 'skills', [
      ...card.hints.skillIds,
      ...card.eventSkillIds,
      ...(card.globalEventSkillIds ?? []),
    ])
  }
  for (const skill of data.skills) {
    const at = `skills[${skill.id}]`
    check(`${at}.inheritedSkillId`, 'skills', [skill.inheritedSkillId])
    check(`${at}.parentSkillIds`, 'skills', skill.parentSkillIds)
    check(`${at}.versionIds`, 'skills', skill.versionIds)
    check(`${at}.evolutions`, 'skills', skill.evolutions.flatMap((evolution) => evolution.skillIds))
    check(`${at}.evolutions`, 'outfits', skill.evolutions.map((evolution) => evolution.outfitId))
    check(`${at}.evolutions`, 'scenarios', skill.evolutions.map((evolution) => evolution.scenarioId))
    check(`${at}.scenarioEventIds`, 'scenarios', skill.scenarioEventIds)
    if (skill.evolvedFrom) {
      check(`${at}.evolvedFrom`, 'skills', [skill.evolvedFrom.skillId])
      check(`${at}.evolvedFrom`, 'outfits', [skill.evolvedFrom.outfitId])
      check(`${at}.evolvedFrom`, 'scenarios', [skill.evolvedFrom.scenarioId])
    }
  }
  for (const scenario of data.scenarios) {
    check(`scenarios[${scenario.id}].linkedCharacters`, 'characters', scenario.linkedCharacters.map((link) => link.characterId))
  }
  for (const race of data.races) {
    check(`races[${race.id}].trackId`, 'tracks', [race.trackId])
    check(`races[${race.id}].courseId`, 'courses', [race.courseId])
  }
  for (const course of data.courses) check(`courses[${course.id}].trackId`, 'tracks', [course.trackId])
  for (const track of data.tracks) check(`tracks[${track.id}].courseIds`, 'courses', track.courseIds)
  for (const entry of data.objectives) check(`objectives[${entry.id}].characterId`, 'characters', [entry.characterId])
  return issues
}
