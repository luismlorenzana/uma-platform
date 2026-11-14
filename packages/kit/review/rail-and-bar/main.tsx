// uma-kit 0.20.0's review page (uma-farm's F74, uma-platform P171): the opt-in landscape variants on a phone held
// sideways. A left rail of pages and a thin bar on top (`AppFrame landscape="rail-and-bar"`, `BottomBar side="left"`,
// `AccountBar landscape="bar"`), the wide side sheet, the Account in two columns, the update notice clear of the sides,
// and the Hub map running across. Built into docs/kit/previews/rail-and-bar.html by
// `pnpm --filter @luismlorenzana/uma-kit review`. No Uma art: marks fall back to plain dots. The map is drawn from the
// kit's own terrain and grid (`layTerrain`, `hubGrid`) under its real place links, without Phaser, to keep the page light.
import './styles.css'
import { StrictMode, useMemo, useState, type CSSProperties, type ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import { Link, MemoryRouter, Route, Routes, useLocation } from 'react-router'
import { ART_TILE, artScale, hubGrid } from '../../src/hub/grid.js'
import { PALETTES } from '../../src/hub/palettes.js'
import { PlaceTargets, useHubGrid, type TargetModel } from '../../src/hub/PlaceTargets.js'
import { layTerrain } from '../../src/hub/terrain.js'
import { AccountPage } from '../../src/places/AccountPage.js'
import { UpdateLifecycle } from '../../src/places/update-lifecycle.js'
import { UpdateNotice } from '../../src/places/UpdateNotice.js'
import { AccountBar, type CurrencyChip } from '../../src/shell/AccountBar.js'
import { AppFrame } from '../../src/shell/AppFrame.js'
import { BottomBar, type BarTab } from '../../src/shell/BottomBar.js'
import { Sheet } from '../../src/ui/BottomSheet.js'
import { Button } from '../../src/ui/Button.js'
import { BookIcon, CarrotIcon, HeartIcon, MoonIcon, SettingsIcon, VenueIcon } from '../../src/ui/icons/index.js'
import { MotionRoot } from '../../src/ui/motion.js'
import { Panel } from '../../src/ui/Panel.js'
import { KitStage } from '../../src/ui/stage.js'

/** An iPhone 15 Pro held sideways, as iOS turns the page: 852 × 393 pt, 59 pt clear of each side, 21 pt over the home bar. */
const PHONE = { long: 852, short: 393, side: 59, home: 21 }

const dot = (colour: string) => <span className="inline-block size-3.5 rounded-full" style={{ background: colour }} />
const CHIPS: CurrencyChip[] = [
  { key: 'date', mark: 'season/spring', fallback: dot('#8fd16a'), value: 12, extra: ' Spr', to: '/calendar', label: 'Calendar: Spring 12' },
  { key: 'actions', mark: 'ui/actions', fallback: dot('#6aa6e8'), value: 7, extra: '/10', to: '/', label: 'Actions left: 7 of 10' },
  { key: 'gold', mark: 'currency/gold', fallback: dot('#e8b84a'), value: 2480, to: '/bin', label: 'Gold: 2,480g' },
]
const MENU = { to: '/menu', label: 'Every place', text: 'Menu' }
const PAGES = [
  { key: 'farm', to: '/', label: 'Farm', Icon: CarrotIcon },
  { key: 'town', to: '/town', label: 'Town', Icon: VenueIcon },
  { key: 'people', to: '/people', label: 'People', Icon: HeartIcon, badge: 2, badgeLabel: 'People, 2 Ready' },
  { key: 'book', to: '/book', label: 'Book', Icon: BookIcon },
  { key: 'account', to: '/account', label: 'Account', Icon: SettingsIcon },
]

/** The game's own button in the bar's trailing slot: End the day. */
function EndDay() {
  return (
    <Link to="/end" aria-label="End the day: 2 Umas idle" className="flex min-h-11 shrink-0 items-center justify-center px-0.5">
      <span aria-hidden className="font-display relative flex h-8 items-center gap-1 rounded-full bg-accent pr-3 pl-2 text-[13px] font-bold text-accent-ink shadow-2">
        <MoonIcon size={16} variant="duotone" accent="var(--color-panel)" />End day
        <span className="absolute -top-1.5 -right-1.5 min-w-4 rounded-full bg-success px-1 text-center text-[10px] leading-4 font-bold text-ink-on-dark ring-2 ring-panel">2</span>
      </span>
    </Link>
  )
}

/** The pages down the left rail, the current one lit. */
function Rail() {
  const { pathname } = useLocation()
  const tabs: BarTab[] = PAGES.map((page) => ({ ...page, active: page.to === '/' ? pathname === '/' : pathname.startsWith(page.to) }))
  return <BottomBar side="left" tabs={tabs} label="Pages" />
}

// An invented farm, laid across: places above the road, on it and below it.
const PLACES: TargetModel[] = [
  { id: 'fields', name: 'Fields', at: { x: 0.06, y: 0.3 } }, { id: 'coop', name: 'Coop', at: { x: 0.2, y: 0.24 } },
  { id: 'barn', name: 'Barn', at: { x: 0.36, y: 0.3 } }, { id: 'gate', name: 'Gate', at: { x: 0.5, y: 0.5 } },
  { id: 'mill', name: 'Mill', at: { x: 0.66, y: 0.26 } }, { id: 'forge', name: 'Forge', at: { x: 0.28, y: 0.84 } },
  { id: 'mine', name: 'Mine', at: { x: 0.74, y: 0.84 } }, { id: 'dock', name: 'Dock', at: { x: 0.9, y: 0.3 } },
].map((place) => ({ ...place, to: `/?peek=${place.id}`, label: place.name, ...(place.id === 'barn' ? { ready: 'Ready' } : {}), ...(place.id === 'dock' ? { locked: true } : {}) }))
const MAP_COLUMNS = 61
const hex = (colour: number) => `#${colour.toString(16).padStart(6, '0')}`

/** The kit's across terrain, drawn as plain tiles on its own grid, so the links above land where the scene would put them. */
function TerrainSketch() {
  const [root, measured] = useHubGrid('across')
  const grid = measured ?? hubGrid(MAP_COLUMNS * 24, 330, 2, 'across')
  const palette = PALETTES.farmlands!
  const terrain = useMemo(() => layTerrain({ page: 'farm', tiles: 'farmlands', places: PLACES, cols: grid.cols, rows: grid.rows, props: [], flow: 'across' }),
    [grid.cols, grid.rows])
  const colour = (frame: string, i: number) => frame.includes('/path-') ? hex(palette.feature) : frame.includes('/water-') ? '#2f6fa8' : hex(palette.ground[i % palette.ground.length]!)
  return (
    <div ref={root} className="absolute inset-0" aria-hidden>
      <svg width={grid.cols * grid.tile} height={grid.rows * grid.tile} style={{ position: 'absolute', left: -grid.left, top: -(grid.top ?? 0) }}>
        {terrain.cells.map((frame, i) => (
          <rect key={i} x={(i % grid.cols) * grid.tile} y={Math.floor(i / grid.cols) * grid.tile} width={grid.tile} height={grid.tile} fill={colour(frame, i * 7 + Math.floor(i / grid.cols))} />
        ))}
        {Object.values(terrain.footprints).map(({ col, row }) => (
          <g key={`${col},${row}`}>
            <rect x={(col - 1) * grid.tile + 4} y={(row - 1) * grid.tile} width={grid.tile * 3 - 8} height={grid.tile * 2} fill={hex(palette.building.wall)} rx={3} />
            <rect x={(col - 1) * grid.tile} y={(row - 2) * grid.tile + 6} width={grid.tile * 3} height={grid.tile - 2} fill={hex(palette.building.roof)} rx={3} />
          </g>
        ))}
      </svg>
    </div>
  )
}

/** The farm page: the map running across, scrolling sideways, with the two sheets to compare. */
function FarmPage({ sheet: initial = null }: { sheet?: 'regular' | 'wide' | null }) {
  const [sheet, setSheet] = useState<'regular' | 'wide' | null>(initial)
  const tile = ART_TILE * artScale(2)
  return (
    <>
      <div className="absolute inset-0 overflow-x-auto overscroll-contain" style={{ background: PALETTES.farmlands!.background }}>
        <div className="relative h-full" style={{ minWidth: MAP_COLUMNS * tile }}>
          <main aria-label="Farm map" className="absolute inset-0 touch-pan-x overflow-hidden select-none" data-flow="across">
            <TerrainSketch />
            <PlaceTargets places={PLACES} flow="across" />
          </main>
        </div>
      </div>
      <div className="absolute right-[calc(var(--inset-right)+0.75rem)] bottom-[calc(var(--inset-bottom)+0.75rem)] flex gap-2">
        <Button size="sm" variant="secondary" onClick={() => setSheet('regular')}>Regular sheet</Button>
        <Button size="sm" onClick={() => setSheet('wide')}>Wide sheet</Button>
      </div>
      <Sheet open={sheet !== null} onClose={() => setSheet(null)} size={sheet ?? 'regular'} title={sheet === 'wide' ? 'The shop · wide' : 'The bin · regular'}
        footer={<Button className="w-full" onClick={() => setSheet(null)}>Done</Button>}>
        <p className="mb-3 text-[13px] text-ink-soft">
          {sheet === 'wide' ? 'size="wide": at most min(34rem, 75cqw) wide, for a content-heavy panel.' : 'The default: at most min(26rem, 62cqw) wide.'}
        </p>
        <div className={sheet === 'wide' ? 'grid grid-cols-3 gap-2' : 'grid grid-cols-2 gap-2'}>
          {['Turnip seeds', 'Potato seeds', 'Fertiliser', 'Hay', 'Milk pail', 'Ribbon'].map((item) => (
            <div key={item} className="rounded-sm bg-sunken p-3 text-[13px]"><b className="block">{item}</b><span className="text-ink-soft">120g</span></div>
          ))}
        </div>
      </Sheet>
    </>
  )
}

function AccountRoute() {
  return (
    <div className="absolute inset-0 overflow-y-auto overscroll-contain pr-[var(--inset-right)]">
      <AccountPage columns={2} rename={{ value: 'Farmer', maxLength: 20, onSave: async () => {} }}
        notifications={<Panel className="p-3"><h2 className="text-[14px] font-semibold">Notifications</h2><p className="text-[12px] text-ink-soft">Off: days are turns</p></Panel>}
        sections={<Panel className="p-3"><h2 className="text-[14px] font-semibold">Safety copies</h2><p className="text-[12px] text-ink-soft">Before a restore · Nov 12</p></Panel>}
        info={[{ label: 'Signed in', value: 'farmer@example.com' }, { label: 'Save', value: 'Synced' }, { label: 'Build', value: 'local' }, { label: 'Master data', value: '1.40.0' }]}
        onSignOut={() => {}} />
    </div>
  )
}

const waiting = () => {
  const lifecycle = new UpdateLifecycle()
  lifecycle.workerWaiting(() => {})
  return lifecycle
}

/** The farm's app on the stage: the rail, the bar, the page. */
function FarmApp({ at, sheet, update = false }: { at: string; sheet?: 'regular' | 'wide'; update?: boolean }) {
  const lifecycle = useMemo(waiting, [])
  return (
    <MemoryRouter initialEntries={[at]}>
      <KitStage layout="landscape">
        {update && <UpdateNotice clearSides lifecycle={lifecycle} />}
        <AppFrame landscape="rail-and-bar"
          top={<AccountBar landscape="bar" chips={CHIPS} sync={{ state: 'offline', text: 'Offline', label: 'Offline: changes sync when you’re back', to: '/account' }}
            actions={<EndDay />} menu={MENU} />}
          bottom={<Rail />}>
          <Routes>
            <Route path="/account" element={<AccountRoute />} />
            <Route path="*" element={<FarmPage sheet={sheet} />} />
          </Routes>
        </AppFrame>
      </KitStage>
    </MemoryRouter>
  )
}

/** The phone, sideways: the Dynamic Island on the left, the home bar along the bottom. */
function Phone({ children }: { children: ReactNode }) {
  const stage = {
    position: 'absolute', inset: 0,
    '--inset-top': '0px', '--inset-right': `${PHONE.side}px`, '--inset-bottom': `${PHONE.home}px`, '--inset-left': `${PHONE.side}px`,
  } as CSSProperties
  return (
    <div className="shrink-0 rounded-[56px] bg-[#0b1118] p-3 shadow-3">
      {/* `translateZ(0)` makes the screen the containing block of the kit's fixed overlays, as the stage is on a phone. */}
      <div className="relative overflow-hidden rounded-[44px] bg-page" style={{ width: PHONE.long, height: PHONE.short, transform: 'translateZ(0)' }}>
        <div style={stage}>{children}</div>
        <div aria-hidden className="pointer-events-none absolute z-[60] rounded-full bg-black" style={{ left: 11, top: '50%', width: 36, height: 124, marginTop: -62 }} />
        <div aria-hidden className="pointer-events-none absolute z-[60] rounded-full bg-ink/60" style={{ bottom: 8, left: '50%', width: 134, height: 5, marginLeft: -67 }} />
      </div>
    </div>
  )
}

function Section({ title, children, note }: { title: string; note: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-lg border border-hairline bg-panel p-6 shadow-1">
      <h2 className="mb-1 text-xl">{title}</h2>
      <div className="mb-5 max-w-3xl text-[14px] leading-relaxed text-ink-soft">{note}</div>
      <div className="flex flex-wrap items-start gap-8">{children}</div>
    </section>
  )
}

function Notes({ items }: { items: ReactNode[] }) {
  return <ul className="max-w-sm list-disc space-y-2 pl-5 text-[14px] leading-relaxed text-ink-soft">{items.map((item, i) => <li key={i}>{item}</li>)}</ul>
}

function Page() {
  return (
    <main className="mx-auto flex max-w-[1400px] flex-col gap-6 px-6 py-8">
      <header>
        <p className="text-micro">uma-kit 0.20.0 · uma-farm F74 · uma-platform P171</p>
        <h1 className="text-3xl">A left rail and a top bar</h1>
        <p className="mt-2 max-w-3xl text-[15px] leading-relaxed text-ink-soft">
          uma-farm runs its whole app on a landscape <code>KitStage</code>, held sideways. Its layout is the other way round
          from uma-quest's two rails: the pages down the left edge by the thumb, and a thin bar across the top with the
          day, the actions, the gold, End the day and the Menu. These are opt-in props: uma-quest, and every portrait game,
          draw exactly what they drew before (the kit's tests compare the markup).
        </p>
      </header>
      <Section title="The farm: rail and bar, the map running across" note={<>
        <code>AppFrame landscape="rail-and-bar"</code>, <code>BottomBar side="left"</code> and <code>AccountBar landscape="bar"</code>.
        The map scrolls sideways; its road runs across the middle and every door joins it. Open the two sheets to compare their widths.
      </>}>
        <Phone><FarmApp at="/" update /></Phone>
        <Notes items={[
          <><b>The rail:</b> the pages stacked, labels under the icons, a border on its right, clear of the island; the active marker on its inner (right) edge; the People badge. No menu slot.</>,
          <><b>The bar:</b> one 44 pt row across the page column, the chips and the sync chip from the left, End the day (the game's <code>actions</code>) and the Menu at the right end, clear of the right inset. Beside the rail its <code>pl-safe</code> adds nothing.</>,
          <><b>The update notice</b> (<code>clearSides</code>) keeps clear of the island and the right inset.</>,
          <><b>The map</b> (<code>HubMap flow="across"</code>): the trunk road across the middle row, a branch down from each place above it, round and up from each below, and a lane under the Gate, which stands on it. Drawn here from the kit's terrain without Phaser.</>,
        ]} />
      </Section>
      <Section title="The wide sheet" note={<><code>size="wide"</code> on a landscape stage: at most <code>min(34rem, 75cqw)</code> instead of <code>min(26rem, 62cqw)</code>.</>}>
        <Phone><FarmApp at="/" sheet="wide" /></Phone>
      </Section>
      <Section title="The Account in two columns" note={<><code>AccountPage columns={'{2}'}</code>: on a page at least 36rem wide its panels sit in two CSS columns, each kept whole; narrower, one.</>}>
        <Phone><FarmApp at="/account" /></Phone>
      </Section>
    </main>
  )
}

createRoot(document.getElementById('root')!).render(<StrictMode><MotionRoot><Page /></MotionRoot></StrictMode>)
