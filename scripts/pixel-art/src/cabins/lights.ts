// The six lights. Five hang from the ceiling (their cords or track reach the top of the box, so hang one by its cell's
// top); the Classic brass lamp is a wall sconce. Each lights the air below it with a soft wash of its accent.
import type { Style } from './items.ts'
import { erode, type Painter, type Pen, type Pt } from './kit.ts'
import { look } from './look.ts'
import { bulb, leaf, shadeLeaf, tube } from './parts.ts'

/** Neon: three LED bars stepping down in an inverted pyramid, hung on fine wires, magenta light falling below. */
function stripLights(p: Pen): void {
  const L = look(p, 'neon')
  const bars = [[6, 58, 16], [12, 52, 29], [18, 46, 42]] as const
  // Wires: ceiling to the top bar, then bar to bar.
  for (const x of [11, 53]) { p.fill(p.rect(x - 1.6, 2, x + 1.6, 3.4), L.deep, 3); p.fill(p.hair(x, 3.4, x, 16), L.metal, 3) }
  for (const x of [16, 48]) p.fill(p.hair(x, 18.6, x, 29), L.metal, 3)
  for (const x of [22, 42]) p.fill(p.hair(x, 31.6, x, 42), L.metal, 3)
  for (const [x0, x1, y] of bars) {
    p.wash(p.poly([[x0 + 2, y + 2.6], [x1 - 2, y + 2.6], [x1 + 1, y + 9], [x0 - 1, y + 9]]), L.accent, (_x, yy) => Math.max(0, 58 - (yy - y - 2.6) * 9))
    p.cylH(p.rrect(x0, y, x0 + 2.6, y + 2.6, .8), L.deep)
    p.cylH(p.rrect(x1 - 2.6, y, x1, y + 2.6, .8), L.deep)
    tube(p, [[x0 + 3.2, y + 1.3], [x1 - 3.2, y + 1.3]], L.light, L.accent, 2.2)
  }
}

/** Classic: a brass wall sconce: an oval backplate, a curved arm, a tulip shade lit from within, light pooling below. */
function brassLamp(p: Pen): void {
  const L = look(p, 'classic')
  const shadeCloth = p.add('#f0d9a4', { lift: .26, drop: .3 })
  p.wash(p.poly([[29, 31], [51, 31], [60, 60], [20, 60]]), L.accent, (_x, y) => Math.max(0, 56 - (y - 31) * 1.9))
  // The backplate and its mounting screws.
  const plate = p.ell(12.6, 36, 4.4, 10)
  p.dome(plate, L.trim, { bias: .1, relief: .6 })
  for (const y of [29.4, 42.6]) p.dot(12.6, y, L.trim, 1)
  // The arm: out from the plate, a knuckle, up to the shade's collar.
  const arm: Pt[] = Array.from({ length: 17 }, (_, i) => { const t = i / 16; return [15.6 + t * 24.4, 37 - Math.sin(t * Math.PI * .62) * 15 - t * 2] as const })
  p.cylH(p.path(arm, 1.8), L.trim)
  p.dome(p.circ(26.4, 27.2, 1.9), L.trim, { bias: .2 })
  // The shade: a flared tulip, warm cloth glowing from within, a brass rim, the bulb under it.
  const shade = p.test((x, y) => { const t = (y - 13.6) / 16.4; return t >= 0 && t <= 1 && Math.abs(x - 40) <= 6.2 + t * 7.8 + Math.sin(t * Math.PI) * 1.4 })
  p.fill(shade, shadeCloth, (x, y) => (Math.abs(x - 40) < 3 + (y - 13.6) * .3 ? 5 : x < 40 ? 4 : 3))
  p.halo(shade, L.accent, .55)
  p.cylH(p.rrect(34.4, 12, 45.6, 14.4, 1), L.trim)
  const rimLine = p.rect(25.6, 29.4, 54.4, 30.8)
  p.fill(rimLine, L.trim, 4)
  const glow = bulb(p, 40, 32.2, L.light, L.accent, 1.6)
  p.fill(erode(glow), L.light, 5)
}

