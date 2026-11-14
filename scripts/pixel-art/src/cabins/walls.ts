// The six wall pieces, seen face on, hung on the wall (no floor shadow).
import { hex } from '../color.ts'
import type { Style } from './items.ts'
import { dilate, intersect, type Painter, type Pen, type Pt } from './kit.ts'
import { look } from './look.ts'
import { bulb, heart, leaf, shadeLeaf, starPts, tube } from './parts.ts'

/** Neon: a heart of magenta tube around a pale star, on contour-cut dark acrylic, a cable below. */
function neonSign(p: Pen): void {
  const L = look(p, 'neon')
  const acrylic = p.add('#24183a', { lift: .3, drop: .3 })
  const white = p.tones(['#3c1e46', '#784690', '#be8ccd', '#eccef6', '#fcecff', '#ffffff'].map((c) => hex(c)))
  const hx = (t: number) => 32 + 1.42 * 16 * Math.sin(t) ** 3
  const hy = (t: number) => 26.6 - 1.42 * (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t))
  const pts: Pt[] = Array.from({ length: 73 }, (_, i) => [hx((i / 72) * Math.PI * 2), hy((i / 72) * Math.PI * 2)] as const)
  const star = starPts(32, 29.4, 8.6, .44)
  const bolt: Pt[] = [...star, star[0]!]
  // The acrylic, cut a little wider than the tubes, its standoffs, and the cable.
  const plate = dilate(p.path(pts, 2.4).union(p.path(bolt, 2.4)), p.px(2.4))
  p.fill(plate, acrylic, (x, y) => (x + y < 40 ? 3 : 2))
  for (const [x, y] of [[13.6, 13.4], [50.4, 13.4], [32, 48.6]] as const) p.dome(p.circ(x, y, 1.2), L.metal, { bias: .3 })
  p.fill(p.curve((t) => [32 + t * 9, 53 + Math.sin(t * Math.PI) * 3.2] as const, .8), L.deep, 1)
  // The tubes: the heart in magenta, the star in pale pink-white.
  tube(p, pts, L.light, L.accent, 2.4)
  tube(p, bolt, white, '#ffd8f4', 1.8)
}

/** Classic: an oval gilt frame with a shell crest, a moonlit mountain lake inside, a brass picture light above. */
function framedPrint(p: Pen): void {
  const L = look(p, 'classic')
  const sky = p.add('#2e3566', { lift: .3, drop: .3 })
  const hills = p.add('#262c4a', { lift: .24 })
  const moon = p.tones(['#3a3020', '#8a7a50', '#c8b88a', '#efe2b8', '#fbf3d8', '#ffffff'].map((c) => hex(c)))
  // The picture: a sky darkening upward, stars, the moon, two ranges of hills, a lake with the moon's path.
  const art = p.ell(32, 36, 15.6, 19.6)
  const inArt = (f: (x: number, y: number) => boolean) => intersect(p.test(f), art)
  p.fill(art, sky, (_x, y) => (y < 24 ? 1 : y < 33 ? 2 : 3))
  for (const [x, y] of [[26, 22], [37, 20.5], [41, 27], [22.4, 30], [33, 26]] as const) p.dot(x, y, moon, 5)
  const disc = p.circ(25.6, 27.4, 3.2)
  p.fill(disc, moon, (x, y) => (x + y < 52 ? 5 : 4))
  p.halo(disc, '#fff2c4', .6)
  p.fill(inArt((x, y) => y > 34.6 - Math.abs(Math.sin(x * .32)) * 5.2 + (x > 34 ? 1.4 : 0) && y < 44), hills, (x, y) => (x + y * .3 < 33 ? 3 : 2))
  p.fill(inArt((x, y) => y > 39.6 - Math.abs(Math.sin(x * .45 + 1)) * 3.4 && y < 44), hills, 1)
  p.fill(inArt((_x, y) => y >= 44), sky, (x, y) => (Math.abs(x - 25.6) < 1.6 - (y - 44) * .06 && Math.floor((y * p.k) / 1.6) % 2 === 0 ? 5 : y < 46 ? 3 : 2))
  // The gilt frame.
  const frame = p.ell(32, 36, 20, 24).subtract(p.ell(32, 36, 15.6, 19.6))
  p.dome(frame, L.trim, { bias: .12, relief: .5 })
  p.fill(p.ring(32, 36, 16.6, 20.6, .8), L.trim, (x, y) => (x + y < 66 ? 2 : 4))
  if (p.big) for (let i = 0; i < 28; i++) { const a = (i / 28) * Math.PI * 2; p.dot(32 + Math.cos(a) * 18.2, 36 + Math.sin(a) * 22.2, L.trim, 5) }
  // The shell crest on top.
  const shell = p.poly([[25.6, 14.4], [32, 8.6], [38.4, 14.4], [36, 16.4], [28, 16.4]])
  p.dome(shell, L.trim, { bias: .2, relief: .6 })
  for (const dx of [-3.2, 0, 3.2]) p.fill(p.seg(32, 15.8, 32 + dx * 1.2, 10.6, .5), L.trim, 2)
  // The picture light: a brass hood on an arm, its lit underside washing the picture.
  p.fill(p.seg(32, 8.6, 32, 6.6, 1.2), L.trim, 3)
  p.cylH(p.rrect(21.4, 3.6, 42.6, 6.6, 1.4), L.trim)
  const lamp = p.rect(22.6, 6.4, 41.4, 7.4)
  p.fill(lamp, L.light, 5)
  p.halo(lamp, L.accent)
  p.wash(p.poly([[22, 7.6], [42, 7.6], [50, 34], [14, 34]]), L.accent, (_x, y) => Math.max(0, 70 - (y - 7.6) * 2.7), false)
}

