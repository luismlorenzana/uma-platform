// H31: an open green laurel wreath. Paint at the target grid, as the shared ticket painter does; no bitmap resizing.
import { Mask, shadeDome, type Point } from './shape.ts'
import type { Sprite } from './sprite.ts'
import { add, stroke } from './tiles/props/kit.ts'

export function laurelMark(s: Sprite): void {
  const scale = s.w / 16
  const green = add(s, '#8fd18a', { lift: .32, drop: .3, hueShift: 10 })
  s.shadow = { cx: 8 * scale, cy: 14 * scale, rx: 5.5 * scale, ry: .7 * scale, alpha: 40 }
  const stem: readonly Point[] = [[7, 13], [4, 11], [3, 8], [4, 4]]
  for (const flip of [false, true]) {
    const x = (v: number) => Math.round((flip ? 15 - v : v) * scale)
    for (let i = 1; i < stem.length; i++) {
      const [ax, ay] = stem[i - 1]!, [bx, by] = stem[i]!
      stroke(s, x(ax), Math.round(ay * scale), x(bx), Math.round(by * scale), green, flip ? 2 : 3)
    }
    const leaves: readonly (readonly Point[])[] = [
      [[4, 2], [5, 4], [4, 6], [3, 4]],
      [[2, 5], [4, 6], [5, 8], [2, 7]],
      [[2, 9], [5, 9], [6, 11], [3, 11]],
      [[4, 11], [7, 11], [8, 13], [5, 13]],
    ]
    for (const points of leaves) {
      const leaf = Mask.polygon(points.map(([px, py]): Point => [(flip ? 15 - px : px) * scale, py * scale]), s.w, s.h)
      shadeDome(s, leaf, green, { contact: false, relief: .4 })
    }
  }
  // The two stems meet at a small knot, with the wreath's centre and open top left transparent.
  stroke(s, Math.round(7 * scale), Math.round(13 * scale), Math.round(8 * scale), Math.round(13 * scale), green, 4)
}
