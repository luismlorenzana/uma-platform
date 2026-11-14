// The six desks, side on, standing on the floor at y ≈ 57 of the 64-unit box, each with what sits on it.
import type { Style } from './items.ts'
import type { Painter, Pen, Pt } from './kit.ts'
import { look } from './look.ts'
import { bulb, leaf, shadeLeaf, tube } from './parts.ts'

/** Neon: a slim desk on two slanted panels, a magenta lip, an emitter casting a translucent holo screen above it. */
function holoDesk(p: Pen): void {
  const L = look(p, 'neon')
  p.shadow(32, 57.4, 27, 2.4, 84)
  // The legs: two slanted panels, a lit seam down each.
  for (const pts of [[[8, 36], [15, 36], [12.5, 57], [6.5, 57]], [[49, 36], [56, 36], [57.5, 57], [51.5, 57]]] as Pt[][]) p.cylV(p.poly(pts), L.deep, { hi: 4 })
  tube(p, [[13.4, 38.5], [11.6, 55]], L.light, L.accent, 1, .8)
  tube(p, [[50.6, 38.5], [52.4, 55]], L.light, L.accent, 1, .8)
  // The top, its front lip a magenta tube; holo keys on the top face.
  p.box(3, 31, 61, 37, 2.6, L.body, { round: true })
  tube(p, [[4.5, 35.2], [59.5, 35.2]], L.light, L.accent, 1.2)
  for (const x of [20, 24, 28, 36, 40]) p.fill(p.rect(x, 32, x + 2.6, 33), L.light, 4)
  // The emitter and its cone of light up to the screen.
  p.dome(p.ell(32, 31.2, 3.2, 1.2), L.metal, { bias: .2 })
  bulb(p, 32, 30.2, L.light, L.accent, .7)
  p.wash(p.poly([[30.6, 29.6], [33.4, 29.6], [47, 24.4], [17, 24.4]]), L.accent, (_x, y) => 18 + (30 - y) * 3)
  // The hologram: a translucent panel, scanlines, glyph bars and a ring, its frame lit.
  const panel = p.poly([[17, 6], [47, 6], [49, 24], [15, 24]])
  p.wash(panel, L.accent, (x, y) => {
    const row = Math.floor(y * p.k) % 2 ? 62 : 84
    const bar = (y > 9.5 && y < 10.8 && x > 26 && x < 44) || (y > 12.8 && y < 14 && x > 26 && x < 40) || (y > 16 && y < 17.2 && x > 26 && x < 42)
    const ring = Math.abs(Math.hypot(x - 21.6, y - 13.6) - 3.2) < .8
    const chart = y > 19.4 && y < 22 && x > 19 && x < 45 && ((x * 1.5) % 3) < 1.2 && y > 22 - ((x * 7) % 5) * .5
    return bar || ring || chart ? 200 : row
  })
  const frame = p.path([[17, 6], [47, 6], [49, 24], [15, 24], [17, 6]], 1)
  p.fill(frame, L.light, 4)
  p.fill(p.path([[17, 6], [47, 6]], .4), L.light, 5)
  p.halo(frame, L.accent, .9)
}

