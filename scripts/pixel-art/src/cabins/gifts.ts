// The twelve gifts (64 px icons), two of each kind. Their own colours: each object's natural materials, with the kind's
// accent from the game's stand-ins (snacks amber, music lavender, gear sky blue, plants green, books cream, keepsakes pink).
import { intersect, lightTones, type Painter, type Pen, type Pt } from './kit.ts'
import { bulb, heart, leaf, shadeLeaf, starPts } from './parts.ts'

/** Turns a local (u, v) shape about (cx, cy) by `deg`, for objects lying at a slant. */
function turned(cx: number, cy: number, deg: number) {
  const a = (deg * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a)
  return {
    world: (u: number, v: number): Pt => [cx + u * c - v * s, cy + u * s + v * c],
    local: (x: number, y: number): [number, number] => { const dx = x - cx, dy = y - cy; return [dx * c + dy * s, -dx * s + dy * c] },
  }
}

/** Steamed Buns: a bamboo steamer, three soft buns with pleated tops, steam rising. */
function buns(p: Pen): void {
  const bamboo = p.add('#c8a05e', { lift: .28, drop: .3 })
  const dough = p.add('#f6efe2', { lift: .14, drop: .2 })
  p.shadow(32, 55.6, 22, 2.2, 80)
  p.fill(p.test((x, y) => y >= 36 && y < 52 && Math.hypot((x - 32) / 21, 0) <= 1).union(p.ell(32, 52, 21, 4)), bamboo, (x, y) => {
    if (y > 49 && Math.hypot((x - 32) / 21, (y - 52) / 4) > .85) return 1
    const band = (y - 36) % 5.4 < 1.1
    return band ? 2 : x < 14 ? 4 : x > 49 ? 2 : (Math.floor(x * 1.4) % 3 === 0 ? 2 : 3)
  })
  p.fill(p.ell(32, 36, 21, 5.4), bamboo, (x, y) => (Math.hypot((x - 32) / 21, (y - 36) / 5.4) > .8 ? (y < 36 ? 5 : 4) : 2))
  // The buns: a back one between two in front, each with a swirl of pleats.
  for (const [x, y, rx, ry] of [[32, 28.6, 7.4, 6], [23.6, 32.6, 7.6, 6.2], [40.4, 32.6, 7.6, 6.2]] as const) {
    p.dome(p.ell(x, y, rx, ry).subtract(p.test((_x, yy) => yy > 37.4)), dough, { bias: .25, relief: .7 })
    for (const d of [-50, 0, 50]) p.fill(p.seg(x, y - ry + 1.6, x + Math.sin((d * Math.PI) / 180) * 2.6, y - ry + 3.6, .5), dough, 2)
    p.dot(x, y - ry + 1.4, dough, 2)
  }
  for (const [x0, len] of [[22, 12], [36, 14]] as const) {
    const wisp = p.curve((t) => [x0 + Math.sin(t * 7) * 1.4, 22 - t * len] as const, .9, 14)
    p.wash(wisp, '#ffffff', (_x, y) => 150 - (22 - y) * (110 / len))
  }
}

/** Fizz Candy: a striped paper cone heaped with round candies, fizz bubbles rising off them. */
function candy(p: Pen): void {
  const paper = p.add('#f4eadc', { lift: .16, drop: .26 })
  const amber = p.add('#ffb347', { lift: .34, drop: .3 })
  const fizz = p.add('#bfeaff', { lift: .2 })
  p.shadow(32, 58, 7, 1.4, 70)
  const cone = p.poly([[17.6, 27], [46.4, 27], [33.4, 58], [30.6, 58]])
  p.fill(cone, paper, (x, y) => (((x - 32) * .9 + y) % 7 < 3.2 ? 1 : 2))
  cone.each((x, y) => {
    const ux = (x + .5) / p.k, uy = (y + .5) / p.k, onStripe = ((ux - 32) * .9 + uy) % 7 < 3.2
    p.s.paint(x, y, onStripe ? amber : paper, ux < 26 ? 4 : ux > 38 ? 2 : 3)
  })
  p.fill(p.rect(17.6, 26.6, 46.4, 28.4), paper, 5)
  // The candies heaped over the rim.
  const colors = ['#ff6fae', '#ffb347', '#8be36a', '#a98bff', '#5fd0ff', '#ff6fae', '#ffd447']
  for (const [i, [x, y, r]] of ([[22, 25.4, 3.6], [29.4, 23.6, 3.8], [37, 24.4, 3.6], [43, 26, 3.2], [26, 18.8, 3.4], [33.6, 17.6, 3.6], [40, 20.4, 3]] as const).entries()) {
    const id = p.add(colors[i]!, { lift: .36, drop: .3 })
    p.dome(p.circ(x, y, r), id, { bias: .2, relief: .7 })
  }
  for (const [x, y, r] of [[20, 12, 1.6], [27, 8.6, 1.2], [38, 10.4, 1.8], [45, 14.6, 1.2], [31, 4.6, 1]] as const) p.fill(p.ring(x, y, r, r, .6), fizz, 4)
}

