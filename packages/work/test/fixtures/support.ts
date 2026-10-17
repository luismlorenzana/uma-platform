// Shared test helpers for uma-work: an invented day's clock, the success branch of an operation, deep freezing, and
// source with comments and strings blanked for the purity guard.
import { isRefusal, type OpResult } from '../../src/index.js'

/** An invented day: `clock('13:00')` is 13:00 UTC on it, and `clock('08:20', 1)` the next morning. */
const DAY = Date.UTC(2026, 9, 14)
export function clock(hhmm: string, day = 0): number {
  const [h, m] = hhmm.split(':').map(Number) as [number, number]
  return DAY + day * 86_400_000 + (h * 60 + m) * 60_000
}
export const minutes = (n: number): number => n * 60_000

/** The success branch, or a test failure naming the refusal. */
export function ok<R, S>(result: OpResult<R, S>): { readonly state: S; readonly receipt: R } {
  if (isRefusal(result)) throw new Error(`Refused ${result.code}: ${result.message}`)
  return result
}

export function deepFreeze<T>(value: T): T {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value)
    for (const child of Object.values(value as object)) deepFreeze(child)
  }
  return value
}

/** TypeScript source with comments and string literals blanked, so a guard test searches code only. */
export function codeOnly(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/'(?:\\.|[^'\\\n])*'|"(?:\\.|[^"\\\n])*"|`(?:\\.|[^`\\])*`/g, "''")
    .replace(/\/\/.*$/gm, ' ')
}
