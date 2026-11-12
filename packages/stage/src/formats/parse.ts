// The design formats' strict parsing helpers (uma-quest Q5; uma-platform ST2): shared by the room, town and farm parsers.
// Internal to the formats: not re-exported from the package, except the error.

export class DesignParseError extends Error {
  constructor(readonly path: string, message: string) {
    super(`${path}: ${message}`)
    this.name = 'DesignParseError'
  }
}

/** The fewest rows and columns a design's grid may have. */
const ROWS_MIN = 3

export type Obj = Record<string, unknown>
export function object(value: unknown, path: string, keys: readonly string[], optional: readonly string[] = []): Obj {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) throw new DesignParseError(path, 'expected an object')
  const extra = Object.keys(value).filter((k) => !keys.includes(k) && !optional.includes(k))
  if (extra.length) throw new DesignParseError(path, `unknown keys ${extra.join(', ')}`)
  const missing = keys.filter((k) => !(k in value))
  if (missing.length) throw new DesignParseError(path, `missing ${missing.join(', ')}`)
  return value as Obj
}
export const int = (v: unknown, path: string, min: number, max: number): number => {
  if (typeof v !== 'number' || !Number.isInteger(v) || v < min || v > max) throw new DesignParseError(path, `expected an integer ${min}–${max}`)
  return v
}
export const id = (v: unknown, path: string): string => {
  if (typeof v !== 'string' || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(v) || v.length > 48) throw new DesignParseError(path, 'expected a kebab-case id')
  return v
}
export function list<T>(v: unknown, path: string, max: number, item: (x: unknown, p: string) => T): T[] {
  if (!Array.isArray(v) || v.length > max) throw new DesignParseError(path, `expected a list of at most ${max}`)
  return v.map((x, i) => item(x, `${path}[${i}]`))
}
export function oneOf<T extends string>(v: unknown, path: string, all: readonly T[]): T {
  if (typeof v !== 'string' || !all.includes(v as T)) throw new DesignParseError(path, `expected one of ${all.join(', ')}`)
  return v as T
}
export function rows(v: unknown, path: string, max: { w: number; d: number }, chars: RegExp, min = ROWS_MIN): string[] {
  const r = list(v, path, max.d, (x, p) => {
    if (typeof x !== 'string' || !chars.test(x)) throw new DesignParseError(p, `expected a row of ${chars}`)
    return x
  })
  if (r.length < min) throw new DesignParseError(path, `expected at least ${min} rows`)
  const w = r[0]!.length
  if (w < min || w > max.w || r.some((x) => x.length !== w)) throw new DesignParseError(path, `expected rows of one length, ${min}–${max.w}`)
  return r
}