/** Cozy: a plum wall shelf with a scalloped pink valance, a plush bear, a heart cushion and a bunny, fairy lights below. */
function plushShelf(p: Pen): void {
  const L = look(p, 'cozy')
  const tan = p.add('#cf9c86', { lift: .28 })
  const snow = p.add('#ebe2f0', { lift: .2, drop: .24 })
  const face = p.add('#3a2630', { lift: .2 })
  // The brackets and the shelf, the valance under its front.
  for (const x of [11, 50]) p.fill(p.poly([[x, 41], [x + 3, 41], [x + 3, 50], [x + 2, 50]]), L.deep, 2)
  p.box(4, 36.6, 60, 41.4, 2, L.body, { round: true })
  const scallop = (x: number) => 41.4 + 2.2 * Math.sqrt(Math.max(0, 1 - (((((x - 4) % 5) + 5) % 5 - 2.5) / 2.5) ** 2))
  p.fill(p.test((x, y) => x >= 4.6 && x < 59.4 && y >= 41.4 && y <= scallop(x)), L.trim, (_x, y) => (y < 42.4 ? 4 : 3))
  // A plush bear: round body, round head, ears, a pale muzzle, two dot eyes.
  p.dome(p.ell(15, 31.2, 6.6, 5.8), tan, { bias: .15, relief: .6 })
  for (const x of [10.6, 19.4]) p.dome(p.circ(x, 17.6, 2.1), tan, { bias: .1 })
  p.dome(p.ell(15, 21.8, 5.6, 5), tan, { bias: .15, relief: .6 })
  p.dome(p.ell(15, 24, 2.3, 1.6), snow, { bias: .2 })
  for (const x of [13, 17]) p.dot(x, 21.2, face, 2)
  p.dot(15, 23.2, face, 2)
  // A heart cushion with a stitched edge.
  const cushion = heart(p, 31.6, 22, 7.2)
  p.dome(cushion, L.trim, { bias: .18, relief: .5 })
  if (p.big) p.fill(heart(p, 31.6, 23.4, 5.6).subtract(heart(p, 31.6, 24, 5)), L.trim, 5)
  // A bunny with tall ears.
  p.dome(p.ell(47.6, 31.4, 5.8, 5.6), snow, { bias: .15, relief: .6 })
  for (const [x, a] of [[45.4, -8], [50, 8]] as const) {
    p.dome(p.ell(x, 15.4, 1.7, 4.6, a), snow, { bias: .2 })
    p.fill(p.ell(x, 15.8, .7, 3, a), L.trim, 3)
  }
  p.dome(p.ell(47.6, 23, 4.8, 4.4), snow, { bias: .15, relief: .6 })
  for (const x of [45.8, 49.4]) p.dot(x, 22.6, face, 2)
  p.dot(47.6, 24.2, L.trim, 2)
  // Fairy lights looped under the shelf.
  const wire = (t: number): [number, number] => [5 + t * 54, 44.6 + Math.sin(t * Math.PI) * 6.4]
  p.fill(p.curve(wire, .5), L.deep, 1)
  for (const t of [.08, .25, .42, .58, .75, .92]) { const [x, y] = wire(t); bulb(p, x, y + 1, L.light, L.accent, 1.2) }
}