/** Classic: an oak desk with a bank of drawers and brass knobs, a turned leg, books, an inkwell and quill, a candle. */
function writingDesk(p: Pen): void {
  const L = look(p, 'classic')
  const wax = p.add('#efe4c8', { lift: .2, drop: .26 })
  const paper = p.add('#e9dfc6', { lift: .2 })
  const ink = p.add('#2c3a66', { lift: .4 })
  p.shadow(32, 57.4, 28.5, 2.4, 84)
  // A turned leg at the left: a column with two beads and a tapered foot.
  p.cylV(p.rect(5.4, 33, 8.4, 54), L.body)
  for (const y of [38, 47]) p.cylV(p.rrect(4.6, y, 9.2, y + 1.6, .6), L.body)
  p.cylV(p.poly([[5, 54], [8.8, 54], [8, 57], [5.8, 57]]), L.body)
  // The pedestal of three drawers and the apron, brass knobs.
  p.box(38, 33, 58.5, 57, 0, L.body)
  for (const y of [41, 49]) p.fill(p.rect(39, y, 57.5, y + .9), L.deep, 1)
  for (const y of [34.4, 42.4, 50.4]) p.fill(p.rect(39.5, y, 57, y + .8), L.body, 4)
  for (const y of [37.5, 45.5, 53.5]) p.dome(p.circ(48.2, y, 1.4), L.trim, { bias: .25 })
  p.box(8.4, 33, 38, 37.2, 0, L.body)
  p.dome(p.circ(23, 35.1, 1.1), L.trim, { bias: .25 })
  // The top, a gold inlay along its edge.
  p.box(3, 28, 61, 33, 2.2, L.body, { round: true })
  p.fill(p.rect(4, 31.3, 60, 32), L.trim, 3)
  // Three books, spines out, gold bands.
  for (const [x0, y0, x1, y1, c] of [[7, 24.6, 20.5, 28, '#7c3230'], [8.2, 21.6, 19.4, 24.6, '#3e5a3a'], [7.4, 18.8, 18.2, 21.6, '#334468']] as const) {
    const id = p.add(c, { lift: .3 })
    p.box(x0, y0, x1, y1, .9, id)
    p.fill(p.rect(x0 + 1.6, y0 + 1, x0 + 2.4, y1), L.trim, 4)
    p.fill(p.rect(x1 - 2.4, y0 + 1, x1 - 1.6, y1), L.trim, 3)
  }
  // A sheet of paper, the inkwell and its quill.
  p.fill(p.poly([[22.6, 28.2], [33, 28.2], [34, 30], [22, 30]]), paper, 4)
  if (p.big) for (const x of [24.5, 27, 29.5]) p.fill(p.hair(x, 28.8, x + 2, 28.8), paper, 2)
  p.dome(p.ell(37.4, 26.4, 2.4, 2.2), ink, { bias: .1 })
  p.fill(p.rect(36.4, 23.4, 38.4, 24.6), ink, 2)
  const quill = leaf(p, 37.6, 24, 10.5, 2.8, -62)
  shadeLeaf(p, quill, wax, 37.6, 24, -62, 4)
  // A candle in a brass dish, its flame lit, a warm glow around it.
  p.dome(p.ell(52, 27.6, 4, 1.2), L.trim, { bias: .2 })
  p.cylV(p.rect(50.7, 20.6, 53.3, 27.2), wax)
  p.fill(p.rect(50.7, 20.6, 53.3, 21.4), wax, 5)
  const flame = p.test((x, y) => { const t = (y - 15.6) / 4.4; return t >= 0 && t <= 1 && Math.abs(x - 52) <= Math.sin(t * Math.PI * .8) * 1.5 + .1 })
  p.fill(flame, L.light, 4)
  p.fill(p.test((x, y) => y > 17.6 && y < 19.6 && Math.abs(x - 52) < .7), L.light, 5)
  p.halo(flame, L.accent)
  p.wash(p.circ(52, 18.4, 7.4), L.accent, (x, y) => Math.max(0, 54 - Math.hypot(x - 52, y - 18.4) * 7.4))
}

/** Cozy: a low round plum tea table on curved legs, a lace doily, a rose teapot with steam, two cups. */
function teaTable(p: Pen): void {
  const L = look(p, 'cozy')
  const lace = p.add('#f8e8ee', { lift: .2, drop: .22 })
  const tea = p.add('#b5683a', { lift: .3 })
  p.shadow(32, 56.8, 27, 2.5, 84)
  // Three curved legs.
  for (const [x, dx] of [[12, -2.6], [32, 0], [52, 2.6]] as const)
    p.cylV(p.curve((t) => [x + dx * Math.sin(t * Math.PI * .9) * (1 - t * .4), 44 + t * 12.4] as const, 2.6, 12), L.body)
  // The top: a lit oval face over a rim band.
  p.fill(p.ell(32, 42.6, 27, 6).subtract(p.ell(32, 40, 27, 6)), L.body, (_x, y) => (y > 46 ? 1 : 2))
  p.fill(p.ell(32, 40, 27, 6), L.body, (x, y) => (Math.hypot((x - 32) / 27, (y - 40) / 6) > .86 ? (y < 40 ? 5 : 3) : 4))
  // The doily: a scalloped pale oval.
  p.fill(p.test((x, y) => { const a = Math.atan2((y - 39.8) / 3.4, (x - 30) / 14); const r = 1 + .08 * Math.cos(a * 12); return Math.hypot((x - 30) / 14, (y - 39.8) / 3.4) <= r }), lace, (x, y) => ((Math.floor(x) + Math.floor(y * 2)) % 4 === 0 ? 3 : 4))
  // The teapot: a round rose body with a plum band, its lid and knob, a spout and a handle.
  p.fill(p.ring(32.4, 33.6, 3, 3.6, 1.3).subtract(p.test((x) => x < 32.6)), L.trim, 3)
  p.cylV(p.seg(19.4, 34.6, 15, 29.4, 2), L.trim)
  p.dome(p.ell(25, 33.8, 7.4, 5.6), L.trim, { bias: .18, relief: .7 })
  p.fill(p.test((x, y) => Math.abs(y - 34.6) < .7 && Math.hypot((x - 25) / 7.4, (y - 33.8) / 5.6) < 1), L.body, 3)
  p.dome(p.ell(25, 28.4, 3.8, 1.4), L.trim, { bias: .3 })
  p.dome(p.circ(25, 26.8, 1.2), L.body, { bias: .3 })
  // Two cups on saucers.
  for (const [cx, cy] of [[42, 37.6], [49.6, 38.4]] as const) {
    p.fill(p.ell(cx, cy + 1.6, 3.8, 1.1), lace, 3)
    p.cylV(p.rrect(cx - 2.5, cy - 2.6, cx + 2.5, cy + 1.6, 1), L.trim)
    p.fill(p.ell(cx, cy - 2.4, 2.2, .7), tea, 3)
  }
  // Steam from the spout and a cup.
  for (const [x0, y0, len] of [[14.6, 27.6, 9], [42, 33.6, 7]] as const) {
    const wisp = p.curve((t) => [x0 + Math.sin(t * 7) * 1.2, y0 - t * len] as const, .9, 14)
    p.wash(wisp, '#fff4f8', (_x, y) => 150 - (y0 - y) * (110 / len))
  }
}

