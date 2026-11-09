// uma-kit 0.19.0's review page: the raised tab's badge and glow, and the work screens' duration format, both from
// uma-farm's F18 request (its D31). The kit's real pieces, in light and dark, with the reduced-motion switch.
// Built into docs/kit/previews/raised-and-durations.html by `pnpm --filter @luismlorenzana/uma-kit review`. No Uma art.
import './styles.css'
import { StrictMode, type ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import { MemoryRouter } from 'react-router'
import { queue, start, type WorkEnv } from '@luismlorenzana/uma-work'
import { BottomBar, type BarTab } from '../../src/shell/BottomBar.js'
import { BookIcon, CardsIcon, CarrotIcon, HomeIcon, MoonIcon, PlayIcon, StableIcon, SwordsIcon } from '../../src/ui/icons/index.js'
import { MotionRoot, setReducedMotion, useReducedMotionSetting } from '../../src/ui/motion.js'
import { KitStage } from '../../src/ui/stage.js'
import { WorkProvider } from '../../src/work/context.js'
import { QueueChips } from '../../src/work/QueueChips.js'
import { SizeChips } from '../../src/work/SizeChips.js'
import { SlotRow } from '../../src/work/SlotRow.js'
import { StoppedQueueCard } from '../../src/work/StoppedQueueCard.js'
import type { DurationFormat, WorkWords } from '../../src/work/words.js'
import { AT, done, ENV, fresh, MINUTE, type TestState } from '../../src/work/work.fixtures.js'

const MENU = { to: '/menu', label: 'Every place', text: 'Menu' }
type Farm = 'badge' | 'all-set' | 'active'
/** uma-farm's loop bar (its FC29): Farm · Roster · End the day (raised) · Diary · Menu. */
const farmTabs = (state: Farm): BarTab[] => [
  { key: 'farm', to: '/', label: 'Farm', Icon: CarrotIcon, active: state !== 'active' },
  { key: 'roster', to: '/roster', label: 'Roster', Icon: CardsIcon, active: false },
  {
    key: 'end', to: '/end', label: state === 'all-set' ? 'All set' : 'End day', Icon: MoonIcon, raised: true, active: state === 'active',
    badge: state === 'all-set' ? 0 : 3, badgeLabel: 'End the day: 2 Umas idle, 1 thing to collect', glow: state === 'all-set',
  },
  { key: 'diary', to: '/diary', label: 'Diary', Icon: BookIcon, active: false },
]
/** uma-rpg's bar, as it is: the raised Battle tab passes no badge and no glow, so it draws 0.18.0's markup. */
const RPG_TABS: BarTab[] = [
  { key: 'home', to: '/', label: 'Home', Icon: HomeIcon, active: true },
  { key: 'grow', to: '/grow', label: 'Grow', Icon: StableIcon, active: false, badge: 2, badgeLabel: 'Grow, 2 ready' },
  { key: 'battle', to: '/battle', label: 'Battle', Icon: SwordsIcon, active: false, raised: true },
  { key: 'work', to: '/work', label: 'Work', Icon: PlayIcon, active: false },
]

/** A strip of page with the bar docked under it, at an iPhone's 393 pt. */
function BarStrip({ tabs, dark, caption }: { tabs: BarTab[]; dark?: boolean; caption: string }) {
  return (
    <figure className="w-[393px] shrink-0">
      <div data-theme={dark ? 'dark' : 'light'} className="flex h-40 flex-col justify-end overflow-hidden rounded-md border border-hairline bg-page text-ink">
        <MemoryRouter><BottomBar tabs={tabs} menu={MENU} label="Pages" /></MemoryRouter>
      </div>
      <figcaption className="mt-2 text-[13px] text-ink-soft">{caption}</figcaption>
    </figure>
  )
}

/** The action rail on a landscape stage (KL1), with the same tab. */
function RailBox({ tabs, dark, caption }: { tabs: BarTab[]; dark?: boolean; caption: string }) {
  return (
    <figure className="shrink-0">
      <div data-theme={dark ? 'dark' : 'light'} className="relative h-[393px] w-[300px] overflow-hidden rounded-md border border-hairline bg-stage" style={{ transform: 'translateZ(0)' }}>
        <MemoryRouter>
          <KitStage layout="landscape">
            <div className="flex h-full flex-row">
              <div className="min-w-0 flex-1" />
              <BottomBar tabs={tabs.filter((tab) => tab.key !== 'diary')} menu={MENU} label="Pages" />
            </div>
          </KitStage>
        </MemoryRouter>
      </div>
      <figcaption className="mt-2 text-[13px] text-ink-soft">{caption}</figcaption>
    </figure>
  )
}

/** The page's own reduced-motion switch: the kit's Account switch, stored on this device. */
function MotionSwitch() {
  const reduced = useReducedMotionSetting()
  return (
    <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full border border-hairline-strong bg-panel px-4 text-[14px] font-semibold">
      <input type="checkbox" checked={reduced} onChange={(event) => setReducedMotion(event.target.checked)} className="size-4 accent-[var(--color-accent)]" />
      Reduce motion {reduced ? '(the glow holds still)' : '(the glow pulses)'}
    </label>
  )
}

// ——— Durations ———
const DAY = 86_400_000
/** One farm day per item, as on uma-farm's day clock (its D25, FC6). */
const DAY_ENV: WorkEnv<TestState> = {
  ...ENV,
  kinds: Object.fromEntries(Object.entries(ENV.kinds).map(([kind, rules]) => [kind, {
    ...rules, plan: (...args: Parameters<typeof rules.plan>) => {
      const plan = rules.plan(...args)
      return Array.isArray(plan) ? plan.map((step) => ({ ...step, seconds: DAY / 1000 })) : plan
    },
  }])) as WorkEnv<TestState>['kinds'],
}
/** An example day-clock format; uma-farm writes its own words. */
const days = (ms: number) => Math.max(1, Math.round(ms / DAY))
const dayClock: DurationFormat = (ms, use) => {
  const n = days(ms)
  if (use === 'ago') return n === 1 ? 'yesterday' : `${n} days ago`
  return n === 1 ? '1 day' : `${n} days`
}
const DAY_WORDS: Partial<WorkWords> = { stoppedLine: '{place} · stopped {time}' }

const slot = { building: 'grove', slot: 0 }
function workScreens(env: WorkEnv<TestState>, unit: number) {
  const running = done(start(fresh(), { outfitId: 'ada', slot, request: { kind: 'gather', item: 'twig', count: 2 } }, AT, env))
  let queued = done(start(fresh({ twig: 3 }), { outfitId: 'ada', slot, request: { kind: 'make', item: 'toy', count: 1 } }, AT, env))
  queued = done(queue(queued, { outfitId: 'ada', add: { building: 'grove', request: { kind: 'make', item: 'toy', count: 2 } } }, AT, env))
  const stopped: TestState = { ...fresh(), work: { ada: { outfitId: 'ada', entries: [], slot: null, last: null, queue: [], dropped: { at: AT, slot, requests: [{ kind: 'make', item: 'toy', count: 2 }], short: [{ item: 'twig', qty: 2 }], refused: null } } } }
  return { running, queued, stopped, now: AT + unit / 4, later: AT + unit }
}

function WorkColumn({ title, note, env, unit, format, words, itemSeconds }: {
  title: string; note: ReactNode; env: WorkEnv<TestState>; unit: number; format?: DurationFormat; words?: Partial<WorkWords>; itemSeconds: number[]
}) {
  const s = workScreens(env, unit)
  const provider = (state: TestState, now: number, node: ReactNode) => (
    <WorkProvider state={state} now={now} env={env} names={{ uma: (id) => id === 'ada' ? 'Ada' : id, item: (id) => id === 'twig' ? 'Firewood' : id === 'toy' ? 'Basket' : id, place: () => 'Forest' }}
      actions={{ collect: () => {}, speedUp: () => {}, queue: () => {}, restart: () => {}, dismiss: () => {} }} formatDuration={format} words={words}>{node}</WorkProvider>
  )
  return (
    <div className="w-[393px] shrink-0 space-y-3">
      <h3 className="text-lg">{title}</h3>
      <p className="text-[13px] leading-relaxed text-ink-soft">{note}</p>
      <MemoryRouter>
        <div className="space-y-3 rounded-md border border-hairline bg-page p-3">
          <p className="text-micro">SlotRow · <code>left</code></p>
          {provider(s.running, s.now, <SlotRow slot={slot} />)}
          <p className="text-micro">SizeChips · <code>length</code></p>
          {provider(fresh(), AT, <SizeChips start={AT} itemSeconds={itemSeconds} max={3} value={2} onChange={() => {}} rule={{ mode: 'duration' }} />)}
          <p className="text-micro">QueueChips · <code>length</code></p>
          {provider(s.queued, AT, <QueueChips outfitId="ada" />)}
          <p className="text-micro">StoppedQueueCard · <code>ago</code></p>
          {provider(s.stopped, s.later, <StoppedQueueCard outfitId="ada" />)}
        </div>
      </MemoryRouter>
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

function Page() {
  return (
    <main className="mx-auto flex max-w-[1400px] flex-col gap-6 px-6 py-8">
      <header>
        <p className="text-micro">uma-kit 0.19.0 · two "Both apps" requests from uma-farm's F18 (its D31)</p>
        <h1 className="text-3xl">The raised tab's badge and glow, and the work screens' durations</h1>
        <p className="mt-2 max-w-3xl text-[15px] leading-relaxed text-ink-soft">
          uma-farm's End the day is its bar's raised centre tab. It shows a count of what still waits (idle Umas and things
          to collect), and glows "All set" when nothing does. Its jobs take whole farm days, so the work screens need to
          say "1 day" where the kit printed "24h". Both are options: a game that passes neither draws exactly what 0.18.0
          drew.
        </p>
        <div className="mt-4"><MotionSwitch /></div>
      </header>

      <Section title="The raised tab: badge and glow" note={<>
        <code>BarTab.badge</code> now draws on the raised disc too, at its top-right on the ring, hidden at 0, like every
        other tab's badge; <code>badgeLabel</code> is still the tab's accessible name while it shows. The new
        <code> BarTab.glow</code> adds a soft accent halo that pulses every 2.4 s; under reduced motion it holds still. The
        halo is an outer shadow just outside the disc's ring, so it never covers the disc or its notch.</>}>
        <BarStrip tabs={farmTabs('badge')} caption="End day, 3 waiting (light)" />
        <BarStrip tabs={farmTabs('badge')} dark caption="End day, 3 waiting (dark)" />
        <BarStrip tabs={farmTabs('all-set')} caption="All set: no badge, the glow (light)" />
        <BarStrip tabs={farmTabs('all-set')} dark caption="All set: no badge, the glow (dark)" />
        <BarStrip tabs={farmTabs('active')} caption="The raised tab active, with its badge: the outline and the badge together" />
        <BarStrip tabs={RPG_TABS} dark caption="uma-rpg's Battle disc, unchanged: no badge, no glow (0.18.0's markup, held by snapshots)" />
      </Section>

      <Section title="On a landscape stage" note={<>The same disc on the action rail (KL1), rising toward the stage, with its badge and its glow.</>}>
        <RailBox tabs={farmTabs('badge')} caption="End day, 3 waiting" />
        <RailBox tabs={farmTabs('all-set')} dark caption="All set, glowing (dark)" />
      </Section>

      <Section title="The work screens' durations" note={<>
        <code>WorkProvider</code>'s new <code>formatDuration(ms, use)</code> words every duration the work screens print,
        by where it is printed: <code>left</code> (a running job's time left, its VoiceOver line, the speed-up sheet and a
        refusal's <code>{'{time}'}</code>), <code>length</code> (the size chips and their idle time, the queue line, the
        job sheet's submit button) and <code>ago</code> (a stopped queue). It's on <code>useWork()</code> for the game's
        own rows. Without it every use prints <code>durationText</code>, as before.</>}>
        <WorkColumn title="Default: uma-rpg and uma-racer" env={ENV} unit={60 * MINUTE} itemSeconds={[1200, 1200, 1200]}
          note="Minutes and hours, rounded up to the next minute, exactly as 0.18.0 printed them." />
        <WorkColumn title="A day clock: uma-farm" env={DAY_ENV} unit={DAY} format={dayClock} words={DAY_WORDS} itemSeconds={[86_400, 86_400, 86_400]}
          note={<>An example format on uma-farm's clock, where a farm day is 86,400,000 ms and jobs take whole days; uma-farm writes its own words ("Tomorrow", "Yesterday"). The stopped line's word drops its "ago" here, since <code>ago</code> says it.</>} />
      </Section>
    </main>
  )
}

createRoot(document.getElementById('root')!).render(<StrictMode><MotionRoot><Page /></MotionRoot></StrictMode>)
