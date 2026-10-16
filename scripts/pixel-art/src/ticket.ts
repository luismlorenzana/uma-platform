// A02: one original lightning-stub design, painted natively at 16px for the HUD and 32px for inventory.
import { Mask, shadeDome, type Point } from './shape.ts'
import type { Sprite } from './sprite.ts'
import { add } from './tiles/props/kit.ts'

export function speedTicket(s: Sprite): void {
  const scale = s.w / 16
  const teal = add(s, '#3c9b96', { lift: 0.34, drop: 0.25 })
  const edge = add(s, '#b1d8c5', { lift: 0.3 })
  const ink = add(s, '#ffe4a2', { lift: 0.3 })
  const points: Point[] = [[3, 3], [13, 3], [14, 4], [14, 12], [2, 12], [1, 11], [1, 4]]
    .map(([x, y]) => [x! * scale, y! * scale])
  const ticket = Mask.polygon(points, s.w, s.h)
    .subtract(Mask.circle(scale, 8 * scale, 1.6 * scale, s.w, s.h))
    .subtract(Mask.circle(14 * scale, 8 * scale, 1.6 * scale, s.w, s.h))
  shadeDome(s, ticket, teal, { contact: false, relief: 0.35 })
  ticket.each((x, y) => {
    if (!ticket.get(x, y - 1)) s.paint(x, y, edge, 4)
    if (x === Math.floor(11.5 * scale) && Math.floor(y / scale) % 2 && y > 4 * scale && y < 11 * scale) s.paint(x, y, teal, 1)
  })
  const bolt = Mask.polygon([[8, 4], [4, 8], [7, 8], [5, 11], [10, 6], [7, 6]].map(([x, y]): Point => [x! * scale, y! * scale]), s.w, s.h)
  bolt.each((x, y) => s.paint(x, y, ink, x < 7 * scale ? 5 : 4))
  // At item scale the paper has a fine inner border; it is not a scaled bitmap of the HUD mark.
  if (s.w === 32) for (let x = 6; x <= 23; x++) {
    s.paint(x, 8, teal, 4)
    s.paint(x, 21, teal, 2)
  }
}
