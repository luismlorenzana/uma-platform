import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { StorageDashboard } from './StorageScreen'
import { bytes, growth, trendPoints, type StorageReport } from './data'

const usage = { liveBytes: 1024 ** 3, liveObjects: 2, noncurrentBytes: 100, noncurrentObjects: 1, softDeletedBytes: 10, softDeletedObjects: 1 }
const report: StorageReport = {
  schemaVersion: 1, generatedAt: '2026-01-01T00:00:00.000Z', previousGeneratedAt: null, totals: usage, deltaBytes: null,
  buckets: [{ name: 'invented-bucket', project: 'test', location: 'TEST', storageClass: 'STANDARD', versioned: true, softDeleteDays: 7, lifecycleRuleCount: 1, usage, repeatedLiveBytes: 0, deltaBytes: null }],
  groups: [{ id: 'farm', bucket: 'invented-bucket', world: 'farm', purpose: 'character-art', usage, deltaBytes: null }], history: [],
}
describe('Storage Report', () => {
  it('separates live, retained and soft-deleted bytes and explains collection freshness and local-only sources', () => {
    const html = renderToStaticMarkup(<StorageDashboard report={report} now={Date.parse(report.generatedAt)} />)
    for (const text of ['Total stored', 'Live data', 'Retained history', 'Soft-deleted', 'Uma Farm', 'Character art', 'invented-bucket', 'baseline is now recorded', 'remain local']) expect(html).toContain(text)
    expect(html).not.toContain('older than expected')
    expect(renderToStaticMarkup(<StorageDashboard report={report} now={Date.parse(report.generatedAt) + 48 * 3600_000} />)).toContain('older than expected')
  })
  it('formats binary units, zero and signed growth without inventing a first-run delta', () => {
    expect([bytes(0), bytes(1024), bytes(1024 ** 3), growth(null), growth(1024), growth(-1024)]).toEqual(['0 B', '1.00 KiB', '1.00 GiB', '—', '+1.00 KiB', '-1.00 KiB'])
    expect(trendPoints([])).toBe('')
    expect(trendPoints([{ generatedAt: '2026-01-01', totalBytes: 0, worldBytes: {} }])).toBe('20,140')
  })
})
