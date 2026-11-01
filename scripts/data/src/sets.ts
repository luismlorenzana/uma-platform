// GameTora's datasets → the nine master sets, shared by the import and by `pnpm uma:check`.

import type { MasterData } from '@luismlorenzana/uma-data'
import type { DatasetName } from './gametora'
import { normalizeSupportCards } from './normalize/cards'
import { normalizeCharacters } from './normalize/characters'
import { normalizeTracks } from './normalize/courses'
import { normalizeObjectives } from './normalize/objectives'
import { normalizeOutfits } from './normalize/outfits'
import { normalizeRaces } from './normalize/races'
import { normalizeScenarios } from './normalize/scenarios'
import { normalizeSkills } from './normalize/skills'
import type { MasterSets } from './pack'

export interface NormalizedSets {
  sets: MasterSets
  data: MasterData
  warnings: string[]
}

export function normalizeSets(datasets: Record<DatasetName, unknown>): NormalizedSets {
  const characters = normalizeCharacters(datasets.characters)
  const outfits = normalizeOutfits(datasets['character-cards'])
  const supportCards = normalizeSupportCards(datasets['support-cards'])
  const skills = normalizeSkills(datasets.skills)
  const scenarios = normalizeScenarios(datasets.scenarios)
  const races = normalizeRaces(datasets.races)
  const { tracks, courses } = normalizeTracks(datasets.racetracks)
  const objectives = normalizeObjectives(datasets['ura-objectives'])
  return {
    sets: {
      characters: characters.items,
      outfits: outfits.items,
      'support-cards': supportCards.items,
      skills: skills.items,
      scenarios: scenarios.items,
      races: races.items,
      tracks: tracks.items,
      courses: courses.items,
      objectives: objectives.items,
    },
    data: {
      characters: characters.items,
      outfits: outfits.items,
      supportCards: supportCards.items,
      skills: skills.items,
      scenarios: scenarios.items,
      races: races.items,
      tracks: tracks.items,
      courses: courses.items,
      objectives: objectives.items,
    },
    warnings: [
      ...characters.warnings, ...outfits.warnings, ...supportCards.warnings, ...skills.warnings, ...scenarios.warnings,
      ...races.warnings, ...tracks.warnings, ...courses.warnings, ...objectives.warnings,
    ],
  }
}
