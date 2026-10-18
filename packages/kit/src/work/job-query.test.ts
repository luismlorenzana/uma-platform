import { describe, expect, it } from 'vitest'
import { inAppPath, jobQuery, readJobQuery, withoutJobQuery } from './job-query.js'

describe('job links', () => {
  it('round-trips a preselected worker, ×40 batch, slot and return path', () => {
    const query = { job: 'toy', uma: 'ada', count: 40, slot: 2, queue: true, back: '/town/warehouse?tab=raw' }
    expect(readJobQuery(new URLSearchParams(jobQuery(query)))).toEqual(query)
    expect(readJobQuery(new URLSearchParams('peek=grove'))).toBeNull()
    expect(readJobQuery(new URLSearchParams('job='))).toMatchObject({ job: null, uma: null, count: null, queue: false })
  })
  it('keeps unrelated overlays when closing and rejects malformed sizes and external returns', () => {
    expect(withoutJobQuery('?peek=grove&job=toy&uma=ada&count=40&queue=1&slot=2&back=%2Ftown')).toBe('?peek=grove')
    for (const value of ['//evil.example', '/\\evil', 'https://evil.example', '/https:evil']) expect(inAppPath(value)).toBeNull()
    expect(readJobQuery(new URLSearchParams('job=x&count=-1&slot=1.5&back=//evil'))).toMatchObject({ count: null, slot: null, back: null })
    expect(withoutJobQuery('?job=x')).toBe('')
  })
})
