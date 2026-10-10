// GameTora `ura-objectives` → master career objectives, ported from uma-racer (docs/master-data.md#objectives).
// uma-racer kept only ordered race-family ids per character; master data keeps every objective as the source gives
// it, and the racer adapter derives its signature races from them (docs/racer-mapping.md).

import type { CareerObjective, CareerObjectives, ObjectiveRace } from '@luismlorenzana/uma-data'
import { id, integer, isRecord, localText, pick, records, servers, WarningTally, type NormalizeResult, type RawRecord } from './shared'

function objectiveRace(raw: RawRecord, unknownServers: WarningTally): ObjectiveRace | null {
  const familyId = id(raw.id)
  const name = localText(pick(raw, 'name_ja', 'name_jp'), raw.name_en)
  const grade = integer(raw.grade)
  const group = integer(raw.group)
  const terrain = integer(raw.terrain)
  const distance = integer(raw.distance)
  const trackId = id(raw.track)
  const iconId = integer(raw.icon_id)
  const fansGained = integer(raw.fans_gained)
  const fansNeeded = integer(raw.fans_needed)
  if (!familyId || !name || grade === null || group === null || terrain === null || distance === null || distance <= 0 ||
    !trackId || iconId === null || fansGained === null || fansGained < 0 || fansNeeded === null || fansNeeded < 0) return null
  return {
    familyId,
    name,
    grade,
    group,
    terrain,
    distance,
    trackId,
    iconId,
    fansGained,
    fansNeeded,
    nar: raw.nar === true,
    unreleasedIn: servers(raw.unreleased_servers, (code) => unknownServers.add('Unknown server code in objectives', code)),
  }
}

function objective(raw: RawRecord, unknownServers: WarningTally): CareerObjective | null {
  const values = {
    order: integer(raw.order),
    turn: integer(raw.turn),
    conditionId: integer(raw.cond_id),
    conditionType: integer(raw.cond_type),
    conditionValue: integer(raw.cond_value),
    conditionValue2: integer(raw.cond_value_2),
    raceChoice: integer(raw.race_choice),
    raceChoiceDetails: integer(raw.race_choice_details),
    raceType: integer(raw.race_type),
    targetType: integer(raw.target_type),
  }
  if (Object.values(values).some((entry) => entry === null) || values.order! < 1 || values.turn! < 0) return null
  if (raw.races !== undefined && raw.races !== null && !Array.isArray(raw.races)) return null
  const races: ObjectiveRace[] = []
  for (const race of Array.isArray(raw.races) ? raw.races : []) {
    const parsed = isRecord(race) ? objectiveRace(race, unknownServers) : null
    if (!parsed) return null
    races.push(parsed)
  }
  return { ...(values as { [K in keyof typeof values]: number }), races }
}

export function normalizeObjectives(value: unknown): NormalizeResult<CareerObjectives> {
  const warnings: string[] = []
  const unknownServers = new WarningTally()
  const items: CareerObjectives[] = []
  const seen = new Set<number>()
  let malformed = 0

  for (const row of records(value)) {
    const objectiveId = id(row.obj_id)
    const characterId = id(row.char_id)
    const parsed = Array.isArray(row.objectives)
      ? row.objectives.map((entry) => (isRecord(entry) ? objective(entry, unknownServers) : null))
      : null
    if (!objectiveId || !characterId || !parsed || parsed.some((entry) => entry === null) || seen.has(objectiveId)) {
      malformed += 1
      continue
    }
    seen.add(objectiveId)
    const objectives = (parsed as CareerObjective[]).sort((left, right) => left.order - right.order)
    items.push({ id: objectiveId, characterId, objectives })
  }

  if (malformed > 0) warnings.push(`Objectives skipped ${malformed} malformed or repeated row(s)`)
  warnings.push(...unknownServers.lines())
  return { items, warnings }
}
