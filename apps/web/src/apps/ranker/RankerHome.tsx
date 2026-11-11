// The Ranker's home (RK1): a tile for each board with its numbers, the careers, and where the catalog came from.
import { allStats, BOARDS, BOSS_BOARDS, careerMath, rankedIdentities, tiersOf, type BoardGroup } from '@uma-platform/tiers'
import { AppFrame, PlaceHeader } from '@luismlorenzana/uma-kit/shell'
import { Button, Panel } from '@luismlorenzana/uma-kit/ui'
import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { request } from '../../api/client'
import { useRanker } from './data'
import { TierBadge } from './Detail'

const GROUPS: { id: BoardGroup; title: string; blurb: string }[] = [
  { id: 'umas', title: 'Umas', blurb: 'Playable Umas ranks every outfit on ten tiers, one art batch each; sisters rank as themselves.' },
  { id: 'bosses', title: 'Bosses', blurb: 'The boss boards: SS, S and A are the cast; the rest go to Key enemies.' },
  { id: 'enemies', title: 'Enemies', blurb: 'Key enemies escort the bosses; Regular enemies make the random fights.' },
]

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
  const careers = careerMath(identities.filter((i) => i.tier).length, BOSS_BOARDS.map((b) => stats[b]))
  const batches = tiersOf('umas').map((t) => ({ tier: t.id, umas: identities.filter((i) => i.tier === t.id).length, outfits: stats.umas.tiers[t.id] ?? 0 }))

  return (
    <AppFrame top={<PlaceHeader title="Uma Ranker" onBack={() => void navigate('/')} words={{ back: 'Uma Platform', about: 'About the Ranker' }}
      about={<p>Every board in one place: the order things get authored in. Playable Umas ranks each outfit on ten tiers, one art batch each, and Character Art follows it. Every save writes the plan the other tools read.</p>} />}>
      <main className="pb-safe h-full overflow-y-auto bg-page px-4 py-5">
        <div className="mx-auto flex max-w-5xl flex-col gap-6">
          {GROUPS.map((g) => (
            <section key={g.id} className="flex flex-col gap-2">
              <div><h2 className="font-display text-lg font-bold">{g.title}</h2><p className="text-sm text-ink-soft">{g.blurb}</p></div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {BOARDS.filter((b) => b.group === g.id).map((b) => {
                  const s = stats[b.id]
                  return (
                    <Link key={b.id} to={`/ranker/${b.id}`} className="flex flex-col gap-1 rounded-md bg-panel p-3 shadow-1 hover:shadow-2">
                      <span className="font-display font-bold">{b.title}</span>
                      <span className="text-xs text-ink-soft">{b.blurb}</span>
                      <span className="mt-1 text-sm"><b>{s.cast}</b> <span className="text-ink-soft">in the cast of {s.pool}{s.unranked ? ` · ${s.unranked} to rank` : ''}</span></span>
                    </Link>
                  )
                })}
              </div>
            </section>
          ))}

          <Panel>
            <h2 className="font-display text-lg font-bold">The ten batches</h2>
            <p className="mb-2 text-sm text-ink-soft">Each tier of Playable Umas is an art batch, authored in order. An Uma counts in the batch of her best-ranked outfit.</p>
            <div className="grid grid-cols-5 gap-1.5 sm:grid-cols-10">
              {batches.map((b) => (
                <div key={b.tier} className="flex flex-col items-center gap-0.5 rounded-sm bg-raised p-1.5 text-center">
                  <TierBadge tier={b.tier} /><span className="font-display text-lg font-bold">{b.umas}</span><span className="text-[11px] text-ink-faint">{b.outfits} outfits</span>
                </div>
              ))}
            </div>
          </Panel>

          <Panel>
            <h2 className="font-display text-lg font-bold">Careers</h2>
            <p className="text-sm text-ink-soft">Every ranked Uma, sisters included, is a career of at least three bosses from the boss boards’ cast; when there are more bosses than that, careers lengthen so every boss is met.</p>
            <p className="mt-2 text-sm"><b>{careers.careers}</b> careers · <b>{careers.bosses}</b> bosses · <b>{careers.bossesPerCareer}</b> bosses a career · <b>{careers.fights}</b> boss fights</p>
          </Panel>

          <Panel>
            <h2 className="font-display text-lg font-bold">Sources</h2>
            <ul className="text-sm text-ink-soft">
              <li>Umas: master data release <code>{data.release}</code>, {data.catalog.umas.length} characters; {data.profiles.sisters.length} sisters in the profiles.</li>
              <li>Azur Lane and NIKKE: the private enemy catalog.</li>
              {data.imports.map((i) => <li key={i.franchise}>{i.franchise}: {i.units} from {i.source} ({i.filter}), imported {i.importedAt.slice(0, 10)}.</li>)}
            </ul>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button size="sm" variant="secondary" disabled={busy} onClick={() => { setBusy(true); void reload().finally(() => setBusy(false)) }}>Reload the catalog</Button>
              <Button size="sm" variant="secondary" onClick={() => void request('/api/ranker/plan').then((plan) => download('tier-plan.json', plan))}>Export plan</Button>
            </div>
          </Panel>
        </div>
      </main>
    </AppFrame>
  )
}
