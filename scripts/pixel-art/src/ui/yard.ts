// Racer A05: original native marks for the Card Ticket and Training Yard pieces.
import { Mask, shadeDome } from '../shape.ts'
import type { Sprite } from '../sprite.ts'
import { add, stroke } from '../tiles/props/kit.ts'
import type { YardMark } from './spec.ts'

/** Fanned portrait cards, violet with a pale star, beside the older gold punched coupon. */
export function cardTicket(s: Sprite): void {
  const back = add(s, '#7765bc', { lift: .32, drop: .24 })
  const paper = add(s, '#d4bbf0', { lift: .22, drop: .3 })
  const face = add(s, '#7651b0', { lift: .28 })
  const ink = add(s, '#fff4d3', { lift: .12 })
  s.shadow = { cx: 8, cy: 13.6, rx: 5.5, ry: .7, alpha: 40 }
  shadeDome(s, Mask.polygon([[7, 2], [13, 4], [11, 11], [5, 9]], 16, 16), back, { contact: false, relief: .3 })
  shadeDome(s, Mask.polygon([[3, 4], [10, 4], [10, 13], [3, 13]], 16, 16), paper, { contact: false, relief: .25 })
  Mask.polygon([[4, 5], [9, 5], [9, 11], [4, 11]], 16, 16).each((x, y) => s.paint(x, y, face, x < 6 ? 4 : 3))
  // A native five-point star; the lower paper edge remains clear as the card's border.
  for (const [x, y] of [[6, 6], [5, 7], [6, 7], [7, 7], [8, 7], [6, 8], [7, 8], [5, 9], [7, 9]] as const) s.paint(x, y, ink, 5)
  stroke(s, 4, 12, 8, 12, paper, 5)
}

export function yardMark(s: Sprite, key: YardMark): void {
  if (key === 'fatigue') {
    const water = add(s, '#74c8ef', { lift: .3, drop: .26 })
    const white = add(s, '#f1fcff', { lift: .08 })
    // Lean toward the pointed upper-right tip: the broad, rounded foot reads as sweat at 2×.
    const drop = Mask.polygon([[16, 3], [16, 8], [18, 13], [18, 16], [16, 19], [13, 20],
      [10, 20], [7, 18], [6, 15], [7, 12], [10, 9], [13, 7]], 24, 24)
    shadeDome(s, drop, water, { contact: false, relief: .65 })
    stroke(s, 10, 11, 8, 14, white, 5)
    s.paint(8, 15, white, 5); s.paint(9, 12, white, 5)
    return
  }
  const cloth = add(s, '#e5f0f5', { lift: .16, drop: .25 })
  const stripe = add(s, '#5c9dcc', { lift: .25, drop: .25 })
  s.shadow = { cx: 12, cy: 20, rx: 8.5, ry: 1, alpha: 40 }
  const body = Mask.polygon([[4, 8], [16, 5], [20, 8], [20, 16], [18, 18], [8, 20], [4, 17]], 24, 24)
  shadeDome(s, body, cloth, { contact: false, relief: .3 })
  const top = Mask.polygon([[4, 8], [16, 5], [20, 8], [8, 11]], 24, 24)
  top.each((x, y) => s.paint(x, y, cloth, x + y < 18 ? 5 : 4))
  // Two woven stripes follow the top plane then turn down the near edge.
  for (const x of [8, 11]) {
    stroke(s, x, 7, x + 4, 10, stripe, 4)
    stroke(s, x + 4, 10, x + 4, 17, stripe, 3)
  }
  // Two soft folded layers, with pale lips above blue-grey seams; no hard book spine.
  stroke(s, 5, 12, 8, 15, cloth, 2); stroke(s, 8, 15, 18, 12, cloth, 2)
  stroke(s, 5, 15, 8, 18, cloth, 2); stroke(s, 8, 18, 18, 15, cloth, 2)
  stroke(s, 8, 14, 18, 11, cloth, 5)
  stroke(s, 9, 17, 18, 14, cloth, 4)
}
