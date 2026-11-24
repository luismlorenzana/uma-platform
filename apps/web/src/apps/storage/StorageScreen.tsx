import { AppFrame, PlaceHeader } from '@luismlorenzana/uma-kit/shell'
import { Button } from '@luismlorenzana/uma-kit/ui'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { ApiError } from '../../api/client'
import { bytes, growth, loadReport, purposes, stored, trendPoints, worlds, type StorageReport } from './data'

export function StorageDashboard({ report, now = Date.now() }: { report: StorageReport; now?: number }) {
  const [world, setWorld] = useState('all')
  const groups = report.groups.filter(group => world === 'all' || group.world === world).sort((a, b) => stored(b.usage) - stored(a.usage))
  const stale = now - Date.parse(report.generatedAt) > 36 * 3600_000
  return (
    <div className="flex flex-col gap-6">
      <div className="text-sm text-ink-soft">
        <p>Collected {new Date(report.generatedAt).toLocaleString()}. {report.automaticUpdates ? 'Updates daily.' : 'Automatic updates are awaiting activation.'}</p>
        {stale && <p role="status" className="mt-1 font-semibold text-ink">This report is older than expected. The last successful collection is shown.</p>}
        <p className="mt-1">Cloud storage only. Private universe-authoring workspaces remain local.</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        {[['Total stored', stored(report.totals)], ['Live data', report.totals.liveBytes], ['Retained history', report.totals.noncurrentBytes + report.totals.softDeletedBytes]].map(([label, value]) => (
          <div key={String(label)} className="rounded-lg bg-panel p-4 shadow-1">
            <p className="text-sm text-ink-soft">{label}</p><p className="mt-1 font-display text-2xl font-bold">{bytes(Number(value))}</p>
          </div>
        ))}
      </div>
      <p className="text-sm text-ink-soft">Change since previous report: <b className="text-ink">{growth(report.deltaBytes)}</b>
        {report.previousGeneratedAt ? ` · ${new Date(report.previousGeneratedAt).toLocaleString()}` : ' · A baseline is now recorded; growth appears after the next collection.'}</p>
      {report.history.length > 1 && (
        <section className="rounded-lg bg-panel p-4">
          <h2 className="font-display font-bold">Storage over time</h2>
          <svg role="img" aria-label="Total stored bytes over the last collected days, measured from zero" viewBox="0 0 800 160" className="mt-3 w-full text-accent">
            <line x1="20" y1="140" x2="780" y2="140" stroke="currentColor" opacity="0.25" />
            <polyline points={trendPoints(report.history)} fill="none" stroke="currentColor" strokeWidth="3" />
          </svg>
          <div className="flex justify-between gap-3 text-xs text-ink-soft"><span>{report.history[0]?.generatedAt.slice(0, 10)}</span><span>{bytes(stored(report.totals))} · {report.generatedAt.slice(0, 10)}</span></div>
        </section>
      )}
      <section className="flex flex-col gap-3">
        <h2 className="font-display text-lg font-bold">By universe and purpose</h2>
        <div aria-label="Universe filter" className="flex flex-wrap gap-2">
          {[['all', 'All universes'], ...Object.entries(worlds)].map(([id, label]) => (
            <button key={id} type="button" aria-pressed={world === id} onClick={() => setWorld(id!)}
              className={`min-h-10 rounded-full px-3 text-sm ${world === id ? 'bg-accent text-accent-ink' : 'bg-sunken text-ink'}`}>{label}</button>
          ))}
        </div>
        <div className="overflow-x-auto rounded-lg bg-panel">
          <table className="w-full min-w-[44rem] text-left text-sm">
            <caption className="sr-only">Storage by universe and purpose, including current data and retained versions</caption>
            <thead><tr className="border-b border-hairline">{['Universe / purpose', 'Live', 'History', 'Soft-deleted', 'Total', 'Change'].map(label => <th key={label} scope="col" className="px-3 py-3 font-semibold">{label}</th>)}</tr></thead>
            <tbody>{groups.map(group => (
              <tr key={group.id} className="border-b border-hairline last:border-0">
                <th scope="row" className="px-3 py-3 font-normal"><span className="font-semibold">{worlds[group.world] ?? group.world} · {purposes[group.purpose] ?? group.purpose}</span><span className="mt-0.5 block text-xs text-ink-soft">{group.bucket}</span></th>
                <td className="whitespace-nowrap px-3 py-3 tabular-nums">{bytes(group.usage.liveBytes)}</td><td className="whitespace-nowrap px-3 py-3 tabular-nums">{bytes(group.usage.noncurrentBytes)}</td>
                <td className="whitespace-nowrap px-3 py-3 tabular-nums">{bytes(group.usage.softDeletedBytes)}</td><td className="whitespace-nowrap px-3 py-3 font-semibold tabular-nums">{bytes(stored(group.usage))}</td><td className="whitespace-nowrap px-3 py-3 tabular-nums">{growth(group.deltaBytes)}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
        <p className="text-xs text-ink-soft">Shared includes neutral master data and legacy backups. Files copied into both gallery and game paths count in both locations. Gallery visibility does not determine storage usage.</p>
      </section>
      <section className="flex flex-col gap-3">
        <h2 className="font-display text-lg font-bold">Buckets · all universes</h2>
        {report.buckets.map(bucket => (
          <details key={bucket.name} className="rounded-lg bg-panel p-4">
            <summary className="cursor-pointer text-sm"><span className="font-semibold">{bucket.name}</span><span className="ml-3 text-ink-soft">{bytes(stored(bucket.usage))}</span></summary>
            <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
              <dt className="text-ink-soft">Location / class</dt><dd>{bucket.location} · {bucket.storageClass}</dd>
              <dt className="text-ink-soft">Live objects</dt><dd>{bucket.usage.liveObjects.toLocaleString()}</dd>
              <dt className="text-ink-soft">Retained history</dt><dd>{bytes(bucket.usage.noncurrentBytes)} · {bucket.usage.noncurrentObjects.toLocaleString()} versions</dd>
              <dt className="text-ink-soft">Recovery window</dt><dd>{bucket.softDeleteDays} days</dd>
              <dt className="text-ink-soft">Lifecycle rules</dt><dd>{bucket.lifecycleRuleCount}</dd>
              <dt className="text-ink-soft">Repeated contents</dt><dd>{bytes(bucket.repeatedLiveBytes)} across different live paths; copies may serve different purposes.</dd>
            </dl>
          </details>
        ))}
      </section>
      <aside className="rounded-lg bg-sunken p-4 text-sm text-ink-soft">The targeted Platform rules cover old Ranker metadata and temporary-upload versions. Art and release paths are outside those rules. Retained and soft-deleted data continues to occupy storage until it expires.</aside>
    </div>
  )
}

export default function StorageScreen() {
  const navigate = useNavigate()
  const [report, setReport] = useState<StorageReport | null>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'empty' | 'error'>('loading')
  const [checking, setChecking] = useState(false)
  const load = async (refresh = false) => {
    setChecking(true)
    try { setReport(await loadReport(refresh)); setStatus('ready') }
    catch (error) { setStatus(error instanceof ApiError && error.status === 404 ? 'empty' : 'error') }
    finally { setChecking(false) }
  }
  useEffect(() => { void load() }, [])
  return (
    <AppFrame top={<PlaceHeader title="Storage Report" onBack={() => void navigate('/')} words={{ back: 'Uma Platform', about: 'About' }}
      about={<p>Daily cloud-storage totals across the Uma buckets, separated by universe, purpose and retained history. This report contains aggregate metadata.</p>} />}>
      <main className="h-full overflow-y-auto bg-page pb-safe" data-testid="storage">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-4">
          <div className="flex items-center justify-between gap-3"><p className="text-sm text-ink-soft">Published content, shared data and cloud backups</p><Button variant="secondary" size="sm" disabled={checking} onClick={() => void load(true)}>{checking ? 'Checking…' : 'Check for updates'}</Button></div>
          {status === 'loading' && <p className="text-ink-soft">Loading storage report…</p>}
          {status === 'empty' && <p className="text-ink-soft">The storage report is waiting for its first collection.</p>}
          {status === 'error' && <p role="status" className="text-ink-soft">The report couldn’t be updated. Check you’re signed in and online.</p>}
          {report && <StorageDashboard report={report} />}
        </div>
      </main>
    </AppFrame>
  )
}
