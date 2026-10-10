// GameTora `scenarios` → master scenarios (docs/master-data.md#scenarios). uma-racer kept scenarios as a hand-written
// ladder; master data imports them, so a new scenario reaches every game with its release.

import type { Scenario, Stats } from '@luismlorenzana/uma-data'
import { id, integer, isRecord, localText, number, records, serverTimes, text, type NormalizeResult } from './shared'

function statsOf(value: unknown): Stats | null {
  if (!Array.isArray(value) || value.length < 5) return null
  const values = value.slice(0, 5).map(number)
  if (values.some((entry) => entry === null)) return null
  const [speed, stamina, power, guts, wit] = values as [number, number, number, number, number]
  return { speed, stamina, power, guts, wit }
}

export function normalizeScenarios(value: unknown): NormalizeResult<Scenario> {
  const warnings: string[] = []
  const items: Scenario[] = []
  const seen = new Set<number>()

  for (const raw of records(value)) {
    const scenarioId = id(raw.id)
    const order = integer(raw.order)
    const name = localText(raw.name_ja, raw.name_en_old, raw.name_en)
    const startsAt = serverTimes(raw, 'start')
    const color = typeof raw.bg_color === 'string' && /^[0-9A-Fa-f]{6}$/.test(raw.bg_color) ? raw.bg_color : null
    const hardCaps = Array.isArray(raw.hard_caps) ? raw.hard_caps.map(integer) : null
    const stats = statsOf(raw.stats)
    if (!scenarioId || order === null || order < 1 || !name || !startsAt || !color || !hardCaps ||
      hardCaps.some((cap) => cap === null || cap < 0) || !stats) {
      warnings.push(`Scenario ${scenarioId ?? '<missing id>'} has invalid required fields and was skipped`)
      continue
    }
    if (seen.has(scenarioId)) {
      warnings.push(`Scenario ${scenarioId} repeats; the first row was kept`)
      continue
    }
    seen.add(scenarioId)
    const linked = Array.isArray(raw.scenario_linked_characters) ? raw.scenario_linked_characters.filter(isRecord) : []
    items.push({
      id: scenarioId,
      order,
      name,
      globalFullName: text(raw.name_en_full),
      startsAt,
      color: color.toUpperCase(),
      hardCaps: hardCaps as number[],
      stats,
      specialProgram: integer(raw.special_program) ?? 0,
      linkedCharacters: linked.flatMap((entry) => {
        const linkId = id(entry.id)
        const characterId = id(entry.char_id)
        const linkName = localText(entry.name_ja, entry.name_en)
        return linkId && characterId && linkName ? [{ id: linkId, characterId, name: linkName }] : []
      }),
    })
  }

  return { items, warnings }
}
