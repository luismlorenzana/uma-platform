import { describe, expect, it } from 'vitest'
import { batches, findingsFor, formatBytes, groupFiles, inFilter, nameIn, reportLine, verdictsOn, words, type CastUma, type DraftFile, type Report, type Reviews } from './api'

// Invented records only.
const file = (path: string, bytes = 10): DraftFile => ({ path, bytes, sha256: 'a'.repeat(64) })
const report = (findings: Report['findings']): Report => ({ book: 'farm', checkedAt: '2026-11-12T09:00:00.000Z', files: {}, findings, layers: {}, counts: {} })

describe('a book’s drafts on the page', () => {
  it('groups them by folder: the root first, the archive last, numbers in order', () => {
    const groups = groupFiles([file('world.json'), file('bundles/9000010.json'), file('bundles/9000002.json'), file('archive/2026-11-10-racing/bundles/9000001.json'), file('cast.json'), file('routes/9000001.json')])
    expect(groups.map((g) => g.folder)).toEqual(['', 'bundles', 'routes', 'archive'])
    expect(groups[0]!.files.map((f) => f.path)).toEqual(['cast.json', 'world.json'])
    expect(groups[1]!.files.map((f) => nameIn(f.path, 'bundles'))).toEqual(['9000002.json', '9000010.json'])
    expect(nameIn('world.json', '')).toBe('world.json')
  })

  it('finds a file’s own verdict and the ones on its parts', () => {
    const reviews: Reviews = { schemaVersion: 1, items: {
      'cast.json': { status: 'liked', note: '', updatedAt: '' }, 'cast.json#9000001': { status: 'rework', note: 'Too early', updatedAt: '' },
      'cast.json.bak': { status: 'question', note: '', updatedAt: '' }, 'world.md#towns': { status: null, note: 'Names?', updatedAt: '' },
    } }
    expect(verdictsOn(reviews, 'cast.json')).toEqual({ own: reviews.items['cast.json'], parts: 1 })
    expect(verdictsOn(reviews, 'world.md')).toEqual({ own: null, parts: 1 })
    expect(verdictsOn(reviews, 'ties.json')).toEqual({ own: null, parts: 0 })
  })

  it('says how the book’s check stands in one line', () => {
    const findings: Report['findings'] = [{ level: 'error', file: 'cast.json', where: 'umas[1]', message: 'Invented' }, { level: 'todo', file: 'cast.json', where: '', message: 'To write' }, { level: 'todo', file: 'world.md', where: '', message: 'To write' }]
    expect(reportLine({ report: null, reportProblem: null, stale: [] })).toEqual({ tone: 'none', text: 'No check report yet' })
    expect(reportLine({ report: report([]), reportProblem: null, stale: [] })).toEqual({ tone: 'good', text: 'No errors' })
    expect(reportLine({ report: report(findings), reportProblem: null, stale: [] })).toEqual({ tone: 'bad', text: '1 error · 2 to write' })
    expect(reportLine({ report: report(findings.slice(1)), reportProblem: null, stale: ['world.md'] })).toEqual({ tone: 'warn', text: 'No errors · 2 to write · older than 1 draft' })
    expect(reportLine({ report: null, reportProblem: 'written for another book', stale: [] }).tone).toBe('bad')
    expect(findingsFor(report(findings), 'cast.json')).toHaveLength(2)
    expect(findingsFor(null, 'cast.json')).toEqual([])
  })

  it('writes sizes and API errors in words', () => {
    expect([formatBytes(512), formatBytes(1850), formatBytes(66_597), formatBytes(2_400_000)]).toEqual(['512 B', '1.9 KB', '67 KB', '2.4 MB'])
    expect(words(Object.assign(new Error('API 400 on /api/story/farm/reviews'), { body: { error: 'A verdict names its item' } }))).toBe('A verdict names its item')
    expect(words(new Error('Offline'))).toBe('Offline')
  })
})

describe('the cast on the page', () => {
  const uma = (id: string, batch: number, order: number): CastUma => ({ id, characterId: 9000000 + order, name: `Stand-in ${order}`, sister: null, outfitId: 900000000 + order, tier: `T${batch}`, batch, order })
  it('is laid out in batches, in the Ranker’s order', () => {
    const out = batches([uma('9000003', 2, 11), uma('9000002', 1, 2), uma('9000001', 1, 1)])
    expect(out.map((b) => [b.tier, b.umas.map((u) => u.id)])).toEqual([['T1', ['9000001', '9000002']], ['T2', ['9000003']]])
  })
  it('filters by the books that hold her', () => {
    const cast = { books: { cast: {}, quest: { '9000001': null, '9000002': 'bible' as const }, farm: { '9000001': null } } }
    const ids = ['9000001', '9000002', '9000003']
    expect(ids.filter((id) => inFilter(cast, id, 'all'))).toEqual(ids)
    expect(ids.filter((id) => inFilter(cast, id, 'quest'))).toEqual(['9000001', '9000002'])
    expect(ids.filter((id) => inFilter(cast, id, 'farm'))).toEqual(['9000001'])
    expect(ids.filter((id) => inFilter(cast, id, 'neither'))).toEqual(['9000003'])
  })
})
