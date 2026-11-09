// The bottom bar (uma-racer's `hub/BottomBar`, both games' since P48): five equal slots in one order, Home · Grow · [Play]
// · Work · Menu. Since 0.2.0 it is a game's bar, docked full width to the bottom edge: its panel runs under the home
// indicator, so nothing shows below it, and the Play tab is a gold disc rising out of the bar's top edge in a notch of the
// bar's colour. The active tab shows by shape (a marker on the bar's top edge and a two-tone icon) as well as colour;
// badges are counts, hidden at 0. Since 0.19.0 the raised disc draws its badge too, at its top-right on the ring, and an
// optional `glow`, a soft accent halo that pulses (still under reduced motion), for uma-farm's End the day (its CS6).
//
// On a landscape `KitStage` (0.18.0, KL1) it is the frame's right rail, under the right thumb: the tabs stacked, the Play
// disc rising out of the rail's inner edge toward the stage, the active marker on that edge. The menu isn't drawn there:
// on a landscape stage it is the account rail's (`AccountBar`'s `menu`). Outside a stage it is exactly as before.
import { m } from 'motion/react'
import { Link } from 'react-router'
import { MenuIcon, type IconComponent } from '../ui/icons/index.js'
import { useReducedMotionSetting } from '../ui/motion.js'
import { useKitStage } from '../ui/stage.js'

export interface BarTab {
  readonly key: string
  readonly to: string
  readonly label: string
  readonly Icon: IconComponent
  readonly active: boolean
  /** The raised centre disc. */
  readonly raised?: boolean
  /** Hidden at 0. On the raised disc it sits at the disc's top-right, on its ring (0.19.0). */
  readonly badge?: number
  /** The accessible name when a badge shows, such as "Farm, 3 ready". */
  readonly badgeLabel?: string
  /** The raised disc only: a soft accent halo that pulses around it, still under reduced motion. Off by default (0.19.0). */
  readonly glow?: boolean
}

const PRESS = { duration: 0.12, ease: [0.2, 0, 0, 1] as const }

/** The marker on the bar's top edge over the active tab. */
function ActiveMark() {
  return <span aria-hidden className="absolute top-0 left-1/2 h-[3px] w-8 -translate-x-1/2 rounded-b-full bg-accent" />
}

/** The rail's marker, on its inner edge beside the active tab. */
function RailMark() {
  return <span aria-hidden className="absolute top-1/2 left-0 h-8 w-[3px] -translate-y-1/2 rounded-r-full bg-accent" />
}

function Badge({ count, at = '-top-1.5 -right-3' }: { count: number; at?: string }) {
  return (
    <span aria-hidden className={`absolute ${at} min-w-4 rounded-full bg-success px-1 text-center text-[10px] leading-4 font-bold text-ink-on-dark ring-2 ring-panel`}>
      {count}
    </span>
  )
}

/**
 * The raised tab's halo (0.19.0). An outer shadow is drawn only outside its own box, and the box is the disc's ring, so the
 * glow never covers the disc or its notch, whatever the paint order (a pressed disc is its own stacking context). Under
 * reduced motion it is a plain, still span.
 */
function Glow() {
  const reduced = useReducedMotionSetting()
  const look = 'pointer-events-none absolute -inset-1 rounded-full shadow-[0_0_14px_4px_var(--color-accent)]'
  return reduced ? <span aria-hidden data-glow="still" className={`${look} opacity-80`} /> : (
    <m.span
      aria-hidden
      data-glow="pulse"
      className={look}
      initial={{ opacity: 0.35, scale: 1 }}
      animate={{ opacity: [0.35, 0.9, 0.35], scale: [1, 1.06, 1] }}
      transition={{ duration: 2.4, ease: 'easeInOut', repeat: Infinity }}
    />
  )
}

/**
 * The raised disc, rising out of the bar's top edge (`-mt-5`) or the rail's inner edge (`-ml-5`): a ring of the bar's colour
 * cuts it a notch. Without a badge or a glow its markup is 0.18.0's to the character (portrait.test.tsx holds it).
 */
