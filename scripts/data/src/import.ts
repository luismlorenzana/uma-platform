// CLI for `pnpm data:import`: GameTora → neutral master sets in content/release (scripts/data/README.md).

import { findReferenceIssues, SET_NAMES, type MasterData, type SetName } from '@luismlorenzana/uma-data'
import { DATASET_NAMES, loadGameToraData } from './gametora'
import { writeDataSets } from './pack'
import { DEFAULT_RELEASE_DIR, readLocalManifest, readLocalSet } from './release-dir'
import { scenarioCoverage, scenarioCoverageWarning } from './scenario-coverage'
import { normalizeSets } from './sets'

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

  const { sets, data, warnings: normalizeWarnings } = normalizeSets(datasets)
  const { characters, outfits, supportCards, skills, scenarios, races, tracks, courses, objectives } = data

  const byRarity = (items: readonly { rarity: number }[]) =>
    [...items.reduce((counts, item) => counts.set(item.rarity, (counts.get(item.rarity) ?? 0) + 1), new Map<number, number>())]
      .sort(([left], [right]) => left - right)
      .map(([rarity, count]) => `${rarity}: ${count}`)
      .join(' · ')
  const coverage = scenarioCoverage(scenarios)
  console.log(`Characters: ${characters.length} (${characters.filter((item) => item.playable.jp).length} playable in Japan)`)
  console.log(`Outfits: ${outfits.length} (by starting stars ${byRarity(outfits)})`)
  console.log(`Support cards: ${supportCards.length} (by rarity ${byRarity(supportCards)})`)
  console.log(`Skills: ${skills.length} (by rarity ${byRarity(skills)}; ${skills.filter((item) => item.parentSkillIds.length > 0).length} inherited versions)`)
  console.log(`Scenarios: ${scenarios.length} (${coverage.released} out in Japan through ${coverage.releasedThrough ?? 'none'}, ${coverage.upcoming} upcoming)`)
  console.log(`Races: ${races.length} · Tracks: ${tracks.length} · Courses: ${courses.length}`)
  console.log(`Objectives: ${objectives.length} characters · ${objectives.reduce((total, item) => total + item.objectives.length, 0)} objectives`)

  const warnings = [...normalizeWarnings]
  const previous = await previousRelease(releaseDir)
  const coverageWarning = scenarioCoverageWarning(scenarios, previous?.scenarios ?? null)
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