/** Mix Tape: a violet cassette with a hand-labelled sticker, two reels in the window, screws and the head slot. */
function tape(p: Pen): void {
  const shell = p.add('#3c2c6a', { lift: .3, drop: .3 })
  const label = p.add('#f1e8d4', { lift: .16, drop: .24 })
  const lilac = p.add('#b48cff', { lift: .34, drop: .3 })
  const reel = p.add('#e8e2f2', { lift: .2 })
  const ink = p.add('#3a3046', { lift: .2 })
  p.shadow(32, 54.4, 24, 2, 80)
  p.box(7, 14, 57, 51.6, 2.2, shell, { round: true })
  p.fill(p.rrect(11, 19, 53, 39, 1.6), label, (x, y) => (x + y < 34 ? 5 : 4))
  p.fill(p.rect(11, 19, 53, 22.6), lilac, 4)
  p.fill(p.curve((t) => [14 + t * 24, 25.4 + Math.sin(t * 16) * .7] as const, .6, 30), ink, 2)
  // The window and its reels.
  p.fill(p.rrect(19, 28.6, 45, 36.6, 3.6), shell, 1)
  for (const x of [25, 39]) {
    p.fill(p.circ(x, 32.6, 3.2), reel, 4)
    p.fill(p.circ(x, 32.6, 1.4), shell, 1)
    for (const [dx, dy] of [[0, -2.2], [1.9, 1.1], [-1.9, 1.1]] as const) p.dot(x + dx, 32.6 + dy, shell, 2)
  }
  p.fill(p.rect(28.6, 31.4, 35.4, 34.6), p.add('#6a3e2a'), 2)
  // The head slot, its holes and four screws.
  p.fill(p.poly([[18, 51.6], [46, 51.6], [43, 43.6], [21, 43.6]]), shell, 2)
  for (const x of [24, 32, 40]) p.fill(p.rect(x - 1, 46.4, x + 1, 48.6), shell, 1)
  for (const [x, y] of [[9.6, 17.4], [54.4, 17.4], [9.6, 49], [54.4, 49], [32, 41.6]] as const) p.dot(x, y, reel, 3)
}

/** Spare Earbuds: a white charging case with its lid up, one bud seated, the other lying in front, a lavender light. */
function earbuds(p: Pen): void {
  const white = p.add('#eceaf2', { lift: .14, drop: .24 })
  const mesh = p.add('#5a5670', { lift: .3 })
  const lilac = p.tones(lightTones('#b48cff'))
  p.shadow(31, 54.6, 22, 2.2, 80)
  // The lid tipped back, its inside in shade, then the case.
  p.fill(p.ell(28, 30, 15, 9).subtract(p.test((_x, y) => y > 30)), white, (x, y) => (Math.hypot((x - 28) / 15, (y - 30) / 9) > .82 ? 4 : 2))
  p.dome(p.rrect(13, 29.6, 43, 50, 9), white, { bias: .2, relief: .5 })
  p.fill(p.rect(13.6, 33.4, 42.4, 34.2), white, 2)
  p.fill(p.ell(28, 31.4, 12.4, 2.4), white, 1)
  bulb(p, 28, 41, lilac, '#b48cff', .7)
  const tip = p.add('#b48cff', { lift: .34, drop: .3 })
  // One bud seated in the case, its lilac ear tip up.
  p.dome(p.circ(24, 28.6, 4), white, { bias: .25, relief: .6 })
  p.dome(p.ell(22.4, 25.6, 2.4, 1.8), tip, { bias: .2, relief: .6 })
  // The other lying in front, its stem pointing right, its ear tip to the left.
  p.cylH(p.rrect(44.6, 47, 58, 50.8, 1.6), white)
  p.dome(p.circ(45, 46.4, 5), white, { bias: .25, relief: .6 })
  p.fill(p.ell(46.4, 45.4, 1.6, 1.2), mesh, 2)
  p.dome(p.ell(40.4, 46.4, 1.9, 2.6), tip, { bias: .2, relief: .6 })
}

