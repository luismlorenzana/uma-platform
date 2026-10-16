// A01, uma-racer manual 11 §10: four original 48px places, in the shared frontal/overhead building kit.
import type { Sprite } from '../sprite.ts'
import { BASE, col, dome, door, fence, fill, hline, M, rect, roofSide, slab, vline, wall } from './kit.ts'
import type { Place } from './types.ts'

function library(s: Sprite): void {
  const plaster = col(s, '#e8d3ae', { lift: 0.3 })
  const stone = col(s, '#b8ad96', { lift: 0.3 })
  const roof = col(s, '#955449', { lift: 0.3 })
  const wood = col(s, '#785339')
  const dark = col(s, '#302a32')
  const paper = col(s, '#f2e8cb', { lift: 0.3 })
  const red = col(s, '#bd4f4b')
  const books = [red, col(s, '#477b73'), col(s, '#c3a14a'), col(s, '#557096')]
  wall(s, plaster, 6, 36, 17, 31, 'plaster', 'card-library')
  wall(s, stone, 6, 36, 32, BASE, 'stone', 'card-library-base')
  roofSide(s, roof, 3, 39, 9, 16, { tex: 'slate', back: 2 })
  hline(s, stone, 5, 37, 31, 4)
  // A tall arched book window spanning the two floors: shelves, coloured spines and pale page edges, no glow.
  const arch = M.rect(10, 24, 23, 37).union(M.ellipse(17, 24, 7, 6))
  slab(s, arch, stone)
  const opening = M.rect(12, 24, 21, 35).union(M.ellipse(17, 24, 5, 4))
  fill(s, opening, dark, 1)
  for (const [row, y] of [25, 30, 35].entries()) {
    for (let x = 12; x <= 21; x++) if (opening.get(x, y)) s.paint(x, y, wood, 4)
    for (let x = 12; x < 22; x += 2) {
      const height = (x + row) % 3 === 0 ? 2 : 3
      for (let k = 1; k <= height; k++) if (opening.get(x, y - k)) {
        s.paint(x, y - k, books[(x / 2 + row) % books.length]!, k === height ? 4 : 3)
        if (opening.get(x + 1, y - k)) s.paint(x + 1, y - k, paper, k === height ? 4 : 2)
      }
    }
  }
  hline(s, stone, 9, 24, 38, 5)
  door(s, wood, 28, BASE, 6, 9, { arch: true, frame: stone })
  // Iron bracket and suspended playing-card sign, outside the facade so the icon remains legible.
  const iron = col(s, '#57505a')
  hline(s, iron, 35, 43, 21, 4)
  vline(s, iron, 41, 22, 24, 3)
  rect(s, wood, 38, 25, 44, 33, 3)
  rect(s, paper, 39, 26, 43, 32, 4)
  for (const [x, y] of [[41, 27], [40, 28], [41, 28], [42, 28], [41, 29], [41, 30]] as const) s.paint(x, y, red, 3)
  s.paint(39, 26, red, 4)
  s.paint(43, 32, red, 2)
}

