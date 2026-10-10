// Explicit runtime parsers for master data (P18). Each parser checks one value and returns it typed, or throws a
// MasterDataError naming the JSON path of the first problem. Keys a parser doesn't know are ignored, so a newer
// release with additive fields still passes an older client (P7).

export class MasterDataError extends Error {
  override readonly name = 'MasterDataError'

  constructor(
    /** JSON path of the offending value, e.g. `outfits[3].stats.star5.speed`. */
    readonly path: string,
    /** What the parser expected there. */
    readonly expected: string,
  ) {
    super(`${path}: expected ${expected}`)
  }
}

/** Parses `value` found at `path`, or throws a MasterDataError. */
export type Parser<T> = (value: unknown, path: string) => T

export function fail(path: string, expected: string): never {
  throw new MasterDataError(path, expected)
}

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

export function object(value: unknown, path: string): Record<string, unknown> {
  if (!isRecord(value)) fail(path, 'an object')
  return value
}

/** Reads typed fields from one object: `const f = fields(value, path); f('id', positiveInt)`. */
export function fields(value: unknown, path: string): <T>(key: string, parse: Parser<T>) => T {
  const record = object(value, path)
  return (key, parse) => parse(record[key], `${path}.${key}`)
}

export const integer: Parser<number> = (value, path) =>
  Number.isSafeInteger(value) ? (value as number) : fail(path, 'an integer')

export const nonNegativeInteger: Parser<number> = (value, path) =>
  Number.isSafeInteger(value) && (value as number) >= 0 ? (value as number) : fail(path, 'a non-negative integer')

export const positiveInteger: Parser<number> = (value, path) =>
  Number.isSafeInteger(value) && (value as number) > 0 ? (value as number) : fail(path, 'a positive integer')

/** Original-game ids are positive integers (P8). */
export const id: Parser<number> = (value, path) =>
  Number.isSafeInteger(value) && (value as number) > 0 ? (value as number) : fail(path, 'a positive integer id')

export const finite: Parser<number> = (value, path) =>
  typeof value === 'number' && Number.isFinite(value) ? value : fail(path, 'a finite number')

export const boolean: Parser<boolean> = (value, path) => (typeof value === 'boolean' ? value : fail(path, 'a boolean'))

/** Any string, including the empty one. */
export const string: Parser<string> = (value, path) => (typeof value === 'string' ? value : fail(path, 'a string'))

/** A non-empty string. */
export const text: Parser<string> = (value, path) =>
  typeof value === 'string' && value.length > 0 ? value : fail(path, 'a non-empty string')

const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/

/** A real calendar date as `YYYY-MM-DD`. */
export const isoDate: Parser<string> = (value, path) => {
  const match = typeof value === 'string' ? DATE_PATTERN.exec(value) : null
  if (!match) fail(path, 'a date as YYYY-MM-DD')
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])]
  const date = new Date(Date.UTC(year, month - 1, day))
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    fail(path, 'a real calendar date')
  }
  return value as string
}

const DATE_TIME_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/

/** A UTC timestamp as an ISO 8601 string ending in `Z`. */
export const isoDateTime: Parser<string> = (value, path) =>
  typeof value === 'string' && DATE_TIME_PATTERN.test(value) && !Number.isNaN(Date.parse(value))
    ? value
    : fail(path, 'a UTC ISO 8601 timestamp')

export function nullable<T>(parse: Parser<T>): Parser<T | null> {
  return (value, path) => (value === null ? null : parse(value, path))
}

/** For fields added in a later minor schema version: absent reads as `undefined`. */
export function optional<T>(parse: Parser<T>): Parser<T | undefined> {
  return (value, path) => (value === undefined ? undefined : parse(value, path))
}

export function arrayOf<T>(parse: Parser<T>): Parser<T[]> {
  return (value, path) => {
    if (!Array.isArray(value)) fail(path, 'an array')
    return value.map((item, index) => parse(item, `${path}[${index}]`))
  }
}

/** An object used as a map from string keys to parsed values. */
export function recordOf<T>(parse: Parser<T>): Parser<Record<string, T>> {
  return (value, path) => {
    const record = object(value, path)
    const result: Record<string, T> = {}
    for (const [key, entry] of Object.entries(record)) result[key] = parse(entry, `${path}.${key}`)
    return result
  }
}

export function oneOf<const T extends string>(values: readonly T[]): Parser<T> {
  return (value, path) =>
    typeof value === 'string' && (values as readonly string[]).includes(value)
      ? (value as T)
      : fail(path, `one of ${values.join(', ')}`)
}

export function literal<const T extends string | number>(expected: T): Parser<T> {
  return (value, path) => (value === expected ? expected : fail(path, JSON.stringify(expected)))
}

export const idList: Parser<number[]> = arrayOf(id)
