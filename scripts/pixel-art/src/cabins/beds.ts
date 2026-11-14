// The six beds, side on, the head at the left, standing on the floor at y ≈ 57 of the 64-unit box.
import type { Style } from './items.ts'
import { mix, type Painter, type Pen } from './kit.ts'
import { look } from './look.ts'
import { bulb, heart, leaf, shadeLeaf, tube } from './parts.ts'

/** Neon: a rounded pod on a glowing pedestal, a smoked-glass canopy slid back over the foot, a magenta rim. */
function glowPod(p: Pen): void {
  const L = look(p, 'neon')
  const glass = p.add('#3a2d70', { lift: .32, drop: .32 })
  p.shadow(32, 57.4, 26, 2.8, 84)
  p.wash(p.ell(32, 57.6, 29, 3.6), L.accent, (x, y) => 78 * Math.max(0, 1 - Math.hypot((x - 32) / 29, (y - 57.6) / 3.6)))
  // The pedestal and its under-glow.
  p.fill(p.poly([[18, 50], [46, 50], [42.5, 56.6], [21.5, 56.6]]), L.deep, (_x, y) => (y < 52 ? 2 : 1))
  const foot = p.rect(23, 55.4, 41, 56.6)
  p.fill(foot, L.light, 4)
  p.halo(foot, L.accent)
  // The mattress and pillow, seen over the shell's lip at the head end.
  p.fill(p.rrect(7, 26.5, 57, 34, 2.5), L.cloth, (_x, y) => (y < 28.5 ? 4 : 3))
  p.dome(p.ell(14.5, 27.6, 6, 3.1), L.cloth, { bias: .2, relief: .5 })
  p.fill(p.rrect(21, 27, 56, 33, 2), L.trim, (x, y) => (y < 28.6 ? 4 : (x + y) % 5 < 1 ? 2 : 3))
  // The shell: a long rounded tub.
  const shell = p.rrect(3, 31, 61, 52, 10.5)
  p.cylH(shell, L.body)
  p.fill(p.rect(9, 31, 55, 32), L.body, 4)
  // The canopy over the foot: smoked glass with a lit reflection, the rim a magenta tube.
  const canopy = p.ell(40.5, 32, 20, 16.5).subtract(p.test((_x, y) => y >= 31.6))
  p.dome(canopy, glass, { bias: -.22, relief: .9 })
  p.fill(p.ell(40.5, 32, 15.5, 12.5).subtract(p.ell(41.5, 33.5, 14.5, 12.5)).subtract(p.test((x, y) => y >= 30 || x > 46)), glass, 5)
  const rim = p.ring(40.5, 32, 20, 16.5, 1.5).subtract(p.test((_x, y) => y >= 31.6))
  p.fill(rim, L.light, 4)
  p.halo(rim, L.accent)
  // The waist strip and a head-end indicator.
  tube(p, [[8, 42], [56, 42]], L.light, L.accent, 1.6)
  bulb(p, 9, 47, L.light, L.accent, .8)
  if (p.big) for (const x of [16, 24, 32, 40, 48]) p.fill(p.hair(x, 44, x, 50), L.body, 2)
}

