// The controls (DN26; Q4): a floating stick on the stage's left half, Interact and Dash on the right, and the keyboard on a
// desktop (SL17). Pure: a stick's vector from where the thumb landed and where it is, and the keys' vector.
import type { Point } from './turn.js'

/** Full speed at 40 pt from where the thumb landed (D10); nothing inside 6 pt. */
export const STICK_RADIUS = 40
export const STICK_DEAD = 6
/** Interact and Dash: 56 pt circles, above the 44 pt minimum (N3). */
export const BUTTON_SIZE = 56

export interface Move { x: number; y: number }
export const STILL: Move = { x: 0, y: 0 }

/** The stick's move: a direction scaled 0–1 from the dead zone to full reach. Stage y grows downward, so a thumb pushed
 * up gives a negative y (into the scene). */
export function stickMove(origin: Point, at: Point): Move {
  const dx = at.x - origin.x, dy = at.y - origin.y
  const d = Math.hypot(dx, dy)
  if (d <= STICK_DEAD) return STILL
  const strength = Math.min(1, (d - STICK_DEAD) / (STICK_RADIUS - STICK_DEAD))
  return { x: (dx / d) * strength, y: (dy / d) * strength }
}

/** Where the stick's knob draws: the thumb, kept within reach of the origin. */
export function stickKnob(origin: Point, at: Point): Point {
  const dx = at.x - origin.x, dy = at.y - origin.y
  const d = Math.hypot(dx, dy)
  return d <= STICK_RADIUS ? at : { x: origin.x + (dx / d) * STICK_RADIUS, y: origin.y + (dy / d) * STICK_RADIUS }
}

const UP = ['KeyW', 'ArrowUp'], DOWN = ['KeyS', 'ArrowDown'], LEFT = ['KeyA', 'ArrowLeft'], RIGHT = ['KeyD', 'ArrowRight']
export const DASH_KEYS = ['ShiftLeft', 'ShiftRight']
export const INTERACT_KEYS = ['Space', 'Enter']

/** The move the held keys make (`KeyboardEvent.code`), at full strength, diagonals not faster. */
export function keyMove(held: ReadonlySet<string>): Move {
  const any = (codes: string[]) => codes.some((c) => held.has(c))
  const x = (any(RIGHT) ? 1 : 0) - (any(LEFT) ? 1 : 0), y = (any(DOWN) ? 1 : 0) - (any(UP) ? 1 : 0)
  const d = Math.hypot(x, y)
  return d === 0 ? STILL : { x: x / d, y: y / d }
}

/** True when a touch at stage `x` is for the stick (the left half). */
export const isStickSide = (x: number, stageWidth: number): boolean => x < stageWidth / 2