/** Sporty: a padded bench under a pegboard with a cyan strip light, a stopwatch, a jump rope, a towel, shoes, a bag. */
function gearBench(p: Pen): void {
  const L = look(p, 'sporty')
  const white = p.add('#eaf2f7', { lift: .2, drop: .24 })
  const bag = p.add('#2a5f8c', { lift: .3 })
  p.shadow(32, 57.4, 28.5, 2.4, 84)
  // The pegboard: a mid-blue perforated panel in a metal frame, under a small shelf with a cyan strip light.
  const board = p.rect(7, 10, 57, 31)
  p.fill(board, L.body, (x, y) => (y < 11 ? 2 : x < 8 ? 5 : 4))
  for (let y = 12.5; y < 30; y += 3.2) for (let x = 9.5; x < 56; x += 3.2) p.dot(x, y, L.body, 2)
  p.edge(board, L.metal, 3)
  p.box(5, 6, 59, 10, 1.6, L.metal)
  const strip = p.rect(9, 9.2, 55, 10.2)
  p.fill(strip, L.light, 5)
  p.halo(strip, L.accent)
  p.wash(p.rect(8, 10.4, 56, 16), L.accent, (_x, y) => 40 - (y - 10.4) * 6.4, false)
  // A stopwatch on a lanyard, a jump rope, a towel over a peg.
  p.fill(p.path([[13, 10.6], [16, 13.4], [19, 10.6]], .7), white, 3)
  p.dome(p.circ(16, 18, 4), L.metal, { bias: .2 })
  p.fill(p.circ(16, 18, 2.8), white, 4)
  p.fill(p.seg(16, 18, 16, 15.8, .6), L.trim, 2)
  p.fill(p.seg(16, 18, 17.6, 18.8, .6), L.trim, 2)
  p.cylV(p.rect(15.2, 12.6, 16.8, 14.2), L.metal)
  p.fill(p.ring(32, 17, 5, 4.4, 1.3), L.trim, (x, y) => (x + y < 49 ? 4 : 3))
  for (const x of [28.6, 35.4]) p.cylV(p.rrect(x - .9, 21, x + .9, 26.6, .6), L.deep)
  const towelDrop = (x: number) => 26 + .8 * Math.sin(x * 1.4)
  p.fill(p.test((x, y) => x >= 42 && x < 52 && y >= 11 && y <= towelDrop(x)), white, (x, y) => (y < 12.4 ? 5 : x < 43 ? 4 : x > 51 ? 2 : 3))
  for (const y of [21.4, 23.4]) p.fill(p.test((x, yy) => x >= 42 && x < 52 && yy >= y && yy < y + .9), L.trim, 3)
  // The duffel bag under the bench, the legs and the shelf rail.
  p.dome(p.rrect(17, 45.5, 41, 56.8, 4.2), bag, { bias: .1, relief: .4 })
  p.fill(p.rect(18, 49.4, 40, 50.4), L.trim, 4)
  p.fill(p.curve((t) => [23 + t * 12, 46 - Math.sin(t * Math.PI) * 3.4] as const, 1.1), L.deep, 2)
  for (const x of [7.6, 53.4]) p.cylV(p.rect(x, 39, x + 3, 57), L.metal)
  p.cylH(p.rect(10.6, 51, 53.4, 52.6), L.metal)
  // The padded seat, its cyan piping.
  p.box(4, 34, 60, 39.6, 2.4, L.body, { round: true })
  p.fill(p.rect(4.5, 36.4, 59.5, 37.2), L.trim, 4)
  // A pair of running shoes and a bottle on the seat.
  for (const x0 of [43, 50]) {
    p.fill(p.poly([[x0, 33.9], [x0 + 6.4, 33.9], [x0 + 6.4, 32.6], [x0 + 4, 31.4], [x0 + 2.6, 29.2], [x0, 29.2]]), L.trim, (x, y) => (y < 30.4 ? 5 : x > x0 + 4.6 ? 3 : 4))
    p.fill(p.rect(x0, 33, x0 + 6.6, 34), white, 4)
    p.fill(p.hair(x0 + 1.4, 31.8, x0 + 3.6, 30.6), L.deep, 2)
  }
  p.cylV(p.rrect(9, 26, 13, 34, 1), L.trim)
  p.fill(p.rect(9, 28.6, 13, 30.4), white, 4)
  p.cylV(p.rect(9.8, 24.4, 12.2, 26), L.deep)
}