/** Classic: a two-tier oak bunk with brass finials, a ladder at the foot, drawers under, a clip lamp on the post. */
function oakBunk(p: Pen): void {
  const L = look(p, 'classic')
  const sheet = p.add('#e6d9bc', { lift: .2, drop: .26 })
  const wool = p.add('#7c3230', { lift: .3 })
  p.shadow(31.5, 57.4, 29, 2.6, 84)
  const tier = (top: number) => {
    p.fill(p.rect(7, top, 55, top + 3), sheet, 4)
    p.fill(p.rect(7, top + 3, 55, top + 6), sheet, 3)
    p.dome(p.ell(12.5, top + 1.2, 4.6, 2.4), sheet, { bias: .25, relief: .5 })
    // The wool blanket over the foot two thirds, a gold stripe near its fold.
    p.fill(p.rect(18, top - .5, 55, top + 6.5), wool, (x, y) => (y < top + 1.5 ? 4 : (x - 18) % 7 < 1 ? 2 : 3))
    p.fill(p.rect(18, top + 2, 55, top + 3), L.trim, 4)
    p.box(7, top + 6, 55, top + 11, 0, L.body)
    if (p.big) p.fill(p.hair(9, top + 8.5, 53, top + 8.5), L.body, 2)
  }
  tier(14)
  tier(37)
  // The upper guard rail with two balusters.
  p.cylH(p.rect(7, 8.5, 40, 10.5), L.body)
  for (const x of [18, 29]) p.cylV(p.rect(x, 10.5, x + 2, 14), L.body)
  // A low stretcher rail between the posts under the lower bunk.
  p.cylH(p.rect(7, 52, 55, 53.6), L.body)
  // The posts, finials and the ladder.
  for (const x of [3, 55]) p.cylV(p.rect(x, 6, x + 4, 57), L.body)
  for (const x of [5, 57]) p.dome(p.circ(x, 5.2, 2.4), L.trim, { bias: .25 })
  for (const x of [44.5, 51]) p.cylV(p.rect(x, 9, x + 2.4, 57), L.body)
  for (const y of [14, 21, 28, 35, 42, 49]) p.cylH(p.rect(46.9, y, 51, y + 1.5), L.trim)
}

/** Cozy: seen from the foot, a scalloped plum headboard, tufted, with string lights, two big pillows, a rose quilt. */
function quiltedBed(p: Pen): void {
  const L = look(p, 'cozy')
  const quilt = p.add(mix(L.base, L.accent, .58), { lift: .3, drop: .26 })
  const pillow = p.add('#f6e4ea', { lift: .2, drop: .22 })
  const knit = p.add('#f2d3b0', { lift: .24 })
  p.shadow(32, 56.6, 28.5, 2.6, 84)
  for (const x of [10, 54]) p.dome(p.ell(x, 55.2, 2.2, 1.8), L.deep, { bias: .1 })
  // The headboard: three soft scallops, tufted, piped in pink, a little heart in the middle.
  const bumps = [[19.4, 21, 8.8], [32, 17.5, 10], [44.6, 21, 8.8]] as const
  const top = (x: number) => Math.min(...bumps.map(([cx, cy, r]) => (Math.abs(x - cx) <= r ? cy - Math.sqrt(r * r - (x - cx) * (x - cx)) : 99)))
  const head = p.test((x, y) => x >= 10.6 && x < 53.4 && y >= top(x) && y < 36)
  p.dome(head, L.deep, { bias: -.04, relief: .24 })
  p.edge(head, L.trim, 1)
  for (const [x, y] of [[19.4, 20], [25.7, 24.5], [32, 20], [38.3, 24.5], [44.6, 20], [14.6, 26], [49.4, 26], [32, 28]] as const) {
    if (p.big) p.fill(p.ell(x - .3, y - .3, 1.1, .8), L.deep, 4)
    p.dot(x, y, L.deep, 1)
  }
  p.dome(heart(p, 32, 10.6, 2.7), L.trim, { bias: .3, relief: .6 })
  // The pillows.
  for (const x of [22.6, 41.4]) {
    p.dome(p.ell(x, 31.4, 8.6, 4.4), pillow, { bias: .22, relief: .5 })
    p.fill(p.hair(x - 5.4, 31.6, x + 5.4, 31.6), pillow, 2)
  }
  // The quilt's top, a knit throw across the foot, then the scalloped drape at the front.
  const left = (y: number) => 10.4 - (y - 34.5) * .26, right = (y: number) => 53.6 + (y - 34.5) * .26
  const surface = p.test((x, y) => y >= 34.5 && y < 46 && x >= left(y) && x < right(y))
  p.fill(surface, quilt, (x, y) => {
    const a = (((x * .5 + y * 1.25) / 3.6) % 1 + 1) % 1, b = (((x * .5 - y * 1.25) / 3.6) % 1 + 1) % 1
    return a < .12 || b < .12 ? 3 : 4
  })
  p.fill(p.test((x, y) => y >= 40 && y < 44.4 && x >= left(y) && x < right(y)), knit, (x, y) => (y < 41 ? 5 : (Math.floor(x * 1.4) + Math.floor(y * 1.4)) % 2 ? 3 : 4))
  const hem = (x: number) => { const f = (((x - 7.4) % 6) + 6) % 6; return 51.6 + 1.6 * Math.sqrt(Math.max(0, 1 - ((f - 3) / 3) ** 2)) }
  const drape = p.test((x, y) => x >= 7.4 && x < 56.6 && y >= 46 && y <= hem(x))
  p.fill(drape, quilt, (x, y) => {
    if (y < 47) return 5
    const a = (((x + y) / 6) % 1 + 1) % 1, b = (((x - y) / 6) % 1 + 1) % 1
    if (a < .1 || b < .1) return 2
    return x < 11 ? 4 : x > 53 ? 2 : a < .45 ? 4 : 3
  })
  p.fill(p.test((x, y) => x >= 7.4 && x < 56.6 && y > hem(x) - 1.1 && y <= hem(x)), L.trim, 3)
  // String lights strung across the scallops' peaks.
  const peaks: [number, number][] = [[9.6, 19], [19.4, 10.2], [32, 5.8], [44.6, 10.2], [54.4, 19]]
  const at = (i: number, t: number): [number, number] => {
    const [ax, ay] = peaks[i]!, [bx, by] = peaks[i + 1]!
    return [ax + (bx - ax) * t, ay + (by - ay) * t + Math.sin(t * Math.PI) * 3]
  }
  for (let i = 0; i < peaks.length - 1; i++) p.fill(p.curve((t) => at(i, t), .5, 12), L.deep, 1)
  for (let i = 0; i < peaks.length - 1; i++) for (const t of [.3, .75]) { const [x, y] = at(i, t); bulb(p, x, y + 1, L.light, L.accent, 1.3) }
}

