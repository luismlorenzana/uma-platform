// The six keepsakes (64 px icons only; a keepsake shows in the diorama by its icon). Their own colours: old gold first,
// as the game's keepsake gold, with each object's natural materials.
import { lightTones, type Painter, type Pen, type Pt } from './kit.ts'
import { bulb, heart, starPts } from './parts.ts'

const GOLD = '#ffd166'

/** First Trophy: a two-handled gold cup with a star on it, on an ebony plinth with a gold plaque. */
function trophy(p: Pen): void {
  const gold = p.add(GOLD, { lift: .4, drop: .32 })
  const ebony = p.add('#4a3428', { lift: .3 })
  p.shadow(32, 57.2, 15, 2, 80)
  p.box(19, 46.6, 45, 57, 2.2, ebony, { round: true })
  p.fill(p.rect(25.6, 50.6, 38.4, 54.2), gold, (x) => (x < 27 ? 5 : 3))
  p.cylV(p.poly([[27, 46.6], [37, 46.6], [35, 44.2], [29, 44.2]]), gold)
  p.cylV(p.rect(30, 36, 34, 44.4), gold)
  p.dome(p.ell(32, 38.6, 4.6, 1.8), gold, { bias: .2 })
  // The handles, then the cup in front of them.
  for (const side of [-1, 1]) p.fill(p.ring(32 + side * 15.4, 19.6, 5, 6.4, 1.8).subtract(p.test((x) => side * (x - 32 - side * 15.4) < -1)), gold, side < 0 ? 4 : 2)
  const cup = p.poly([[16.6, 10.6], [47.4, 10.6], [46, 20], [41, 30], [34.4, 34.6], [29.6, 34.6], [23, 30], [18, 20]])
  p.cylV(cup, gold, { lo: 2 })
  p.fill(p.ell(32, 11, 15.4, 2.6), gold, (x, y) => (y < 10.6 ? 5 : x < 32 ? 2 : 1))
  p.dome(p.poly(starPts(32, 21, 5.4, .46)), gold, { bias: .4, relief: .5 })
  p.s.sparkle(Math.round(20 * p.k), Math.round(16 * p.k), 2)
  p.s.sparkle(Math.round(43 * p.k), Math.round(27 * p.k), 1)
}

/** Crew Photo: a framed snapshot standing on its easel back: the ship over a ringed planet, a heart sticker, a caption. */
function photo(p: Pen): void {
  const wood = p.add('#8a5a3a', { lift: .3 })
  const mat = p.add('#f1ece0', { lift: .16, drop: .24 })
  const sky = p.add('#2c2a66', { lift: .3, drop: .3 })
  const planet = p.add('#e09a5a', { lift: .3 })
  const hull = p.add('#c9d2e0', { lift: .26 })
  const pink = p.add('#ff8fc7', { lift: .3 })
  const ink = p.add('#3a3a4a', { lift: .2 })
  const glow = p.tones(lightTones('#7fd4ff'))
  p.shadow(33, 57, 18, 2, 80)
  p.fill(p.poly([[40, 40], [44, 40], [50, 57], [47, 57]]), wood, 2)
  p.box(12, 8, 52, 56, 0, wood, { round: true })
  p.fill(p.rect(12, 8, 52, 9), wood, 4)
  p.fill(p.rect(15, 11, 49, 53), mat, (x, y) => (x + y < 30 ? 5 : 4))
  // The picture: a night sky, stars, a ringed planet, the ship with a lit engine.
  const pic = p.rect(17.6, 13.6, 46.4, 41.4)
  p.fill(pic, sky, (_x, y) => (y < 22 ? 1 : y < 32 ? 2 : 3))
  for (const [x, y] of [[21, 17], [30, 15.6], [43, 19], [38, 27], [24, 33], [44, 36]] as const) p.dot(x, y, mat, 5)
  p.dome(p.circ(40, 33.6, 6.4).subtract(p.test((_x, y) => y > 41.3)), planet, { bias: .1 })
  p.fill(p.ring(40, 34, 10, 2.4, .8).subtract(p.test((x, y) => y < 34 && Math.hypot(x - 40, y - 33.6) < 6.4)).subtract(p.test((x, y) => x < 17.6 || x > 46.3 || y > 41.3)), mat, 3)
  const ship: Pt[] = [[19.6, 26.4], [26, 23.6], [33.6, 23], [36.4, 24.8], [33.6, 26.6], [26, 27.2]]
  p.dome(p.poly(ship), hull, { bias: .3, relief: .5 })
  p.fill(p.poly([[24, 23.8], [28.4, 20.4], [30, 23.4]]), hull, 3)
  const engine = p.rect(18.4, 24.6, 20, 26.2)
  p.fill(engine, glow, 5)
  p.halo(engine, '#7fd4ff', .8)
  // A heart sticker on the corner and a handwritten caption on the mat.
  p.dome(heart(p, 44.4, 39.4, 3.6), pink, { bias: .3, relief: .5 })
  p.fill(p.curve((t) => [20 + t * 22, 47 + Math.sin(t * 14) * .9] as const, .7, 30), ink, 2)
}

