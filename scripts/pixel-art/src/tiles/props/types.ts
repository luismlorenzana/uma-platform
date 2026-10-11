import type { Shadow, Sprite } from '../../sprite.ts'

/** One prop: an id within its page, its size (16×16, or 16×32 when tall) and the painter. */
export interface Prop {
  id: string
  w: number
  h: number
  shadow: Shadow
  paint: (s: Sprite) => void
}

/** The soft ground shadow under a prop whose foot is centred at (cx, cy). */
export const foot = (cx: number, cy: number, rx: number, ry = 1.8, alpha = 78): Shadow => ({ cx, cy, rx, ry, alpha })