/** Sporty: a low folding cot, taut navy canvas on X legs with a cyan stripe, a pillow, a towel over the side, a bottle. */
function trainingCot(p: Pen): void {
  const L = look(p, 'sporty')
  const towel = p.add('#e8f1f6', { lift: .2, drop: .24 })
  const blanket = p.add('#2f6d9c', { lift: .3 })
  p.shadow(31.5, 57.2, 28, 2.3, 80)
  const t = 33 // the canvas's top edge; everything above the legs hangs off it
  for (const [a, b] of [[11, 22], [41, 52]] as const) {
    p.cylV(p.seg(a, t + 6, b, 56.2, 1.8), L.metal)
    p.cylV(p.seg(b, t + 6, a, 56.2, 1.8), L.metal)
    for (const x of [a, b]) p.fill(p.rect(x - 1.6, 55.6, x + 1.6, 57), L.deep, 1)
    p.dome(p.circ((a + b) / 2, (t + 6 + 56.2) / 2, 1.2), L.trim, { bias: .2 })
  }
  // The canvas: a lit top, its front sagging between the rails, a cyan stripe.
  p.fill(p.rect(7, t, 57, t + 3), L.body, (x, y) => (y < t + 1 ? 5 : p.big && x % 5 < .6 ? 3 : 4))
  const sag = (x: number) => t + 7.4 + 1.3 * Math.sin(((x - 7) / 50) * Math.PI)
  p.fill(p.test((x, y) => x >= 7 && x < 57 && y >= t + 3 && y <= sag(x)), L.body, (x, y) => (y > sag(x) - 1 ? 2 : 3))
  p.fill(p.test((x, y) => x >= 7 && x < 57 && Math.abs(y - (t + 5.4 + .8 * Math.sin(((x - 7) / 50) * Math.PI))) < .7), L.trim, 4)
  p.cylH(p.rect(5, t + 2.4, 59, t + 4), L.metal)
  for (const x of [4.5, 57.5]) p.cylV(p.rect(x, t - 1.5, x + 2, t + 8.4), L.metal)
  // A striped pillow at the head, a folded blanket at the foot, a towel over the side.
  p.dome(p.ell(14.5, t - 1.4, 7, 3.2), towel, { bias: .25, relief: .5 })
  p.fill(p.rect(9, t - 1.6, 20, t - .7), L.trim, 3)
  p.box(39, t - 4.4, 54, t + .6, 1.6, blanket)
  p.fill(p.rect(39, t - 2, 54, t - 1.2), L.trim, 4)
  const drop = (x: number) => t + 15 + .8 * Math.sin(x * 1.3)
  p.fill(p.test((x, y) => x >= 26 && x < 34 && y >= t - .4 && y <= drop(x)), towel, (x, y) => (y < t + 1 ? 5 : x < 27 ? 4 : x > 33 ? 2 : 3))
  for (const y of [t + 10, t + 12]) p.fill(p.test((x, yy) => x >= 26 && x < 34 && yy >= y && yy < y + .9), L.trim, 3)
  // A sports bottle on the floor by the foot.
  p.cylV(p.rrect(54.6, 47.6, 59, 56.8, 1.2), L.trim)
  p.fill(p.rect(54.6, 50.4, 59, 52), towel, 4)
  p.cylV(p.rect(55.6, 45.8, 58, 47.6), L.deep)
}

