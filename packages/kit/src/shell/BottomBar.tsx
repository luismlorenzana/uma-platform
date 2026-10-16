// The bottom bar (uma-racer's `hub/BottomBar`, both games' since P48): five slots in one order, Home · Grow · [Play] ·
// Work · Menu, the Play tab raised as a gold disc. The active tab shows by shape (a two-tone icon and a chamfered
// underline) as well as colour; badges are counts, hidden at 0. The floating panel lifts above the home indicator by
// `max(inset − 12px, 8px)` (Phase 0), not the full inset plus a margin.
import { m } from 'motion/react'
import { Link } from 'react-router'
import { MenuIcon, type IconComponent } from '../ui/icons'

export interface BarTab {
  readonly key: string
  readonly to: string
  readonly label: string
  readonly Icon: IconComponent
  readonly active: boolean
  /** The raised centre disc. */
  readonly raised?: boolean
  /** Hidden at 0. */
  readonly badge?: number
  /** The accessible name when a badge shows, such as "Farm, 3 ready". */
  readonly badgeLabel?: string
}

const PRESS = { duration: 0.12, ease: [0.2, 0, 0, 1] as const }

export function BottomBar({ tabs, menu, label }: {
  tabs: readonly BarTab[]
  menu: { readonly to: string; readonly label: string; readonly text: string; readonly state?: unknown }
  /** The bar's accessible name. */
  label: string
}) {
  return (
    <nav aria-label={label} className="relative z-20 shrink-0 px-3" data-kit="bottom-bar">
      <div className="mb-bar-safe flex items-end justify-between rounded-lg border border-hairline bg-panel/90 px-1 pt-1.5 pb-1 shadow-2 backdrop-blur-xl">
        {tabs.map((tab) => {
          const count = tab.badge ?? 0
          return (
            <Link
              key={tab.key}
              to={tab.to}
              aria-label={count > 0 && tab.badgeLabel ? tab.badgeLabel : tab.label}
              aria-current={tab.active ? 'page' : undefined}
              className={`flex min-w-0 flex-1 justify-center ${tab.raised ? '-mt-6' : ''}`}
            >
              {tab.raised ? (
                <m.span
                  whileTap={{ scale: 0.94 }}
                  transition={PRESS}
                  className={`flex size-14 flex-col items-center justify-center rounded-full border bg-accent text-accent-ink shadow-2 ${
                    tab.active ? 'border-accent-ink/60 ring-2 ring-accent-ink/25' : 'border-accent-strong/30'
                  }`}
                >
                  {/* On the gold disc the icon's tone is the panel colour, so its marks still read. */}
                  <tab.Icon size={24} variant="duotone" accent="var(--color-panel)" />
                  <span className="font-display -mt-0.5 text-[10px] font-semibold">{tab.label}</span>
                </m.span>
              ) : (
                <m.span whileTap={{ scale: 0.94 }} transition={PRESS} className="relative flex min-h-11 min-w-14 flex-col items-center justify-center gap-0.5 px-1 py-1">
                  <tab.Icon size={24} variant={tab.active ? 'duotone' : 'line'} className={tab.active ? 'text-ink' : 'text-ink-faint'} />
                  <span className={`text-[11px] font-semibold whitespace-nowrap ${tab.active ? 'text-ink' : 'text-ink-faint'}`}>{tab.label}</span>
                  {tab.active && <span aria-hidden className="chamfer-tr absolute -bottom-0.5 h-0.5 w-7 bg-accent" />}
                  {count > 0 && (
                    <span aria-hidden className="absolute top-0 right-1 min-w-4 rounded-full bg-success px-1 text-center text-[10px] leading-4 font-bold text-ink-on-dark">
                      {count}
                    </span>
                  )}
                </m.span>
              )}
            </Link>
          )
        })}
        <Link
          to={menu.to}
          state={menu.state ?? { back: true }}
          aria-label={menu.label}
          className="flex min-h-11 min-w-12 flex-col items-center justify-center gap-0.5 px-1 py-1 text-ink-faint"
        >
          <MenuIcon size={24} />
          <span className="text-[11px] font-semibold">{menu.text}</span>
        </Link>
      </div>
    </nav>
  )
}