/** Tech: a slate desk with a mint edge light, three monitors of code and graphs, a keyboard, a tower with an LED strip. */
function consoleDesk(p: Pen): void {
  const L = look(p, 'tech')
  p.shadow(32, 57.4, 28.5, 2.4, 84)
  // The tower under the right end: vents, an LED strip and a power light.
  p.box(45, 37, 57.5, 57, 0, L.deep)
  for (let y = 41; y < 55; y += 2.4) p.fill(p.rect(50, y, 56, y + .9), L.deep, 1)
  const led = p.rect(46.8, 39, 47.8, 55)
  p.fill(led, L.light, 4)
  p.halo(led, L.accent)
  bulb(p, 53, 39.4, L.light, L.accent, .6)
  p.cylV(p.rect(5, 37, 9, 57), L.body)
  // The top and its mint front edge.
  p.box(3, 32, 61, 37.6, 2.2, L.body, { round: true })
  tube(p, [[4.4, 36], [59.6, 36]], L.light, L.accent, 1.1, .8)
  // Three monitors: the middle one square on, the sides turned in.
  const screen = (bezel: Pt[], inner: Pt[], seed: number) => {
    p.fill(p.poly(bezel), L.deep, 2)
    const m = p.poly(inner)
    p.fill(m, L.light, (x, y) => {
      const row = Math.floor((y - inner[0]![1]) / 2.2)
      const len = 4 + ((row * 7 + seed * 3) % 9)
      const indent = (row * 5 + seed) % 3
      const x0 = Math.min(...inner.map((q) => q[0])) + 1.4 + indent
      return (y - inner[0]![1]) % 2.2 < 1 && x > x0 && x < x0 + len ? ((row + seed) % 4 === 0 ? 5 : 3) : 1
    })
    p.halo(m, L.accent, .45)
  }
  screen([[19.5, 8.5], [44.5, 8.5], [44.5, 26.5], [19.5, 26.5]], [[21, 10], [43, 10], [43, 25], [21, 25]], 1)
  // The middle screen carries a mint graph on its right half.
  p.fill(p.curve((t) => [33 + t * 9, 21.5 - Math.sin(t * 7) * 1.6 - t * 3.4] as const, .6, 18), L.light, 5)
  screen([[6, 11], [18.6, 9.4], [18.6, 26.6], [6, 25]], [[7.4, 12.4], [17.4, 11], [17.4, 25.2], [7.4, 23.8]], 2)
  screen([[45.4, 9.4], [58, 11], [58, 25], [45.4, 26.6]], [[46.6, 11], [56.6, 12.4], [56.6, 23.8], [46.6, 25.2]], 3)
  p.cylV(p.rect(30.6, 26.5, 33.4, 31), L.metal)
  p.dome(p.ell(32, 31.6, 5, 1), L.metal, { bias: .2 })
  for (const x of [12, 52]) { p.cylV(p.rect(x - 1, 25.4, x + 1, 31), L.metal); p.fill(p.ell(x, 31.6, 3, .8), L.metal, 3) }
  // The keyboard, its keys faintly lit, and a mouse.
  p.fill(p.rect(21, 32.3, 41, 33.6), L.metal, 4)
  for (let x = 22; x < 40; x += 2) p.fill(p.rect(x, 32.6, x + 1, 33.3), L.light, 3)
  p.dome(p.ell(44.6, 32.8, 1.6, .9), L.metal, { bias: .2 })
}

