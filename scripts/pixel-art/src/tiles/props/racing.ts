// A01: original racecourse furniture; tall props stand in the bottom cell and rise one tile above it.
import { Mask } from '../../shape.ts'
import type { Sprite } from '../../sprite.ts'
import { add, box, stroke } from './kit.ts'
import { foot, type Prop } from './types.ts'

function rail(s: Sprite): void {
  const white = add(s, '#e9ebde', { lift: 0.3 })
  for (const y of [6, 10]) {
    stroke(s, 1, y, 14, y, white, 5)
    stroke(s, 1, y + 1, 14, y + 1, white, 3)
  }
  for (const x of [2, 12]) box(s, x, 4, x + 1, 13, 4, white)
}

function furlongPost(s: Sprite): void {
  const white = add(s, '#eeeedd', { lift: 0.3 })
  const green = add(s, '#2e715d')
  const gold = add(s, '#d5b04a')
  box(s, 7, 8, 8, 29, 8, white)
  box(s, 3, 3, 12, 11, 3, white)
  box(s, 4, 5, 11, 9, 5, green)
  // A gold distance marker, not tiny text that would turn to noise at native size.
  stroke(s, 7, 6, 7, 8, gold, 5)
  stroke(s, 9, 6, 9, 8, gold, 4)
  stroke(s, 6, 27, 9, 27, white, 5)
}

function pennant(s: Sprite): void {
  const pole = add(s, '#eee9d3', { lift: 0.3 })
  const green = add(s, '#2d765d', { lift: 0.3 })
  const gold = add(s, '#ddb547', { lift: 0.35 })
  box(s, 3, 3, 4, 29, 3, pole)
  const cloth = Mask.polygon([[5, 4], [14, 8], [5, 13]], 16, 32)
  cloth.each((x, y) => {
    s.paint(x, y, green, y < 8 ? 4 : 3)
    if (!cloth.get(x, y - 1) || !cloth.get(x, y + 1)) s.paint(x, y, gold, y < 8 ? 5 : 3)
  })
  s.paint(3, 2, gold, 5)
}

function flowerBox(s: Sprite): void {
  const white = add(s, '#e9e6d2', { lift: 0.3 })
  const green = add(s, '#398956')
  const yellow = add(s, '#e7c34d', { lift: 0.35 })
  const cream = add(s, '#f5efd8', { lift: 0.3 })
  const soil = add(s, '#74533c')
  box(s, 1, 8, 14, 13, 9, white)
  stroke(s, 2, 8, 13, 8, soil, 2)
  for (const x of [3, 6, 9, 12]) {
    stroke(s, x, 5, x, 8, green, 4)
    s.paint(x - 1, 7, green, 3)
    s.paint(x + 1, 6, green, 4)
    const bloom = x % 2 ? yellow : cream
    s.paint(x, 4, bloom, 5)
    s.paint(x - 1, 5, bloom, 4)
    s.paint(x + 1, 5, bloom, 3)
  }
}

export const RACING_PROPS: readonly Prop[] = [
  { id: 'rail', w: 16, h: 16, shadow: foot(8, 13.5, 7, 1.3, 60), paint: rail },
  { id: 'furlong-post', w: 16, h: 32, shadow: foot(8.5, 29.4, 3.5, 1.4), paint: furlongPost },
  { id: 'pennant', w: 16, h: 32, shadow: foot(5, 29.4, 3.5, 1.4), paint: pennant },
  { id: 'flower-box', w: 16, h: 16, shadow: foot(8, 13.6, 7, 1.3, 60), paint: flowerBox },
]
