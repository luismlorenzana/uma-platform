// Slot pips (uma-racer's `hub/Pips.tsx`, from uma-rpg's D22; P48): up to eight 20 pt pips in rows of four under a
// building's name pill, display only (the place link is the target). Busy: her face in a ring filled by the current
// item's progress, with "+N" on its shoulder for jobs queued behind. Ready: the ring full and gold with a small bounce.
// Free: a small dark dot. A pip may carry its own tone (uma-racer's Gym rooms). Past the pips shown, "+N". Since 0.15.0
// a place may hang them over its building's top instead, 28 pt in a half arch, each with a short tag on her lower left.
import type { ReactNode } from 'react'

export interface PipModel {
  readonly state: 'free' | 'busy' | 'ready'
  /** 0–1, for a busy pip. */
  readonly progress?: number
  /** Jobs queued behind this one. */
  readonly queued?: number
  /** Her face, 16 pt (24 pt in an arch). */
  readonly face?: ReactNode
  /** The ring's and the free dot's colour, such as a room's. */
  readonly tone?: string
  /** A short tag on her lower left, such as her level (0.15.0). */
  readonly badge?: string
}

const BUSY_TONE = 'var(--color-ink-soft)'
const TRACK = 'var(--color-hairline-strong)'
/** An arch pip's size in CSS px. */
export const ARCH_PIP = 28

function Pip({ pip, large = false }: { pip: PipModel; large?: boolean }) {
  const box = large ? 'size-7' : 'size-5'
  if (pip.state === 'free') {
    return (
      <span data-pip="free" className={`flex ${box} items-center justify-center`}>
        <span className={`block ${large ? 'size-2.5' : 'size-2'} rounded-full border border-white/60 bg-black/30`} style={pip.tone === undefined ? undefined : { borderColor: pip.tone }} />
      </span>
    )
  }
  const ready = pip.state === 'ready'
  const ring = ready ? 'var(--color-accent)' : `conic-gradient(${pip.tone ?? BUSY_TONE} ${Math.round((pip.progress ?? 0) * 360)}deg, ${TRACK} 0)`
  const queued = pip.queued ?? 0
  return (
    <span data-pip={pip.state} data-queued={queued || undefined} className={`relative block ${box} rounded-full p-[2px] ${large ? 'shadow-2' : ''} ${ready ? 'kit-pip-ready' : ''}`} style={{ background: ring }}>
      <span className={`block ${large ? 'size-6' : 'size-4'} overflow-hidden rounded-full bg-panel`}>{pip.face}</span>
      {queued > 0 && (
        <span className="font-display absolute -top-1.5 -right-2 rounded-full bg-scrim px-1 text-[9px] leading-3 font-bold text-ink-on-dark">+{queued}</span>
      )}
      {pip.badge !== undefined && (
        <span data-pip-badge className="font-display absolute -bottom-1 -left-1.5 rounded-full bg-scrim px-1 text-[9px] leading-3 font-bold text-ink-on-dark tabular-nums">{pip.badge}</span>
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

/**
 * Where `n` arch pips' centres sit over a building `w` × `h` CSS px (its sprite down to the ground line), left to right:
 * evenly round the top half of an ellipse a little wider than the building, so four ring its roof, their tops just above
 * it.
 */
export function archSpots(n: number, w: number, h: number): { x: number; y: number }[] {
  const cx = w / 2
  const cy = h * 0.55
  const rx = w * 0.62
  const ry = h * 0.45
  return Array.from({ length: n }, (_, i) => {
    const angle = Math.PI - ((i + 0.5) * Math.PI) / n
    return { x: Math.round(cx + rx * Math.cos(angle)), y: Math.round(cy - ry * Math.sin(angle)) }
  })
}

/** The pips over a building's top in a half arch (0.15.0): best with four, "+N" taking the last spot. */
export function ArchPips({ pips, more = 0, w, h }: { pips: readonly PipModel[]; more?: number; w: number; h: number }) {
  const spots = archSpots(pips.length + (more > 0 ? 1 : 0), w, h)
  // Placed by left and top, so a ready pip's bounce (a transform) doesn't move it.
  const at = (i: number) => ({ left: spots[i]!.x - ARCH_PIP / 2, top: spots[i]!.y - ARCH_PIP / 2 })
  return (
    <span aria-hidden data-pips="arch" className="absolute inset-0">
      {pips.map((pip, i) => (
        <span key={i} className="absolute" style={at(i)}><Pip pip={pip} large /></span>
      ))}
      {more > 0 && (
        <span data-pip="more" className="font-display absolute flex size-7 items-center justify-center rounded-full bg-sunken text-[10px] font-bold text-ink-soft" style={at(pips.length)}>+{more}</span>
      )}
    </span>
  )
}
