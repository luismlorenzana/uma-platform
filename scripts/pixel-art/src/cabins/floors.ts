// The six floor pieces: rugs and mats lying flat, seen from the front and above as parallelograms whose back edge
// leans right, so their front edge and right side show a sliver of thickness. No contact shadow: they lie flat.
import type { Style } from './items.ts'
import { mix, scatter, type Painter, type Pen, type Pt } from './kit.ts'
import { look } from './look.ts'
import { bulb, heart, tube } from './parts.ts'

interface Rug { x0: number; x1: number; yb: number; yf: number; skew: number }
const corners = (r: Rug): Pt[] => [[r.x0 + r.skew, r.yb], [r.x1 + r.skew, r.yb], [r.x1, r.yf], [r.x0, r.yf]]
/** Rug-local coordinates: u across (0 left, 1 right), v from the back edge (0) to the front (1). */
const uv = (r: Rug, x: number, y: number): [number, number] => {
  const v = (y - r.yb) / (r.yf - r.yb)
  return [(x - r.x0 - r.skew * (1 - v)) / (r.x1 - r.x0), v]
}
/** A point at rug-local (u, v). */
const at = (r: Rug, u: number, v: number): Pt => [r.x0 + r.skew * (1 - v) + u * (r.x1 - r.x0), r.yb + v * (r.yf - r.yb)]

/** The rug's thickness: its front edge and right side, `t` units deep. */
function edge(p: Pen, r: Rug, t: number, id: number): void {
  p.fill(p.poly([[r.x0, r.yf], [r.x1, r.yf], [r.x1, r.yf + t], [r.x0, r.yf + t]]), id, 1)
  p.fill(p.poly([[r.x1, r.yf], [r.x1 + r.skew, r.yb], [r.x1 + r.skew, r.yb + t], [r.x1, r.yf + t]]), id, 1)
}

/** Neon: a dark mat ruled with a glowing magenta grid, a brighter border, hot nodes where the lines cross. */
function lightGridMat(p: Pen): void {
  const L = look(p, 'neon')
  const r: Rug = { x0: 4, x1: 55, yb: 22, yf: 46, skew: 5 }
  edge(p, r, 1.6, L.deep)
  const mat = p.poly(corners(r))
  p.fill(mat, L.deep, (x, y) => (uv(r, x, y)[1] < .08 ? 3 : 2))
  const grid = p.blank()
  for (let i = 1; i < 8; i++) grid.union(p.seg(...at(r, i / 8, .08), ...at(r, i / 8, .92), .8))
  for (let j = 1; j < 5; j++) grid.union(p.seg(...at(r, .04, j / 5), ...at(r, .96, j / 5), .8))
  p.fill(grid, L.light, 2)
  for (let i = 1; i < 8; i++) for (let j = 1; j < 5; j++) { const [x, y] = at(r, i / 8, j / 5); p.dot(x, y, L.light, (i + j) % 2 ? 4 : 5) }
  const b = [at(r, .02, .06), at(r, .98, .06), at(r, .98, .94), at(r, .02, .94)]
  tube(p, [...b, b[0]!], L.light, L.accent, 1.2)
}

