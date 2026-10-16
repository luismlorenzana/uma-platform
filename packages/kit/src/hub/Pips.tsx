// Slot pips (uma-racer's `hub/Pips.tsx`, from uma-rpg's D22; P48): up to eight 20 pt pips in rows of four under a
// building's name pill, display only (the place link is the target). Busy: her face in a ring filled by the current
// item's progress, with "+N" on its shoulder for jobs queued behind. Ready: the ring full and gold with a small bounce.
// Free: a small dark dot. A pip may carry its own tone (uma-racer's Gym rooms). Past the pips shown, "+N".
import type { ReactNode } from 'react'

export interface PipModel {
  readonly state: 'free' | 'busy' | 'ready'
  /** 0–1, for a busy pip. */
  readonly progress?: number
  /** Jobs queued behind this one. */
  readonly queued?: number
  /** Her face, 16 pt. */
  readonly face?: ReactNode
  /** The ring's and the free dot's colour, such as a room's. */
  readonly tone?: string
}

const BUSY_TONE = 'var(--color-ink-soft)'
const TRACK = 'var(--color-hairline-strong)'

function Pip({ pip }: { pip: PipModel }) {
  if (pip.state === 'free') {
    return (
      <span data-pip="free" className="flex size-5 items-center justify-center">
        <span className="block size-2 rounded-full border border-white/60 bg-black/30" style={pip.tone === undefined ? undefined : { borderColor: pip.tone }} />
      </span>
    )
  }
  const ready = pip.state === 'ready'
  const ring = ready ? 'var(--color-accent)' : `conic-gradient(${pip.tone ?? BUSY_TONE} ${Math.round((pip.progress ?? 0) * 360)}deg, ${TRACK} 0)`
  const queued = pip.queued ?? 0
  return (
    <span data-pip={pip.state} data-queued={queued || undefined} className={`relative block size-5 rounded-full p-[2px] ${ready ? 'kit-pip-ready' : ''}`} style={{ background: ring }}>
      <span className="block size-4 overflow-hidden rounded-full bg-panel">{pip.face}</span>
      {queued > 0 && (
        <span className="font-display absolute -top-1.5 -right-2 rounded-full bg-scrim px-1 text-[9px] leading-3 font-bold text-ink-on-dark">+{queued}</span>
      )}
    </span>
  )
}

export function Pips({ pips, more = 0 }: { pips: readonly PipModel[]; more?: number }) {
  // Four to a row, and no wider than the pips it holds.
  const columns = Math.min(4, pips.length + (more > 0 ? 1 : 0))
  return (
    <span aria-hidden data-pips className="grid gap-1" style={{ gridTemplateColumns: `repeat(${Math.max(1, columns)}, 1.25rem)` }}>
      {pips.map((pip, i) => <Pip key={i} pip={pip} />)}
      {more > 0 && (
        <span data-pip="more" className="font-display flex size-5 items-center justify-center rounded-full bg-sunken text-[9px] font-bold text-ink-soft">+{more}</span>
      )}
    </span>
  )
}
