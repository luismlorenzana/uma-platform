// A02, Racer manual 11 §10.3: tiny account-bar marks and tier shields, distinct even without their palettes.
import { Mask, shadeDome } from '../shape.ts'
import type { Sprite } from '../sprite.ts'
import { speedTicket } from '../ticket.ts'
import { add } from '../tiles/props/kit.ts'
import type { Currency, Tier } from './spec.ts'

export function currencyMark(s: Sprite, key: Currency): Mask | undefined {
  s.shadow = { cx: 8, cy: 13.7, rx: 5.8, ry: 0.8, alpha: 40 }
  if (key === 'speed-ticket') { speedTicket(s); return }
  const gold = add(s, '#d9a63f', { lift: 0.35, drop: 0.25 })
  const dark = add(s, '#856030')
  if (key === 'prize-money') {
    const coin = Mask.circle(8, 7.5, 5.5, 16, 16)
    shadeDome(s, coin, gold, { contact: false, relief: 0.6 })
    coin.each((x, y) => {
      if (!coin.get(x, y - 1) || !coin.get(x - 1, y)) s.paint(x, y, gold, 5)
    })
    for (const [x, y] of [[5, 5], [5, 6], [5, 7], [5, 8], [6, 9], [7, 10], [8, 10], [9, 9], [10, 8], [10, 7], [10, 6], [10, 5]] as const) s.paint(x, y, dark, 2)
    s.paint(6, 5, gold, 5); s.paint(9, 5, gold, 4)
    return
  }
  // A vertical gold coupon, not the teal horizontal stub. The horseshoe is a physical hole through the paper.
  const ticket = Mask.polygon([[5, 2], [11, 2], [12, 3], [12, 12], [10, 14], [4, 14], [3, 13], [3, 4]], 16, 16)
  shadeDome(s, ticket, gold, { contact: false, relief: 0.4 })
  const cutout = Mask.from((x, y) => (x > 5 && x < 7 && y > 4 && y < 9) || (x > 8 && x < 10 && y > 4 && y < 9) || (x > 6 && x < 9 && y > 8 && y < 10), 16, 16)
  // A recessed lip around the punched shape. drawUi clears its centre after compositing, including shadow pixels.
  cutout.each((x, y) => {
    for (const [dx, dy] of [[0, -1], [-1, 0], [1, 0], [0, 1]] as const) s.paint(x + dx, y + dy, dark, 2)
  })
  return cutout
}

export function tierCrest(s: Sprite, key: Tier): void {
  const rim = add(s, { '1': '#b47b4d', '2': '#a9bbc9', '3': '#dcb34b' }[key], { lift: 0.34 })
  const field = add(s, '#3d6467')
  const pip = add(s, '#f5e7b8', { lift: 0.3 })
  s.shadow = { cx: 6, cy: 10.7, rx: 3.8, ry: 0.6, alpha: 40 }
  const shield = Mask.polygon([[2, 1], [10, 1], [10, 7], [6, 11], [2, 7]], 12, 12)
  shadeDome(s, shield, rim, { contact: false, relief: 0.4 })
  const inner = Mask.polygon([[3, 3], [9, 3], [9, 7], [6, 10], [3, 7]], 12, 12)
  inner.each((x, y) => s.paint(x, y, field, x === 3 ? 3 : 2))
  // Keep empty dark pixels between pips at native size, clear of the bright upper rim.
  const dots = { '1': [[5, 5], [6, 5], [5, 6], [6, 6]],
    '2': [[4, 5], [4, 6], [7, 5], [7, 6]],
    '3': [[4, 4], [4, 5], [7, 4], [7, 5], [5, 7], [6, 7]] }[key]
  for (const [x, y] of dots) s.paint(x!, y!, pip, 5)
}
