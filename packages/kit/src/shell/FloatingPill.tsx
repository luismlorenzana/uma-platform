// The floating pill in the right thumb zone above the bar (uma-racer's, both games' since P48): Collect all · N ready,
// or a game's quieter action. Gold when it collects. A link (`to`) or a button (`onClick`).
import { Link } from 'react-router'

const PILL = 'font-display absolute right-4 bottom-3 z-20 flex min-h-11 items-center rounded-full px-4 text-[14px] font-bold shadow-3'

export function FloatingPill({ to, onClick, text, state, emphasis = true, label }: {
  to?: string
  onClick?: () => void
  text: string
  state?: unknown
  emphasis?: boolean
  label?: string
}) {
  const face = `${PILL} ${emphasis ? 'bg-accent text-accent-ink' : 'border border-hairline-strong bg-panel text-ink'}`
  if (to === undefined) {
    return <button type="button" onClick={onClick} aria-label={label} data-kit="pill" className={face}>{text}</button>
  }
  return <Link to={to} state={state ?? { back: true }} aria-label={label} data-kit="pill" className={face}>{text}</Link>
}