/** Sporty: a slightly tilted race poster taped up: navy with cyan speed stripes, a checkered flag, a ringed 1. */
function racePoster(p: Pen): void {
  const L = look(p, 'sporty')
  const white = p.add('#e9f1f6', { lift: .2, drop: .24 })
  const tape = p.add('#e7dcb6', { lift: .2 })
  const a = (-4 * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a)
  const toWorld = (u: number, v: number): Pt => [32 + u * c - v * s, 32.4 + u * s + v * c]
  const toLocal = (x: number, y: number): [number, number] => { const dx = x - 32, dy = y - 32.4; return [dx * c + dy * s, -dx * s + dy * c] }
  const W = 19, H = 25
  /** A mask in the poster's own (u, v) coordinates. */
  const local = (f: (u: number, v: number) => boolean) => p.test((x, y) => f(...toLocal(x, y)))
  const poster = p.poly([toWorld(-W, -H), toWorld(W, -H), toWorld(W, H - 5), toWorld(W - 5, H), toWorld(-W, H)])
  p.fill(poster, L.body, (x, y) => { const v = toLocal(x, y)[1]; return v < -6 || v > 14 ? 2 : 3 })
  // A ringed 1, a waving checkered flag on a pole, speed stripes, a title bar.
  p.fill(local((u, v) => Math.abs(Math.hypot(u - 9, v + 13) - 5.6) < 1.1 || (Math.abs(u - 9.4) < 1.1 && v > -16.6 && v < -9.4) || (v > -16.8 && v < -15.6 && u > 7.4 && u < 9.6)), L.trim, 4)
  const wave = (u: number) => Math.sin(u * .5) * 1.2
  p.fill(local((u, v) => u > -15 && u < -1 && v > -20.6 + wave(u) && v < -11.4 + wave(u)), white, (x, y) => {
    const [u, v] = toLocal(x, y)
    return (Math.floor((u + 15) / 2.8) + Math.floor((v + 20.6 - wave(u)) / 2.3)) % 2 ? 4 : 1
  })
  p.fill(local((u, v) => u > -16.6 && u < -15 && v > -21 && v < -3), white, 3)
  p.fill(local((u, v) => v > -2 && v < 13 && ((u + v * .9 + 60) % 8.4) < 3 && Math.abs(u) < W - .5), L.trim, (x, y) => (toLocal(x, y)[1] < 5 ? 4 : 3))
  p.fill(local((u, v) => v > 16.4 && v < 18.6 && Math.abs(u) < 13), white, 4)
  p.fill(local((u, v) => v > 20 && v < 21.2 && Math.abs(u) < 8), L.trim, 3)
  // The curled corner and four pieces of tape.
  p.fill(p.poly([toWorld(W, H - 5), toWorld(W - 5, H), toWorld(W - 4.4, H - 4.4)]), white, 3)
  for (const [u, v, d] of [[-W, -H, 45], [W, -H, -45], [-W, H, -45], [W - 2, H - 2, 45]] as const) {
    const [x, y] = toWorld(u, v)
    p.fill(p.ell(x, y, 3.4, 1.4, d - 4), tape, 4)
  }
}