/** Classic: a brown wool rug with a gold-lined border, a lattice field and a gold medallion, fringe at both ends. */
function wovenRug(p: Pen): void {
  const L = look(p, 'classic')
  const red = p.add('#7a3a2c', { lift: .3 })
  const fringe = p.add('#e6d6ac', { lift: .2 })
  // A runner laid from the front back into the room: narrow, deep, its back end leaning right.
  const r: Rug = { x0: 17, x1: 45, yb: 11, yf: 53, skew: 9 }
  const W = r.x1 - r.x0, D = r.yf - r.yb
  // Fringe along both short ends (the back and the front), then the thickness and the field.
  for (let u = .05; u < .97; u += .09) {
    const [bx, by] = at(r, u, 0), [fx, fy] = at(r, u, 1)
    p.fill(p.seg(bx, by - 2.4, bx, by, .8), fringe, 4)
    p.fill(p.seg(fx, fy + 1.2, fx - .3, fy + 3.4, .8), fringe, 3)
  }
  edge(p, r, 1.2, L.deep)
  // Each pixel of the field is one of five threads: gold lines, red motifs, the deep border, the lattice, the field.
  const thread = (x: number, y: number): 'gold' | 'red' | 'deep' | 'lattice' | 'field' => {
    const [u, v] = uv(r, x, y), U = u * W, V = v * D
    const bu = .13, bv = .08
    if (u < bu || u > 1 - bu || v < bv || v > 1 - bv) {
      if (Math.abs(u - bu / 2) < .02 || Math.abs(u - 1 + bu / 2) < .02 || Math.abs(v - bv / 2) < .01 || Math.abs(v - 1 + bv / 2) < .01) return 'gold'
      if (Math.abs(((V * .8 + U) % 4) - 2) < .55) return 'red'
      return 'deep'
    }
    const d = Math.abs(U - W / 2) / 7 + Math.abs(V - D / 2) / 9
    if (d < .45) return 'red'
    if (d < 1) return Math.abs(d - .72) < .12 ? 'deep' : 'gold'
    return Math.abs(((U * 1.4 + V) % 6) - 3) < .45 || Math.abs(((U * 1.4 - V + 90) % 6) - 3) < .45 ? 'lattice' : 'field'
  }
  p.poly(corners(r)).each((x, y) => {
    const ux = (x + .5) / p.k, uy = (y + .5) / p.k, kind = thread(ux, uy), lit = uv(r, ux, uy)[1] < .5
    if (kind === 'gold') p.s.paint(x, y, L.trim, lit ? 4 : 3)
    else if (kind === 'red') p.s.paint(x, y, red, lit ? 4 : 3)
    else if (kind === 'deep') p.s.paint(x, y, L.body, 2)
    else if (kind === 'lattice') p.s.paint(x, y, L.trim, 2)
    else p.s.paint(x, y, L.body, lit ? 4 : 3)
  })
}

/** Cozy: a round shaggy rug in dusty rose, a paler inner ring, a pink heart in the middle, tufts all round its edge. */
function fluffyRug(p: Pen): void {
  const L = look(p, 'cozy')
  const shag = p.add(mix(L.base, L.accent, .5), { lift: .3, drop: .26 })
  const pale = p.add(mix(L.accent, '#ffffff', .3), { lift: .2, drop: .2 })
  const cx = 32, cy = 36, rx = 21.6, ry = 14.6
  const radius = (x: number, y: number) => {
    const a = Math.atan2((y - cy) / ry, (x - cx) / rx)
    return 1 + .028 * Math.sin(a * 22) + .016 * Math.sin(a * 37 + 1)
  }
  const rug = p.test((x, y) => Math.hypot((x - cx) / rx, (y - cy) / ry) <= radius(x, y))
  p.fill(p.ell(cx + .6, cy + 1.6, rx - .4, ry - .6).subtract(rug), L.deep, 1)
  p.dome(rug, shag, { bias: .16, relief: .22 })
  p.fill(p.test((x, y) => { const d = Math.hypot((x - cx) / (rx * .66), (y - cy) / (ry * .66)); return d > .82 && d < 1 }), pale, (x, y) => (y < cy ? 4 : 3))
  for (const [x, y] of scatter(rug, 7, 11)) p.s.shift(x, y, (x + y) % 2 ? 1 : -1)
  p.dome(heart(p, cx, cy - 4.4, 5.4), L.trim, { bias: .2, relief: .3 })
}

