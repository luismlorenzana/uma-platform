// The top bar (uma-racer's `hub/AccountBar`, both games' since P48): the trainer's initial with a tier crest, then up to
// three currency chips in fixed slots (main currency · Speed Tickets · Uma Tickets with Shards toward the next), and a
// sync chip only when something isn't synced. Every chip is a 44 pt link to the place that sells or spends it. The game
// supplies the values, words and links; the kit draws them the same in both games. With `tierShifter` (0.12.0) the crest
// is a link of its own at the same spot (uma-rpg's Tier shifter); without it the bar is unchanged.
import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { AnimatedNumber } from '../ui/AnimatedNumber.js'
import { OfflineIcon, WarningIcon } from '../ui/icons/index.js'
import { UiMark } from '../ui/UiMark.js'

export interface CurrencyChip {
  readonly key: string
  /** The uma-art `ui` mark, such as `currency/uma-ticket`. */
  readonly mark: string
  /** Drawn when the pinned atlas lacks the mark. */
  readonly fallback?: ReactNode
  /** Null while the save loads: a blank bar instead of a number. */
  readonly value: number | null
  /** After the number, such as " · 3/5" for Shards. */
  readonly extra?: ReactNode
  readonly to: string
  /** The chip's accessible name, with its number. */
  readonly label: string
}

export type SyncState = 'synced' | 'offline' | 'paused' | 'waiting' | 'failing'

const SYNC_TONE: Readonly<Record<Exclude<SyncState, 'synced'>, string>> = {
  offline: 'text-ink-soft',
  paused: 'text-ink-soft',
  waiting: 'border-warning/40 bg-warning/15 text-warning',
  failing: 'border-danger/40 bg-danger/15 text-danger',
}

function Chip({ to, label, children, className = '' }: { to: string; label: string; children: ReactNode; className?: string }) {
  return (
    <Link to={to} state={{ back: true }} aria-label={label} className="flex min-h-11 min-w-11 shrink-0 items-center justify-center">
      <span aria-hidden className={`flex h-8 items-center gap-1 rounded-full border border-hairline bg-panel/90 px-2 text-[13px] text-ink shadow-1 ${className}`}>
        {children}
      </span>
    </Link>
  )
}

const blank = <span className="inline-block h-3 w-5 rounded-full bg-sunken" />

/** The crest's link (0.12.0): its hit box is the bar row's height and 44 pt wide, from the crest's left edge. */
export interface TierShifter {
  readonly to: string
  /** The link's accessible name, such as "Tier 1, switch tiers". */
  readonly label: string
  /** Navigation state; `{ back: true }` by default, so Back closes what it opens. */
  readonly state?: unknown
}

const crestMark = (tier: number) => `tier/${Math.min(3, Math.max(1, tier))}`

export function AccountBar({ initial, tier, tierShifter, account, chips, sync }: {
  /** The trainer's initial, or empty while loading. */
  initial: string
  /** The tier crest under the initial; none when undefined. */
  tier?: number
  /** Makes the crest a link of its own (drawn only with `tier`). The initial still opens `account`. */
  tierShifter?: TierShifter
  account: { readonly to: string; readonly label: string }
  chips: readonly CurrencyChip[]
  /** The sync chip: its words and link. None when synced. */
  sync?: { readonly state: SyncState; readonly text: string; readonly label: string; readonly to: string }
}) {
  const showSync = sync !== undefined && sync.state !== 'synced'
  const shifter = tier === undefined ? undefined : tierShifter
  const accountLink = (
    <Link to={account.to} state={{ back: true }} aria-label={account.label} className="flex min-h-11 min-w-11 shrink-0 items-center justify-center">
      <span aria-hidden className="font-display relative flex size-8 items-center justify-center rounded-full bg-accent text-[15px] font-bold text-accent-ink shadow-1">
        {initial}
        {tier !== undefined && shifter === undefined && (
          <span className="absolute -right-1.5 -bottom-1 drop-shadow-sm">
            <UiMark mark={crestMark(tier)} />
          </span>
        )}
      </span>
    </Link>
  )
  return (
    <header className="pt-safe relative z-20 border-b border-hairline bg-panel/95 backdrop-blur" data-kit="account-bar">
      <div className="flex items-center gap-0.5 px-1">
        {tier !== undefined && shifter !== undefined ? (
          // The account link is 44 pt square with the 32 pt disc centred. The 12 pt crest's box sits 6 pt past the disc's
          // right edge and 4 pt below it, so its left edge is at 32 pt and its foot 2 pt above the row's; it keeps the
          // disc's type, so the mark sits on the same baseline as before. The shifter starts at that left edge, is
          // positioned (so it paints and takes taps above the account link) and adds no width. The chips' row is
          // positioned after it, so a crowded row keeps every chip's full tap area.
          <div className="relative flex shrink-0">
            {accountLink}
            <Link to={shifter.to} state={shifter.state ?? { back: true }} aria-label={shifter.label} data-kit="tier-shifter" className="absolute inset-y-0 left-8 w-11">
              <span className="font-display absolute bottom-0.5 left-0 text-[15px] font-bold drop-shadow-sm">
                <UiMark mark={crestMark(tier)} />
              </span>
            </Link>
          </div>
        ) : accountLink}
        <div className={shifter !== undefined ? 'relative ml-auto flex min-w-0 items-center gap-0.5' : 'ml-auto flex min-w-0 items-center gap-0.5'}>
          {chips.map((chip) => (
            <Chip key={chip.key} to={chip.to} label={chip.label}>
              <UiMark mark={chip.mark} fallback={chip.fallback} />
              <span className="font-display font-semibold">
                {chip.value === null ? blank : <><AnimatedNumber value={chip.value} />{chip.extra}</>}
              </span>
            </Chip>
          ))}
          {showSync && (
            <Chip to={sync.to} label={sync.label} className={`font-semibold ${SYNC_TONE[sync.state as Exclude<SyncState, 'synced'>]}`}>
              {sync.state === 'offline' ? <OfflineIcon size={16} /> : sync.state === 'paused' ? null : <WarningIcon size={16} />}
              <span className="whitespace-nowrap text-[12px]">{sync.text}</span>
            </Chip>
          )}
        </div>
      </div>
    </header>
  )
}
