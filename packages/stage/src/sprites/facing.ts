// Facings in the field (CR4, CR10; Q6): front, back and right walk with the field set; standing shows the turnaround still
// for the facing. Left: a set's own `walk-left` and `run-left` when it has them (requested from uma-platform after the
// owner's 2026-11-08 feedback, D17), standing on the left turnaround still; until then the battle set's `walk`, `run`
// and `idle`, as format.md §7.2 has it. Nothing is mirrored (DN25).
import type { SpriteSet } from '@luismlorenzana/uma-data'

export type Facing = 'left' | 'right' | 'front' | 'back'

/** The facing a move gives, by its larger axis; stage up (−y) walks into the scene, away from the camera. */
export function facingOf(x: number, y: number, current: Facing): Facing {
  if (Math.hypot(x, y) < 0.05) return current
  if (Math.abs(x) >= Math.abs(y)) return x < 0 ? 'left' : 'right'
  return y < 0 ? 'back' : 'front'
}

/** What to play: an action looping, or a still frame of an action. */
export type FieldPose = { kind: 'play'; action: string } | { kind: 'still'; action: string; frame: number }

export function fieldPose(set: Pick<SpriteSet, 'actions'>, facing: Facing, moving: boolean, running: boolean): FieldPose {
  const fieldLeft = !!set.actions['walk-left']
  if (moving) {
    const base = running ? 'run' : 'walk'
    const name = facing === 'left' && !fieldLeft ? base : `${base}-${facing}`
    if (set.actions[name]) return { kind: 'play', action: name }
    if (facing === 'left' && set.actions[`walk-left`]) return { kind: 'play', action: 'walk-left' }
    if (set.actions[base]) return { kind: 'play', action: base }
  }
  if (facing === 'left' && !fieldLeft && set.actions.idle) return { kind: 'play', action: 'idle' }
  const turn = set.actions.turnaround
  const view = facing === 'left' ? 'left' : facing
  const frame = turn?.frames.findIndex((f) => f.view === view) ?? -1
  if (turn && frame >= 0) return { kind: 'still', action: 'turnaround', frame }
  return { kind: 'play', action: set.actions.idle ? 'idle' : Object.keys(set.actions)[0]! }
}

/** Whether blinks may show: the battle facing, on a locked frame (format.md §5). */
export const blinksShow = (facing: Facing, headLocked: boolean): boolean => facing === 'left' && headLocked
