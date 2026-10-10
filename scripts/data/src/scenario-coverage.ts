// Aggregate-only scenario freshness guard, ported from uma-racer. There it compared GameTora with a hand-written
// ladder; master data imports every scenario, so here it reports what's out in Japan and warns if a new import has
// fewer released scenarios than the last local release (a source regression).

import type { Scenario } from '@luismlorenzana/uma-data'

export interface ScenarioCoverage {
  /** Scenarios that have started in Japan by `today`. */
  released: number
  /** Scenarios GameTora already lists with a later Japanese start. */
  upcoming: number
  /** The latest Japanese start date among the released ones, or null. */
  releasedThrough: string | null
}

export function scenarioCoverage(scenarios: readonly Scenario[], today = new Date()): ScenarioCoverage {
  if (Number.isNaN(today.getTime())) throw new Error('Scenario coverage date is invalid')
  const now = today.toISOString()
  const released = scenarios.filter((scenario) => scenario.startsAt.jp <= now).map((scenario) => scenario.startsAt.jp).sort()
  return {
    released: released.length,
    upcoming: scenarios.length - released.length,
    releasedThrough: released.at(-1)?.slice(0, 10) ?? null,
  }
}

/** A warning when the new import has fewer released scenarios than the previous release, else null. */
export function scenarioCoverageWarning(
  next: readonly Scenario[],
  previous: readonly Scenario[] | null,
  today = new Date(),
): string | null {
  if (!previous) return null
  const before = scenarioCoverage(previous, today)
  const after = scenarioCoverage(next, today)
  if (after.released >= before.released) return null
  return `Scenario coverage dropped: the source now has ${after.released} JP releases through ${after.releasedThrough ?? 'none'}; ` +
    `the last local release had ${before.released} through ${before.releasedThrough ?? 'none'}`
}
