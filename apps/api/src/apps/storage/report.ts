export interface Usage { liveBytes: number; liveObjects: number; noncurrentBytes: number; noncurrentObjects: number; softDeletedBytes: number; softDeletedObjects: number }
export interface BucketReport { name: string; project: string; location: string; storageClass: string; versioned: boolean; softDeleteDays: number; lifecycleRuleCount: number; usage: Usage; repeatedLiveBytes: number; deltaBytes: number | null }
export interface GroupReport { id: string; bucket: string; world: string; purpose: string; usage: Usage; deltaBytes: number | null }
export interface StorageReport { schemaVersion: 1; generatedAt: string; previousGeneratedAt: string | null; totals: Usage; buckets: BucketReport[]; groups: GroupReport[]; deltaBytes: number | null; history: { generatedAt: string; totalBytes: number; worldBytes: Record<string, number> }[] }

const object = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid storage report')
  return value as Record<string, unknown>
}
const text = (value: unknown): string => { if (typeof value !== 'string' || value.length > 200) throw new Error('Invalid report text'); return value }
const integer = (value: unknown): number => { if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) throw new Error('Invalid report count'); return value }
const delta = (value: unknown): number | null => { if (value === null) return null; if (typeof value !== 'number' || !Number.isSafeInteger(value)) throw new Error('Invalid growth'); return value }
const date = (value: unknown): string => { const result = text(value); if (!Number.isFinite(Date.parse(result))) throw new Error('Invalid collection date'); return result }
const array = (value: unknown, max: number): unknown[] => { if (!Array.isArray(value) || value.length > max) throw new Error('Invalid report rows'); return value }
const usage = (value: unknown): Usage => {
  const row = object(value)
  return { liveBytes: integer(row.liveBytes), liveObjects: integer(row.liveObjects), noncurrentBytes: integer(row.noncurrentBytes), noncurrentObjects: integer(row.noncurrentObjects), softDeletedBytes: integer(row.softDeletedBytes), softDeletedObjects: integer(row.softDeletedObjects) }
}

/** Return aggregate fields only, and refuse partial or inconsistent snapshots. */
export function parseReport(value: unknown): StorageReport {
  const report = object(value)
  if (report.schemaVersion !== 1) throw new Error('Unsupported report format')
  const buckets = array(report.buckets, 20).map(value => {
    const row = object(value)
    if (typeof row.versioned !== 'boolean' || typeof row.softDeleteDays !== 'number' || row.softDeleteDays < 0 || !Number.isFinite(row.softDeleteDays)) throw new Error('Invalid retention metadata')
    return { name: text(row.name), project: text(row.project), location: text(row.location), storageClass: text(row.storageClass), versioned: row.versioned,
      softDeleteDays: row.softDeleteDays, lifecycleRuleCount: integer(row.lifecycleRuleCount), usage: usage(row.usage), repeatedLiveBytes: integer(row.repeatedLiveBytes), deltaBytes: delta(row.deltaBytes) }
  })
  if (buckets.length !== 6 || new Set(buckets.map(row => row.name)).size !== 6) throw new Error('Incomplete bucket inventory')
  const groups = array(report.groups, 200).map(value => {
    const row = object(value)
    if (!['farm', 'cyberpunk', 'quest', 'rpg', 'shared'].includes(String(row.world))) throw new Error('Unknown storage world')
    return { id: text(row.id), bucket: text(row.bucket), world: text(row.world), purpose: text(row.purpose), usage: usage(row.usage), deltaBytes: delta(row.deltaBytes) }
  })
  if (new Set(groups.map(row => row.id)).size !== groups.length || groups.some(row => !buckets.some(bucket => bucket.name === row.bucket))) throw new Error('Invalid group inventory')
  const totals = usage(report.totals)
  for (const key of Object.keys(totals) as (keyof Usage)[]) {
    if (buckets.reduce((sum, row) => sum + row.usage[key], 0) !== totals[key]) throw new Error('Inconsistent report totals')
    for (const bucket of buckets) if (groups.filter(row => row.bucket === bucket.name).reduce((sum, row) => sum + row.usage[key], 0) !== bucket.usage[key]) throw new Error('Inconsistent bucket groups')
  }
  const history = array(report.history, 31).map(value => {
    const row = object(value), worldBytes = Object.fromEntries(Object.entries(object(row.worldBytes)).map(([key, value]) => [key, integer(value)]))
    return { generatedAt: date(row.generatedAt), totalBytes: integer(row.totalBytes), worldBytes }
  })
  return { schemaVersion: 1, generatedAt: date(report.generatedAt), previousGeneratedAt: report.previousGeneratedAt === null ? null : date(report.previousGeneratedAt),
    totals, buckets, groups, history, deltaBytes: delta(report.deltaBytes) }
}
