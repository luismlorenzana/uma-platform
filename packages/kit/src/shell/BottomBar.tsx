// The bottom bar (uma-racer's `hub/BottomBar`, both games' since P48): five equal slots in one order, Home · Grow · [Play]
// · Work · Menu. Since 0.2.0 it is a game's bar, docked full width to the bottom edge: its panel runs under the home
// indicator, so nothing shows below it, and the Play tab is a gold disc rising out of the bar's top edge in a notch of the
// bar's colour. The active tab shows by shape (a marker on the bar's top edge and a two-tone icon) as well as colour;
// badges are counts, hidden at 0.
import { m } from 'motion/react'
import { Link } from 'react-router'
import { MenuIcon, type IconComponent } from '../ui/icons/index.js'

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

/** The marker on the bar's top edge over the active tab. */
function ActiveMark() {
  return <span aria-hidden className="absolute top-0 left-1/2 h-[3px] w-8 -translate-x-1/2 rounded-b-full bg-accent" />
}

export function BottomBar({ tabs, menu, label }: {
  tabs: readonly BarTab[]
  menu: { readonly to: string; readonly label: string; readonly text: string; readonly state?: unknown }
  /** The bar's accessible name. */
  label: string
}) {
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
              // The disc rises out of the bar: a ring of the bar's colour cuts it a notch in the top edge.
              <m.span
                whileTap={{ scale: 0.94 }}
                transition={PRESS}
                className={`-mt-5 flex size-[62px] flex-col items-center justify-center rounded-full bg-accent text-accent-ink shadow-2 ring-4 ring-panel ${
                  tab.active ? 'outline-2 outline-offset-[3px] outline-accent' : ''
                }`}
              >
                {/* On the gold disc the icon's tone is the panel colour, so its marks still read. */}
                <tab.Icon size={24} variant="duotone" accent="var(--color-panel)" />
                <span className="font-display -mt-0.5 text-[10px] font-bold">{tab.label}</span>
              </m.span>
            ) : (
              <m.span whileTap={{ scale: 0.94 }} transition={PRESS} className="flex h-14 w-full flex-col items-center justify-center gap-0.5 px-1">
                {tab.active && <ActiveMark />}
                <span className="relative">
                  <tab.Icon size={24} variant={tab.active ? 'duotone' : 'line'} className={tab.active ? 'text-ink' : 'text-ink-faint'} />
                  {count > 0 && (
                    <span aria-hidden className="absolute -top-1.5 -right-3 min-w-4 rounded-full bg-success px-1 text-center text-[10px] leading-4 font-bold text-ink-on-dark ring-2 ring-panel">
                      {count}
                    </span>
                  )}
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
