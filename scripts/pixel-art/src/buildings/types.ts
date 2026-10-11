import type { Sprite } from '../sprite.ts'

export type Page = 'farmlands' | 'wilds' | 'learning' | 'town'

/** What a painter reports back: points the game may animate (chimney smoke). */
export interface PaintExtras {
  smoke?: { x: number; y: number }
}

/** One Hub place: its id, name and page in uma-rpg's Hub, where it sits on the page (fractions), and its painter. */
export interface Place {
  id: string
  /** The name uma-rpg shows under the sprite (used by the preview). */
  name: string
  page: Page
  at: { x: number; y: number }
  paint: (sprite: Sprite) => PaintExtras | void
}