/** Wild: a driftwood slab on crooked branch legs, mossy at one end, a potted fern, a glowing mushroom cluster, a stone. */
function driftwoodDesk(p: Pen): void {
  const L = look(p, 'wild')
  const drift = p.add('#9a917a', { lift: .3, drop: .3 })
  const pot = p.add('#a8634a', { lift: .3 })
  const fern = p.add('#5c9a3e', { lift: .3 })
  const stem = p.add('#e8e0c4', { lift: .2 })
  const stone = p.add('#8d9496', { lift: .3 })
  p.shadow(32, 57.4, 28.5, 2.4, 80)
  // Crooked legs, each with a side branch.
  p.cylV(p.curve((t) => [11 - t * 4 + Math.sin(t * 5) * .8, 35 + t * 21.6] as const, 2.6, 14), drift)
  p.cylV(p.seg(9.6, 44, 15, 50.4, 1.5), drift)
  p.cylV(p.curve((t) => [51 + t * 5 - Math.sin(t * 4) * .8, 35 + t * 21.6] as const, 2.6, 14), drift)
  p.cylV(p.seg(53.4, 46, 48.4, 52, 1.5), drift)
  // The slab: a wavy top face, a rough front edge, grain and knots, moss over the left end.
  const back = (x: number) => 28 + .8 * Math.sin(x * .5)
  const front = (x: number) => 32.2 + .9 * Math.sin(x * .37 + 1)
  const under = (x: number) => front(x) + 3.6 + .8 * Math.sin(x * .9)
  const left = (y: number) => 3.6 + Math.sin(y * 1.3) * .8, right = (y: number) => 60.4 - Math.sin(y * 1.1) * .8
  p.fill(p.test((x, y) => x >= left(y) && x < right(y) && y >= back(x) && y < front(x)), drift, (x, y) => (y < back(x) + .9 ? 5 : Math.abs(((y - back(x)) * 3 + x * .08) % 2.2 - 1) < .25 ? 3 : 4))
  p.fill(p.test((x, y) => x >= left(y) && x < right(y) && y >= front(x) && y <= under(x)), drift, (x, y) => (y < front(x) + .9 ? 3 : y > under(x) - 1 ? 1 : Math.abs((y * 2.6 + x * .05) % 2 - 1) < .3 ? 1 : 2))
  for (const [x, y] of [[24, 30], [37, 29.6]] as const) p.fill(p.ell(x, y, 1.4, .7), drift, 2)
  p.dome(p.test((x, y) => x >= left(y) && x < 15 && y >= back(x) - 1.2 && y < front(x) + 1.4 - (x - 4) * .12 && Math.sin(x * 2.1) + Math.cos(y * 2.6) > -.6), L.body, { bias: .2, relief: .5 })
  // A potted fern.
  p.cylV(p.poly([[40.4, 21], [49.6, 21], [48.6, 28.6], [41.4, 28.6]]), pot)
  p.fill(p.rect(40, 20.4, 50, 22), pot, 4)
  for (const d of [-160, -128, -96, -64, -28]) {
    const m = leaf(p, 45, 21, d === -96 ? 13 : 10.5, 3.2, d)
    shadeLeaf(p, m, fern, 45, 21, d)
    p.fill(p.seg(45, 21, 45 + Math.cos((d * Math.PI) / 180) * 6, 21 + Math.sin((d * Math.PI) / 180) * 6, .4), L.trim, 4)
  }
  // Glowing mushrooms on a little log, a soft lime light around them.
  p.cylH(p.rrect(7, 26.6, 21, 29, 1), drift)
  for (const [x, y, rx, ry] of [[11, 22.4, 3, 1.8], [16, 19.8, 3.4, 2], [19.4, 24.4, 2.2, 1.4]] as const) {
    p.cylV(p.rect(x - .7, y, x + .7, 27), stem)
    const cap = p.ell(x, y, rx, ry).subtract(p.test((_x, yy) => yy > y + .4))
    p.fill(cap, L.light, (cx, cy) => (cy < y - ry * .4 && cx < x ? 5 : 4))
    p.halo(cap, L.accent)
  }
  p.wash(p.circ(15, 22, 9), L.accent, (x, y) => Math.max(0, 44 - Math.hypot(x - 15, y - 22) * 5))
  p.dome(p.ell(31, 27.6, 3, 1.8), stone, { bias: .2 })
}

export const DESKS: Record<Style, Painter> = { neon: holoDesk, classic: writingDesk, cozy: teaTable, sporty: gearBench, tech: consoleDesk, wild: driftwoodDesk }
