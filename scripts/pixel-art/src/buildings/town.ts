// Town: the stable, the party hall, the scenario gate, the warehouse, the exchange, the observatory and the tier
// finale. Mixed roofs (teal, green, red-brown) and the brightest accents in the Hub: banners, gold, pennants.
import { rng } from '../rng.ts'
import type { Point } from '../shape.ts'
import type { Sprite } from '../sprite.ts'
import {
  barrel,
  BASE,
  col,
  crate,
  dome,
  door,
  dot,
  erase,
  fence,
  fill,
  hline,
  line,
  M,
  rect,
  roofGable,
  roofSide,
  vline,
  wall,
  window,
} from './kit.ts'
import type { Place } from './types.ts'

/** A gold horseshoe, open side down, `w` wide. */
function horseshoe(s: Sprite, id: number, x: number, y: number, w = 4, h = 4): void {
  for (let yy = y; yy < y + h; yy++) {
    s.paint(x, yy, id, 4)
    s.paint(x + w - 1, yy, id, 3)
  }
  for (let xx = x + 1; xx < x + w - 1; xx++) s.paint(xx, y - 1, id, 5)
  s.paint(x, y - 1 + 0, id, 4)
  s.paint(x + w - 1, y - 1 + 0, id, 3)
  erase(s, x, y - 1)
  erase(s, x + w - 1, y - 1)
}

/** A hanging banner: a rod, a body with a lit left edge and a swallowtail hem. */
function banner(s: Sprite, id: number, rod: number, x0: number, x1: number, top: number, bot: number): void {
  hline(s, rod, x0 - 1, x1 + 1, top - 1, 4)
  const mid = (x0 + x1) / 2
  for (let y = top; y <= bot; y++)
    for (let x = x0; x <= x1; x++) {
      if (y > bot - 2 && Math.abs(x - mid) < (y - (bot - 2)) * 1.1) continue
      s.paint(x, y, id, x === x0 ? 4 : x === x1 ? 2 : 3)
    }
}

/** A pennant on a short pole: a triangle trailing right. */
function pennant(s: Sprite, pole: number, id: number, x: number, top: number, bot: number): void {
  vline(s, pole, x, top, bot, 3)
  for (let k = 0; k < 4; k++) for (let j = 0; j < Math.max(1, 3 - Math.floor(k / 1.5)); j++) s.paint(x + 1 + k, top + j, id, j === 0 ? 4 : 3)
}

