// Races: one record per program instance (docs/master-data.md#races).

import {
  parseLocalText,
  parseServer,
  type CourseId,
  type LocalText,
  type RaceFamilyId,
  type RaceId,
  type Server,
  type TrackId,
} from '../common.js'
import { arrayOf, fields, id, integer, nullable, positiveInteger, text, type Parser } from '../parse.js'

/** The original's race grade codes. */
export const RACE_GRADES: Readonly<Record<number, string>> = {
  100: 'G1',
  200: 'G2',
  300: 'G3',
  400: 'OP',
  700: 'Pre-OP',
  800: 'Maiden',
  900: 'Debut',
}

/** The original's terrain codes, shared by races and courses. */
export const TERRAINS: Readonly<Record<number, 'turf' | 'dirt'>> = { 1: 'turf', 2: 'dirt' }

/** The original's turn directions. */
export const DIRECTIONS: Readonly<Record<number, 'right' | 'left' | 'straight'>> = { 1: 'right', 2: 'left', 4: 'straight' }

/** The original's season codes; 0 and 5 also occur (docs/master-data.md#races). */
export const SEASONS: Readonly<Record<number, string>> = { 1: 'spring', 2: 'summer', 3: 'autumn', 4: 'winter' }

export interface RaceAlternative {
  /** The alternative's own race id. */
  id: RaceId
  familyId: RaceFamilyId
  trackId: TrackId
  courseId: CourseId
  direction: number
  /** Null where the source doesn't give it (it's the main race's). */
  distance: number | null
  entries: number | null
  /** The period it didn't exist in, as the source names it, e.g. `pre_nar`. */
  didNotExist: string | null
}

export interface Race {
  /** The program-instance id (GameTora `id`). */
  id: RaceId
  /** The race's own id, shared by every instance of the same race (GameTora `race_id`). */
  familyId: RaceFamilyId
  /** `en` is GameTora's English name. */
  name: LocalText
  /** Grade code, see `RACE_GRADES`. */
  grade: number
  /** GameTora's `group` code. */
  group: number
  /** Terrain code, see `TERRAINS`. */
  terrain: number
  /** Length in metres. */
  distance: number
  /** Direction code, see `DIRECTIONS`. */
  direction: number
  trackId: TrackId
  courseId: CourseId
  /** GameTora's `course` code (inner/outer layout variant). */
  courseCode: number
  /** Season code, see `SEASONS`. */
  season: number
  /** GameTora's `time` code for the time of day. */
  timeOfDay: number
  /** Field size. */
  entries: number
  bannerId: number
  /** The race's spark effects as the source writes them (a stat or a Japanese skill name). */
  factor: { effect1: string; effect2: string } | null
  /** GameTora's `list_ura` program ids. */
  programIds: string[]
  /** Other venues or layouts this race ran under in some periods. */
  alternatives: RaceAlternative[]
  /** The period it didn't exist in, as the source names it, e.g. `pre_nar`. */
  didNotExist: string | null
  unreleasedIn: Server[]
}

const parseAlternative: Parser<RaceAlternative> = (value, path) => {
  const f = fields(value, path)
  return {
    id: f('id', id),
    familyId: f('familyId', id),
    trackId: f('trackId', id),
    courseId: f('courseId', id),
    direction: f('direction', integer),
    distance: f('distance', nullable(positiveInteger)),
    entries: f('entries', nullable(positiveInteger)),
    didNotExist: f('didNotExist', nullable(text)),
  }
}

export const parseRace: Parser<Race> = (value, path) => {
  const f = fields(value, path)
  return {
    id: f('id', id),
    familyId: f('familyId', id),
    name: f('name', parseLocalText),
    grade: f('grade', integer),
    group: f('group', integer),
    terrain: f('terrain', integer),
    distance: f('distance', positiveInteger),
    direction: f('direction', integer),
    trackId: f('trackId', id),
    courseId: f('courseId', id),
    courseCode: f('courseCode', integer),
    season: f('season', integer),
    timeOfDay: f('timeOfDay', integer),
    entries: f('entries', positiveInteger),
    bannerId: f('bannerId', integer),
    factor: f(
      'factor',
      nullable((entry, at) => {
        const e = fields(entry, at)
        return { effect1: e('effect1', text), effect2: e('effect2', text) }
      }),
    ),
    programIds: f('programIds', arrayOf(text)),
    alternatives: f('alternatives', arrayOf(parseAlternative)),
    didNotExist: f('didNotExist', nullable(text)),
    unreleasedIn: f('unreleasedIn', arrayOf(parseServer)),
  }
}