/** Grip Gloves: a pair of sky-blue fingerless gloves, one over the other, grip dots on the palms, white straps. */
function gloves(p: Pen): void {
  const blue = p.add('#4f9fd6', { lift: .3, drop: .3 })
  const dark = p.add('#24425a', { lift: .3 })
  const strap = p.add('#eef3f6', { lift: .16 })
  p.shadow(32, 57, 23, 2, 80)
  for (const [cx, cy, deg, back] of [[24, 33, -14, true], [40, 35, 12, false]] as const) {
    const g = turned(cx, cy, deg)
    const inside = (f: (u: number, v: number) => boolean) => p.test((x, y) => f(...g.local(x, y)))
    const palm = inside((u, v) => Math.abs(u) <= 8 && v >= -6 && v <= 10 && Math.hypot(Math.max(0, Math.abs(u) - 5), Math.max(0, v - 7)) <= 3)
    const fingers = inside((u, v) => [-6, -2, 2, 6].some((fu) => Math.abs(u - fu) <= 1.7 && v >= -12 && v < -5) || (u > 7 && u < 12.4 && v > -3 + (u - 7) * -.6 && v < 4 && Math.hypot(u - 9.6, v - .5) < 3.4))
    p.dome(fingers.union(palm), blue, { bias: back ? .05 : .15, relief: .5 })
    for (const fu of [-6, -2, 2, 6]) { const [x, y] = g.world(fu, -11.2); p.dot(x, y, dark, 3) }
    if (!back) for (let u = -5; u <= 5; u += 3) for (let v = -2; v <= 6; v += 3) { const [x, y] = g.world(u, v); p.dot(x, y, dark, 2) }
    p.fill(inside((u, v) => Math.abs(u) <= 8.4 && v > 10 && v < 14.6), dark, 3)
    p.fill(inside((u, v) => Math.abs(u) <= 8.4 && v > 11 && v < 13.4), strap, 4)
  }
}

/** Tune-Up Kit: a red toolbox, lid open, a wrench and a blue-handled screwdriver standing up out of its tray. */
function kit(p: Pen): void {
  const red = p.add('#c4473a', { lift: .3, drop: .3 })
  const steel = p.add('#aab4bf', { lift: .3, drop: .3 })
  const blue = p.add('#4f9fd6', { lift: .3 })
  p.shadow(32, 57.2, 24, 2, 80)
  // The lid tipped back behind, its inside dark.
  p.fill(p.poly([[12, 33], [52, 33], [56, 20], [16, 20]]), red, (x, y) => (y < 21.6 ? 4 : 1))
  // The tools.
  p.cylV(p.rect(23, 10, 26, 34), steel)
  p.fill(p.ring(24.5, 9.4, 4.4, 4.4, 2).subtract(p.rect(23.4, 3, 25.6, 9.4)), steel, (x) => (x < 24 ? 4 : 2))
  p.cylV(p.rect(37.6, 8, 39.4, 22), steel)
  p.cylV(p.rrect(35.4, 20, 41.6, 34, 2), blue)
  p.fill(p.rect(35.4, 24, 41.6, 25), blue, 2)
  // The box with its latches and handle.
  p.box(10, 32, 54, 56.4, 3, red, { round: true })
  p.fill(p.rect(10.6, 40, 53.4, 41), red, 2)
  for (const x of [16, 48]) p.fill(p.rrect(x - 2, 37.4, x + 2, 43.4, .6), steel, (xx, y) => (y < 39 || xx < x - 1 ? 4 : 3))
  p.cylH(p.rrect(26, 44.6, 38, 46.4, .8), steel)
}