/** Tech: two stacked sleep capsules, rounded doorways lit mint inside, a shutter, a status panel, an LED plinth. */
function capsuleBunk(p: Pen): void {
  const L = look(p, 'tech')
  const shell = p.add('#c9d6dc', { lift: .26, drop: .3 })
  p.shadow(32, 57.4, 29, 2.6, 84)
  p.box(5, 51, 59, 56.8, 0, L.deep)
  const led = p.rect(8, 53, 56, 54)
  p.fill(led, L.light, 4)
  p.halo(led, L.accent)
  const pod = (x0: number, top: number, shutter: number) => {
    // A pill-shaped shell lit along its top and left, shaded along its bottom and right.
    p.fill(p.rrect(x0, top, 61, top + 22.5, 9.5), L.body, (x, y) => {
      const t = y < top + 1.2 ? 5 : y < top + 3.4 ? 4 : y > top + 20.6 ? 2 : 3
      return x < x0 + 1.4 ? Math.min(5, t + 1) : x > 59.6 ? Math.max(1, t - 1) : t
    })
    // The doorway: a pale bezel, a dark lit interior, a mattress and a pillow, the shutter drawn partway.
    const d0 = x0 + 5, d1 = 46
    p.fill(p.rrect(d0, top + 5, d1, top + 21, 5), shell, (x, y) => (x + y < d0 + top + 12 ? 4 : 2))
    const inner = p.rrect(d0 + 1.5, top + 6.5, d1 - 1.5, top + 19.5, 4)
    p.fill(inner, L.deep, (_x, y) => (y < top + 12 ? 2 : 1))
    p.wash(inner, L.accent, (_x, y) => Math.max(0, 70 - (y - top - 6.5) * 6), false)
    const strip = p.rect(d0 + 6, top + 7, d1 - 6, top + 8)
    p.fill(strip, L.light, 5)
    p.halo(strip, L.accent)
    p.fill(p.rect(d0 + 2, top + 14.5, d1 - 2, top + 19.5), shell, (_x, y) => (y < top + 16 ? 5 : 4))
    p.dome(p.ell(d0 + 7.5, top + 14.4, 4.2, 2), shell, { bias: .3, relief: .5 })
    if (shutter > 0) p.fill(p.rect(d0 + 1.5, top + 6.5, d1 - 1.5, top + 6.5 + shutter), shell, (_x, y) => ((y - top) % 2 < 1 ? 4 : 2))
    // The panel: a small mint screen, three LEDs and a vent.
    p.fill(p.rrect(49, top + 5, 58, top + 21, 1.4), L.deep, 2)
    const screen = p.rect(50.2, top + 6.5, 56.8, top + 11)
    p.fill(screen, L.light, (x, y) => ((x > 51.4 && x < 55.6 && Math.round(y - top) === 9) ? 5 : 3))
    p.halo(screen, L.accent, .7)
    for (const x of [51, 53.5, 56]) bulb(p, x, top + 14, L.light, L.accent, .6, .8)
    for (const y of [17, 19]) p.fill(p.rect(50.2, top + y, 56.8, top + y + .9), L.deep, 1)
  }
  pod(3, 28.5, 5)
  pod(17, 5, 0)
  // A short ladder up to the top capsule.
  for (const x of [5, 11]) p.cylV(p.rect(x, 7, x + 1.6, 29), L.metal)
  for (const y of [10, 14.4, 18.8, 23.2]) p.cylH(p.rect(6.6, y, 11, y + 1.3), L.metal)
}

