import type { Sprite } from '../sprite.ts'

export type Page = 'farmlands' | 'wilds' | 'learning' | 'town' | 'racing'

/** What a painter reports back: points the game may animate (chimney smoke). */
export interface PaintExtras {
  smoke?: { x: number; y: number }
}

/** One shared Hub place, a preview position (fractions), and its painter. Game layouts stay game-owned. */
export interface Place {
  id: string
  /** Display name used by the preview. */
  name: string
  page: Page
  at: { x: number; y: number }
  paint: (sprite: Sprite) => PaintExtras | void
}