/** Captain's Charm: a gold medallion with a raised star and a teal gem, on a cord loop, a red tassel hanging below. */
function charm(p: Pen): void {
  const gold = p.add(GOLD, { lift: .4, drop: .32 })
  const cord = p.add('#2f4f6a', { lift: .3 })
  const teal = p.add('#3fd0c0', { lift: .4, drop: .3 })
  const red = p.add('#c8463e', { lift: .3 })
  p.shadow(32, 58.4, 9, 1.4, 60)
  // The cord: a loop from a bead at the top down to the medallion's bail.
  p.fill(p.curve((t) => [32 + Math.sin(t * Math.PI * 2) * 9, 5.6 + (1 - Math.cos(t * Math.PI * 2)) * 6.4] as const, 1.4, 30).subtract(p.test((_x, y) => y > 17)), cord, (x) => (x < 32 ? 4 : 2))
  p.dome(p.circ(32, 18.2, 1.8), gold, { bias: .2 })
  // The medallion: a rope rim, a raised star, the gem.
  const disc = p.circ(32, 31, 11.4)
  p.dome(disc, gold, { bias: .1, relief: .4 })
  p.fill(p.ring(32, 31, 11.4, 11.4, 1.4), gold, (x, y) => ((Math.round(Math.atan2(y - 31, x - 32) * 8) % 2) ? 2 : 4))
  p.dome(p.poly(starPts(32, 31, 8.6, .44)), gold, { bias: .45, relief: .5 })
  p.dome(p.circ(32, 31.4, 2.6), teal, { bias: .2, relief: .6 })
  p.dot(31.2, 30.4, teal, 5)
  // The tassel: a gold cap and red threads.
  p.cylV(p.rect(30, 42.4, 34, 45.4), gold)
  p.fill(p.poly([[30, 45.4], [34, 45.4], [36.4, 56.6], [27.6, 56.6]]), red, (x, y) => (y > 55.4 ? 2 : Math.floor(x * p.k) % 2 ? 3 : x < 31 ? 4 : 2))
  p.s.sparkle(Math.round(24 * p.k), Math.round(24 * p.k), 1)
}

/** Hand-Drawn Star Map: a parchment scroll held open, ink constellations, a dotted course, a little ship and a compass rose. */
function starmap(p: Pen): void {
  const paper = p.add('#e6d2a2', { lift: .2, drop: .26 })
  const ink = p.add('#3a3a66', { lift: .3 })
  const gold = p.add(GOLD, { lift: .4 })
  p.shadow(32, 51.6, 27, 2, 70)
  // A wide sheet held open between two rolls, its top and bottom edges a little wavy.
  const sheet = p.test((x, y) => x >= 9 && x < 55 && y >= 17 + Math.sin(x * .3) * .6 && y < 46 + Math.sin(x * .3 + 1) * .6)
  p.fill(sheet, paper, (x, y) => (y < 19 ? 3 : y > 44 ? 3 : (Math.floor(x * 1.7 + y * .4) % 11 === 0 ? 3 : 4)))
  for (const x of [4.6, 54.4]) {
    p.cylV(p.rrect(x, 14.4, x + 5, 49, 2.4), paper)
    for (const y of [14.4, 47.6]) p.fill(p.ell(x + 2.5, y + .7, 2.4, 1.1), paper, 2)
  }
  // Constellations: gold stars joined by ink lines.
  const groups: Pt[][] = [[[14, 24], [19, 27], [23, 23.6], [27, 26.4]], [[33, 22.6], [38, 25.4], [43, 22.4], [47, 28], [41, 30.4]], [[15, 37], [19, 33.6], [23.6, 38.6]]]
  for (const g of groups) {
    p.fill(p.path(g, .5), ink, 3)
    for (const [x, y] of g) {
      p.fill(p.rect(x - 1.5, y - .5, x + 1.5, y + .5).union(p.rect(x - .5, y - 1.5, x + .5, y + 1.5)), ink, 1)
      p.dot(x, y, gold, 4)
    }
  }
  // The dotted course from a planet circle to the ship.
  p.fill(p.ring(38, 38.6, 3.2, 3.2, .7), ink, 2)
  for (let t = 0; t < 1; t += .11) p.dot(29 + t * 7, 41.4 - Math.sin(t * Math.PI) * 3.4, ink, 2)
  p.fill(p.poly([[25, 41.6], [30, 39.6], [29, 43]]), ink, 2)
  // A compass rose.
  p.fill(p.poly([[48.6, 34.4], [49.4, 37], [48.6, 39.6], [47.8, 37]]), ink, 2)
  p.fill(p.poly([[46, 37], [48.6, 36.2], [51.2, 37], [48.6, 37.8]]), ink, 2)
}

