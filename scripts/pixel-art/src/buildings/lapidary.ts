// H29 / D144: a stone gem-cutter's workshop, between the timber Workbench and slate-roofed Forge.
import { BASE, col, dome, door, hline, line, M, rect, roofSide, vline, wall, window } from './kit.ts'
import type { Place } from './types.ts'

export const LAPIDARY: Place = {
  id: 'lapidary', name: 'Lapidary', page: 'wilds', at: { x: .5, y: .51 },
  paint: s => {
    const stone = col(s, '#b8b09e', { lift: .3 })
    const roof = col(s, '#b36e4b', { lift: .3 })
    const wood = col(s, '#936b43')
    const dark = col(s, '#302d31')
    const steel = col(s, '#a6b5bd', { lift: .34 })
    const wheel = col(s, '#a8a494', { lift: .32 })
    const blue = col(s, '#6aa8dd', { lift: .35 })
    const pink = col(s, '#d487b1', { lift: .35 })
    const green = col(s, '#6cbb9c', { lift: .35 })
    wall(s, stone, 6, 41, 21, BASE, 'stone', 'lapidary-wall')
    roofSide(s, roof, 3, 44, 10, 20, { back: 3, tex: 'tile' })
    hline(s, wood, 5, 42, 21, 2)
    door(s, wood, 22, BASE, 7, 12, { arch: true, frame: stone })
    window(s, wood, blue, 31, 25, 6, 5, { mullion: true, sill: true })
    // A diamond-shaped trade sign over the door, cut faces rather than a magical glow.
    const sign = M.poly([[25, 22], [29, 25], [25, 29], [21, 25]])
    sign.each((x, y) => s.paint(x, y, green, y < 25 ? 5 : x < 25 ? 4 : 2))
    s.paint(24, 24, green, 5)
    // The grinding wheel on a timber trestle, with its axle and hand crank in front.
    for (const x of [8, 16]) vline(s, wood, x, 35, BASE, x === 8 ? 4 : 2)
    hline(s, wood, 6, 18, BASE, 3)
    dome(s, M.circle(12.5, 34.5, 6.3), wheel, { contact: false, relief: .6 })
    const face = M.circle(12.5, 34.5, 4.5)
    face.each((x, y) => {
      if (!face.get(x - 1, y) || !face.get(x, y - 1)) s.paint(x, y, wheel, 4)
      if ((x + y * 3) % 11 === 0) s.shift(x, y, -1)
    })
    rect(s, steel, 11, 33, 13, 35, 4)
    s.paint(12, 34, dark, 1)
    line(s, steel, 13, 35, 17, 37, 3)
    vline(s, wood, 18, 36, 39, 4)
    // Three cut stones on a lit bench top, with a loupe beside them and chip tray beneath.
    for (const x of [32, 42]) vline(s, wood, x, 38, BASE, x === 32 ? 4 : 2)
    rect(s, wood, 31, 36, 44, 38, 3)
    hline(s, wood, 31, 44, 36, 5)
    hline(s, wood, 33, 41, 41, 2)
    for (const [x, id] of [[33, pink], [37, blue], [41, green]] as const) {
      const gem = M.poly([[x, 31], [x + 2, 33], [x + 1, 35], [x - 1, 35], [x - 2, 33]])
      gem.each((xx, yy) => s.paint(xx, yy, id, yy <= 32 ? 5 : xx < x ? 4 : 2))
    }
    hline(s, steel, 33, 35, 29, 4)
    s.paint(34, 28, dark, 2)
    // No chimney: this station polishes stone; it does not smelt it.
  },
}