/** Tiny Succulent: a rosette of plump sea-green leaves with pink tips in a little terracotta pot, a pebble beside it. */
function succulent(p: Pen): void {
  const clay = p.add('#c06a48', { lift: .3, drop: .3 })
  const green = p.add('#6fb39a', { lift: .3, drop: .3 })
  const tip = p.add('#ff8fa8', { lift: .3 })
  const soil = p.add('#4a3428', { lift: .2 })
  const stone = p.add('#9aa2a4', { lift: .3 })
  p.shadow(31, 57.2, 17, 2, 80)
  p.cylV(p.poly([[19.6, 40], [44.4, 40], [41.6, 56.4], [22.4, 56.4]]), clay)
  p.box(18, 37, 46, 42, 0, clay, { round: true })
  p.fill(p.ell(32, 37.4, 12.6, 2.2), soil, 2)
  // The rosette: back leaves first, then a ring nearer, then the heart of it.
  const ring = (n: number, r: number, len: number, wid: number, cy: number, start: number) => {
    for (let i = 0; i < n; i++) {
      const a = start + (i / n) * Math.PI * 2, x = 32 + Math.cos(a) * r, y = cy + Math.sin(a) * r * .45
      const d = (Math.atan2(Math.sin(a) * .45, Math.cos(a)) * 180) / Math.PI
      const m = leaf(p, 32 + Math.cos(a) * r * .2, cy + Math.sin(a) * r * .1, len, wid, d)
      p.dome(m, green, { bias: Math.sin(a) > 0 ? .2 : -.05, relief: .6 })
      p.dot(x + Math.cos(a) * (len - r) * .9, y + Math.sin(a) * (len - r) * .4, tip, 3)
    }
  }
  ring(8, 10, 12.6, 6.4, 32, 0)
  ring(6, 6, 8.4, 5, 31.4, .5)
  p.dome(p.ell(32, 30.4, 3.4, 2.6), green, { bias: .3, relief: .6 })
  p.dome(p.ell(50.6, 55, 3.4, 2), stone, { bias: .2 })
}

/** Seed Packet: a cream packet with a crimped top, a picture of a sprout on green, seeds spilling from its corner. */
function seeds(p: Pen): void {
  const paper = p.add('#efe4c8', { lift: .16, drop: .26 })
  const green = p.add('#7be38a', { lift: .3, drop: .32 })
  const dark = p.add('#2e6a3a', { lift: .3 })
  const seed = p.add('#8a5a36', { lift: .3 })
  p.shadow(32, 57.2, 21, 2, 80)
  const g = turned(30, 31, -28)
  const inside = (f: (u: number, v: number) => boolean) => p.test((x, y) => f(...g.local(x, y)))
  const packet = inside((u, v) => Math.abs(u) <= 15 && v <= 23 && v >= -21 + (Math.abs((u + 30) % 3 - 1.5) < .75 ? 0 : 1))
  p.fill(packet, paper, (x, y) => { const [u, v] = g.local(x, y); return v < -18.6 ? 3 : u < -13.4 ? 5 : u > 13.6 ? 3 : 4 })
  p.fill(inside((u, v) => Math.abs(u) <= 15 && v > -18.6 && v < -17.6), paper, 2)
  // The picture: green ground, a sprout with two leaves, a sun.
  p.fill(inside((u, v) => Math.abs(u) <= 11.6 && v > -14 && v < 9), green, (x, y) => (g.local(x, y)[1] > 4 ? 2 : 4))
  p.fill(inside((u, v) => Math.abs(u) < .8 && v > -4 && v < 5), dark, 3)
  for (const [u, d] of [[-.4, -150], [.4, -30]] as const) {
    const [x, y] = g.world(u, -3.4)
    shadeLeaf(p, leaf(p, x, y, 7, 3.6, d - 6), dark, x, y, d - 6, 4)
  }
  const [sx, sy] = g.world(7, -9.6)
  p.dome(p.circ(sx, sy, 2.4), p.add('#ffd166', { lift: .4 }), { bias: .3 })
  p.fill(inside((u, v) => Math.abs(u) <= 10 && v > 13 && v < 14.4), dark, 3)
  p.fill(inside((u, v) => Math.abs(u) <= 6 && v > 16.6 && v < 17.8), dark, 2)
  for (const [x, y] of [[48, 55], [51.4, 53], [53, 56], [46, 52.4]] as const) p.dome(p.ell(x, y, 1.4, 1), seed, { bias: .3 })
}

