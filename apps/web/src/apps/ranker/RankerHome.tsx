// The Ranker's home (RK1, P133): a tile for each board with its numbers, the batches, the careers and the data in use.
// Numbers only; the little there is to know sits behind the header's (i).
import { allStats, BOARDS, BOSS_BOARDS, careerMath, inBatch, MIN_CAREER_BOSSES, rankedIdentities, tiersOf, type BoardGroup } from '@uma-platform/tiers'
import { AppFrame, PlaceHeader } from '@luismlorenzana/uma-kit/shell'
import { Button, Panel } from '@luismlorenzana/uma-kit/ui'
import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { request } from '../../api/client'
import { useRanker } from './data'
import { TierBadge } from './Detail'

const GROUPS: { id: BoardGroup; title: string }[] = [{ id: 'umas', title: 'Umas' }, { id: 'bosses', title: 'Bosses' }, { id: 'enemies', title: 'Enemies' }]

function download(name: string, value: unknown) {
  const url = URL.createObjectURL(new Blob([`${JSON.stringify(value, null, 2)}\n`], { type: 'application/json' }))
  const a = document.createElement('a'); a.href = url; a.download = name; a.click(); URL.revokeObjectURL(url)
}

export function RankerHome() {
  const { data, error, reload } = useRanker()
  const navigate = useNavigate()
  const [busy, setBusy] = useState(false)
  const stats = useMemo(() => (data ? allStats(data.catalog, data.states, data.profiles) : null), [data])
  const identities = useMemo(() => (data ? rankedIdentities(data.catalog, data.states, data.profiles) : []), [data])
  if (error) return <div className="fixed inset-0 flex items-center justify-center bg-page p-8 text-center text-ink-soft">The Ranker couldn’t load: {error}</div>
  if (!data || !stats) return <div className="fixed inset-0 flex items-center justify-center bg-page text-ink-soft">Loading the boards</div>
  const careers = careerMath(identities.filter(inBatch).length, BOSS_BOARDS.map((b) => stats[b]))
  const tiers = tiersOf('umas').map((t) => ({ tier: t.id, umas: identities.filter((i) => i.tier === t.id).length, outfits: stats.umas.tiers[t.id] ?? 0 }))
  const unranked = identities.filter((i) => i.tier === null).length

  return (
    <AppFrame top={<PlaceHeader title="Uma Ranker" onBack={() => void navigate('/')} words={{ back: 'Uma Platform', about: 'About the numbers' }}
      about={<><p>An Uma counts in the tier of her best-ranked outfit; sisters count as Umas of their own. F is in no batch.</p>
        <p>Careers: every Uma in a batch fights at least {MIN_CAREER_BOSSES} bosses from the boss boards’ cast.</p></>} />}>
      <main className="pb-safe h-full overflow-y-auto bg-page px-4 py-5">
        <div className="mx-auto flex max-w-5xl flex-col gap-5">
          <Panel>
            <h2 className="mb-2 font-display text-lg font-bold">Umas per tier</h2>
            <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-6 lg:grid-cols-12">
              {tiers.map((t) => (
                <div key={t.tier} className="flex flex-col items-center gap-0.5 rounded-sm bg-raised p-1.5 text-center" title={`${t.outfits} outfits`}>
                  <TierBadge tier={t.tier} /><span className="font-display text-lg font-bold">{t.umas}</span>
                </div>
              ))}
              <div className="flex flex-col items-center gap-0.5 rounded-sm bg-raised p-1.5 text-center">
                <span className="text-[12px] text-ink-soft">Unranked</span><span className="font-display text-lg font-bold">{unranked}</span>
              </div>
            </div>
          </Panel>

          {GROUPS.map((g) => (
            <section key={g.id} className="flex flex-col gap-2">
              <h2 className="font-display text-lg font-bold">{g.title}</h2>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {BOARDS.filter((b) => b.group === g.id).map((b) => {
                  const s = stats[b.id]
                  return (
                    <Link key={b.id} to={`/ranker/${b.id}`} className="flex items-baseline justify-between gap-2 rounded-md bg-panel p-3 shadow-1 hover:shadow-2">
                      <span className="font-display font-bold">{b.title}</span>
                      <span className="text-sm text-ink-soft"><b className="text-ink">{s.cast}</b> / {s.pool}{s.unranked ? ` · ${s.unranked} to rank` : ''}</span>
                    </Link>
                  )
                })}
              </div>
            </section>
          ))}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Panel>
              <h2 className="mb-1 font-display text-lg font-bold">Careers</h2>
              <p className="text-sm"><b>{careers.careers}</b> careers · <b>{careers.bosses}</b> bosses · <b>{careers.bossesPerCareer}</b> a career · <b>{careers.fights}</b> fights</p>
            </Panel>
            <Panel>
              <h2 className="mb-1 font-display text-lg font-bold">Data</h2>
              <p className="text-sm text-ink-soft">Release <code>{data.release}</code> · {data.catalog.umas.length} Umas · {data.profiles.sisters.length} sisters · {data.catalog.enemies.length} enemies</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <Button size="sm" variant="secondary" disabled={busy} onClick={() => { setBusy(true); void reload().finally(() => setBusy(false)) }}>Reload the catalog</Button>
                <Button size="sm" variant="secondary" onClick={() => void request('/api/ranker/plan').then((plan) => download('tier-plan.json', plan))}>Export plan</Button>
              </div>
            </Panel>
          </div>
        </div>
      </main>
    </AppFrame>
  )
}