/** Cozy: a round paper lantern glowing pink, its ribs showing, caps top and bottom, a cord up, a tassel down. */
function paperLantern(p: Pen): void {
  const L = look(p, 'cozy')
  const cx = 32, cy = 33.6, rx = 18.6, ry = 18.4
  p.wash(p.circ(cx, cy, 25), L.accent, (x, y) => Math.max(0, 46 - Math.max(0, Math.hypot(x - cx, y - cy) - 17) * 6))
  p.fill(p.hair(cx, 2, cx, 12), L.deep, 2)
  p.cylH(p.rrect(27.6, 11.6, 36.4, 15.4, 1.2), L.deep)
  const body = p.ell(cx, cy, rx, ry)
  p.fill(body, L.light, (x, y) => {
    const d = Math.hypot((x - cx + 3) / rx, (y - cy + 3) / ry)
    return d < .42 ? 5 : d < .84 ? 4 : 3
  })
  // The ribs bow outward with the paper; a darker band where each one runs.
  for (let k = -3; k <= 3; k++) {
    const yk = cy + k * 5.2
    p.fill(p.test((x, y) => { const f = 1 - ((x - cx) / rx) ** 2; return Math.abs(y - (yk + k * .5 * f)) < .45 && Math.hypot((x - cx) / rx, (y - cy) / ry) < .98 }), L.light, 2)
  }
  p.halo(body, L.accent)
  p.cylH(p.rrect(28, 51.4, 36, 54.6, 1.2), L.deep)
  p.fill(p.rect(31, 54.6, 33, 56), L.trim, 3)
  p.fill(p.poly([[30.4, 56], [33.6, 56], [34.6, 61], [29.4, 61]]), L.trim, (x) => (x < 31.6 ? 4 : x > 33 ? 2 : 3))
}

/** Sporty: a ceiling track with three spot cans aimed down and out, cyan lenses, faint beams. */
function trackLight(p: Pen): void {
  const L = look(p, 'sporty')
  for (const x of [16, 48]) p.fill(p.rect(x - 2, 2, x + 2, 4), L.deep, 3)
  p.cylH(p.rrect(4, 4, 60, 7.6, 1.4), L.deep)
  p.fill(p.rect(5, 5, 59, 5.6), L.trim, 3)
  for (const [x, deg] of [[13, 24], [32, 0], [51, -24]] as const) {
    const a = (deg * Math.PI) / 180, s = Math.sin(a), c = Math.cos(a)
    // From the pivot the can points down at `deg` (positive leans left): axis (−sin, cos).
    const px = x, py = 12.6, ax = -s, ay = c, len = 11, half = 3.4
    const end: Pt = [px + ax * len, py + ay * len]
    p.fill(p.seg(x, 7.6, x, 11.4, 1.3), L.metal, 3)
    const can = p.poly([[px - ay * half * .8, py + ax * half * .8], [px + ay * half * .8, py - ax * half * .8], [end[0] + ay * half, end[1] - ax * half], [end[0] - ay * half, end[1] + ax * half]])
    p.fill(can, L.body, (ux, uy) => { const lat = (ux - px) * ay - (uy - py) * ax; return lat < -1.6 ? 4 : lat < .4 ? 3 : 2 })
    p.fill(p.test((ux, uy) => { const along = (ux - px) * ax + (uy - py) * ay, lat = (ux - px) * ay - (uy - py) * ax; return along > len - 3.4 && along < len - 2.2 && Math.abs(lat) < half }), L.trim, 4)
    p.dome(p.circ(px, py, 1.6), L.metal, { bias: .2 })
    const lens = p.ell(end[0], end[1], half - .4, 1.2, -deg)
    p.fill(lens, L.light, 5)
    p.halo(lens, L.accent)
    const spread = 6.4, reach = 17
    const tip: Pt = [end[0] + ax * reach, end[1] + ay * reach]
    p.wash(p.poly([[end[0] - ay * half, end[1] + ax * half], [end[0] + ay * half, end[1] - ax * half], [tip[0] + ay * spread, tip[1] - ax * spread], [tip[0] - ay * spread, tip[1] + ax * spread]]), L.accent, (ux, uy) => Math.max(0, 50 - Math.hypot(ux - end[0], uy - end[1]) * 2.2))
  }
}

