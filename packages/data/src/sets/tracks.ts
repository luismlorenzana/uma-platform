// Racetracks and their course layouts (docs/master-data.md#tracks-and-courses).

import type { CourseId, TrackId } from '../common.js'
import { arrayOf, fields, finite, id, integer, nonNegativeInteger, nullable, positiveInteger, text, type Parser } from '../parse.js'

export interface Track {
  id: TrackId
  /** English venue name; null for a track the importer has no name for. */
  name: string | null
  courseIds: CourseId[]
}

/** A stretch of the course in metres from the start. */
export interface CourseSpan {
  start: number
  end: number
}

export interface Course {
  id: CourseId
  trackId: TrackId
  /** Terrain code, see `TERRAINS`. */
  terrain: number
  /** The original's distance-category code (1 sprint … 4 long), not metres. */
  distanceCategory: number
  /** Length in metres. */
  length: number
  /** Turn direction code, see `DIRECTIONS`. */
  turn: number
  /** The original's inner/outer layout code. */
  inout: number
  corners: (CourseSpan & { number: number })[]
  straights: (CourseSpan & { frontType: number })[]
  slopes: (CourseSpan & { slope: number })[]
  /** Race phases (0 opening … 3 last spurt). */
  phases: (CourseSpan & { id: number })[]
  laps: (CourseSpan & { lap: number })[]
  noMansLand: CourseSpan[]
  /** GameTora's overlap markers. */
  overlaps: string[]
  /** Metres at which position keeping ends. */
  positionKeepEnd: number
  spurtStart: { lap: number; location: string[]; meters: number }
  /** The original's stat ids that the course checks for its stat-threshold bonus. */
  statThresholds: number[]
  terrainChanges: { start: number; terrain: number }[]
}

export const parseTrack: Parser<Track> = (value, path) => {
  const f = fields(value, path)
  return { id: f('id', id), name: f('name', nullable(text)), courseIds: f('courseIds', arrayOf(id)) }
}

function span<T extends object>(extra: (f: <V>(key: string, parse: Parser<V>) => V) => T): Parser<CourseSpan & T> {
  return (value, path) => {
    const f = fields(value, path)
    return { start: f('start', finite), end: f('end', finite), ...extra(f) }
  }
}

export const parseCourse: Parser<Course> = (value, path) => {
  const f = fields(value, path)
  return {
    id: f('id', id),
    trackId: f('trackId', id),
    terrain: f('terrain', integer),
    distanceCategory: f('distanceCategory', integer),
    length: f('length', positiveInteger),
    turn: f('turn', integer),
    inout: f('inout', integer),
    corners: f('corners', arrayOf(span((g) => ({ number: g('number', integer) })))),
    straights: f('straights', arrayOf(span((g) => ({ frontType: g('frontType', integer) })))),
    slopes: f('slopes', arrayOf(span((g) => ({ slope: g('slope', finite) })))),
    phases: f('phases', arrayOf(span((g) => ({ id: g('id', integer) })))),
    laps: f('laps', arrayOf(span((g) => ({ lap: g('lap', integer) })))),
    noMansLand: f('noMansLand', arrayOf(span(() => ({})))),
    overlaps: f('overlaps', arrayOf(text)),
    positionKeepEnd: f('positionKeepEnd', finite),
    spurtStart: f('spurtStart', (entry, at) => {
      const e = fields(entry, at)
      return { lap: e('lap', integer), location: e('location', arrayOf(text)), meters: e('meters', finite) }
    }),
    statThresholds: f('statThresholds', arrayOf(integer)),
    terrainChanges: f(
      'terrainChanges',
      arrayOf((entry, at) => {
        const e = fields(entry, at)
        return { start: e('start', nonNegativeInteger), terrain: e('terrain', integer) }
      }),
    ),
  }
}