/** Sporty: a long navy stretch mat with cyan edge stripes, its far end rolled up, a cyan resistance band lying on it. */
function stretchMat(p: Pen): void {
  const L = look(p, 'sporty')
  const r: Rug = { x0: 4, x1: 46, yb: 27, yf: 43, skew: 4 }
  edge(p, r, 1.2, L.deep)
  p.fill(p.poly(corners(r)), L.body, (x, y) => {
    const [u, v] = uv(r, x, y)
    if (v < .1 || v > .9) return v < .5 ? 5 : 4
    if (Math.abs(v - .16) < .045 || Math.abs(v - .84) < .045) return 7
    return Math.floor(u * 42) % 3 === 0 ? 3 : 4
  })
  p.fill(p.test((x, y) => { const [u, v] = uv(r, x, y); return u >= 0 && u <= 1 && v >= 0 && v <= 1 && (Math.abs(v - .16) < .05 || Math.abs(v - .84) < .05) }), L.trim, 4)
  // The roll at the right end: a short cylinder lying across the mat, its spiral facing out.
  const front: Pt = [49.6, 38.6], back: Pt = [53.6, 30.4], rad = 5.4
  const roll = p.circ(...front, rad).union(p.circ(...back, rad)).union(p.poly([[front[0] - rad * .9, front[1] - rad * .45], [back[0] - rad * .9, back[1] - rad * .45], [back[0] + rad * .9, back[1] + rad * .45], [front[0] + rad * .9, front[1] + rad * .45]]))
  p.dome(roll, L.body, { bias: .1, relief: .7 })
  const face = p.circ(...front, rad)
  p.fill(face, L.body, (x, y) => {
    const d = Math.hypot(x - front[0], y - front[1]) + Math.atan2(y - front[1], x - front[0]) * .28
    return Math.floor(d * 1.25) % 2 ? 2 : 4
  })
  p.fill(p.ring(...front, rad, rad, .9), L.trim, 3)
  // The band.
  p.fill(p.ring(22, 35, 9, 3.6, 1.3), L.trim, (x, y) => (y < 35 ? 5 : x > 26 ? 3 : 4))
}

/** Tech: a raised slate floor panel of six tiles with glowing mint seams, a sensor ring, bolts, LEDs on its edge. */
function gridPanel(p: Pen): void {
  const L = look(p, 'tech')
  const r: Rug = { x0: 8, x1: 50, yb: 19, yf: 41, skew: 6 }
  const t = 5.2
  // The front and right faces, vents and three LEDs on the front.
  p.fill(p.poly([[r.x0, r.yf], [r.x1, r.yf], [r.x1, r.yf + t], [r.x0, r.yf + t]]), L.deep, (x, y) => (y > r.yf + t - 1 ? 1 : x < r.x0 + 1 ? 3 : 2))
  p.fill(p.poly([[r.x1, r.yf], [r.x1 + r.skew, r.yb], [r.x1 + r.skew, r.yb + t], [r.x1, r.yf + t]]), L.deep, 1)
  for (let x = 12; x < 30; x += 3) p.fill(p.rect(x, r.yf + 2, x + 1.8, r.yf + 3), L.deep, 1)
  for (const x of [36, 40, 44]) bulb(p, x, r.yf + 2.6, L.light, L.accent, .6, .8)
  // The top: six tiles, the seams lit, bolts in the corners and a sensor ring in the middle tile.
  p.fill(p.poly(corners(r)), L.body, (x, y) => { const [u, v] = uv(r, x, y); return u + v < .5 ? 4 : 3 })
  const seams = p.blank()
  for (const u of [1 / 3, 2 / 3]) seams.union(p.seg(...at(r, u, 0), ...at(r, u, 1), .9))
  seams.union(p.seg(...at(r, 0, .5), ...at(r, 1, .5), .9))
  const c = corners(r)
  const border = p.path([...c, c[0]!], .9)
  p.fill(seams.union(border), L.light, 4)
  p.halo(seams, L.accent, .7)
  p.halo(border, L.accent, .7)
  const [mx, my] = at(r, .5, .26)
  const ring = p.ring(mx, my, 3.4, 2, .9)
  p.fill(ring, L.light, 5)
  p.halo(ring, L.accent)
  for (const u of [.06, .27, .4, .6, .73, .94]) for (const v of [.12, .38, .62, .88]) if ((u < .3 || u > .7 || v > .5) && (u === .06 || u === .27 || u === .73 || u === .94 || u === .4 || u === .6)) {
    const [x, y] = at(r, u, v)
    if ((Math.round(u * 100) + Math.round(v * 100)) % 2 === 0) p.dot(x, y, L.metal, 4)
  }
}

