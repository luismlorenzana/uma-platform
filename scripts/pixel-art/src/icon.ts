// Draws one item icon with the rules every icon shares: a soft drop shadow, the item, then glints on legendary grades.
import type { ItemIcon } from './items/types.ts'
import { Sprite } from './sprite.ts'

export const ICON_SIZE = 32

/** Where legendary glints go. Keep these pixels clear when painting a grade 9–10 item. */
export const GLINTS: readonly (readonly [number, number, number])[] = [[5, 7, 2], [27, 11, 1], [6, 22, 1]]

export function drawIcon(item: ItemIcon): Uint8Array {
  const s = new Sprite(ICON_SIZE, ICON_SIZE)
  s.shadow = { cx: 16, cy: 28, rx: 9.5, ry: 2.2, alpha: 80 }
  item.paint(s)
  if (item.grade >= 9) for (const [x, y, size] of GLINTS) s.sparkle(x, y, size)
  return s.render()
}