/** Wild: a net hammock slung between two forked driftwood posts, lime fringe, leaves and three fireflies. */
function ropeHammock(p: Pen): void {
  const L = look(p, 'wild')
  const drift = p.add('#857c62', { lift: .3, drop: .3 })
  const rope = p.add('#c9b083', { lift: .24 })
  const leafy = p.add('#4f8a3a', { lift: .3 })
  p.shadow(32, 57.4, 29, 2.3, 70)
  // The posts, a forked twig at each top.
  const posts = [p.poly([[4, 10], [8.6, 9], [9.2, 32], [8.6, 57], [4.4, 57], [5, 31]]), p.poly([[55.4, 9], [60, 10], [59, 31], [59.6, 57], [55.4, 57], [54.8, 32]])]
  for (const m of posts) p.cylV(m, drift)
  p.cylV(p.seg(7.6, 12, 11.4, 5.8, 1.6), drift)
  p.cylV(p.seg(56.4, 12, 52.6, 5.8, 1.6), drift)
  if (p.big) for (const x of [6.4, 57.4]) p.fill(p.hair(x, 16, x - .4, 50), drift, 2)
  // Ropes to the spreader bars.
  for (const [a, b] of [[8, 13.5], [56, 13.5]] as const) {
    const end = a < 32 ? 15 : 49
    p.fill(p.seg(a, b, end, 25.5, .9), rope, 3)
    p.fill(p.seg(a, b + 1.4, end, 31, .9), rope, 2)
  }
  for (const x of [14.2, 48.6]) p.cylV(p.rect(x, 24.5, x + 1.6, 32.5), drift)
  // The sling: a net of lime cords on deep green, a lit upper rim, a fringe.
  const top = (x: number) => 26 + 10.5 * Math.sin(((x - 15.6) / 33) * Math.PI)
  const bottom = (x: number) => 31.5 + 14 * Math.sin(((x - 15.6) / 33) * Math.PI)
  const sling = p.test((x, y) => x >= 15.6 && x < 48.6 && y >= top(x) && y <= bottom(x))
  p.fill(sling, L.body, (x, y) => {
    if (y < top(x) + 1.3) return 5
    const a = (((x + y * 1.4) / 4) % 1 + 1) % 1, b = (((x - y * 1.4) / 4) % 1 + 1) % 1
    return a < .22 || b < .22 ? 4 : y > bottom(x) - 1.2 ? 2 : 3
  })
  p.fill(p.test((x, y) => x >= 15.6 && x < 48.6 && y >= top(x) && y < top(x) + 1.2), L.trim, 4)
  for (let x = 18; x < 47; x += 3) { const y = bottom(x); p.fill(p.seg(x, y, x, y + 2.6, .8), L.trim, 3) }
  p.dome(p.ell(21.5, top(21.5) + 2.6, 4.2, 2.6), p.add('#e8e3c8', { lift: .2 }), { bias: .2, relief: .5 })
  // Leaves on the posts.
  for (const [x, y, d] of [[8.6, 22, -30], [8.4, 26, 20], [55, 36, 200], [55.4, 41, 160], [55.2, 16, 210]] as const) {
    const m = leaf(p, x, y, 5, 2.6, d)
    shadeLeaf(p, m, leafy, x, y, d)
  }
  for (const [x, y] of [[26, 15], [39, 10.5], [45.5, 19]] as const) bulb(p, x, y, L.light, L.accent, .9)
}

export const BEDS: Record<Style, Painter> = { neon: glowPod, classic: oakBunk, cozy: quiltedBed, sporty: trainingCot, tech: capsuleBunk, wild: ropeHammock }
