import type { Sprite } from '../sprite.ts'

/** One item icon: catalog identity (uma-rpg docs/design/items.md) plus the painter that draws it on a 32×32 sprite. */
export interface ItemIcon {
  id: string
  name: string
  grade: number
  paint: (sprite: Sprite) => void
}