/** Old Race Ribbon: a faded blue rosette, pleated, a gold centre with a star, two tails with V-cut ends. */
function ribbon(p: Pen): void {
  const blue = p.add('#5d86a2', { lift: .3, drop: .3 })
  const pale = p.add('#c9d6dc', { lift: .2 })
  const gold = p.add('#e2bd6a', { lift: .34 })
  p.shadow(32, 58.4, 13, 1.6, 60)
  // The tails, V-cut, a crease across each.
  for (const side of [-1, 1]) {
    const x0 = 32 + side * 3, x1 = 32 + side * 11
    const tail = p.poly([[x0 - 3.6, 30], [x0 + 3.6, 30], [x1 + 4, 57], [x1, 53.6], [x1 - 4, 57]])
    p.fill(tail, blue, (x, y) => (Math.abs(y - (44 + side * (x - 32) * .1)) < .7 ? 2 : (x - x0) * side < 0 ? 4 : 3))
    p.fill(p.poly([[x0 - 1, 30], [x0 + 1, 30], [x1 + 1, 55], [x1 - 1, 55]]), pale, 3)
  }
  // The pleated rosette, then the gold button with a star.
  const pleat = p.test((x, y) => { const a = Math.atan2(y - 23, x - 32), d = Math.hypot(x - 32, y - 23); return d <= 13.4 + Math.cos(a * 16) * 1.1 })
  p.fill(pleat, blue, (x, y) => { const a = Math.atan2(y - 23, x - 32); return Math.sin(a * 16) > .3 ? 2 : x + y < 52 ? 4 : 3 })
  p.fill(p.ring(32, 23, 9.6, 9.6, 1.6), pale, (x, y) => (x + y < 52 ? 4 : 3))
  p.dome(p.circ(32, 23, 7.4), gold, { bias: .15, relief: .5 })
  p.fill(p.poly(starPts(32, 23, 4.8, .45)), gold, 5)
}

/** Pocket Radio: a teal transistor radio, a speaker grille, an amber tuning dial lit, two knobs, its aerial raised. */
function radio(p: Pen): void {
  const teal = p.add('#3f8f8a', { lift: .32, drop: .3 })
  const cream = p.add('#ece2c8', { lift: .18, drop: .26 })
  const metal = p.add('#a8b0b8', { lift: .3 })
  const amber = p.tones(lightTones('#ffb347'))
  const red = p.add('#d04a3a', { lift: .3 })
  p.shadow(32, 57.2, 21, 2, 80)
  // The aerial behind the body.
  p.fill(p.seg(44, 24, 55, 5.6, 1.1), metal, 4)
  p.dome(p.circ(55.4, 5, 1.6), metal, { bias: .3 })
  p.box(11, 22, 53, 56, 3.2, teal, { round: true })
  p.fill(p.rect(11, 22, 53, 23.2), teal, 5)
  // The grille, the dial with its needle, the knobs, a strap loop.
  p.fill(p.rrect(14.6, 29, 33, 52, 2), cream, (x, y) => (x + y < 48 ? 4 : 3))
  for (let y = 31.6; y < 51; y += 2.6) for (let x = 17; x < 32; x += 2.6) p.dot(x, y, teal, 1)
  const dial = p.rrect(36, 28.6, 50, 35.4, 1)
  p.fill(dial, amber, (x) => (x < 43 ? 4 : 3))
  for (let x = 37.4; x < 49; x += 1.8) p.fill(p.rect(x, 29.4, x + .5, 30.6), amber, 2)
  p.fill(p.rect(42.4, 29.2, 43.4, 34.8), red, 4)
  p.halo(dial, '#ffb347', .7)
  for (const x of [39.6, 46.6]) {
    p.dome(p.circ(x, 43.4, 3), cream, { bias: .15, relief: .6 })
    p.fill(p.rect(x - .4, 40.8, x + .4, 42.6), teal, 2)
  }
  bulb(p, 43, 50, amber, '#ffb347', .6, .6)
}

export const KEEPSAKE_ART: Record<string, Painter> = {
  'keepsake-trophy': trophy, 'keepsake-photo': photo, 'keepsake-charm': charm,
  'keepsake-starmap': starmap, 'keepsake-ribbon': ribbon, 'keepsake-radio': radio,
}
