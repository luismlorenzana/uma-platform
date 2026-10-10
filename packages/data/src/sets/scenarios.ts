// Career scenarios (docs/master-data.md#scenarios).

import {
  parseLocalText,
  parseServerTimes,
  parseStats,
  type CharacterId,
  type LocalText,
  type ScenarioId,
  type ServerTimes,
  type Stats,
} from '../common.js'
import { arrayOf, fail, fields, id, integer, nonNegativeInteger, positiveInteger, type Parser } from '../parse.js'

export interface ScenarioLinkedCharacter {
  /** GameTora's link id. */
  id: number
  characterId: CharacterId
  name: LocalText
}

export interface Scenario {
  id: ScenarioId
  /** Release order in Japan, from 1. */
  order: number
  /** `en` is GameTora's English name; `global` is the official Global name. */
  name: LocalText
  /** Global's full title, e.g. `The Beginning: URA Finale`. */
  globalFullName: string | null
  /** When the scenario started on each server. */
  startsAt: ServerTimes
  /** Theme colour as `RRGGBB`. */
  color: string
  /** Hard caps in the source's order: the five stats, then skill points. */
  hardCaps: number[]
  /** GameTora's per-stat `stats` values for the scenario, kept as given (docs/master-data.md#scenarios). */
  stats: Stats
  /** GameTora's `special_program` code. */
  specialProgram: number
  /** Scenario characters (trainers, rivals) linked to it. */
  linkedCharacters: ScenarioLinkedCharacter[]
}

const COLOR_PATTERN = /^[0-9A-Fa-f]{6}$/

export const parseScenario: Parser<Scenario> = (value, path) => {
  const f = fields(value, path)
  return {
    id: f('id', id),
    order: f('order', positiveInteger),
    name: f('name', parseLocalText),
    globalFullName: f('globalFullName', (entry, at) =>
      entry === null || (typeof entry === 'string' && entry.length > 0) ? entry : fail(at, 'a non-empty string or null'),
    ),
    startsAt: f('startsAt', parseServerTimes),
    color: f('color', (entry, at) =>
      typeof entry === 'string' && COLOR_PATTERN.test(entry) ? entry : fail(at, 'a colour as RRGGBB'),
    ),
    hardCaps: f('hardCaps', arrayOf(nonNegativeInteger)),
    stats: f('stats', parseStats),
    specialProgram: f('specialProgram', integer),
    linkedCharacters: f(
      'linkedCharacters',
      arrayOf((entry, at) => {
        const e = fields(entry, at)
        return { id: e('id', id), characterId: e('characterId', id), name: e('name', parseLocalText) }
      }),
    ),
  }
}