export const TOWN: Place[] = [
  {
    id: 'stable',
    name: 'Stable',
    page: 'town',
    at: { x: 0.26, y: 0.12 },
    paint: (s) => {
      // A cream and red-timber stable under teal shingles with a cupola, a horse looking out of a half-door, a golden
      // horseshoe over the stalls, a flower box, hay, and a white paddock fence.
      const roof = col(s, '#3a9488', { hueShift: 6, lift: 0.3 })
      const plaster = col(s, '#f2e6cc', { lift: 0.3 })
      const timber = col(s, '#a8543a')
      const dark = col(s, '#2a1e1e')
      const gold = col(s, '#ecb840', { lift: 0.4 })
      const hay = col(s, '#e6c25a', { lift: 0.3 })
      const white = col(s, '#f4f2ea', { lift: 0.3 })
      roofSide(s, roof, 2, 39, 13, 23, { back: 3, tex: 'shingle' })
      // The cupola on the ridge: louvred, with its own cap and a horseshoe finial.
      for (let y = 7; y <= 12; y++) for (let x = 17; x <= 24; x++) s.paint(x, y, plaster, x === 17 ? 5 : x === 24 ? 2 : 4)
      for (let y = 8; y <= 11; y += 1) hline(s, timber, 19, 22, y, y % 2 ? 2 : 3)
      roofSide(s, roof, 16, 25, 5, 7, { back: 1, tex: 'plain' })
      vline(s, gold, 20, 3, 3, 4)
      s.paint(19, 2, gold, 4)
      s.paint(21, 2, gold, 3)
      wall(s, plaster, 4, 37, 24, BASE, 'plaster', 'stable')
      for (const x of [4, 37]) vline(s, timber, x, 24, BASE, x === 4 ? 4 : 2)
      hline(s, timber, 4, 37, 24, 2)
      // Two stalls with dutch doors: the left one open on top, a horse looking out.
      const stall = (x: number, open: boolean) => {
        rect(s, timber, x - 1, 27, x + 7, BASE, 3)
        vline(s, timber, x - 1, 27, BASE, 4)
        hline(s, timber, x - 1, x + 7, 27, 4)
        if (open) rect(s, dark, x, 28, x + 6, 34, 1)
        else {
          rect(s, white, x, 28, x + 6, 34, 4)
          line(s, timber, x, 28, x + 6, 34, 3)
          line(s, timber, x + 6, 28, x, 34, 3)
        }
        hline(s, timber, x - 1, x + 7, 35, 2)
        rect(s, white, x, 36, x + 6, BASE, 4)
        line(s, timber, x, 36, x + 6, BASE, 3)
        line(s, timber, x + 6, 36, x, BASE, 3)
        vline(s, white, x + 6, 36, BASE, 3)
      }
      stall(7, true)
      stall(26, false)
      // The horse: a long chestnut face looking out, ears up, a dark forelock, a white blaze, a pale muzzle.
      const coat = col(s, '#b06a3c', { lift: 0.3 })
      const mane = col(s, '#4a2c20')
      const muzzle = col(s, '#e8c8a8')
      for (let y = 27; y <= 35; y++) for (let x = 9; x <= 12; x++) s.paint(x, y, coat, x === 9 ? 4 : x === 12 ? 2 : 3)
      s.paint(9, 26, coat, 4)
      s.paint(12, 26, coat, 2)
      s.paint(9, 25, coat, 4)
      s.paint(12, 25, coat, 3)
      hline(s, mane, 10, 11, 27, 2)
      s.paint(10, 28, mane, 1)
      vline(s, white, 11, 28, 32, 5)
      vline(s, white, 10, 30, 32, 4)
      s.paint(9, 29, dark, 1)
      s.paint(12, 29, dark, 1)
      rect(s, muzzle, 9, 33, 12, 35, 4)
      vline(s, muzzle, 12, 33, 35, 3)
      s.paint(9, 34, dark, 2)
      s.paint(12, 34, dark, 2)
      hline(s, coat, 9, 12, 33, 3)
      // Horseshoe and a window box between the stalls.
      // A lucky horseshoe, open end up, over the window.
      for (const [x, y, t] of [[19, 25, 5], [19, 26, 4], [19, 27, 4], [20, 28, 4], [21, 29, 3], [22, 28, 3], [23, 27, 3], [23, 26, 3], [23, 25, 4], [20, 29, 4], [22, 29, 2]] as const) s.paint(x, y, gold, t)
      window(s, timber, col(s, '#3a4a66'), 19, 32, 5, 3)
      const flowers = [col(s, '#ec6a8a'), col(s, '#f4d04a'), col(s, '#ec6a8a')]
      rect(s, timber, 17, 36, 24, 37, 3)
      hline(s, timber, 17, 24, 36, 4)
      flowers.forEach((id, i) => {
        s.paint(18 + i * 2, 35, id, 4)
        s.paint(19 + i * 2, 35, col(s, '#5aa63c'), 3)
      })
      // A hay bale with its twine, and the paddock fence.
      const bale = M.rect(2, 37, 9, BASE)
      bale.each((x, y) => s.paint(x, y, hay, y <= 38 ? (x === 9 ? 3 : 5) : x === 2 ? 4 : x === 9 ? 2 : (x + y) % 3 === 0 ? 2 : 3))
      for (const x of [4, 7]) vline(s, timber, x, 37, BASE, 2)
      fence(s, white, 36, 45, BASE, { every: 3, h: 7 })
    },
  },
  {
    id: 'party-hall',
    name: 'Party Hall',
    page: 'town',
    at: { x: 0.75, y: 0.13 },
    paint: (s) => {
      // A two-storey timbered guildhall under green shingles, a gabled dormer with a gold crest, banners and bunting.
      const roof = col(s, '#3c7c58', { hueShift: 6, lift: 0.3 })
      const plaster = col(s, '#f0e4c6', { lift: 0.3 })
      const timber = col(s, '#6a4430')
      const stone = col(s, '#aaa292', { lift: 0.3 })
      const glass = col(s, '#ffd36a', { lift: 0.4 })
      const gold = col(s, '#e8b440', { lift: 0.4 })
      const red = col(s, '#d0443a', { lift: 0.3 })
      const blue = col(s, '#3a62c8', { lift: 0.3 })
      roofSide(s, roof, 2, 45, 9, 20, { back: 3, tex: 'shingle' })
      // The dormer.
      const gable = roofGable(s, roof, 16, 31, 19, 9, 5, { tex: 'shingle', wallTop: 21 })
      fill(s, gable.subtract(M.rect(0, 0, 17, 47)).subtract(M.rect(30, 0, 47, 47)), plaster, 4)
      dome(s, M.circle(24, 16.5, 2.4), gold, { contact: false, bias: 0.1 })
      s.paint(24, 16, red, 4)
      // Upper storey: plaster in a timber frame.
      wall(s, plaster, 5, 42, 21, 31, 'plaster', 'hall-up')
      for (const x of [5, 12, 19, 28, 35, 42]) vline(s, timber, x, 21, 31, x === 5 ? 3 : 2)
      hline(s, timber, 5, 42, 21, 1)
      hline(s, timber, 5, 42, 31, 2)
      for (const x of [14, 30, 37]) window(s, timber, glass, x, 24, 3, 4, { lit: true, mullion: false })
      window(s, timber, glass, 22, 24, 4, 4, { lit: true, mullion: true })
      line(s, timber, 6, 30, 11, 22, 3)
      // Ground storey: stone with a great arched door and two lanterns.
      wall(s, stone, 5, 42, 32, BASE, 'stone', 'hall-down')
      hline(s, stone, 5, 42, 32, 4)
      door(s, timber, 20, BASE, 8, 9, { arch: true, leaves: 2, frame: stone })
      for (const x of [17, 30]) {
        rect(s, glass, x, 36, x + 1, 37, 5)
        hline(s, timber, x, x + 1, 35, 1)
      }
      // Banners hanging from the jetty, and bunting along it.
      banner(s, red, timber, 7, 10, 33, 42)
      banner(s, blue, timber, 37, 40, 33, 42)
      for (let x = 5; x <= 42; x++) {
        const k = Math.floor((x - 5) / 3)
        const tip = (x - 5) % 3 === 1
        const id = [red, gold, blue][k % 3] ?? red
        s.paint(x, 32, id, 4)
        if (tip) s.paint(x, 33, id, 3)
      }
    },
  },
  {
    id: 'scenario-gate',
    name: 'Scenario Gate',
    page: 'town',
    at: { x: 0.5, y: 0.36 },
    paint: (s) => {
      // A grand marble arch with a checkered frieze, a gold horseshoe keystone and pennants, a racetrack running through it.
      const marble = col(s, '#e6e2d6', { lift: 0.3 })
      const gold = col(s, '#e6b23c', { lift: 0.4 })
      const dirt = col(s, '#c08e5c')
      const turf = col(s, '#5aa448', { hueShift: 8 })
      const white = col(s, '#f6f6f0')
      const black = col(s, '#2a2a34')
      // The track, narrowing as it runs back through the arch, turf on either side.
      for (let y = 18; y <= BASE; y++) {
        const t = (y - 18) / (BASE - 18)
        const half = 4.5 + t * 6
        const turfHalf = half + 2 + t * 2
        for (let x = 0; x < 48; x++) {
          const d = Math.abs(x + 0.5 - 24)
          if (d < half) s.paint(x, y, dirt, (x + y) % 5 === 0 ? 2 : y === 18 ? 2 : 3)
          else if (d < half + 1) s.paint(x, y, white, 4)
          else if (d < turfHalf) s.paint(x, y, turf, 3)
        }
      }
      // The finish line.
      for (let x = 15; x <= 32; x++) for (const y of [36, 37]) if (s.filled(x, y) && s.mat[y * 48 + x] === dirt) s.paint(x, y, (x + y) % 2 ? white : black, (x + y) % 2 ? 5 : 2)
      // Pillars: fluted shafts on plinths under capitals.
      for (const [x0, x1] of [[4, 13], [34, 43]] as const) {
        for (let y = 16; y <= BASE; y++) for (let x = x0 + 1; x <= x1 - 1; x++) s.paint(x, y, marble, x === x0 + 1 ? 5 : x === x1 - 1 ? 2 : (x - x0) % 2 === 0 ? 3 : 4)
        rect(s, marble, x0, 39, x1, BASE, 4)
        hline(s, marble, x0, x1, 39, 5)
        hline(s, marble, x0, x1, BASE, 2)
        rect(s, marble, x0, 14, x1, 15, 4)
        hline(s, marble, x0, x1, 15, 2)
      }
      // The arch's spandrels and soffit.
      for (let x = 14; x <= 33; x++) {
        const dx = x + 0.5 - 24
        const curve = 24 - Math.sqrt(Math.max(0, 100 - dx * dx))
        for (let y = 14; y < curve; y++) s.paint(x, y, marble, y === Math.floor(curve - 0.01) ? 2 : 4)
      }
      // The entablature: cornice, gold trims, a checkered frieze.
      rect(s, marble, 3, 5, 44, 13, 4)
      hline(s, marble, 3, 44, 5, 5)
      hline(s, gold, 3, 44, 7, 4)
      for (let y = 8; y <= 11; y++) for (let x = 3; x <= 44; x++) s.paint(x, y, ((x >> 1) + (y >> 1)) % 2 ? white : black, ((x >> 1) + (y >> 1)) % 2 ? 4 : 2)
      hline(s, gold, 3, 44, 12, 3)
      hline(s, marble, 3, 44, 13, 2)
      // Keystone horseshoe.
      rect(s, marble, 22, 13, 25, 16, 5)
      horseshoe(s, gold, 22, 14, 4, 3)
      // Pennants on the corners.
      const pole = col(s, '#8a6a4a')
      pennant(s, pole, col(s, '#d8443a', { lift: 0.3 }), 5, 2, 4)
      pennant(s, pole, col(s, '#3a64cc', { lift: 0.3 }), 38, 2, 4)
      pennant(s, pole, gold, 23, 2, 4)
    },
  },
  {
    id: 'warehouse',
    name: 'Warehouse',
    page: 'town',
    at: { x: 0.24, y: 0.6 },
    paint: (s) => {
      // A big gambrel-roofed timber warehouse, white-trimmed sliding doors, a hayloft with a hoist beam, crates and barrels.
      const roof = col(s, '#8c4a3c', { lift: 0.3 })
      const boards = col(s, '#8a6646', { lift: 0.28 })
      const trim = col(s, '#ece4d0', { lift: 0.3 })
      const dark = col(s, '#2a2020')
      const wood = col(s, '#a87a48')
      const iron = col(s, '#5a5e6a')
      // The gambrel gable faces us: two pitches per side.
      const edge: Point[] = [[3, 25], [9, 14], [24, 7], [39, 14], [45, 25]]
      const edgeY = (px: number) => {
        for (let i = 0; i < edge.length - 1; i++) {
          const [ax, ay] = edge[i] ?? [0, 0]
          const [bx, by] = edge[i + 1] ?? [0, 0]
          if (px >= ax && px <= bx) return ay + ((px - ax) / (bx - ax)) * (by - ay)
        }
        return 99
      }
      const depth = 5
      for (let x = 3; x <= 44; x++) {
        const px = x + 0.5
        const e = edgeY(px)
        const steep = px < 9 || px > 39
        const left = px < 24
        for (let y = 0; y < 48; y++) {
          const py = y + 0.5
          if (py <= e + 0.5 && py >= e - depth) {
            const fromEdge = e - py
            let tone = left ? (steep ? 4 : 5) : steep ? 2 : 3
            if (fromEdge < 1.2) tone = left ? 3 : 1
            if (Math.abs(px - 24) < 0.6) tone = 5
            else if (Math.floor(Math.abs(px - 24)) % 3 === 2 && fromEdge >= 1.2) tone -= 1
            s.paint(x, y, roof, tone)
          } else if (py > e + 0.5 && y <= BASE && x >= 5 && x <= 42) s.paint(x, y, boards, x === 5 ? 4 : x === 42 ? 2 : (x - 5) % 4 === 3 ? 2 : 3)
        }
      }
      for (let x = 5; x <= 42; x++) {
        const e = Math.ceil(edgeY(x + 0.5) + 0.5)
        s.paint(x, e, boards, 1)
      }
      // Corner trim.
      vline(s, trim, 5, 25, BASE, 4)
      vline(s, trim, 42, 25, BASE, 3)
      // Hayloft door and hoist beam.
      rect(s, dark, 21, 15, 26, 21, 1)
      rect(s, trim, 20, 14, 27, 14, 4)
      vline(s, trim, 20, 14, 22, 4)
      vline(s, trim, 27, 14, 22, 3)
      hline(s, trim, 20, 27, 22, 3)
      hline(s, wood, 22, 25, 12, 4)
      vline(s, col(s, '#d8c08a'), 24, 13, 18, 4)
      // The big sliding doors with X braces.
      rect(s, wood, 15, 28, 32, BASE, 3)
      for (const [x0, x1] of [[15, 23], [24, 32]] as const) {
        rect(s, trim, x0, 28, x1, 28, 4)
        vline(s, trim, x0, 28, BASE, 4)
        vline(s, trim, x1, 28, BASE, 3)
        line(s, trim, x0, 28, x1, BASE, 4)
        line(s, trim, x1, 28, x0, BASE, 3)
      }
      hline(s, iron, 14, 33, 27, 2)
      // Crates and barrels.
      crate(s, wood, 2, BASE, 7, 7)
      crate(s, wood, 8, BASE, 7, 6)
      crate(s, wood, 4, 36, 7, 6)
      barrel(s, wood, iron, 37.5, BASE, 6, 7)
      barrel(s, wood, iron, 43, BASE, 5, 6)
    },
  },
  {
    id: 'exchange',
    name: 'Exchange',
    page: 'town',
    at: { x: 0.76, y: 0.6 },
    paint: (s) => {
      // A market stall: a striped awning on posts, goods heaped on the counter, a gold laurel wreath on a round sign.
      const red = col(s, '#d24a3c', { lift: 0.3 })
      const cream = col(s, '#f4ead2', { lift: 0.3 })
      const wood = col(s, '#9a6a3c')
      const dark = col(s, '#2e2420')
      const cloth = col(s, '#2e7a5a', { lift: 0.3 })
        const gold = col(s, '#ecba3c', { lift: 0.4 })
      // The sign: a gold laurel wreath on a post above the awning, open at the top, tied with a red ribbon.
      vline(s, wood, 23, 12, 14, 4)
      vline(s, wood, 24, 12, 14, 2)
      // Two branches: a dark stem curving up each side, lit leaves alternating outside and inside it.
      for (const side of [-1, 1] as const) {
        const at = (deg: number, r: number) => {
          const a = ((90 + side * deg) * Math.PI) / 180
          return [Math.floor(24 + Math.cos(a) * r), Math.floor(6.8 + Math.sin(a) * r * 0.88)] as const
        }
        for (let deg = 4; deg <= 158; deg += 3) {
          const [x, y] = at(deg, 5.4)
          s.paint(x, y, gold, 2)
        }
        for (let k = 0; k < 8; k++) {
          const deg = 20 + k * 18
          const outside = k % 2 === 0
          const [x0, y0] = at(deg, outside ? 6.6 : 4.2)
          const [x1, y1] = at(deg + 9, outside ? 6.7 : 4.1)
          s.paint(x0, y0, gold, outside ? 4 : 3)
          s.paint(x1, y1, gold, outside ? 5 : 4)
        }
      }
      for (const [x, y, t] of [[23, 12, 4], [24, 12, 3], [22, 13, 3], [25, 13, 2]] as const) s.paint(x, y, red, t)
      // Posts, and the back of the stall in shade with shelves.
      for (const x of [5, 42]) {
        vline(s, wood, x, 17, BASE, x === 5 ? 4 : 2)
        vline(s, wood, x + (x === 5 ? 1 : -1), 17, BASE, 3)
      }
      rect(s, dark, 7, 21, 40, 30, 1)
      hline(s, wood, 7, 40, 25, 3)
      const goods = [col(s, '#e8a032'), col(s, '#6a9ae4'), col(s, '#c84a5a'), col(s, '#7ab84a')]
      for (let x = 8; x <= 39; x += 3) {
        const id = goods[(x >> 1) % goods.length] ?? 0
        rect(s, id, x, 23, x + 1, 24, 3)
        s.paint(x, 23, id, 5)
      }
      // The awning: stripes, a lit top, a scalloped hem.
      for (let y = 14; y <= 21; y++)
        for (let x = 3; x <= 44; x++) {
          const stripe = Math.floor((x - 3) / 3) % 2 === 0 ? red : cream
          let tone = y === 14 ? 5 : y < 17 ? 4 : 3
          if (x === 44) tone = 2
          s.paint(x, y, stripe, tone)
        }
      for (let x = 3; x <= 44; x++) {
        const stripe = Math.floor((x - 3) / 3) % 2 === 0 ? red : cream
        if ((x - 3) % 3 !== 2) s.paint(x, 22, stripe, 2)
        if ((x - 3) % 3 === 1) s.paint(x, 23, stripe, 2)
      }
      // The counter: a lit top and a draped front.
      rect(s, wood, 4, 31, 43, 32, 4)
      hline(s, wood, 4, 43, 31, 5)
      rect(s, cloth, 4, 33, 43, BASE, 3)
      vline(s, cloth, 4, 33, BASE, 4)
      vline(s, cloth, 43, 33, BASE, 2)
      for (let x = 4; x <= 43; x++) if ((x - 4) % 6 === 5) vline(s, cloth, x, 34, BASE, 2)
      hline(s, gold, 4, 43, 34, 4)
      // Goods on the counter: apples, a jar, a stack of coins.
      for (const [x, y] of [[8, 29], [11, 29], [9.5, 27]] as const) dome(s, M.circle(x + 0.5, y + 0.5, 1.7), red, { contact: false, bias: 0.2 })
      rect(s, col(s, '#b4d0cc'), 17, 27, 19, 30, 4)
      rect(s, goods[0] ?? 0, 17, 28, 19, 30, 3)
      for (let k = 0; k < 3; k++) {
        hline(s, gold, 30, 33, 30 - k, k === 2 ? 5 : 3)
        s.paint(30, 30 - k, gold, 4)
      }
      hline(s, gold, 35, 38, 30, 4)
      hline(s, gold, 35, 38, 29, 5)
      rect(s, col(s, '#8a5ab8', { lift: 0.3 }), 23, 28, 27, 30, 3)
      hline(s, col(s, '#8a5ab8', { lift: 0.3 }), 23, 27, 28, 5)
    },
  },
  {
    id: 'observatory',
    name: 'Observatory',
    page: 'town',
    at: { x: 0.25, y: 0.86 },
    paint: (s) => {
      // A round stone drum under a great ribbed dome, its slit open and a brass telescope pointing at the sky.
      const stone = col(s, '#ddd4c0', { lift: 0.3 })
      const domeId = col(s, '#8aa4c4', { lift: 0.38, hueShift: 6 })
      const brass = col(s, '#dca444', { lift: 0.4 })
      const dark = col(s, '#1c2034')
      const wood = col(s, '#6a4a3a')
      for (let y = 28; y <= BASE; y++)
        for (let x = 9; x <= 38; x++) {
          const t = (x + 0.5 - 24) / 15
          let tone = t < -0.6 ? 4 : t < 0.2 ? 3 : t < 0.75 ? 2 : 1
          if ((y - 28) % 4 === 3) tone = Math.max(1, tone - 1)
          s.paint(x, y, stone, tone)
        }
      hline(s, stone, 8, 39, 28, 5)
      hline(s, stone, 8, 39, 29, 2)
      door(s, wood, 21, BASE, 6, 9, { arch: true, frame: stone })
      for (const x of [12, 33]) window(s, stone, dark, x, 33, 2, 4, { arch: true })
      const domeM = M.ellipse(24, 28, 14.5, 15).subtract(M.rect(0, 28, 47, 47))
      dome(s, domeM, domeId, { contact: false, relief: 1.1 })
      // Ribs.
      domeM.each((x, y) => {
        const u = (x + 0.5 - 24) / (14.5 * Math.sqrt(Math.max(0.01, 1 - ((28 - y - 0.5) / 15) ** 2)))
        for (const r of [-0.72, -0.38, 0.38, 0.72]) if (Math.abs(u - r) < 0.07) s.shift(x, y, -1)
      })
      // The slit.
      for (let y = 14; y <= 27; y++) for (let x = 22; x <= 25; x++) if (domeM.get(x, y)) s.paint(x, y, dark, x === 22 ? 2 : 1)
      // The telescope: a brass tube with a dark band, aimed up and to the right.
      for (let k = 0; k <= 13; k++) {
        const x = 24 + k, y = 21 - Math.round(k * 0.9)
        s.paint(x, y, brass, 5)
        s.paint(x, y + 1, brass, 4)
        s.paint(x + 1, y + 1, brass, 3)
        s.paint(x, y + 2, brass, 2)
        if (k === 6) {
          s.paint(x, y + 1, wood, 2)
          s.paint(x + 1, y + 1, wood, 1)
        }
      }
      dome(s, M.circle(38.5, 9.5, 2.2), brass, { contact: false, bias: 0.2 })
      s.paint(38, 9, col(s, '#cfe6ff'), 5)
      for (const [x, y] of [[9, 9], [14, 5], [43, 18]] as const) dot(s, x, y, '#fff4c8', 220)
    },
  },
  {
    id: 'tier-finale',
    name: 'Tier Finale',
    page: 'town',
    at: { x: 0.75, y: 0.86 },
    paint: (s) => {
      // A small oval stadium: arcaded walls, tiered stands round a turf arena with a track, pennants round the rim.
      const stone = col(s, '#dcc8a2', { lift: 0.3 })
      const arch = col(s, '#3a2c2a')
      const turf = col(s, '#5aa448', { hueShift: 8 })
      const dirt = col(s, '#c4925e')
      const crowd = [col(s, '#d0503e'), col(s, '#3a64c8'), col(s, '#ecb83c'), col(s, '#f2ece0')]
      const cx = 24, cy = 23, rx = 21.5, ry = 10, h = 10
      const top = M.ellipse(cx, cy, rx, ry)
      // Front wall face: below the near half of the rim, `h` rows deep.
      for (let x = 0; x < 48; x++) {
        const dx = (x + 0.5 - cx) / rx
        if (Math.abs(dx) >= 1) continue
        const arc = cy + ry * Math.sqrt(1 - dx * dx)
        for (let y = Math.floor(arc); y <= Math.min(BASE, Math.floor(arc + h)); y++) {
          if (top.get(x, y)) continue
          const t = dx
          let tone = t < -0.6 ? 4 : t < 0.3 ? 3 : t < 0.8 ? 2 : 1
          const row = y - Math.floor(arc)
          if (row === 0) tone = 5
          // Two rows of arches.
          const col0 = (x + 1) % 4
          const upper = row >= 2 && row <= 4, lower = row >= 6 && row <= 9
          if ((upper || lower) && (col0 === 1 || col0 === 2) && !(row === 2 && col0 === 1) && !(row === 6 && col0 === 1)) {
            s.paint(x, y, arch, row === 2 || row === 6 ? 1 : 2)
            continue
          }
          if (row === 5) tone = Math.min(tone, 2)
          s.paint(x, y, stone, tone)
        }
      }
      // Stands: concentric tiers on the rim, crowd specks on the far side.
      const r = rng('finale-crowd')
      top.each((x, y) => {
        const d = Math.hypot((x + 0.5 - cx) / rx, (y + 0.5 - cy) / ry)
        const tier = Math.floor((1 - d) * 7)
        let tone = tier % 2 === 0 ? 4 : 3
        if (d > 0.93) tone = 5
        s.paint(x, y, stone, tone)
        if (y < cy - 1 && d < 0.88 && d > 0.6 && r() < 0.28) s.paint(x, y, crowd[Math.floor(r() * crowd.length)] ?? 0, 4)
      })
      // The arena: turf ringed by a track, sunk below the stands.
      const arena = M.ellipse(cx, cy + 1, 13, 5.2)
      arena.each((x, y) => {
        const d = Math.hypot((x + 0.5 - cx) / 13, (y + 0.5 - cy - 1) / 5.2)
        s.paint(x, y, d > 0.72 ? dirt : turf, d > 0.72 ? 3 : (x + y) % 4 === 0 ? 4 : 3)
        if (!arena.get(x, y - 1) || !arena.get(x, y - 2)) s.paint(x, y, stone, 2)
      })
      // Pennants round the back of the rim.
      const pole = col(s, '#7a5a40')
      const flags = [crowd[0], crowd[2], crowd[1], crowd[2], crowd[0]]
      ;[6, 15, 24, 33, 41].forEach((x, i) => {
        const dx = (x + 0.5 - cx) / rx
        const rimY = Math.round(cy - ry * Math.sqrt(1 - dx * dx))
        pennant(s, pole, flags[i] ?? 0, x, rimY - 6, rimY)
      })
    },
  },
]