function gym(s: Sprite): void {
  const brick = col(s, '#b46f50', { lift: 0.3 })
  const roof = col(s, '#596e7c', { lift: 0.32 })
  const stone = col(s, '#c5bca5', { lift: 0.3 })
  const wood = col(s, '#9e754e')
  const dark = col(s, '#292c32')
  const iron = col(s, '#7c8a99', { lift: 0.35 })
  const rope = col(s, '#dcc28a')
  wall(s, brick, 5, 42, 23, BASE, 'brick', 'gym')
  roofSide(s, roof, 3, 44, 14, 22, { tex: 'slate', back: 3 })
  // Open front, with the floor visible from above. Everything inside is athletic equipment, never weapons.
  rect(s, dark, 9, 28, 38, 40, 1)
  rect(s, wood, 9, 40, 38, BASE, 3)
  hline(s, wood, 9, 38, 40, 4)
  for (const x of [9, 38]) vline(s, stone, x, 28, BASE, x === 9 ? 4 : 2)
  hline(s, stone, 8, 39, 27, 4)
  // A two-tier dumbbell rack: short silver grips between paired dark weight plates.
  for (const x of [13, 27]) vline(s, iron, x, 32, 41, x === 13 ? 4 : 2)
  for (const y of [34, 39]) {
    hline(s, iron, 12, 28, y, 3)
    for (const x of [15, 23]) {
      hline(s, iron, x - 2, x + 2, y - 2, 5)
      for (const dx of [-3, 2]) {
        rect(s, iron, x + dx, y - 4, x + dx + 1, y - 1, 2)
        s.paint(x + dx, y - 4, iron, 4)
      }
    }
  }
  vline(s, rope, 33, 28, 38, 4)
  for (let y = 29; y <= 38; y += 2) s.paint(34, y, rope, 2)
  hline(s, rope, 32, 34, 39, 3)
  // Stopwatch sign above the entrance, with button, winding crown and a readable minute hand.
  const face = col(s, '#f3ead6', { lift: 0.3 })
  const green = col(s, '#347563')
  dome(s, M.circle(24, 24, 4.3), green, { contact: false })
  fill(s, M.circle(24, 24, 2.8), face, 4)
  vline(s, dark, 24, 22, 24, 2)
  s.paint(25, 25, dark, 2)
  hline(s, iron, 23, 25, 19, 5)
  s.paint(28, 21, iron, 4)
}

function racecourse(s: Sprite): void {
  const stone = col(s, '#d4cbb6', { lift: 0.3 })
  const roof = col(s, '#287663', { lift: 0.32 })
  const gold = col(s, '#d9b44e', { lift: 0.35 })
  const white = col(s, '#f2f1dc', { lift: 0.3 })
  const seats = col(s, '#668c9e', { lift: 0.3 })
  const dark = col(s, '#35414a')
  const turf = col(s, '#58ab66', { hueShift: 6 })
  const dirt = col(s, '#b58b60')
  const red = col(s, '#cf4d45', { lift: 0.3 })
  // A single roofed grandstand, not the ring-shaped Expedition stadium. Narrow far seats, widening near seats.
  wall(s, stone, 7, 36, 20, 34, 'stone', 'racecourse')
  for (let tier = 0; tier < 4; tier++) {
    const y = 21 + tier * 3, x0 = 10 - tier, x1 = 33 + tier
    rect(s, dark, x0, y, x1, y + 2, 2)
    for (let x = x0 + 1; x < x1; x++) {
      s.paint(x, y, seats, 4)
      s.paint(x, y + 1, seats, x % 3 === 0 ? 2 : 3)
    }
    hline(s, stone, x0, x1, y + 2, 4)
    // A central aisle separates the seat blocks; alternating treads reveal the tiering at 1×.
    rect(s, stone, 21, y, 23, y + 2, 3)
    hline(s, stone, 21, 23, y, 5)
  }
  roofSide(s, roof, 4, 39, 12, 19, { tex: 'tile', back: 2, ridge: gold })
  hline(s, gold, 4, 39, 18, 4)
  for (const x of [6, 37]) {
    vline(s, white, x, 20, 34, x === 6 ? 4 : 2)
    vline(s, white, x + 1, 20, 34, 3)
  }
  // Roof pennant: one flag and a long open track make a different silhouette from tier-finale's flag ring.
  vline(s, white, 23, 3, 11, 4)
  fill(s, M.poly([[24, 3], [32, 5], [24, 8]]), gold, 4)
  hline(s, roof, 24, 27, 5, 3)
  // Turf oval and raked dirt lane in the foreground, viewed from above.
  const oval = M.ellipse(24, 39, 20, 4.4)
  oval.each((x, y) => s.paint(x, y, turf, Math.floor(x / 4) % 2 ? 3 : 4))
  for (let y = 38; y <= 42; y++) for (let x = 5; x <= 42; x++) {
    if (!oval.get(x, y) || y < 39) continue
    s.paint(x, y, dirt, y % 2 === 0 ? 3 : 4)
  }
  // White rails in front of the stand and along the near side. Their feet stop on the shared ground line.
  fence(s, white, 4, 38, 36, { every: 7, h: 3 })
  fence(s, white, 4, 39, BASE, { every: 7, h: 3 })
  // Finish post, with the familiar red-and-white winning disc (no logo or copied course layout).
  vline(s, white, 42, 29, BASE, 4)
  vline(s, white, 43, 29, BASE, 2)
  dome(s, M.circle(42.5, 27, 3.2), red, { contact: false })
  fill(s, M.circle(42.5, 27, 1.7), white, 5)
  s.paint(42, 27, red, 4)
}

