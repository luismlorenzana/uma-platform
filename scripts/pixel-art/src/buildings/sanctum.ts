// H135: an original open temple for the Healer Sanctum, not a repaint of either older healer hall.
import { BASE, col, dome, fill, glow, hline, line, M, rect, slab, vline } from './kit.ts'
import type { Place } from './types.ts'

export const HEALER_SANCTUM: Place = {
  id: 'healer-sanctum', name: 'Healer Sanctum', page: 'learning', at: { x: .5, y: .3 },
  paint(s) {
    const stone = col(s, '#ece6da', { lift: .3 }), shade = col(s, '#b4b0a6', { lift: .3 })
    const dark = col(s, '#30313f'), bronze = col(s, '#817058'), gold = col(s, '#e6b640', { lift: .4 })
    const lightFire = col(s, '#f2c14e', { lift: .4 }), darkFire = col(s, '#9a6ad8', { lift: .38 })
    // Three wide courses, with a lit tread and a shaded riser on each.
    for (const [left, right, top, bottom] of [[3, 44, 42, BASE], [5, 42, 39, 41], [7, 40, 36, 38]] as const)
      slab(s, M.rect(left, top, right, bottom), stone, { lit: 2, dark: 2 })
    // The recessed cella and its open doorway, behind four bright columns.
    // Open side bays reveal the ground between the outer and inner columns; only the cella has a back wall.
    rect(s, shade, 19, 21, 28, 35, 2)
    rect(s, dark, 20, 24, 27, 35, 1)
    hline(s, shade, 19, 28, 23, 1)
    for (const x of [8, 17, 30, 39]) {
      rect(s, stone, x - 1, 23, x + 1, 34, 3)
      vline(s, stone, x - 1, 23, 34, 5)
      vline(s, stone, x + 1, 23, 34, 2)
      hline(s, shade, x, x, 24, 3)
      rect(s, stone, x - 2, 21, x + 2, 22, 4)
      rect(s, stone, x - 2, 35, x + 2, 36, 4)
      hline(s, shade, x - 2, x + 2, 36, 2)
    }
    // A low triangular pediment, without a chapel's roof depth, bell tower or battlements.
    const pediment = M.poly([[4, 19], [24, 8], [44, 19]])
    fill(s, pediment, stone, 3)
    line(s, stone, 4, 19, 24, 8, 5)
    line(s, stone, 24, 8, 44, 19, 4)
    rect(s, stone, 4, 20, 43, 21, 4)
    hline(s, shade, 5, 42, 21, 2)
    dome(s, M.circle(24, 15, 3), gold, { contact: false, bias: .15 })
    s.paint(23, 14, gold, 5)
    // Two equal braziers at the steps' foot: blessing to the left, curse to the right.
    for (const [x, fire, color] of [[6, lightFire, '#f2c14e'], [42, darkFire, '#9a6ad8']] as const) {
      rect(s, bronze, x - 1, 40, x, BASE, 3)
      hline(s, bronze, x - 2, x + 1, BASE, 4)
      fill(s, M.poly([[x - 3, 37], [x + 2, 37], [x + 1, 40], [x - 2, 40]]), bronze, 3)
      hline(s, gold, x - 3, x + 2, 37, 4)
      const flame = M.poly([[x, 30], [x + 2, 33], [x + 1, 34], [x + 2, 36], [x, 38], [x - 2, 36], [x - 2, 34], [x - 1, 34]])
      dome(s, flame, fire, { contact: false, bias: .2 })
      vline(s, fire, x - 1, 34, 36, 5)
      glow(s, x, 34.5, 4, 5, color, 65)
    }
    // The braziers' painted light is static: no chimney or smoke anchor.
  },
}