/** Tech: a smart ring pendant: a ceiling canopy, a sensor hub, three fine wires to a glowing mint halo ring. */
function smartLamp(p: Pen): void {
  const L = look(p, 'tech')
  const cx = 32, cy = 35, rx = 23, ry = 8.6
  p.wash(p.ell(cx, cy + 12, rx + 2, 13), L.accent, (x, y) => (y < cy ? 0 : Math.max(0, 40 - Math.hypot((x - cx) / (rx + 2), (y - cy - 12) / 13) * 38)))
  p.cylH(p.rrect(26, 2.2, 38, 5, 1.2), L.deep)
  p.fill(p.hair(cx, 5, cx, 15), L.metal, 3)
  p.dome(p.circ(cx, 17, 2.4), L.metal, { bias: .2 })
  bulb(p, cx, 17.4, L.light, L.accent, .6, .7)
  for (const [x, y] of [[cx - rx + 1.4, cy - 1], [cx + rx - 1.4, cy - 1], [cx, cy - ry + .6]] as const) p.fill(p.hair(cx, 19, x, y), L.metal, 3)
  // The ring: its far half dimmer, its near half bright, a slate rim along the top edge.
  const ring = p.ell(cx, cy, rx, ry).subtract(p.ell(cx, cy, rx - 3.6, ry - 2.8))
  p.fill(ring, L.light, (_x, y) => (y < cy - 2 ? 3 : y > cy + 3 ? 5 : 4))
  p.fill(intersectTop(p, cx, cy, rx, ry), L.body, 3)
  p.halo(ring, L.accent)
}

/** The outer top rim of the ring, one unit deep, for the slate edge. */
function intersectTop(p: Pen, cx: number, cy: number, rx: number, ry: number) {
  return p.ell(cx, cy, rx, ry).subtract(p.ell(cx, cy + .9, rx, ry)).subtract(p.test((_x, y) => y > cy - 1))
}

/** Wild: a glass jar of fireflies hung on a rope, a burlap cover tied with twine, a twig inside, a soft lime glow. */
function fireflyJar(p: Pen): void {
  const L = look(p, 'wild')
  const glass = p.add('#3d6b56', { lift: .36, drop: .3 })
  const burlap = p.add('#b89a6a', { lift: .26 })
  const twine = p.add('#d8c08e', { lift: .2 })
  const twig = p.add('#6e5a3e', { lift: .3 })
  const leafy = p.add('#5c9a3e', { lift: .3 })
  p.wash(p.rrect(14, 16, 50, 60, 9), L.accent, (x, y) => Math.max(0, 34 - Math.hypot((x - 32) / 18, (y - 38) / 22) * 20))
  // The rope and its loop.
  p.fill(p.hair(32, 2, 32, 8), twine, 3)
  p.fill(p.ring(32, 11.6, 5.2, 4.2, .9).subtract(p.test((_x, y) => y > 12.6)), twine, 3)
  // The jar: dark glass so the fireflies show, a lit streak down its left, its shoulder and base.
  const jar = p.rrect(18, 19.4, 46, 57, 6)
  p.fill(jar, glass, (x, y) => (x < 20 ? 3 : x > 44 ? 2 : y > 54.6 ? 2 : 1))
  p.fill(p.rect(21, 23, 22.4, 50), glass, 5)
  p.fill(p.rect(23.4, 24, 24.2, 34), glass, 4)
  p.fill(p.rect(41.6, 24, 43, 52), glass, 3)
  // A twig with two leaves inside, the fireflies and their glow on the glass.
  p.fill(p.path([[23, 54], [30, 44], [35, 36], [38, 30]], 1.2), twig, 3)
  for (const [x, y, d] of [[30, 44, -20], [35, 36, 200]] as const) shadeLeaf(p, leaf(p, x, y, 5.4, 2.8, d), leafy, x, y, d)
  p.wash(p.rrect(19.4, 21, 44.6, 55.6, 5), L.accent, (x, y) => Math.max(0, 46 - Math.hypot(x - 32, y - 38) * 2.4), false)
  for (const [x, y] of [[27, 29], [37.4, 41.6], [30.4, 50], [39.4, 27.4], [25.4, 40.4], [34, 46.6]] as const) bulb(p, x, y, L.light, L.accent, .9)
  // The burlap cover tied on with twine, a frill below the tie.
  p.dome(p.rrect(18.6, 13.4, 45.4, 19.6, 2.4), burlap, { bias: .1, relief: .4 })
  p.fill(p.test((x, y) => x > 19 && x < 45 && y >= 19.6 && y < 19.6 + 1.8 * Math.abs(Math.sin(x * .9))), burlap, 2)
  p.cylH(p.rect(18.6, 17.6, 45.4, 19), twine)
}

export const LIGHTS: Record<Style, Painter> = { neon: stripLights, classic: brassLamp, cozy: paperLantern, sporty: trackLight, tech: smartLamp, wild: fireflyJar }

/** Where each light hangs: the brass lamp is a sconce on the wall, the rest hang from the ceiling. */
export const LIGHT_MOUNT: Record<Style, 'wall' | 'ceiling'> = { neon: 'ceiling', classic: 'wall', cozy: 'ceiling', sporty: 'ceiling', tech: 'ceiling', wild: 'ceiling' }
