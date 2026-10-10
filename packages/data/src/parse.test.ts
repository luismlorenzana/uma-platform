import { describe, expect, it } from 'vitest'
import {
  arrayOf,
  fields,
  id,
  isoDate,
  isoDateTime,
  MasterDataError,
  nullable,
  oneOf,
  optional,
  positiveInteger,
  recordOf,
  text,
} from './parse.js'

function errorOf(run: () => unknown): MasterDataError {
  try {
    run()
  } catch (error) {
    if (error instanceof MasterDataError) return error
    throw error
  }
  throw new Error('expected a MasterDataError')
}

describe('parsers', () => {
  it('accept well-typed values and return them', () => {
    expect(id(42, 'x')).toBe(42)
    expect(text('a', 'x')).toBe('a')
    expect(isoDate('2024-02-29', 'x')).toBe('2024-02-29')
    expect(isoDateTime('2024-02-29T12:00:00.000Z', 'x')).toBe('2024-02-29T12:00:00.000Z')
    expect(nullable(id)(null, 'x')).toBeNull()
    expect(optional(id)(undefined, 'x')).toBeUndefined()
    expect(oneOf(['a', 'b'] as const)('b', 'x')).toBe('b')
    expect(recordOf(positiveInteger)({ k: 1 }, 'x')).toEqual({ k: 1 })
  })

  it('name the path of the first bad value', () => {
    const parse = (value: unknown) => {
      const f = fields(value, 'root')
      return { list: f('list', arrayOf((entry, at) => fields(entry, at)('n', positiveInteger))) }
    }
    const error = errorOf(() => parse({ list: [{ n: 1 }, { n: 0 }] }))
    expect(error.path).toBe('root.list[1].n')
    expect(error.message).toBe('root.list[1].n: expected a positive integer')
  })

  it('reject impossible dates, non-UTC timestamps and floats as ids', () => {
    expect(errorOf(() => isoDate('2023-02-29', 'd')).expected).toBe('a real calendar date')
    expect(() => isoDateTime('2024-01-01T00:00:00+09:00', 't')).toThrow(MasterDataError)
    expect(() => id(1.5, 'i')).toThrow(MasterDataError)
    expect(() => text('', 's')).toThrow(MasterDataError)
  })

  it('ignore keys a parser does not know', () => {
    const f = fields({ id: 7, addedInAFutureMinor: true }, 'item')
    expect(f('id', id)).toBe(7)
  })
})