/** Paperback Novel: a paperback standing open a crack, a night cover with a crescent moon, page edges, a red bookmark. */
function novel(p: Pen): void {
  const cover = p.add('#3c3a6e', { lift: .3, drop: .3 })
  const spine = p.add('#2c2a52', { lift: .3 })
  const pages = p.add('#f2e8cc', { lift: .14, drop: .24 })
  const cream = p.add('#f2d49b', { lift: .3 })
  const red = p.add('#c8463e', { lift: .3 })
  p.shadow(33, 57, 17, 2, 80)
  // The pages' edge on the right, the spine on the left, the front cover.
  p.fill(p.poly([[44, 10.6], [48.4, 13], [48.4, 56], [44, 54.6]]), pages, (_x, y) => (Math.floor(y * p.k) % 2 ? 4 : 3))
  p.fill(p.poly([[15, 12], [19, 9.6], [19, 55], [15, 56.6]]), spine, (x) => (x < 16.4 ? 4 : 2))
  p.box(19, 9.6, 44.4, 55, 0, cover)
  p.fill(p.rect(19, 9.6, 44.4, 10.6), cover, 4)
  // The cover art: a crescent moon, small stars, a title band and an author line in cream.
  p.dome(p.circ(31.6, 26, 7.6).subtract(p.circ(35, 23.6, 6.4)), cream, { bias: .2, relief: .4 })
  for (const [x, y] of [[38, 17], [41, 30], [24, 16.4], [36.6, 33.6]] as const) p.dot(x, y, cream, 5)
  p.fill(p.rect(22.4, 40, 41, 43.6), cream, 4)
  p.fill(p.rect(25.6, 46.6, 38, 47.6), cream, 3)
  // The bookmark ribbon out of the bottom.
  p.fill(p.poly([[39, 55], [41.6, 55], [41.6, 60.4], [40.3, 59], [39, 60.4]]), red, 3)
}

/** Pocket Atlas: a small atlas lying open: blue seas, green and tan lands, a dotted red route, a compass rose. */
function atlas(p: Pen): void {
  const leather = p.add('#6e4a30', { lift: .3 })
  const page = p.add('#f2e6c4', { lift: .14, drop: .26 })
  const sea = p.add('#6fa8c8', { lift: .3, drop: .3 })
  const land = p.add('#8cbf6a', { lift: .3 })
  const sand = p.add('#d9b878', { lift: .3 })
  const red = p.add('#d04a3a', { lift: .3 })
  p.shadow(32, 55, 27, 2.4, 80)
  // The covers peeking under the pages, then the two pages bowing up from the gutter.
  p.fill(p.poly([[5, 27.4], [31.4, 32.4], [32.6, 32.4], [59, 27.4], [59, 50.4], [32.6, 55.6], [31.4, 55.6], [5, 50.4]]), leather, 2)
  // Each page's top and bottom edge, bowing up toward the gutter.
  const bow = (t: number) => Math.sin(t * Math.PI)
  const lTop = (x: number) => 25.6 + (x - 7) * .2 - bow((x - 7) / 24.4) * 1.4, lBot = (x: number) => 48.4 + (x - 7) * .2 - bow((x - 7) / 24.4) * 1.2
  const rTop = (x: number) => 30.6 - (x - 32.6) * .2 - bow((x - 32.6) / 24.4) * 1.4, rBot = (x: number) => 53.4 - (x - 32.6) * .2 - bow((x - 32.6) / 24.4) * 1.2
  const pages = p.test((x, y) => (x >= 7 && x < 31.4 && y >= lTop(x) && y <= lBot(x)) || (x >= 32.6 && x < 57 && y >= rTop(x) && y <= rBot(x)))
  p.fill(pages, page, (x) => (x < 9 ? 5 : x > 55 ? 3 : 4))
  // The map inside a cream margin: sea, lands, a dotted route to a star, a compass needle.
  const map = p.test((x, y) => (x >= 9 && x < 30 && y >= lTop(x) + 1.8 && y <= lBot(x) - 1.8) || (x >= 34 && x < 55.4 && y >= rTop(x) + 1.8 && y <= rBot(x) - 1.8))
  p.fill(map, sea, (x, y) => (x + y < 44 ? 4 : 3))
  for (const [x, y, rx, ry, id] of [[16, 33, 5.6, 3.8, land], [22.4, 41.4, 5, 3.4, sand], [12.4, 42.6, 3, 2.2, land], [42, 37.6, 6.6, 4, land], [50.4, 44.2, 4.2, 3, sand], [45.6, 46.8, 2.8, 1.8, land]] as const)
    p.dome(intersect(p.ell(x, y, rx, ry), map), id, { bias: .2, relief: .4 })
  for (let t = 0; t <= 1; t += .07) if (Math.floor(t * 14) % 2 === 0) p.dot(16 + t * 27.6, 34 - Math.sin(t * Math.PI) * 4 + t * 6.4, red, 4)
  p.fill(p.poly(starPts(43.6, 40.6, 2, .42)), red, 4)
  p.fill(p.poly([[52.6, 32.6], [53.6, 35.4], [52.6, 38.2], [51.6, 35.4]]), red, 3)
  p.fill(p.seg(31.6, 32.6, 32.4, 55.4, 1.1), leather, 1)
}

