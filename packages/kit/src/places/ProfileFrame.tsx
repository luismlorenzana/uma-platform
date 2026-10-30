// An Uma's profile frame, one for both games (uma-platform SD2): a header (portrait, name, title, level label, chips,
// and a corner for the game's toggle) over a tab bar and the active tab's body. The game passes the portrait (SB3's
// `UmaBust` once it lands), its level label (SB2's `formatLevel`), its tabs and each tab's body. H118 adds an opt-in
// 64px compact header and progress line; omitting both keeps the regular header's markup unchanged.
import type { ReactNode } from 'react'
import { LockedIcon } from '../ui/icons/index.js'

export interface ProfileTab<K extends string = string> {
  readonly key: K
  readonly label: string
  /** A small green "ready" dot after the label, e.g. something on this tab can be done now. */
  readonly dot?: boolean
  /** The tab's accessible name while the dot shows, e.g. "Skills, can upgrade". */
  readonly dotLabel?: string
}

export interface ProfileFrameProps<K extends string = string> {
  readonly portrait: ReactNode
  readonly name: string
  readonly title?: string | null
  /** "Lv 7", or "T2 · Lv 7". */
  readonly level?: ReactNode
  /** Compact uses a 64px portrait and three small text rows; regular retains the original header. */
  readonly size?: 'regular' | 'compact'
  /** Inline with the compact level, or below the regular level. The game supplies its own units and label. */
  readonly progress?: { readonly value: number; readonly max: number; readonly label: string }
  /** Rarity, class, tier: small chips under the name, or beside the title in compact. */
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
  portrait, name, title, level, size = 'regular', progress, chips, corner, summary, locked = false, lockedLabel = 'Locked', tabs = [], tab, onTab, tabsLabel = 'Profile', children,
}: ProfileFrameProps<K>) {
  return (
    <div className="space-y-3 px-4 pt-3 pb-24" data-kit="profile">
      {size === 'compact' ? (
        <section className="flex h-16 items-start gap-3" data-kit="profile-header">
          <div className={`relative size-16 shrink-0 overflow-hidden rounded-md bg-sunken ${locked ? 'opacity-70 saturate-50' : ''}`}>
            {portrait}
            {locked && <span role="img" aria-label={lockedLabel} className="absolute top-1 left-1 flex rounded-full bg-scrim/60 p-0.5 text-ink-on-dark"><LockedIcon size={14} /></span>}
          </div>
          <div className="flex h-16 min-w-0 flex-1 flex-col justify-between">
            {/* Two 18px name lines, a 14px title and a 14px level fit the 64px block without clipping a long name. */}
            <h2 className="break-words text-[17px] leading-[18px] font-bold">{name}</h2>
            {(title || chips) && <div className="flex min-w-0 items-center gap-1 text-[12.5px] leading-[14px]">
              {title && <p className="min-w-0 truncate text-[12.5px] leading-[14px] text-ink-soft">{title}</p>}
              {chips && <div className="shrink-0">{chips}</div>}
            </div>}
            {(level !== undefined || progress) && <div className="flex min-w-0 items-center gap-2 leading-none" data-kit="profile-level">
              {level !== undefined && <span className="shrink-0 font-display text-[14px] font-bold">{level}</span>}
              {progress && <ProfileProgress {...progress} />}
            </div>}
          </div>
          {corner && <div className="shrink-0">{corner}</div>}
        </section>
      ) : <section className="flex items-end gap-3">
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
          {progress && <div className="mt-1 flex min-w-0 items-center gap-2"><ProfileProgress {...progress} /></div>}
        </div>
      </section>}
      {summary}
      {tabs.length > 0 && tab !== undefined && (
        <div className="sticky top-0 z-10 -mx-4 bg-page/95 px-4 py-1.5 backdrop-blur">
          <div role="tablist" aria-label={tabsLabel} className="flex gap-1 rounded-sm bg-sunken p-1">
            {tabs.map((t) => (
              <button key={t.key} type="button" role="tab" aria-selected={t.key === tab} onClick={() => onTab?.(t.key)}
                aria-label={t.dot ? (t.dotLabel ?? t.label) : undefined}
                className={`flex min-h-11 min-w-0 flex-1 items-center justify-center gap-1 rounded-xs px-1 text-[12.5px] font-semibold transition-colors ${t.key === tab ? 'bg-panel text-ink shadow-1' : 'text-ink-soft'}`}>
                <span className="min-w-0 truncate">{t.label}</span>
                {t.dot && <span aria-hidden="true" data-dot="" className="size-1.5 shrink-0 rounded-full bg-success" />}
              </button>
            ))}
          </div>
        </div>
      )}
      {children}
    </div>
  )
}

function ProfileProgress({ value, max, label }: NonNullable<ProfileFrameProps['progress']>) {
  const fraction = max > 0 ? Math.max(0, Math.min(1, value / max)) : value >= max ? 1 : 0
  return <>
    <span role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={max} aria-valuenow={value} aria-valuetext={label}
      className="h-1 min-w-0 flex-1 overflow-hidden rounded-full bg-sunken">
      <span className="block h-full rounded-full bg-info" style={{ width: `${fraction * 100}%` }} />
    </span>
    <span className="shrink-0 whitespace-nowrap text-[11px] leading-none font-semibold text-ink-faint tabular-nums">{label}</span>
  </>
}
