// The menu's body, "Every place" (uma-racer's menu sheet, both games' since P48): each Hub page's places in a 2-column
// grid with their counters (hidden at 0) and locks, in bar order, then the game's extra rows (Account, a roster view).
// The game puts it in its own sheet, so its global-sheet registry stays its own.
import { Link, useLocation } from 'react-router'
import { LockedIcon } from '../ui/icons/index.js'
import { navState } from './nav.js'

export interface MenuPlace {
  readonly key: string
  readonly name: string
  readonly to: string
  /** Hidden at 0 or null. */
  readonly count?: number | null
  readonly locked?: boolean
}
export interface MenuGroup {
  readonly key: string
  readonly label: string
  readonly places: readonly MenuPlace[]
}

function Row({ place }: { place: MenuPlace }) {
  const location = useLocation()
  const count = place.count ?? 0
  return (
    <li>
      <Link
        to={place.to}
        replace
        state={{ back: navState(location).back }}
        aria-label={place.locked ? `${place.name}, not open yet` : undefined}
        className="flex min-h-11 w-full items-center justify-between gap-2 rounded-sm bg-sunken/60 px-3 text-left text-[13px] font-semibold"
      >
        <span className={`truncate ${place.locked ? 'text-ink-faint' : ''}`}>{place.name}</span>
        {place.locked ? <LockedIcon size={16} className="text-locked" /> : count > 0 && (
          <span className="font-display min-w-5 rounded-full bg-accent px-1.5 text-center text-[11px] leading-5 text-accent-ink">{count}</span>
        )}
      </Link>
    </li>
  )
}

export function PlaceMenu({ groups, extra = [] }: { groups: readonly MenuGroup[]; extra?: readonly MenuPlace[] }) {
  return (
    <div className="space-y-4" data-kit="place-menu">
      {groups.map((group) => (
        <section key={group.key} aria-label={group.label}>
          <h3 className="text-micro mb-1.5">{group.label}</h3>
          <ul className="grid grid-cols-2 gap-1.5">
            {group.places.map((place) => <Row key={place.key} place={place} />)}
          </ul>
        </section>
      ))}
      {extra.length > 0 && (
        <ul className="grid grid-cols-2 gap-1.5 border-t border-hairline pt-3">
          {extra.map((place) => <Row key={place.key} place={place} />)}
        </ul>
      )}
    </div>
  )
}
