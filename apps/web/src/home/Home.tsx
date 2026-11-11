// Home (AP4): the platform's name, the signed-in account, the master data release it reads, and a tile for each sub-app
// with its live numbers, in uma-kit's frame. The menu holds the account, the build and sign-out.
import { useAuth } from '@luismlorenzana/uma-kit/auth'
import { AccountBar, AppFrame } from '@luismlorenzana/uma-kit/shell'
import { Button, Panel, Sheet } from '@luismlorenzana/uma-kit/ui'
import { useEffect, useState, type ReactNode } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { APP_BUILD_ID } from '../app/build'
import { SUB_APPS, type SubApp, type SummaryLine } from '../apps'
import { loadMaster, useMaster, type MasterState } from '../master/master'

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex min-h-11 items-center justify-between gap-4 border-b border-hairline py-2 last:border-b-0">
      <span className="text-ink-soft">{label}</span>
      <span className="text-right font-semibold">{children}</span>
    </div>
  )
}

export const masterWords = (master: MasterState): string =>
  master.status === 'ready' ? master.version : master.status === 'error' ? 'Unavailable' : 'Loading'

type Summary = { status: 'loading' } | { status: 'ready'; lines: readonly SummaryLine[] } | { status: 'error' }

/** One sub-app's tile: its title, then its numbers once its summary answers (its line is the tooltip). */
export function Tile({ app }: { app: SubApp }) {
  const [summary, setSummary] = useState<Summary>(app.summary ? { status: 'loading' } : { status: 'ready', lines: [] })
  useEffect(() => {
    if (!app.summary) return
    let live = true
    app.summary().then((lines) => { if (live) setSummary({ status: 'ready', lines }) }, () => { if (live) setSummary({ status: 'error' }) })
    return () => { live = false }
  }, [app])
  return (
    <Link to={`/${app.id}`} title={app.blurb} className="flex min-h-32 flex-col gap-2 rounded-lg bg-panel p-4 shadow-1 transition hover:shadow-2 focus-visible:outline-2 focus-visible:outline-accent">
      <span className="font-display text-xl font-bold tracking-tight text-ink">{app.title}</span>
      <span className="mt-auto flex flex-wrap gap-x-4 gap-y-1 text-sm">
        {summary.status === 'loading' && <span className="text-ink-faint">Loading</span>}
        {summary.status === 'error' && <span className="text-ink-faint">Numbers unavailable</span>}
        {summary.status === 'ready' && summary.lines.map((line) => (
          <span key={line.label}><b className="font-semibold text-ink">{line.value}</b> <span className="text-ink-soft">{line.label}</span></span>
        ))}
      </span>
    </Link>
  )
}

export function Home({ apps = SUB_APPS }: { apps?: readonly SubApp[] }) {
  const auth = useAuth()
  const master = useMaster()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const menuOpen = params.get('menu') === '1'
  useEffect(() => loadMaster(), [])

  const who = auth.user?.email ?? auth.user?.name ?? 'Local'
  return (
    <AppFrame
      top={<AccountBar initial={who.slice(0, 1).toUpperCase()} account={{ to: '/?menu=1', label: 'Menu' }} chips={[]} />}
      overlays={
        <Sheet open={menuOpen} onClose={() => void navigate('/', { replace: true })} title="Menu">
          <div className="flex flex-col gap-3 pb-2">
            <Row label="Account">{who}</Row>
            <Row label="Build">{APP_BUILD_ID}</Row>
            <Row label="Master data">{masterWords(master)}</Row>
            {auth.authRequired && (
              <Button variant="secondary" onClick={() => void auth.signOut()}>Sign out</Button>
            )}
          </div>
        </Sheet>
      }
    >
      <main className="pb-safe h-full overflow-y-auto bg-page px-4 py-6">
        <div className="mx-auto flex max-w-5xl flex-col gap-5">
          <header className="flex flex-wrap items-end justify-between gap-2">
            <h1 className="font-display text-3xl font-bold tracking-tight">Uma Platform</h1>
            <span className="text-sm text-ink-soft">Master data · <b className="font-semibold text-ink">{masterWords(master)}</b></span>
          </header>
          {apps.length > 0 ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {apps.map((app) => <Tile key={app.id} app={app} />)}
            </div>
          ) : (
            <Panel>
              <p className="py-2 text-ink-soft">No sub-apps yet. The Uma Ranker and Uma Character Art open here next.</p>
            </Panel>
          )}
        </div>
      </main>
    </AppFrame>
  )
}
