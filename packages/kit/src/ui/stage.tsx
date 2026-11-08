// The stage (0.18.0, KL1): uma-kit inside a game's own stage. A game that draws on a fixed box (uma-quest's landscape
// stage, turned 90° on an upright phone) puts a `KitStage` inside that box. It fills the box, is a size container (so
// sheets size by the stage, `cqh`, not the viewport, `dvh`), holds the layer sheets portal into (so they turn with the
// stage instead of drawing outside it), and tells every kit piece the stage's layout and turn: landscape frames and
// sheets, and drags mapped through the turn. Its layout containment also makes it the containing block of `fixed`
// overlays, so `fixed inset-0` covers the stage. Safe areas come from the game's `--inset-*` variables on its box (see
// theme.css). Without a `KitStage` nothing changes: portrait games draw exactly what they drew before.
import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'

/** The stage's clockwise turn in the viewport, in degrees (uma-quest: 90 on an upright phone, 0 when iOS turned the page). */
export const STAGE_TURNS = [0, 90, 180, 270] as const
export type StageTurn = (typeof STAGE_TURNS)[number]
export type StageLayout = 'portrait' | 'landscape'

export interface KitStageValue {
  readonly layout: StageLayout
  readonly turn: StageTurn
  /** The element sheets portal into; null until it mounts. */
  readonly layer: HTMLElement | null
}

const StageContext = createContext<KitStageValue | null>(null)

/** The stage this piece is drawn on, or null outside one (every portrait game). */
export function useKitStage(): KitStageValue | null {
  return useContext(StageContext)
}

/** `-0 + 0` is `0`: a turned zero stays a plain zero. */
const plain = (value: number) => value + 0

/**
 * A pointer movement in the viewport as a movement on a stage turned `turn` degrees clockwise. uma-quest's upright
 * phone (90°) maps viewport (x, y) to stage (y, width − x), so a movement (dx, dy) is (dy, −dx) on the stage.
 */
export function toStageDelta(turn: StageTurn, dx: number, dy: number): { x: number; y: number } {
  switch (turn) {
    case 90: return { x: plain(dy), y: plain(-dx) }
    case 180: return { x: plain(-dx), y: plain(-dy) }
    case 270: return { x: plain(-dy), y: plain(dx) }
    default: return { x: plain(dx), y: plain(dy) }
  }
}

export function KitStage({ layout = 'landscape', turn = 0, children }: {
  /** `landscape` (the default) draws frames as side rails and sheets from the right edge. */
  layout?: StageLayout
  /** How far the game turned its stage, clockwise. */
  turn?: StageTurn
  children: ReactNode
}) {
  const [layer, setLayer] = useState<HTMLElement | null>(null)
  const value = useMemo<KitStageValue>(() => ({ layout, turn, layer }), [layout, turn, layer])
  return (
    <div data-kit="stage" data-layout={layout} style={{ position: 'absolute', inset: 0, containerType: 'size' }}>
      <StageContext.Provider value={value}>{children}</StageContext.Provider>
      <div ref={setLayer} data-kit="stage-layer" />
    </div>
  )
}