/** Tech: a wide wall screen in a slim bezel: a ring gauge, a live waveform and bars in mint, bias light around it. */
function wallScreen(p: Pen): void {
  const L = look(p, 'tech')
  const bezel = p.rrect(3, 12.6, 61, 47.4, 2)
  p.fill(bezel, L.deep, (x, y) => (y < 13.8 ? 4 : x < 4.2 ? 3 : 1))
  p.halo(bezel, L.accent, .55)
  const screen = p.rect(5, 14.6, 59, 45.4)
  p.fill(screen, L.light, (_x, y) => (y < 30 ? 1 : 1))
  if (p.big) p.fill(p.test((x, y) => x >= 5 && x < 59 && y >= 14.6 && y < 45.4 && Math.floor(y * p.k) % 3 === 0), L.light, 2)
  // A header with three dots, a ring gauge two-thirds full, a waveform, a bar chart, a text block.
  p.fill(p.rect(7, 16.6, 57, 17.6), L.light, 2)
  for (const x of [52, 54.4, 56.8]) p.dot(x, 17, L.light, 4)
  const gauge = p.ring(15.6, 29, 6.4, 6.4, 1.8)
  p.fill(gauge, L.light, (x, y) => (Math.atan2(y - 29, x - 15.6) < 1.4 ? 5 : 2))
  p.fill(p.rect(13.6, 28, 17.6, 30), L.light, 4)
  p.fill(p.curve((t) => [25 + t * 31, 26 - Math.sin(t * 13) * 3.4 * (1 - Math.abs(t - .5))] as const, .7, 40), L.light, 5)
  for (let i = 0; i < 10; i++) {
    const x = 25.6 + i * 3.1, h = 3 + ((i * 7) % 5) * 1.5
    p.fill(p.rect(x, 43.4 - h, x + 2, 43.4), L.light, i % 3 === 1 ? 4 : 3)
  }
  for (const [y, w] of [[38.6, 12], [40.6, 9], [42.6, 11]] as const) p.fill(p.rect(8, y, 8 + w, y + .9), L.light, 3)
  p.halo(screen, L.accent, .25)
  // A slim soundbar under it.
  p.box(18, 49, 46, 52.6, 1, L.deep, { round: true })
  if (p.big) for (let x = 20; x < 44; x += 1.6) p.dot(x, 51.4, L.deep, 1)
  bulb(p, 43.4, 50.8, L.light, L.accent, .5, .7)
}

/** Wild: a driftwood branch on two pegs with vines cascading down, leaves in two greens, glowing lime buds. */
function vineWall(p: Pen): void {
  const L = look(p, 'wild')
  const drift = p.add('#8f8670', { lift: .3, drop: .3 })
  const leafy = p.add('#4f8a3a', { lift: .3 })
  const dark = p.add('#2f5a2c', { lift: .3 })
  const strands = [[8, 46, 0], [15.4, 30, 1.6], [23, 49, 3], [31, 36, .8], [39, 47, 2.2], [47, 29, 4], [55, 41, 1.2]] as const
  for (const [x0, len, ph] of strands) {
    const vx = (y: number) => x0 + 1.5 * Math.sin(y * .32 + ph)
    p.fill(p.curve((t) => [vx(11 + t * len), 11 + t * len] as const, .9, 30), dark, 2)
    for (let y = 14; y < 9 + len; y += 4.4) {
      const side = Math.round((y + ph * 3) / 4.4) % 2 ? 1 : -1
      const d = side > 0 ? 28 : 152
      const m = leaf(p, vx(y), y, 4.6, 2.8, d)
      const tone = Math.round(y + x0) % 3
      shadeLeaf(p, m, tone === 0 ? dark : tone === 1 ? leafy : L.trim, vx(y), y, d)
    }
  }
  // The branch and its pegs, leaves along the top.
  p.cylH(p.curve((t) => [4.4 + t * 55.2, 9.6 + Math.sin(t * 5) * .9] as const, 3.4, 20), drift)
  for (const x of [12, 52]) p.dome(p.circ(x, 9.8, 1.1), drift, { bias: -.2 })
  for (const [x, y, d] of [[18, 8, -30], [27, 7.6, -150], [36, 8.4, -40], [44, 7.6, -140]] as const) shadeLeaf(p, leaf(p, x, y, 4.6, 2.6, d), leafy, x, y, d, 4)
  // Glowing buds along the vines.
  for (const [i, f] of [[0, .98], [2, .99], [2, .55], [4, .97], [4, .4], [6, .99], [1, .99], [3, .99], [5, .99]] as const) {
    const [x0, len, ph] = strands[i]!
    const y = 11 + f * len
    bulb(p, x0 + 1.5 * Math.sin(y * .32 + ph), y + .6, L.light, L.accent, .9)
  }
}

export const WALLS: Record<Style, Painter> = { neon: neonSign, classic: framedPrint, cozy: plushShelf, sporty: racePoster, tech: wallScreen, wild: vineWall }
