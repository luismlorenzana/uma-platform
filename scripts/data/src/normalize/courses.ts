// GameTora `racetracks` → master tracks and course layouts, ported from uma-racer (docs/master-data.md#tracks-and-courses).

import type { Course, Track } from '@luismlorenzana/uma-data'
import { id, integer, isRecord, number, records, text, type NormalizeResult, type RawRecord } from './shared'

/**
 * Venue names by the original's track id. GameTora's racetracks dataset carries no names; these are uma-racer's list
 * plus Santa Anita Park, where the game's only 10202 race (American Oaks) is run. A track missing here gets a null
 * name and a warning.
 */
export const TRACK_NAMES: Readonly<Record<number, string>> = {
  10001: 'Sapporo',
  10002: 'Hakodate',
  10003: 'Niigata',
  10004: 'Fukushima',
  10005: 'Nakayama',
  10006: 'Tokyo',
  10007: 'Chukyo',
  10008: 'Kyoto',
  10009: 'Hanshin',
  10010: 'Kokura',
  10101: 'Ohi',
  10103: 'Kawasaki',
  10104: 'Funabashi',
  10105: 'Morioka',
  10201: 'Longchamp',
  10202: 'Santa Anita Park',
}

type Span = { start: number; end: number }

/** Rows of `{start, end, …extra}`; null when any row is malformed. */
function spans<T extends object>(value: unknown, extra: (row: RawRecord) => T | null): (Span & T)[] | null {
  if (value === undefined || value === null) return []
  if (!Array.isArray(value)) return null
  const rows: (Span & T)[] = []
  for (const row of value) {
    if (!isRecord(row)) return null
    const start = number(row.start)
    const end = number(row.end)
    const rest = extra(row)
    if (start === null || end === null || rest === null) return null
    rows.push({ start, end, ...rest })
  }
  return rows
}

const withInteger = <K extends string>(key: K, source: string) => (row: RawRecord) => {
  const value = integer(row[source])
  return value === null ? null : ({ [key]: value } as Record<K, number>)
}

function course(trackId: number, raw: RawRecord): Course | null {
  const courseId = id(raw.id)
  const distanceCategory = integer(raw.distance)
  const length = integer(raw.length)
  const terrain = integer(raw.terrain)
  const turn = integer(raw.turn)
  const inout = integer(raw.inout)
  const corners = spans(raw.corners, withInteger('number', 'number'))
  const straights = spans(raw.straights, withInteger('frontType', 'frontType'))
  const slopes = spans(raw.slopes, (row) => {
    const slope = number(row.slope)
    return slope === null ? null : { slope }
  })
  const phases = spans(raw.phases, withInteger('id', 'id'))
  const laps = spans(raw.laps, withInteger('lap', 'lap'))
  const noMansLand = spans(raw.noMansLand, () => ({}))
  const positionKeepEnd = number(raw.positionKeepEnd)
  const spurt = isRecord(raw.spurtStart) ? raw.spurtStart : null
  const spurtLap = integer(spurt?.lap)
  const spurtMeters = number(spurt?.meters)
  if (!courseId || distanceCategory === null || length === null || length <= 0 || terrain === null || turn === null ||
    inout === null || !corners || !straights || !slopes || !phases || !laps || !noMansLand || positionKeepEnd === null ||
    spurtLap === null || spurtMeters === null) return null
  const terrainChanges = Array.isArray(raw.terrainChanges)
    ? raw.terrainChanges.filter(isRecord).flatMap((row) => {
        const start = integer(row.start)
        const changed = integer(row.terrain)
        return start === null || start < 0 || changed === null ? [] : [{ start, terrain: changed }]
      })
    : []
  return {
    id: courseId,
    trackId,
    terrain,
    distanceCategory,
    length,
    turn,
    inout,
    corners,
    straights,
    slopes,
    phases,
    laps,
    noMansLand,
    overlaps: Array.isArray(raw.overlaps) ? raw.overlaps.map(text).filter((entry): entry is string => entry !== null) : [],
    positionKeepEnd,
    spurtStart: {
      lap: spurtLap,
      location: Array.isArray(spurt?.location) ? spurt.location.map(text).filter((entry): entry is string => entry !== null) : [],
      meters: spurtMeters,
    },
    statThresholds: Array.isArray(raw.statThresholds)
      ? raw.statThresholds.map(integer).filter((entry): entry is number => entry !== null)
      : [],
    terrainChanges,
  }
}

export function normalizeTracks(value: unknown): { tracks: NormalizeResult<Track>; courses: NormalizeResult<Course> } {
  const trackWarnings: string[] = []
  const courseWarnings: string[] = []
  const tracks: Track[] = []
  const courses: Course[] = []
  const seenCourses = new Set<number>()

  for (const raw of records(value)) {
    const trackId = id(raw.id)
    if (!trackId) {
      trackWarnings.push('A racetrack without a valid id was skipped')
      continue
    }
    const courseIds: number[] = []
    for (const rawCourse of records(raw.courses)) {
      const parsed = course(trackId, rawCourse)
      if (!parsed) {
        courseWarnings.push(`Course ${id(rawCourse.id) ?? '<missing id>'} on track ${trackId} has invalid fields and was skipped`)
        continue
      }
      if (seenCourses.has(parsed.id)) continue
      seenCourses.add(parsed.id)
      courses.push(parsed)
      courseIds.push(parsed.id)
    }
    const name = TRACK_NAMES[trackId] ?? null
    if (!name) trackWarnings.push(`Track ${trackId} has no known venue name`)
    tracks.push({ id: trackId, name, courseIds })
  }

  return { tracks: { items: tracks, warnings: trackWarnings }, courses: { items: courses, warnings: courseWarnings } }
}