/** Enamel Pin: a glossy pink star pin in a gold rim, a white shine, its gold clutch back peeking out behind. */
function pin(p: Pen): void {
  const gold = p.add('#ffd166', { lift: .4, drop: .32 })
  const pink = p.add('#ff8fc7', { lift: .34, drop: .3 })
  p.shadow(32, 55.6, 17, 2, 70)
  p.cylV(p.rect(44, 40, 46, 50), gold)
  p.dome(p.ell(45, 50.4, 4.4, 2), gold, { bias: .2 })
  const outer = p.poly(starPts(31, 30, 21.4, .48, .08))
  const inner = p.poly(starPts(31, 30, 18, .46, .08))
  p.dome(outer, gold, { bias: .1, relief: .5 })
  p.dome(inner, pink, { bias: .15, relief: .3 })
  p.fill(p.seg(24, 22, 28, 18.4, 1.4), pink, 5)
  p.dome(heart(p, 31, 27.6, 3.2), gold, { bias: .3, relief: .5 })
  p.s.sparkle(Math.round(44 * p.k), Math.round(13 * p.k), 2)
}

/** Postcard: a postcard at a slant, message lines on its left, address lines on its right, a stamp with a postmark. */
function postcard(p: Pen): void {
  const card = p.add('#f2ead6', { lift: .14, drop: .26 })
  const ink = p.add('#4a4660', { lift: .3 })
  const pink = p.add('#ff8fc7', { lift: .3 })
  const blue = p.add('#5f86c8', { lift: .3 })
  p.shadow(32, 50.6, 25, 2.4, 70)
  const g = turned(32, 33, -18)
  const inside = (f: (u: number, v: number) => boolean) => p.test((x, y) => f(...g.local(x, y)))
  p.fill(inside((u, v) => Math.abs(u) <= 24 && Math.abs(v) <= 15), card, (x, y) => { const [u, v] = g.local(x, y); return u < -23 || v < -14 ? 5 : u > 23 || v > 14 ? 3 : 4 })
  p.fill(inside((u, v) => Math.abs(u - 1) < .5 && Math.abs(v) < 12), ink, 3)
  for (const v of [-6, -1.6, 2.8, 7.2]) p.fill(p.curve((t) => g.world(-20 + t * 17, v + Math.sin(t * 13 + v) * .6), .6, 24), ink, 2)
  for (const v of [2, 6.4, 10.8]) p.fill(inside((u, vv) => u > 5 && u < 21 && Math.abs(vv - v) < .45), ink, 3)
  // The stamp: a pink square with a pale heart, scalloped edge, a blue postmark over its corner.
  const stamp = inside((u, v) => u > 12.6 && u < 21.4 && v > -12.4 && v < -2.6 && !((Math.abs(u - 12.6) < .6 || Math.abs(u - 21.4) < .6) && Math.floor(v * 1.4) % 2 === 0) && !((Math.abs(v + 12.4) < .6 || Math.abs(v + 2.6) < .6) && Math.floor(u * 1.4) % 2 === 0))
  p.fill(stamp, pink, (x, y) => { const [u, v] = g.local(x, y); return u < 14 || v < -11 ? 4 : 3 })
  const [hx, hy] = g.world(17, -9.4)
  p.fill(heart(p, hx, hy, 2.6), card, 5)
  const [mx, my] = g.world(11, -5.6)
  p.fill(p.ring(mx, my, 4.6, 4.6, .7), blue, 3)
  for (const dv of [-1.4, 0, 1.4]) p.fill(p.curve((t) => g.world(13 + t * 10, -5.6 + dv + Math.sin(t * 9) * .5), .5, 16), blue, 3)
}

export const GIFT_ART: Record<string, Painter> = {
  'gift-buns': buns, 'gift-candy': candy, 'gift-tape': tape, 'gift-earbuds': earbuds, 'gift-gloves': gloves, 'gift-kit': kit,
  'gift-succulent': succulent, 'gift-seeds': seeds, 'gift-novel': novel, 'gift-atlas': atlas, 'gift-pin': pin, 'gift-postcard': postcard,
}
