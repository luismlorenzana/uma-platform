// Page swipes on the Hub map (uma-rpg's `hub/swipe.ts`; P48): a mostly horizontal drag of more than 60 px changes page,
// in the bottom bar's order, without wrapping.

export interface Point {
  readonly x: number
  readonly y: number
}

export const SWIPE_MIN_PX = 60

/** -1 = previous page (finger moved right), 1 = next page (moved left), 0 = not a swipe. */
export function swipeDirection(start: Point, end: Point): -1 | 0 | 1 {
  const dx = end.x - start.x
  const dy = end.y - start.y
  if (!Number.isFinite(dx) || !Number.isFinite(dy)) return 0
  if (Math.abs(dx) <= SWIPE_MIN_PX || Math.abs(dx) < Math.abs(dy) * 1.5) return 0
  return dx < 0 ? 1 : -1
}

/** The neighbouring page in `pages` (the bar's order), or null at either end. */
export function neighbourPage<T extends string>(pages: readonly T[], page: T, direction: -1 | 1): T | null {
  const i = pages.indexOf(page)
  return i < 0 ? null : pages[i + direction] ?? null
}
