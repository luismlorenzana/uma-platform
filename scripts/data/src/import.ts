// CLI for `pnpm data:import`: GameTora → neutral master sets in content/release (scripts/data/README.md).

import { findReferenceIssues, SET_NAMES, type MasterData, type SetName } from '@luismlorenzana/uma-data'
import { DATASET_NAMES, loadGameToraData } from './gametora'
import { normalizeSupportCards } from './normalize/cards'
import { normalizeCharacters } from './normalize/characters'
import { normalizeTracks } from './normalize/courses'
import { normalizeObjectives } from './normalize/objectives'
import { normalizeOutfits } from './normalize/outfits'
import { normalizeRaces } from './normalize/races'
import { normalizeScenarios } from './normalize/scenarios'
import { normalizeSkills } from './normalize/skills'
import { writeDataSets, type MasterSets } from './pack'
import { DEFAULT_RELEASE_DIR, readLocalManifest, readLocalSet } from './release-dir'
import { scenarioCoverage, scenarioCoverageWarning } from './scenario-coverage'

/** Record counts of the previous local release, to catch a source that suddenly shrinks. */
async function previousRelease(releaseDir: string) {
  try {
    const manifest = await readLocalManifest(releaseDir)
    if (!manifest) return null
    const counts = {} as Record<SetName, number>
    for (const name of SET_NAMES) counts[name] = (await readLocalSet(releaseDir, manifest, name)).length
    return { counts, scenarios: await readLocalSet(releaseDir, manifest, 'scenarios') }
  } catch (error) {
    console.warn(`Warning: the previous local release is unreadable and was ignored (${error instanceof Error ? error.message : String(error)})`)
    return null
  }
}

function summarizeReferenceIssues(data: MasterData): string[] {
  const tally = new Map<string, Set<number>>()
  for (const issue of findReferenceIssues(data)) {
    const from = issue.from.replace(/\[\d+\]/, '[]')
    const key = `${from} → ${issue.to}`
    tally.set(key, (tally.get(key) ?? new Set()).add(issue.id))
  }
  return [...tally].map(([key, missing]) => {
    const sample = [...missing].slice(0, 5).join(', ')
    return `${key}: ${missing.size} unknown id(s) (${sample}${missing.size > 5 ? ', …' : ''})`
  })
}

async function main(): Promise<void> {
  const refresh = process.argv.includes('--refresh')
  const offline = process.argv.includes('--offline')
  const releaseDir = DEFAULT_RELEASE_DIR
  const { versions, datasets, cacheHits } = await loadGameToraData({ refresh, offline })
  console.log(`GameTora: ${DATASET_NAMES.length} datasets (${cacheHits.length} cached, ${DATASET_NAMES.length - cacheHits.length} downloaded)`)

  const characters = normalizeCharacters(datasets.characters)
  const outfits = normalizeOutfits(datasets['character-cards'])
  const supportCards = normalizeSupportCards(datasets['support-cards'])
  const skills = normalizeSkills(datasets.skills)
  const scenarios = normalizeScenarios(datasets.scenarios)
  const races = normalizeRaces(datasets.races)
  const { tracks, courses } = normalizeTracks(datasets.racetracks)
  const objectives = normalizeObjectives(datasets['ura-objectives'])

  const sets: MasterSets = {
    characters: characters.items,
    outfits: outfits.items,
    'support-cards': supportCards.items,
    skills: skills.items,
    scenarios: scenarios.items,
    races: races.items,
    tracks: tracks.items,
    courses: courses.items,
    objectives: objectives.items,
  }
  const data: MasterData = {
    characters: characters.items,
    outfits: outfits.items,
    supportCards: supportCards.items,
    skills: skills.items,
    scenarios: scenarios.items,
    races: races.items,
    tracks: tracks.items,
    courses: courses.items,
    objectives: objectives.items,
  }

  const byRarity = (items: readonly { rarity: number }[]) =>
    [...items.reduce((counts, item) => counts.set(item.rarity, (counts.get(item.rarity) ?? 0) + 1), new Map<number, number>())]
      .sort(([left], [right]) => left - right)
      .map(([rarity, count]) => `${rarity}: ${count}`)
      .join(' · ')
  const coverage = scenarioCoverage(scenarios.items)
  console.log(`Characters: ${characters.items.length} (${characters.items.filter((item) => item.playable.jp).length} playable in Japan)`)
  console.log(`Outfits: ${outfits.items.length} (by starting stars ${byRarity(outfits.items)})`)
  console.log(`Support cards: ${supportCards.items.length} (by rarity ${byRarity(supportCards.items)})`)
  console.log(`Skills: ${skills.items.length} (by rarity ${byRarity(skills.items)}; ${skills.items.filter((item) => item.parentSkillIds.length > 0).length} inherited versions)`)
  console.log(`Scenarios: ${scenarios.items.length} (${coverage.released} out in Japan through ${coverage.releasedThrough ?? 'none'}, ${coverage.upcoming} upcoming)`)
  console.log(`Races: ${races.items.length} · Tracks: ${tracks.items.length} · Courses: ${courses.items.length}`)
  console.log(`Objectives: ${objectives.items.length} characters · ${objectives.items.reduce((total, item) => total + item.objectives.length, 0)} objectives`)

  const warnings = [
    ...characters.warnings, ...outfits.warnings, ...supportCards.warnings, ...skills.warnings, ...scenarios.warnings,
    ...races.warnings, ...tracks.warnings, ...courses.warnings, ...objectives.warnings,
  ]
  const previous = await previousRelease(releaseDir)
  const coverageWarning = scenarioCoverageWarning(scenarios.items, previous?.scenarios ?? null)
  if (coverageWarning) warnings.unshift(coverageWarning)
  for (const name of SET_NAMES) {
    const before = previous?.counts[name]
    const after = sets[name].length
    if (before !== undefined && after < before) warnings.unshift(`${name} shrank from ${before} to ${after} records`)
  }
  for (const warning of warnings) console.warn(`Warning: ${warning}`)
  const references = summarizeReferenceIssues(data)
  if (references.length > 0) {
    console.warn('References to records the source lacks (kept as given; games handle unknown ids):')
    for (const line of references) console.warn(`  ${line}`)
  }

  const sources = Object.fromEntries(DATASET_NAMES.map((name) => [`gametora/${name}`, versions[name]]))
  const manifest = await writeDataSets({ sets, sources, releaseDir })
  console.log(`Release: ${manifest.version} (${manifest.files.length} files, art ${manifest.art ? 'kept' : 'not built yet'})`)
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
