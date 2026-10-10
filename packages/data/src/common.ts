// Vocabulary shared by every master set (docs/master-data.md#shared-shapes). Names follow the Global version of the
// original game where it has one, and match uma-racer's where the meaning is the same.

import { boolean, fields, isoDate, isoDateTime, nullable, oneOf, text, finite, type Parser } from './parse.js'

/** Original-game ids (P8). Plain numbers; the aliases only document which record an id points at. */
export type CharacterId = number
export type OutfitId = number
export type SupportCardId = number
export type SkillId = number
export type ScenarioId = number
export type RaceId = number
export type RaceFamilyId = number
export type TrackId = number
export type CourseId = number

export const STATS = ['speed', 'stamina', 'power', 'guts', 'wit'] as const
export type StatKey = (typeof STATS)[number]
export type Stats = Record<StatKey, number>

export const APTITUDE_GRADES = ['S', 'A', 'B', 'C', 'D', 'E', 'F', 'G'] as const
export type AptitudeGrade = (typeof APTITUDE_GRADES)[number]

export const SURFACES = ['turf', 'dirt'] as const
export type Surface = (typeof SURFACES)[number]

export const DISTANCES = ['sprint', 'mile', 'medium', 'long'] as const
export type Distance = (typeof DISTANCES)[number]

/** Running styles: Front Runner, Pace Chaser, Late Surger, End Closer. */
export const STRATEGIES = ['front', 'pace', 'late', 'end'] as const
export type Strategy = (typeof STRATEGIES)[number]

export interface Aptitudes {
  surface: Record<Surface, AptitudeGrade>
  distance: Record<Distance, AptitudeGrade>
  strategy: Record<Strategy, AptitudeGrade>
}

/** The original's servers: Japan, Global (English), Korea and Taiwan. */
export const SERVERS = ['jp', 'global', 'kr', 'tw'] as const
export type Server = (typeof SERVERS)[number]

/** One `YYYY-MM-DD` date per server; null where the record isn't out on that server. Japan always has one. */
export interface ServerDates {
  jp: string
  global: string | null
  kr: string | null
  tw: string | null
}

/** One UTC timestamp per server; null where it hasn't started there. Japan always has one. */
export interface ServerTimes {
  jp: string
  global: string | null
  kr: string | null
  tw: string | null
}

/** One flag per server; null where the source doesn't say. */
export interface ServerFlags {
  jp: boolean | null
  global: boolean | null
  kr: boolean | null
  tw: boolean | null
}

/**
 * A text in the original's languages.
 * - `ja`: the Japanese original.
 * - `en`: GameTora's English. For most sets this is a translation of the Japanese; some fields hold the official name
 *   (docs/master-data.md says which).
 * - `global`: the official Global-server English, only where the source gives it separately. Null doesn't mean the
 *   record is missing from Global; `release.global` says that.
 */
export interface LocalText {
  ja: string
  en: string | null
  global: string | null
}

export const parseStats: Parser<Stats> = (value, path) => {
  const f = fields(value, path)
  return {
    speed: f('speed', finite),
    stamina: f('stamina', finite),
    power: f('power', finite),
    guts: f('guts', finite),
    wit: f('wit', finite),
  }
}

const grade = oneOf(APTITUDE_GRADES)

export const parseAptitudes: Parser<Aptitudes> = (value, path) => {
  const f = fields(value, path)
  return {
    surface: f('surface', (group, at) => {
      const g = fields(group, at)
      return { turf: g('turf', grade), dirt: g('dirt', grade) }
    }),
    distance: f('distance', (group, at) => {
      const g = fields(group, at)
      return { sprint: g('sprint', grade), mile: g('mile', grade), medium: g('medium', grade), long: g('long', grade) }
    }),
    strategy: f('strategy', (group, at) => {
      const g = fields(group, at)
      return { front: g('front', grade), pace: g('pace', grade), late: g('late', grade), end: g('end', grade) }
    }),
  }
}

export const parseServerDates: Parser<ServerDates> = (value, path) => {
  const f = fields(value, path)
  return {
    jp: f('jp', isoDate),
    global: f('global', nullable(isoDate)),
    kr: f('kr', nullable(isoDate)),
    tw: f('tw', nullable(isoDate)),
  }
}

export const parseServerTimes: Parser<ServerTimes> = (value, path) => {
  const f = fields(value, path)
  return {
    jp: f('jp', isoDateTime),
    global: f('global', nullable(isoDateTime)),
    kr: f('kr', nullable(isoDateTime)),
    tw: f('tw', nullable(isoDateTime)),
  }
}

export const parseServerFlags: Parser<ServerFlags> = (value, path) => {
  const f = fields(value, path)
  return {
    jp: f('jp', nullable(boolean)),
    global: f('global', nullable(boolean)),
    kr: f('kr', nullable(boolean)),
    tw: f('tw', nullable(boolean)),
  }
}

export const parseLocalText: Parser<LocalText> = (value, path) => {
  const f = fields(value, path)
  return { ja: f('ja', text), en: f('en', nullable(text)), global: f('global', nullable(text)) }
}

export const parseServer: Parser<Server> = oneOf(SERVERS)
