// GameTora `races` → master races, ported from uma-racer (docs/master-data.md#races). Every grade and venue is kept
// with the original's codes; uma-racer's grade names, distance categories, venue keys, 18-runner cap and flair
// overlay stay in its adapter (docs/racer-mapping.md).

import type { Race, RaceAlternative } from '@luismlorenzana/uma-data'
import { id, integer, isRecord, localText, pick, records, servers, text, WarningTally, type NormalizeResult } from './shared'

function alternatives(value: unknown): RaceAlternative[] {
  if (!Array.isArray(value)) return []
  return value.filter(isRecord).flatMap((alt) => {
    const altId = id(alt.id)
    const familyId = id(alt.race_id)
    const trackId = id(alt.track)
    const courseId = id(alt.course_id)
    const direction = integer(alt.direction)
    if (!altId || !familyId || !trackId || !courseId || direction === null) return []
    const distance = integer(alt.distance)
    const entries = integer(alt.entries)
    return [{
      id: altId,
      familyId,
      trackId,
      courseId,
      direction,
      distance: distance !== null && distance > 0 ? distance : null,
      entries: entries !== null && entries > 0 ? entries : null,
      didNotExist: text(alt.did_not_exist),
    }]
  })
}

export function normalizeRaces(value: unknown): NormalizeResult<Race> {
  const warnings: string[] = []
  const unknownServers = new WarningTally()
  const items: Race[] = []
  const seen = new Set<number>()

  for (const raw of records(value)) {
    const raceId = id(raw.id)
    const familyId = id(raw.race_id)
    const name = localText(pick(raw, 'name_ja', 'name_jp'), raw.name_en)
    const grade = integer(raw.grade)
    const group = integer(raw.group)
    const terrain = integer(raw.terrain)
    const distance = integer(raw.distance)
    const direction = integer(raw.direction)
    const trackId = id(raw.track)
    const courseId = id(raw.course_id)
    const courseCode = integer(raw.course)
    const season = integer(raw.season)
    const timeOfDay = integer(raw.time)
    const entries = integer(raw.entries)
    if (!raceId || !familyId || !name || grade === null || group === null || terrain === null || distance === null ||
      distance <= 0 || direction === null || !trackId || !courseId || courseCode === null || season === null ||
      timeOfDay === null || entries === null || entries <= 0) {
      warnings.push(`Race ${raceId ?? '<missing id>'} has invalid required fields and was skipped`)
      continue
    }
    // GameTora lists a few races twice; the first row wins, as in uma-racer.
    if (seen.has(raceId)) continue
    seen.add(raceId)
    const factor = isRecord(raw.factor) ? raw.factor : null
    const effect1 = text(factor?.effect_1)
    const effect2 = text(factor?.effect_2)
    items.push({
      id: raceId,
      familyId,
      name,
      grade,
      group,
      terrain,
      distance,
      direction,
      trackId,
      courseId,
      courseCode,
      season,
      timeOfDay,
      entries,
      bannerId: integer(raw.banner_id) ?? 0,
      factor: effect1 && effect2 ? { effect1, effect2 } : null,
      programIds: Array.isArray(raw.list_ura) ? raw.list_ura.map(text).filter((entry): entry is string => entry !== null) : [],
      alternatives: alternatives(raw.alts),
      didNotExist: text(raw.did_not_exist),
      unreleasedIn: servers(raw.unreleased_servers, (code) => unknownServers.add('Unknown server code in races', code)),
    })
  }

  warnings.push(...unknownServers.lines())
  return { items, warnings }
}
