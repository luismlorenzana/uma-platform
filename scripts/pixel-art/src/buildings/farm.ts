// uma-farm F25 part A (P126): the farm's Dorm and shipping bin, two 48px farmlands places appended after H156's three.
// Old painters and game layouts stay untouched; the farm reads both frames by key.
import { BASE, M, col, chimney, crate, dome, door, fill, hline, plinth, rect, roofSide, slab, vline, wall, window } from './kit.ts'
import type { Place } from './types.ts'

/** A long two-storey bunkhouse: green shingles with two dormers, cream clapboard, a porch, a chimney. */
const DORM: Place = {
  id: 'dorm', name: 'Dorm', page: 'farmlands', at: { x: .5, y: .22 },
  paint(s) {
    s.shadow = { cx: 24, cy: BASE + .5, rx: 22, ry: 3.2, alpha: 72 }
    const roof = col(s, '#5d8a64'), boards = col(s, '#e3cfa4'), stone = col(s, '#9c9484')
    const beam = col(s, '#6e4a30'), glass = col(s, '#3a4c6a'), trim = col(s, '#f2e6c8', { lift: .3 })
    // The chimney rises from the back slope on the right; then the long roof over it.
    const smoke = chimney(s, stone, 36, 4, 12)
    roofSide(s, roof, 2, 45, 11, 23, { back: 3, tex: 'shingle', seed: 'dorm-roof' })
    // Two dormers: small cream gables with a window each, breaking the roof line.
    for (const x of [11, 29]) {
      rect(s, boards, x, 14, x + 7, 20, 4)
      vline(s, boards, x + 7, 14, 20, 2)
      window(s, beam, glass, x + 2, 16, 4, 3, { lit: true, mullion: true })
      for (let k = 0; k <= 5; k++) {
        hline(s, roof, x - 1 + k, x + 8 - k, 13 - k, k === 5 ? 5 : 4)
        s.paint(x + 8 - k, 13 - k, roof, 2)
      }
      hline(s, trim, x - 1, x + 8, 13, 4)
    }
    wall(s, boards, 4, 43, 24, BASE, 'clapboard', 'dorm-wall')
    plinth(s, stone, 4, 43, 40, BASE)
    for (const x of [4, 43]) vline(s, beam, x, 24, 39, x === 4 ? 3 : 2)
    hline(s, beam, 4, 43, 24, 2)
    // Four windows, two each side of the door: the bunks, lit at night.
    for (const x of [7, 14, 30, 37]) window(s, beam, glass, x, 28, 3, 4, { lit: true, sill: true })
    // A porch: two posts and a short lean-to roof over the door, a step below.
    door(s, beam, 21, BASE - 1, 6, 9, { leaves: 2, frame: trim })
    roofSide(s, roof, 17, 30, 25, 28, { back: 1, tex: 'plank', seed: 'dorm-porch' })
    for (const x of [18, 29]) vline(s, beam, x, 29, BASE - 1, x === 18 ? 4 : 2)
    slab(s, M.rect(18, BASE - 1, 29, BASE), stone)
    hline(s, stone, 18, 29, BASE - 1, 5)
    // A sign over the porch: three small bunk shapes on a plank.
    rect(s, beam, 20, 21, 27, 23, 2)
    for (const x of [21, 23, 25]) { s.paint(x, 22, trim, 5); s.paint(x + 1, 22, trim, 4) }
    // A bench by the wall and a pair of boots.
    hline(s, beam, 33, 41, 38, 4); hline(s, beam, 33, 41, 39, 2)
    vline(s, beam, 34, 39, BASE, 2); vline(s, beam, 40, 39, BASE, 2)
    const leather = col(s, '#8a5232')
    fill(s, M.rect(8, BASE - 2, 9, BASE), leather, 3); fill(s, M.rect(11, BASE - 2, 12, BASE), leather, 2)
    return { smoke }
  },
}

/** The shipping bin: a lidded wooden bin on low feet, its lid propped open, a crate and produce beside it. */
const SHIPPING_BIN: Place = {
  id: 'shipping-bin', name: 'Shipping bin', page: 'farmlands', at: { x: .5, y: .8 },
  paint(s) {
    s.shadow = { cx: 24, cy: BASE + .5, rx: 17, ry: 2.6, alpha: 72 }
    const wood = col(s, '#a87444'), dark = col(s, '#5a3a24'), iron = col(s, '#7c8288'), lid = col(s, '#b98450')
    const brass = col(s, '#d9b45a', { lift: .35 })
    // The bin's body: plank front between two dark corner posts, iron bands top and bottom.
    for (let y = 26; y <= BASE - 1; y++) for (let x = 10; x <= 37; x++) {
      const seam = (y - 26) % 4 === 3
      s.paint(x, y, wood, x === 10 ? 4 : x === 37 ? 2 : seam ? 2 : 3)
    }
    for (const x of [10, 11, 36, 37]) vline(s, dark, x, 26, BASE, x < 12 ? 3 : 2)
    for (const y of [27, 38]) for (let x = 10; x <= 37; x++) s.paint(x, y, iron, x < 14 ? 4 : 3)
    // Feet, so it stands off the ground.
    for (const x of [11, 35]) rect(s, dark, x, BASE - 1, x + 1, BASE, 2)
    // The open interior, seen past the raised lid.
    rect(s, dark, 12, 22, 35, 25, 1)
    hline(s, wood, 10, 37, 21, 4); vline(s, wood, 10, 21, 25, 4); vline(s, wood, 37, 21, 25, 2)
    // The lid, hinged at the back and propped open, leaning back.
    for (let k = 0; k < 9; k++) {
      const y = 20 - k, x0 = 11 + Math.floor(k / 3), x1 = 36 - Math.floor(k / 3)
      hline(s, lid, x0, x1, y, k === 8 ? 5 : k % 3 === 2 ? 3 : 4)
      s.paint(x0, y, lid, 5); s.paint(x1, y, lid, 2)
    }
    vline(s, dark, 33, 13, 21, 2)
    // A brass hasp and a chalk tally on the front.
    rect(s, brass, 23, 28, 24, 30, 4); s.paint(23, 31, brass, 2)
    const chalk = col(s, '#f2efe6', { lift: .1 })
    for (const x of [14, 16, 18]) vline(s, chalk, x, 32, 35, 4)
    hline(s, chalk, 13, 19, 34, 3)
    // A crate of turnips beside it, and one turnip waiting on the ground.
    crate(s, wood, 39, BASE, 7, 6)
    const root = col(s, '#e9dff0', { lift: .2 }), leaf = col(s, '#5aa346', { lift: .3 })
    for (const [x, y] of [[41, 36], [44, 36]] as const) {
      dome(s, M.circle(x + .5, y + .5, 1.6), root, { contact: false })
      s.paint(x, y - 2, leaf, 4); s.paint(x + 1, y - 2, leaf, 3)
    }
    dome(s, M.circle(6.5, BASE - 1, 2), root, { contact: false })
    s.paint(6, BASE - 4, leaf, 4); s.paint(7, BASE - 4, leaf, 3)
  },
}

export const FARM_M4: Place[] = [DORM, SHIPPING_BIN]
