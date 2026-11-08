// KL1's review page (uma-kit 0.18.0): the kit's real pieces on uma-quest's kind of stage. A phone held upright with the
// stage turned 90°, the same stage as the player sees it with the phone turned, and a portrait game's frame, unchanged.
// Built into docs/kit/previews/landscape.html by `pnpm --filter @luismlorenzana/uma-kit review`. No Uma art: marks fall
// back to plain dots.
import './styles.css'
import { StrictMode, useState, type CSSProperties, type ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import { MemoryRouter } from 'react-router'
import { AccountBar, type CurrencyChip } from '../../src/shell/AccountBar.js'
import { AppFrame } from '../../src/shell/AppFrame.js'
import { BottomBar, type BarTab } from '../../src/shell/BottomBar.js'
import { PeekPanel } from '../../src/shell/PeekPanel.js'
import { PlaceMenu, type MenuGroup } from '../../src/shell/PlaceMenu.js'
import { BottomSheet, Sheet } from '../../src/ui/BottomSheet.js'
import { Button } from '../../src/ui/Button.js'
import { BookIcon, HomeIcon, PlayIcon, StableIcon, SwordsIcon } from '../../src/ui/icons/index.js'
import { MotionRoot } from '../../src/ui/motion.js'
import { KitStage, type StageTurn } from '../../src/ui/stage.js'

/** An iPhone 15 Pro: 393 × 852 pt; the Dynamic Island's inset 59 pt, the home bar's 34 pt. */
const PHONE = { short: 393, long: 852, notch: 59, home: 34 }

const dot = (colour: string) => <span className="inline-block size-3.5 rounded-full" style={{ background: colour }} />
const CHIPS: CurrencyChip[] = [
  { key: 'gold', mark: 'currency/gold', fallback: dot('#e8b84a'), value: 12480, to: '/shop', label: 'Gold, 12,480' },
  { key: 'tickets', mark: 'currency/ticket', fallback: dot('#6aa6e8'), value: 35, to: '/inn', label: 'Tickets, 35' },
]
const TABS: BarTab[] = [
  { key: 'town', to: '/', label: 'Town', Icon: HomeIcon, active: true },
  { key: 'party', to: '/party', label: 'Party', Icon: StableIcon, active: false, badge: 2, badgeLabel: 'Party, 2 new' },
  { key: 'go', to: '/go', label: 'Go', Icon: PlayIcon, active: false, raised: true },
  { key: 'quests', to: '/quests', label: 'Quests', Icon: BookIcon, active: false },
]
const MENU = { to: '/menu', label: 'Every place', text: 'Menu' }
const GROUPS: MenuGroup[] = [{ key: 'town', label: 'Town', places: [
  { key: 'inn', name: 'Inn', to: '/inn' }, { key: 'shop', name: 'Shop', to: '/shop', count: 3 },
  { key: 'guild', name: 'Guild', to: '/guild' }, { key: 'forge', name: 'Forge', to: '/forge', locked: true },
] }]

/** The game's own scene: here a plain stage with a grid and two buttons that open the kit's sheet and side panel. */
function Scene({ label }: { label: string }) {
  const [sheet, setSheet] = useState(false)
  const [peek, setPeek] = useState(false)
  return (
    <>
      <div className="absolute inset-0 bg-stage" style={{ backgroundImage: 'linear-gradient(rgb(255 255 255 / 0.06) 1px, transparent 1px), linear-gradient(90deg, rgb(255 255 255 / 0.06) 1px, transparent 1px)', backgroundSize: '32px 32px' }} />
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-4 text-center text-ink-on-dark">
        <p className="text-micro text-ink-on-dark/70">{label}</p>
        <div className="flex gap-2">
          <Button onClick={() => setSheet(true)}>Open the menu sheet</Button>
          <Button variant="secondary" onClick={() => setPeek(true)}>Open the side panel</Button>
        </div>
        <p className="max-w-80 text-[12px] text-ink-on-dark/70">Drag the sheet by its handle toward the stage's right edge to close it.</p>
      </div>
      <Sheet open={sheet} onClose={() => setSheet(false)} title="Every place" footer={<Button className="w-full" onClick={() => setSheet(false)}>Done</Button>}>
        <PlaceMenu groups={GROUPS} extra={[{ key: 'account', name: 'Account', to: '/account' }]} />
      </Sheet>
      {peek && (
        <PeekPanel title="Inn" count={2} about="Rest the party and buy rooms." onClose={() => setPeek(false)} enter={{ to: '/inn', label: 'Enter the Inn' }}
          words={{ close: 'Close', about: 'About the Inn', backTo: 'Back to town' }}>
          <p className="text-[13px] text-ink-soft">The quick look slides in from the stage's right edge. Swipe it right to close.</p>
        </PeekPanel>
      )}
    </>
  )
}

/** uma-kit's landscape frame on a stage: the account rail on the left, the action rail on the right. */
function LandscapeApp({ turn }: { turn: StageTurn }) {
  return (
    <MemoryRouter>
      <KitStage layout="landscape" turn={turn}>
        <AppFrame top={<AccountBar initial="T" tier={2} account={{ to: '/account', label: 'Account' }} chips={CHIPS} menu={MENU} />}
          bottom={<BottomBar tabs={TABS} menu={MENU} label="Places" />}>
          <Scene label={turn === 90 ? 'Turned stage · 90°' : 'Stage · not turned'} />
        </AppFrame>
      </KitStage>
    </MemoryRouter>
  )
}

/** The stage's own box, with its safe areas on its own edges, as uma-quest's TurnedStage sets them. */
function stageStyle(turned: boolean): CSSProperties {
  return {
    position: 'absolute', left: 0, top: 0, width: PHONE.long, height: PHONE.short, overflow: 'hidden',
    transform: turned ? `translate(${PHONE.short}px, 0px) rotate(90deg)` : 'none', transformOrigin: '0 0',
    '--inset-top': '0px', '--inset-right': `${PHONE.home}px`, '--inset-bottom': '0px', '--inset-left': `${PHONE.notch}px`,
  } as CSSProperties
}

function Phone({ width, height, island, home, children }: {
  width: number; height: number; island?: 'top' | 'left'; home?: 'bottom' | 'right'; children: ReactNode
}) {
  return (
    <div className="shrink-0 rounded-[56px] bg-[#0b1118] p-3 shadow-3">
      {/* `translateZ(0)` makes the screen the containing block of the kit's fixed overlays, as the stage is on a phone. */}
      <div className="relative overflow-hidden rounded-[44px] bg-page" style={{ width, height, transform: 'translateZ(0)' }}>
        {children}
        {island && <div aria-hidden className="pointer-events-none absolute z-[60] rounded-full bg-black"
          style={island === 'top' ? { top: 11, left: '50%', width: 124, height: 36, marginLeft: -62 } : { left: 11, top: '50%', width: 36, height: 124, marginTop: -62 }} />}
        {home && <div aria-hidden className="pointer-events-none absolute z-[60] rounded-full bg-ink/60"
          style={home === 'bottom' ? { bottom: 8, left: '50%', width: 134, height: 5, marginLeft: -67 } : { right: 8, top: '50%', width: 5, height: 134, marginTop: -67 }} />}
      </div>
    </div>
  )
}

function PortraitApp() {
  const [sheet, setSheet] = useState(false)
  return (
    <MemoryRouter>
      <AppFrame top={<AccountBar initial="T" tier={2} account={{ to: '/account', label: 'Account' }} chips={CHIPS} />}
        bottom={<BottomBar tabs={TABS} menu={MENU} label="Places" />}>
        <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
          <p className="text-micro">A portrait game, no stage</p>
          <Button onClick={() => setSheet(true)}>Open a sheet</Button>
          <p className="text-[12px] text-ink-soft">The same markup as 0.17.0, pinned by snapshots.</p>
        </div>
      </AppFrame>
      <BottomSheet open={sheet} onClose={() => setSheet(false)} title="Every place"><PlaceMenu groups={GROUPS} /></BottomSheet>
    </MemoryRouter>
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
        <p className="text-micro">uma-kit 0.18.0 · KL1 · a "Both apps" change for uma-quest</p>
        <h1 className="text-3xl">The landscape layout</h1>
        <p className="mt-2 max-w-3xl text-[15px] leading-relaxed text-ink-soft">
          uma-quest draws on a landscape stage that it turns 90° on an upright phone. A <code>KitStage</code> inside that
          stage makes the kit live on it: sheets portal into the stage, size by it and drag in its directions; the safe
          areas come from the stage's own edges; the frame becomes two rails, the account and the menu by the left thumb
          and the actions by the right. Games without a stage draw exactly what they drew before.
        </p>
      </header>
      <Section title="Held upright: the stage turned 90°" note={<>The phone as it sits in the hand with the rotation lock on. The stage's left edge runs along the Dynamic Island (59 pt inset) and its right along the home bar (34 pt). The menu sheet comes in from the stage's right edge, which is the phone's bottom: <b>drag its handle down the screen</b> to close it, because that's toward the stage's right.</>}>
        <Phone width={PHONE.short} height={PHONE.long} island="top" home="bottom">
          <div style={stageStyle(true)}><LandscapeApp turn={90} /></div>
        </Phone>
        <ul className="max-w-sm list-disc space-y-2 pl-5 text-[14px] leading-relaxed text-ink-soft">
          <li><b>Left rail:</b> the initial with its tier crest, the currency chips stacked, and the Menu at its foot, clear of the island.</li>
          <li><b>Right rail:</b> the actions, the Go disc rising toward the stage, the active marker on the rail's inner edge, clear of the home bar.</li>
          <li><b>The sheet:</b> the stage's full height, at most 26 rem wide, its handle on its left edge; Escape and Close work as before.</li>
          <li><b>The side panel:</b> the same quick look, keeping clear of the home bar; a swipe toward the stage's right closes it.</li>
          <li>Every target is 44 pt or more.</li>
        </ul>
      </Section>
      <Section title="As the player sees it: the phone turned to its left" note={<>The same stage, unturned, the way it reads in the hand. Here the sheet closes with a drag to the right.</>}>
        <Phone width={PHONE.long} height={PHONE.short} island="left" home="right">
          <div style={stageStyle(false)}><LandscapeApp turn={0} /></div>
        </Phone>
      </Section>
      <Section title="Portrait games: unchanged" note={<>uma-rpg and uma-racer use no stage, so the frame, the bars and the bottom sheet keep 0.17.0's markup, byte for byte (seven snapshots in the kit's tests), and the safe areas still read the viewport's <code>env()</code>. A desktop browser reports no safe areas, so this phone is drawn without its island; on the phone the bars clear it as they always have.</>}>
        <Phone width={PHONE.short} height={PHONE.long}><PortraitApp /></Phone>
      </Section>
    </main>
  )
}

createRoot(document.getElementById('root')!).render(<StrictMode><MotionRoot><Page /></MotionRoot></StrictMode>)