function RaisedDisc({ tab, count, rise }: { tab: BarTab; count: number; rise: '-mt-5' | '-ml-5' }) {
  const decorated = count > 0 || tab.glow === true
  return (
    <m.span
      whileTap={{ scale: 0.94 }}
      transition={PRESS}
      className={`${rise} flex size-[62px] flex-col items-center justify-center rounded-full bg-accent text-accent-ink shadow-2 ring-4 ring-panel ${
        tab.active ? 'outline-2 outline-offset-[3px] outline-accent' : ''
      }${decorated ? ' relative' : ''}`}
    >
      {tab.glow && <Glow />}
      {/* On the gold disc the icon's tone is the panel colour, so its marks still read. */}
      <tab.Icon size={24} variant="duotone" accent="var(--color-panel)" />
      <span className="font-display -mt-0.5 text-[10px] font-bold">{tab.label}</span>
      {count > 0 && <Badge count={count} at="-top-1 -right-1" />}
    </m.span>
  )
}

/** The action rail on a landscape stage. */
function BarRail({ tabs, label }: { tabs: readonly BarTab[]; label: string }) {
  return (
    <nav
      aria-label={label}
      data-kit="bottom-bar"
      data-layout="landscape"
      className="pt-safe pb-safe pr-safe relative z-20 flex shrink-0 flex-col justify-center gap-1 border-l border-hairline bg-panel shadow-[-6px_0_18px_-10px_rgb(16_26_36/0.35)]"
    >
      {tabs.map((tab) => {
        const count = tab.badge ?? 0
        return (
          <Link
            key={tab.key}
            to={tab.to}
            aria-label={count > 0 && tab.badgeLabel ? tab.badgeLabel : tab.label}
            aria-current={tab.active ? 'page' : undefined}
            className="relative flex w-16 justify-center"
          >
            {tab.raised ? (
              <RaisedDisc tab={tab} count={count} rise="-ml-5" />
            ) : (
              <m.span whileTap={{ scale: 0.94 }} transition={PRESS} className="flex h-14 w-full flex-col items-center justify-center gap-0.5 px-1">
                {tab.active && <RailMark />}
                <span className="relative">
                  <tab.Icon size={24} variant={tab.active ? 'duotone' : 'line'} className={tab.active ? 'text-ink' : 'text-ink-faint'} />
                  {count > 0 && <Badge count={count} />}
                </span>
                <span className={`max-w-full truncate text-[11px] font-semibold ${tab.active ? 'text-ink' : 'text-ink-faint'}`}>{tab.label}</span>
              </m.span>
            )}
          </Link>
        )
      })}
    </nav>
  )
}

export function BottomBar({ tabs, menu, label }: {
  tabs: readonly BarTab[]
  /** The fifth slot; on a landscape stage it is the account rail's instead (`AccountBar`'s `menu`). */
  menu: { readonly to: string; readonly label: string; readonly text: string; readonly state?: unknown }
  /** The bar's accessible name. */
  label: string
}) {
  const stage = useKitStage()
  if (stage?.layout === 'landscape') return <BarRail tabs={tabs} label={label} />
  return (
    <nav
      aria-label={label}
      data-kit="bottom-bar"
      className="pb-bar-safe relative z-20 grid shrink-0 grid-cols-5 border-t border-hairline bg-panel shadow-[0_-6px_18px_-10px_rgb(16_26_36/0.35)]"
    >
      {tabs.map((tab) => {
        const count = tab.badge ?? 0
        return (
          <Link
            key={tab.key}
            to={tab.to}
            aria-label={count > 0 && tab.badgeLabel ? tab.badgeLabel : tab.label}
            aria-current={tab.active ? 'page' : undefined}
            className="relative flex min-w-0 justify-center"
          >
            {tab.raised ? (
              <RaisedDisc tab={tab} count={count} rise="-mt-5" />
            ) : (
              <m.span whileTap={{ scale: 0.94 }} transition={PRESS} className="flex h-14 w-full flex-col items-center justify-center gap-0.5 px-1">
                {tab.active && <ActiveMark />}
                <span className="relative">
                  <tab.Icon size={24} variant={tab.active ? 'duotone' : 'line'} className={tab.active ? 'text-ink' : 'text-ink-faint'} />
                  {count > 0 && <Badge count={count} />}
                </span>
                <span className={`max-w-full truncate text-[11px] font-semibold ${tab.active ? 'text-ink' : 'text-ink-faint'}`}>{tab.label}</span>
              </m.span>
            )}
          </Link>
        )
      })}
      <Link to={menu.to} state={menu.state ?? { back: true }} aria-label={menu.label} className="relative flex min-w-0 justify-center">
        <m.span whileTap={{ scale: 0.94 }} transition={PRESS} className="flex h-14 w-full flex-col items-center justify-center gap-0.5 px-1 text-ink-faint">
          <MenuIcon size={24} />
          <span className="text-[11px] font-semibold">{menu.text}</span>
        </m.span>
      </Link>
    </nav>
  )
}
