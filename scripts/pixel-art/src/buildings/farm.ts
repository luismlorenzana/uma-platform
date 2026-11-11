// uma-farm F25 part A (P126): the farm's Dorm and shipping bin, two 48px farmlands places appended after H156's three.
// Old painters and game layouts stay untouched; the farm reads both frames by key.
import { BASE, M, col, chimney, crate, dome, door, fill, hline, plinth, rect, roofGable, roofHip, roofSide, slab, vline, wall, window } from './kit.ts'
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

// uma-farm F55 (P126): the homestead, the Farmhouse and the house all six lots share (RM41). Neither carries a name.

/** The Farmhouse: two storeys under a terracotta hip roof, cream plaster upstairs, honey boards below, a porch, a chimney. */
const FARMHOUSE: Place = {
  id: 'farmhouse', name: 'Farmhouse', page: 'farmlands', at: { x: .5, y: .38 },
  paint(s) {
    s.shadow = { cx: 24, cy: BASE + .5, rx: 21, ry: 3.2, alpha: 72 }
    const roof = col(s, '#b85a3c'), plaster = col(s, '#f0e2c0', { lift: .2 }), boards = col(s, '#c99a5e')
    const stone = col(s, '#9c9484'), beam = col(s, '#6e4a30'), glass = col(s, '#3a4c6a')
    const smoke = chimney(s, stone, 33, 3, 11)
    roofHip(s, roof, 3, 44, 9, 18, { inset: 8, tex: 'tile', back: 2, seed: 'farmhouse-roof' })
    // Upstairs: plaster with three lit windows; downstairs: boards with a door and two windows.
    wall(s, plaster, 5, 42, 19, 28, 'plaster', 'farmhouse-up')
    wall(s, boards, 5, 42, 29, BASE, 'boards', 'farmhouse-down')
    hline(s, beam, 5, 42, 28, 2)
    for (const x of [5, 42]) vline(s, beam, x, 19, BASE, x === 5 ? 3 : 2)
    for (const x of [10, 22, 34]) window(s, beam, glass, x, 21, 4, 4, { lit: true, mullion: true, sill: true })
    for (const x of [9, 35]) window(s, beam, glass, x, 33, 4, 4, { lit: true, sill: true })
    plinth(s, stone, 5, 42, 41, BASE)
    // The porch: a plank lean-to over the door on two posts, a step, flower boxes under the lower windows.
    roofSide(s, roof, 15, 32, 29, 31, { back: 1, tex: 'plank', seed: 'farmhouse-porch' })
    for (const x of [16, 31]) vline(s, beam, x, 32, BASE - 1, x === 16 ? 4 : 2)
    door(s, beam, 21, BASE - 1, 6, 9, { frame: plaster })
    slab(s, M.rect(19, BASE - 1, 28, BASE), stone)
    hline(s, stone, 19, 28, BASE - 1, 5)
    const bloom = col(s, '#e8607e', { lift: .36 }), leaf = col(s, '#5aa346', { lift: .3 })
    for (const x of [8, 34]) {
      rect(s, beam, x, 38, x + 6, 39, 3)
      for (let k = 0; k < 7; k++) s.paint(x + k, 37, k % 2 ? bloom : leaf, k % 2 ? 4 : 3)
    }
    return { smoke }
  },
}

/** A house: one cottage for all six lots, a slate-blue front gable, plank walls, one door, one window, a chimney. */
const HOMESTEAD_HOUSE: Place = {
  id: 'homestead-house', name: 'House', page: 'farmlands', at: { x: .5, y: .62 },
  paint(s) {
    s.shadow = { cx: 24, cy: BASE + .5, rx: 16, ry: 2.8, alpha: 72 }
    const roof = col(s, '#6f7f9c'), walls = col(s, '#d8b884'), stone = col(s, '#9c9484')
    const beam = col(s, '#7a4e30'), glass = col(s, '#3a4c6a'), trim = col(s, '#f2e6c8', { lift: .3 })
    const smoke = chimney(s, stone, 29, 8, 16)
    const gable = roofGable(s, roof, 9, 38, 24, 15, 6, { tex: 'slate', trim, wallTop: 27, seed: 'homestead-roof' })
    wall(s, walls, 11, 36, 25, BASE, 'boards', 'homestead-wall')
    fill(s, gable.subtract(M.rect(0, 0, 10, 47)).subtract(M.rect(37, 0, 47, 47)), walls, 4)
    plinth(s, stone, 11, 36, 41, BASE)
    // A round loft window in the gable, a shuttered window and the door below.
    for (const [x, y] of [[23, 17], [24, 17], [23, 18], [24, 18]] as const) s.paint(x, y, glass, x === 23 && y === 17 ? 4 : 3)
    window(s, beam, glass, 14, 30, 5, 5, { lit: true, mullion: true, shutters: beam, sill: true })
    door(s, beam, 26, BASE, 6, 11, { arch: true, frame: trim })
    // A short fence and a flower pot: a lived-in lot.
    const pot = col(s, '#b4643e'), bloom = col(s, '#f2c23a', { lift: .4 })
    rect(s, pot, 39, 39, 41, BASE, 3); s.paint(39, 38, bloom, 4); s.paint(40, 37, bloom, 5); s.paint(41, 38, bloom, 3)
    for (const x of [4, 7]) vline(s, beam, x, 37, BASE, 3)
    hline(s, beam, 3, 9, 38, 4); hline(s, beam, 3, 9, 41, 3)
    return { smoke }
  },
}

export const FARM_ROMANCE: Place[] = [FARMHOUSE, HOMESTEAD_HOUSE]