/** Wild: a lumpy rug of living moss, lime on the lit side of each clump, two stones, tiny mushrooms, glowing spores. */
function mossRug(p: Pen): void {
  const L = look(p, 'wild')
  const moss = p.add('#3f7a34', { lift: .32, drop: .28 })
  const stone = p.add('#8a9190', { lift: .3 })
  const cap = p.add('#efe2c4', { lift: .2 })
  // An island of clumps reaching well back into the room, a little bay at its front.
  const clumps = [[12, 30, 8.6], [22, 21, 9.6], [35, 17.6, 10], [47, 21, 9.4], [54, 31, 7.6], [49, 42, 8.4], [15, 42, 8.6], [31, 31, 10.4], [40, 47.6, 6], [8, 38, 5]] as const
  const soil = p.add('#3a2c22', { lift: .2 })
  // One continuous mat (the clumps a little fatter, so no floor shows between them) with a thin earthy edge along its
  // front, then each clump a low, soft bump on it.
  const blob = p.blank(), mat = p.blank(), lip = p.blank()
  for (const [x, y, r] of clumps) {
    blob.union(p.ell(x, y, r * .82, r * .46))
    mat.union(p.ell(x, y, r * 1.08, r * .62))
    lip.union(p.ell(x, y + 1.4, r * 1.08, r * .62))
  }
  p.fill(lip.subtract(mat), soil, 2)
  p.dome(mat, moss, { bias: .2, relief: .1 })
  blob.each((x, y) => {
    const ux = (x + .5) / p.k, uy = (y + .5) / p.k
    let best: readonly [number, number, number] | undefined, bd = Infinity
    for (const c of clumps) { const d = Math.hypot((ux - c[0]) / (c[2] * .82), (uy - c[1]) / (c[2] * .46)); if (d < bd) { bd = d; best = c } }
    if (!best) return
    const dx = (ux - best[0]) / (best[2] * .82), dy = (uy - best[1]) / (best[2] * .46)
    if (bd < .5 && dx + dy < -.35) p.s.paint(x, y, L.trim, (x + y) % 3 ? 3 : 4)
    else if (bd > .86 && dx + dy > .4) p.s.shift(x, y, -1)
  })
  for (const [x, y] of scatter(mat, 9, 7)) p.s.shift(x, y, 1)
  // Two stones, a cluster of little mushrooms and a few flowers.
  p.dome(p.ell(44, 36.4, 3.4, 2.2), stone, { bias: .2 })
  p.dome(p.ell(17.4, 41.6, 2.4, 1.6), stone, { bias: .2 })
  for (const [x, y, s] of [[29, 30.4, 1], [31.6, 31.6, .8], [27.2, 32.2, .7]] as const) {
    p.fill(p.rect(x - .4, y, x + .4, y + 2.2 * s), cap, 3)
    p.dome(p.ell(x, y, 1.9 * s, 1.1 * s).subtract(p.test((_x, yy) => yy > y + .3)), cap, { bias: .2 })
  }
  for (const [x, y] of [[12, 34], [40, 28.6], [50, 35], [33, 42], [21, 36]] as const) p.dot(x, y, cap, 5)
  for (const [x, y] of [[19, 29], [45, 27.4], [27, 40], [54, 33.4]] as const) bulb(p, x, y, L.light, L.accent, .8)
}

export const FLOORS: Record<Style, Painter> = { neon: lightGridMat, classic: wovenRug, cozy: fluffyRug, sporty: stretchMat, tech: gridPanel, wild: mossRug }