function trophyHall(s: Sprite): void {
  const stone = col(s, '#e0d7bd', { lift: 0.3 })
  const shade = col(s, '#777666')
  const green = col(s, '#307460', { lift: 0.3 })
  const gold = col(s, '#e1b641', { lift: 0.4 })
  const wood = col(s, '#70513e')
  wall(s, stone, 7, 40, 23, 40, 'stone', 'trophy-hall')
  rect(s, shade, 12, 26, 35, 40, 2)
  door(s, wood, 21, 40, 6, 12, { arch: true, frame: stone })
  // Four fluted columns with capitals and bases, all viewed head-on.
  for (const x of [10, 17, 29, 36]) {
    rect(s, stone, x - 1, 25, x + 2, 27, 4)
    for (let y = 28; y <= 38; y++) {
      s.paint(x, y, stone, 5)
      s.paint(x + 1, y, stone, 2)
    }
    rect(s, stone, x - 1, 39, x + 2, 40, 4)
  }
  // A shallow roof behind the triangular classical pediment.
  fill(s, M.poly([[5, 22], [24, 11], [42, 22]]), green, 4)
  slab(s, M.poly([[4, 25], [24, 14], [44, 25]]), stone)
  fill(s, M.poly([[12, 23], [24, 17], [36, 23]]), green, 3)
  hline(s, gold, 12, 35, 23, 4)
  hline(s, stone, 4, 43, 25, 5)
  hline(s, stone, 4, 43, 26, 2)
  // Cup at the peak: bowl, open handles, stem and a stepped foot.
  const bowl = M.poly([[20, 4], [27, 4], [26, 9], [24, 11], [22, 9]])
  slab(s, bowl, gold)
  hline(s, gold, 20, 27, 4, 5)
  for (const [x, d] of [[19, -1], [28, 1]] as const) {
    vline(s, gold, x + d, 5, 7, d < 0 ? 4 : 2)
    s.paint(x, 5, gold, 4)
    s.paint(x, 8, gold, 3)
  }
  vline(s, gold, 23, 10, 12, 4)
  hline(s, gold, 21, 26, 13, 4)
  // Racing-green cloth with gold side edges, suspended beyond the columns.
  for (const x of [5, 40]) {
    rect(s, green, x, 28, x + 2, 36, 3)
    vline(s, gold, x, 28, 37, 4)
    s.paint(x + 2, 37, green, 2)
    s.paint(x + 1, 30, gold, 4)
  }
  rect(s, stone, 6, 41, 41, BASE, 3)
  hline(s, stone, 6, 41, 41, 5)
  hline(s, stone, 4, 43, BASE, 4)
}

export const RACER: Place[] = [
  { id: 'card-library', name: 'Card Library', page: 'town', at: { x: 0.75, y: 0.36 }, paint: library },
  { id: 'gym', name: 'Gym', page: 'learning', at: { x: 0.5, y: 0.7 }, paint: gym },
  { id: 'racecourse', name: 'Racecourse', page: 'racing', at: { x: 0.5, y: 0.76 }, paint: racecourse },
  { id: 'trophy-hall', name: 'Trophy Hall', page: 'racing', at: { x: 0.24, y: 0.4 }, paint: trophyHall },
]
