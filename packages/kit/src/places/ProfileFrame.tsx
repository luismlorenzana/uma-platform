// An Uma's profile frame, one for both games (uma-platform SD2): a header (portrait, name, title, level label, chips,
// and a corner for the game's toggle) over a tab bar and the active tab's body. The game passes the portrait (SB3's
// `UmaBust` once it lands), its level label (SB2's `formatLevel`), its tabs and each tab's body.
import type { ReactNode } from 'react'
import { LockedIcon } from '../ui/icons/index.js'

export interface ProfileTab<K extends string = string> {
  readonly key: K
  readonly label: string
}

export interface ProfileFrameProps<K extends string = string> {
  readonly portrait: ReactNode
  readonly name: string
  readonly title?: string | null
  /** "Lv 7", or "T2 · Lv 7". */
  readonly level?: ReactNode
  /** Rarity, class, tier: small chips under the name. */
  readonly chips?: ReactNode
  /** Top right of the header: a target toggle. */
  readonly corner?: ReactNode
  /** Below the header, before the tabs: bars, what she's doing, Unlock. */
  readonly summary?: ReactNode
  /** A locked Uma: the portrait dims and shows the lock. */
  readonly locked?: boolean
  readonly lockedLabel?: string
  readonly tabs?: readonly ProfileTab<K>[]
  readonly tab?: K
  readonly onTab?: (key: K) => void
  readonly tabsLabel?: string
  /** The active tab's body. */
  readonly children?: ReactNode
}

export function ProfileFrame<K extends string>({
  portrait, name, title, level, chips, corner, summary, locked = false, lockedLabel = 'Locked', tabs = [], tab, onTab, tabsLabel = 'Profile', children,
}: ProfileFrameProps<K>) {
  return (
    <div className="space-y-3 px-4 pt-3 pb-24" data-kit="profile">
      <section className="flex items-end gap-3">
        <div className={`relative size-28 shrink-0 overflow-hidden rounded-md bg-sunken ${locked ? 'opacity-70 saturate-50' : ''}`}>
          {portrait}
          {locked && (
            <span className="absolute top-1.5 left-1.5 flex items-center gap-1 rounded-full bg-scrim/60 px-1.5 py-0.5 text-[11px] text-ink-on-dark">
              <LockedIcon size={16} /> {lockedLabel}
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">{chips}</div>
            {corner}
          </div>
          <h2 className="text-xl leading-tight">{name}</h2>
          {title && <p className="truncate text-[13px] text-ink-soft">{title}</p>}
          {level !== undefined && <p className="font-display mt-1 text-[22px] leading-none font-extrabold">{level}</p>}
        </div>
      </section>
      {summary}
      {tabs.length > 0 && tab !== undefined && (
        <div className="sticky top-0 z-10 -mx-4 bg-page/95 px-4 py-1.5 backdrop-blur">
          <div role="tablist" aria-label={tabsLabel} className="flex gap-1 rounded-sm bg-sunken p-1">
            {tabs.map((t) => (
              <button key={t.key} type="button" role="tab" aria-selected={t.key === tab} onClick={() => onTab?.(t.key)}
                className={`min-h-11 min-w-0 flex-1 truncate rounded-xs px-1 text-[12.5px] font-semibold transition-colors ${t.key === tab ? 'bg-panel text-ink shadow-1' : 'text-ink-soft'}`}>
                {t.label}
              </button>
            ))}
          </div>
        </div>
      )}
      {children}
    </div>
  )
}
