import { syntheticMasterData } from '@luismlorenzana/uma-data/testing'
import { describe, expect, it } from 'vitest'
import { scenarioCoverage, scenarioCoverageWarning } from './scenario-coverage'

const scenario = (id: number, jp: string) => ({ ...syntheticMasterData().scenarios[0]!, id, startsAt: { jp, global: null, kr: null, tw: null } })
const today = new Date('2025-01-01T00:00:00.000Z')

describe('scenario coverage', () => {
  it('counts released and upcoming Japanese starts', () => {
    const scenarios = [scenario(1, '2021-02-24T04:00:00.000Z'), scenario(2, '2024-06-26T04:00:00.000Z'), scenario(3, '2099-01-01T04:00:00.000Z')]
    expect(scenarioCoverage(scenarios, today)).toEqual({ released: 2, upcoming: 1, releasedThrough: '2024-06-26' })
    expect(() => scenarioCoverage(scenarios, new Date('invalid'))).toThrow('invalid')
  })

  it('warns only when an import has fewer released scenarios than the last release', () => {
    const previous = [scenario(1, '2021-02-24T04:00:00.000Z'), scenario(2, '2024-06-26T04:00:00.000Z')]
    expect(scenarioCoverageWarning(previous, null, today)).toBeNull()
    expect(scenarioCoverageWarning([...previous, scenario(3, '2024-12-01T04:00:00.000Z')], previous, today)).toBeNull()
    expect(scenarioCoverageWarning(previous.slice(0, 1), previous, today)).toBe(
      'Scenario coverage dropped: the source now has 1 JP releases through 2021-02-24; the last local release had 2 through 2024-06-26',
    )
  })
})
