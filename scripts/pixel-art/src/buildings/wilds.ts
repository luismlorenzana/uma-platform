// Wilds: the eight gathering sites and the two material stations. Natural stone and timber, darker and rougher than
// the Farmlands it mirrors.
import { rng } from '../rng.ts'
import type { Point } from '../shape.ts'
import type { Sprite } from '../sprite.ts'
import {
  barrel,
  BASE,
  boulder,
  chimney,
  col,
  crystal,
  dome,
  dot,
  fill,
  glow,
  hline,
  line,
  M,
  pick,
  pine,
  rect,
  roofSide,
  vline,
  wall,
} from './kit.ts'
import type { Place } from './types.ts'

/** A bone: a shaft with knobbly ends. */
function bone(s: Sprite, id: number, x0: number, y0: number, x1: number, y1: number): void {
  line(s, id, x0, y0, x1, y1, 4)
  for (const [x, y] of [[x0, y0], [x1, y1]] as const) {
    s.paint(x - 1, y, id, 5)
    s.paint(x, y - 1, id, 5)
    s.paint(x + 1, y, id, 3)
    s.paint(x, y + 1, id, 2)
  }
}

/** A cut stone block in 3/4 view: lit top, front face with a chisel line. */
function block(s: Sprite, id: number, x: number, bot: number, w: number, h: number, lid = 3): void {
  const top = bot - h + 1
  for (let y = top; y <= bot; y++)
    for (let xx = x; xx < x + w; xx++) {
      let tone = y < top + lid ? (xx === x ? 5 : 4) : xx === x ? 4 : xx === x + w - 1 ? 2 : 3
      if (y === top + lid) tone = 2
      if (y === bot) tone = Math.min(tone, 2)
      s.paint(xx, y, id, tone)
    }
  if (w > 5) vline(s, id, x + Math.floor(w / 2), top + lid + 2, bot - 2, 2)
}

/** A tuft of grass blades fanning out from a base. */
function tuft(s: Sprite, id: number, cx: number, bot: number, h: number, blades: number, seed: string): void {
  const r = rng(seed)
  for (let i = 0; i < blades; i++) {
    const t = blades === 1 ? 0 : i / (blades - 1) - 0.5
    const x0 = Math.round(cx + t * blades * 0.8)
    const lean = Math.round(t * 4 + (r() - 0.5) * 2)
    const hh = Math.round(h * (0.7 + r() * 0.3) * (1 - Math.abs(t) * 0.5))
    line(s, id, x0, bot, x0 + lean, bot - hh, (k) => (k > hh - 2 ? 5 : k > hh * 0.5 ? 4 : k > 1 ? 3 : 2))
  }
}

export const WILDS: Place[] = [
  {
    id: 'monster-den',
    name: 'Monster Den',
    page: 'wilds',
    at: { x: 0.24, y: 0.1 },
    paint: (s) => {
      // A jagged dark crag with a fanged maw, eyes glinting inside, claw marks gouged in the rock and bones strewn out front.
      const rock = col(s, '#5f5668', { hueShift: 6, lift: 0.3 })
      const maw = col(s, '#1c1622')
      const boneId = col(s, '#e8dec6')
      const dirt = col(s, '#6e5a46')
      fill(s, M.ellipse(24, 41.5, 21, 3.2), dirt, 3)
      for (const [x, y] of pick(s, 'den-dirt', M.ellipse(24, 41.5, 20, 2.5), 14, 1)) s.shift(x, y, (x + y) % 2 ? -1 : 1)
      const pts: Point[] = [
        [3, 42], [4, 31], [7, 25], [9, 27], [11, 15], [15, 21], [18, 8], [21, 16], [24.5, 4], [28, 15], [31, 9], [34, 19], [37, 13], [40, 24], [43, 27], [45, 42],
      ]
      const crag = M.poly(pts)
      dome(s, crag, rock, { relief: 0.7 })
      // Lit left edges on every spike.
      crag.each((x, y) => {
        if (!crag.get(x - 1, y) && crag.get(x + 1, y)) s.paint(x, y, rock, 5)
        if (!crag.get(x + 1, y) && crag.get(x - 1, y)) s.paint(x, y, rock, 1)
      })
      // Cracks.
      line(s, rock, 18, 12, 16, 22, 1)
      line(s, rock, 31, 13, 33, 22, 1)
      // Claw marks: three gouges.
      for (let k = 0; k < 3; k++) {
        line(s, rock, 6 + k * 2, 36 - k, 10 + k * 2, 29 - k, 1)
        line(s, rock, 7 + k * 2, 36 - k, 11 + k * 2, 29 - k, 4)
      }
      const mouth = M.ellipse(24.5, 44, 10.5, 18).subtract(M.rect(0, 44, 47, 47))
      mouth.each((x, y) => s.paint(x, y, maw, y < 32 ? 1 : 2))
      // Fangs hanging from the top of the maw and rising from the floor.
      const fang = (x: number, y: number, len: number, dir: 1 | -1) => {
        for (let k = 0; k < len; k++) {
          const w = len - k > 2 ? 1 : 0
          for (let dx = -w; dx <= 0; dx++) s.paint(x + dx, y + k * dir, boneId, dx < 0 ? 5 : k === len - 1 ? 3 : 4)
        }
      }
      fang(17, 30, 4, 1)
      fang(21, 27, 5, 1)
      fang(28, 27, 5, 1)
      fang(32, 30, 4, 1)
      fang(20, 43, 3, -1)
      fang(29, 43, 3, -1)
      // Eyes.
      for (const x of [21, 27]) {
        dot(s, x, 33, '#ffcf4a')
        dot(s, x + 1, 33, '#ff6a2a')
        glow(s, x + 1, 33.5, 3, 2, '#ff5a2a', 90)
      }
      // A skull and bones in the dirt.
      const skull = M.ellipse(8, 39.5, 3.4, 2.8).union(M.rect(6, 40, 9, 42))
      dome(s, skull, boneId, { contact: false, bias: 0.1 })
      s.paint(6, 40, maw, 1)
      s.paint(9, 40, maw, 1)
      hline(s, boneId, 7, 8, 42, 2)
      bone(s, boneId, 36, 42, 42, 39)
      bone(s, boneId, 36, 39, 42, 42)
    },
  },
  {
    id: 'ley-spring',
    name: 'Ley Spring',
    page: 'wilds',
    at: { x: 0.74, y: 0.12 },
    paint: (s) => {
      // A round pool of glowing blue water ringed by mossy boulders, a standing stone carved with a shining ley line.
      const stone = col(s, '#8e8a80', { lift: 0.3 })
      const moss = col(s, '#6c9c48')
      const pool = col(s, '#3ec8ea', { lift: 0.45, hueShift: 4 })
      const menhir = M.ellipse(24, 14, 5, 11).union(M.rect(19, 14, 29, 27))
      dome(s, menhir, (x, y) => (y < 7 + ((x * 3) % 2) ? moss : stone), { relief: 0.8 })
      const rune = col(s, '#7ff0ff', { lift: 0.5 })
      vline(s, rune, 24, 9, 24, 4)
      for (const [x0, y0, x1, y1] of [[22, 12, 24, 14], [26, 15, 24, 17], [22, 19, 24, 21]] as const) line(s, rune, x0, y0, x1, y1, 4)
      glow(s, 24, 16, 5, 10, '#7ff0ff', 60)
      for (const [cx, bot, rx, ry] of [[9, 33, 5.5, 4.5], [39, 33, 5.5, 4.5], [17, 28, 4, 3], [31, 28, 4, 3]] as const) {
        const m = boulder(s, stone, cx, bot, rx, ry)
        m.each((x, y) => {
          if (!m.get(x, y - 2)) s.paint(x, y, moss, s.toneAt(x, y))
        })
      }
      const rim = M.ellipse(24, 34.5, 15, 7.5)
      fill(s, rim, stone, 4)
      const hole = M.ellipse(24, 35, 12.5, 5.6)
      hole.each((x, y) => s.paint(x, y, stone, 2))
      const wet = M.from((px, py) => hole.get(Math.floor(px), Math.floor(py)) && hole.get(Math.floor(px), Math.floor(py) - 1))
      wet.each((x, y) => {
        const d = Math.hypot((x + 0.5 - 24) / 12.5, (y + 0.5 - 35.5) / 5.6)
        s.paint(x, y, pool, d < 0.45 ? 5 : d < 0.8 ? 4 : 3)
      })
      for (const [cx, bot, rx, ry] of [[7, 42, 4.6, 4], [41, 42, 4.6, 4], [15, 43, 4, 3], [33, 43, 4, 3.2]] as const) {
        const m = boulder(s, stone, cx, bot, rx, ry)
        m.each((x, y) => {
          if (!m.get(x, y - 2)) s.paint(x, y, moss, s.toneAt(x, y))
        })
      }
      glow(s, 24, 34, 15, 8, '#6fe6ff', 90)
      for (const [x, y] of [[20, 27], [28, 25], [15, 22], [33, 20], [24, 30]] as const) dot(s, x, y, '#c8fbff', 220)
    },
  },
  {
    id: 'mine',
    name: 'Mine',
    page: 'wilds',
    at: { x: 0.2, y: 0.3 },
    paint: (s) => {
      // A rocky hillside with a timbered adit, rails running out of the dark and an ore cart on them, a lantern on the post.
      const rock = col(s, '#8c7458', { lift: 0.3 })
      const grass = col(s, '#6e9a40')
      const timber = col(s, '#a06c3a')
      const dark = col(s, '#1a1418')
      const steel = col(s, '#9aa2ae')
      const hill = M.ellipse(24, 40, 22, 26).union(M.ellipse(12, 30, 10, 12), M.ellipse(36, 28, 10, 12)).subtract(M.rect(0, 44, 47, 47))
      dome(s, hill, rock, { relief: 0.8 })
      for (const [x, y] of pick(s, 'mine-rocks', hill, 16, 2)) {
        s.shift(x, y, 1)
        s.shift(x + 1, y + 1, -1)
      }
      // Grass on the crown of the hill.
      for (let x = 0; x < 48; x++) {
        let top = -1
        for (let y = 0; y < 48; y++) if (hill.get(x, y)) {
          top = y
          break
        }
        if (top >= 0) for (let y = top; y < top + 2 + ((x * 5) % 3 === 0 ? 1 : 0); y++) s.paint(x, y, grass, y === top ? 4 : 3)
      }
      rect(s, dark, 18, 21, 29, BASE, 1)
      for (let y = 26; y <= BASE; y++) hline(s, dark, 19, 28, y, y > 34 ? 2 : 1)
      // Rails and sleepers out of the adit.
      for (let y = 27; y <= BASE; y++) {
        const spread = (y - 27) * 0.25
        const l = Math.round(21 - spread), r = Math.round(26 + spread)
        if ((y - 27) % 3 === 0) hline(s, timber, l - 1, r + 1, y, y > 34 ? 3 : 2)
        s.paint(l, y, steel, 4)
        s.paint(r, y, steel, 3)
      }
      // The frame: two posts and a lintel, with braces.
      for (const x of [15, 30]) {
        vline(s, timber, x, 19, BASE, 4)
        vline(s, timber, x + 1, 19, BASE, 3)
        vline(s, timber, x + 2, 19, BASE, 2)
      }
      rect(s, timber, 13, 16, 34, 18, 3)
      hline(s, timber, 13, 34, 16, 5)
      hline(s, timber, 13, 34, 18, 2)
      line(s, timber, 18, 19, 20, 21, 3)
      line(s, timber, 29, 19, 27, 21, 2)
      // The cart, heaped with ore.
      const cart = col(s, '#6c6e7a')
      const ore = col(s, '#7a7470')
      const copper = col(s, '#e08a3a')
      dome(s, M.ellipse(23.5, 33.5, 7, 3.5), ore, { contact: false })
      for (const [x, y] of [[19, 32], [24, 31], [27, 33], [21, 34]] as const) {
        s.paint(x, y, copper, 5)
        s.paint(x + 1, y, copper, 3)
      }
      for (let y = 34; y <= 40; y++) {
        const inset = Math.floor((y - 34) / 3)
        for (let x = 15 + inset; x <= 32 - inset; x++) s.paint(x, y, cart, y === 34 ? 5 : x === 15 + inset ? 4 : x === 32 - inset ? 2 : y === 40 ? 2 : 3)
      }
      hline(s, cart, 16, 31, 37, 2)
      for (const x of [18, 28]) {
        dome(s, M.circle(x + 0.5, 41.5, 2), steel, { contact: false })
        s.paint(x, 41, dark, 1)
      }
      // A lantern on the right post.
      const lamp = col(s, '#f4c24a', { lift: 0.4 })
      hline(s, dark, 33, 34, 21, 1)
      rect(s, lamp, 33, 22, 34, 23, 5)
      hline(s, dark, 33, 34, 24, 1)
      glow(s, 34, 23, 4, 4, '#ffc860', 80)
    },
  },
  {
    id: 'crystal-cavern',
    name: 'Crystal Cavern',
    page: 'wilds',
    at: { x: 0.76, y: 0.32 },
    paint: (s) => {
      // A blue-grey rock dome with a violet-lit cave mouth, bristling with purple crystals on its crown and at its feet.
      const rock = col(s, '#6d7590', { hueShift: 6, lift: 0.3 })
      const dark = col(s, '#22163a')
      const amethyst = col(s, '#a25ce2', { lift: 0.42, hueShift: 10 })
      const mound = M.ellipse(24, 38, 20.5, 19).union(M.ellipse(13, 33, 9, 10), M.ellipse(35, 32, 9, 10)).subtract(M.rect(0, 44, 47, 47))
      dome(s, mound, rock, { relief: 0.85 })
      for (const [x, y] of pick(s, 'cc-cracks', mound, 12, 3)) {
        s.shift(x, y, -1)
        s.shift(x + 1, y, -1)
      }
      const mouth = M.ellipse(24, 44, 7.5, 13).subtract(M.rect(0, 44, 47, 47))
      mouth.each((x, y) => s.paint(x, y, dark, y < 34 ? 1 : y < 39 ? 2 : 3))
      for (const [x, y] of [[21, 38], [26, 36], [24, 41], [22, 33]] as const) dot(s, x, y, '#e2b8ff')
      glow(s, 24, 39, 8, 6, '#b070ff', 70)
      // Crystals: a crown cluster and two clusters at the mouth.
      crystal(s, amethyst, 19.5, 22, 5, 12, -4)
      crystal(s, amethyst, 29, 22, 5, 11, 4)
      crystal(s, amethyst, 24.5, 22, 6, 18, 0)
      crystal(s, amethyst, 6.5, 43.5, 5, 10, -3)
      crystal(s, amethyst, 11.5, 43.5, 6, 15, 0)
      crystal(s, amethyst, 36, 43.5, 6, 13, 1)
      crystal(s, amethyst, 41, 43.5, 5, 9, 4)
      glow(s, 24, 14, 9, 9, '#c080ff', 50)
      glow(s, 10, 36, 6, 7, '#c080ff', 40)
      glow(s, 38, 37, 6, 7, '#c080ff', 40)
    },
  },
  {
    id: 'quarry',
    name: 'Quarry',
    page: 'wilds',
    at: { x: 0.22, y: 0.71 },
    paint: (s) => {
      // A pit cut into pale stone in three terraces, darker at each step down, squared blocks at its lip and a crane.
      const rim = col(s, '#8c7a5a', { lift: 0.28, hueShift: 8 })
      const pit = col(s, '#cbbfa4', { lift: 0.3, hueShift: 8 })
      const cut = col(s, '#eee4cc', { lift: 0.3 })
      // Rough ground around the pit: a rounded, notched outline with a front lip.
      const jag = rng('quarry-rim')
      const notch = Array.from({ length: 48 }, () => (jag() < 0.3 ? 1 : 0))
      const ground = M.from((px, py) => {
        const x = Math.floor(px)
        if (px < 3 || px > 45 || py < 8 + (notch[x] ?? 0) || py > 36) return false
        const cx = Math.min(Math.max(px, 7), 41), cy = Math.min(Math.max(py, 12), 32)
        return Math.hypot(px - cx, py - cy) <= 4.2
      })
      ground.each((x, y) => s.paint(x, y, rim, !ground.get(x, y - 1) ? 4 : !ground.get(x - 1, y) ? 4 : !ground.get(x + 1, y) ? 2 : 3))
      ground.each((x, y) => {
        if (!ground.get(x, y + 1)) {
          s.paint(x, y + 1, rim, 2)
          s.paint(x, y + 2, rim, 1)
        }
      })
      for (const [x, y] of pick(s, 'quarry-grit', ground, 26, 4)) s.shift(x, y, -1)
      // Grass creeping over the rim.
      const grass = col(s, '#6e9a40')
      for (const [x, y] of [[6, 9], [7, 9], [15, 9], [33, 9], [34, 9], [41, 10], [4, 20], [44, 26], [20, 34], [27, 35]] as const) if (ground.get(x, y)) s.paint(x, y, grass, 4)
      // Terraces: a cut face (in shade) under each edge, then a floor; the deeper, the darker.
      const levels: [number, number, number, number, number][] = [
        // x0, x1, face top, floor top, floor tone
        [7, 40, 11, 14, 4],
        [11, 36, 18, 21, 4],
        [15, 32, 25, 28, 3],
      ]
      for (const [i, [x0, x1, face, floor, tone]] of levels.entries()) {
        const bottom = 32 - i
        for (let y = face; y <= bottom; y++)
          for (let x = x0; x <= x1; x++) {
            let t = y < floor ? (y === face ? 1 : 2) : tone
            if (y < floor && (x - x0) % 5 === 2) t = 1
            if (y === floor) t = 5
            if (x === x0) t = Math.min(t, 2)
            if (x === x1) t = Math.max(t, y < floor ? 3 : 4)
            s.paint(x, y, pit, t)
          }
      }
      // A puddle and rubble at the bottom.
      hline(s, col(s, '#5a86a8'), 21, 26, 30, 3)
      for (const [x, y] of [[17, 29], [30, 30], [12, 23], [35, 16]] as const) {
        s.paint(x, y, cut, 4)
        s.paint(x + 1, y, pit, 1)
      }
      // A ladder down the terraces.
      const ladder = col(s, '#9a6a3c')
      for (let y = 9; y <= 29; y++) {
        s.paint(28, y, ladder, 4)
        s.paint(31, y, ladder, 2)
        if (y % 3 === 0) hline(s, ladder, 29, 30, y, 3)
      }
      // Squared blocks stacked at the lip.
      block(s, cut, 4, BASE, 8, 7)
      block(s, cut, 12, BASE, 7, 6)
      block(s, cut, 6, 37, 7, 5)
      // More blocks on the right, a pick leaning against them.
      block(s, cut, 34, BASE, 9, 7)
      block(s, cut, 36, 36, 6, 5)
      const wood = col(s, '#8a6038')
      const iron = col(s, '#8e96a4', { lift: 0.35 })
      line(s, wood, 30, BASE, 33, 33, 3)
      line(s, iron, 30, 34, 33, 32, 4)
      line(s, iron, 33, 32, 36, 33, 3)
    },
  },
  {
    id: 'meadow',
    name: 'Meadow',
    page: 'wilds',
    at: { x: 0.78, y: 0.7 },
    paint: (s) => {
      // A wild patch of tall grass and flax in blue flower, dotted with poppies and daisies.
      const grass = col(s, '#7cba46', { hueShift: 10 })
      const deep = col(s, '#4c8a34', { hueShift: 8 })
      const flax = col(s, '#5c8ff0', { lift: 0.4 })
      const stem = col(s, '#8fb860')
      const poppy = col(s, '#e8483a')
      const daisy = col(s, '#f6f2e4')
      // A wide, low patch: three loose rows of grass clumps, back to front.
      const clumps: [number, number, number, number][] = [
        [8, 27, 11, 4], [17, 25, 12, 5], [27, 25, 12, 5], [37, 27, 11, 4],
        [5, 35, 10, 4], [13, 34, 12, 5], [23, 33, 13, 5], [33, 34, 12, 5], [41, 35, 10, 4],
        [9, 43, 10, 5], [19, 43, 11, 5], [29, 43, 11, 5], [39, 43, 10, 5],
      ]
      clumps.forEach(([cx, bot, h, n], i) => {
        hline(s, deep, Math.round(cx - n * 0.6), Math.round(cx + n * 0.6), bot - 1, 2)
        tuft(s, grass, cx, bot - 1, h, n, `meadow-${i}`)
        tuft(s, deep, cx + 1, bot - 1, Math.round(h * 0.6), Math.max(2, n - 2), `meadow-under-${i}`)
      })
      // Flax: thin stems topped with five-petal blue flowers.
      const flower = (id: number, x: number, y: number, centre: number) => {
        s.paint(x, y, centre, 5)
        s.paint(x - 1, y, id, 4)
        s.paint(x + 1, y, id, 3)
        s.paint(x, y - 1, id, 5)
        s.paint(x, y + 1, id, 2)
      }
      const flaxAt: [number, number][] = [[7, 15], [13, 12], [20, 11], [26, 12], [32, 11], [39, 15], [4, 24], [11, 22], [18, 21], [29, 20], [36, 22], [43, 25], [15, 30], [25, 29], [40, 31]]
      for (const [x, y] of flaxAt) {
        vline(s, stem, x, y + 2, y + 5, 3)
        flower(flax, x, y, daisy)
      }
      for (const [x, y] of [[10, 17], [23, 15], [35, 16], [8, 29], [21, 27], [33, 28], [27, 36]] as const) flower(poppy, x, y, col(s, '#3a2a20'))
      for (const [x, y] of [[16, 16], [42, 20], [29, 24], [11, 35], [37, 36], [5, 31]] as const) flower(daisy, x, y, col(s, '#f2c838'))
    },
  },
  {
    id: 'forest',
    name: 'Forest',
    page: 'wilds',
    at: { x: 0.26, y: 0.9 },
    paint: (s) => {
      // A dense stand of dark pines, a pile of cut logs out front and a stump with an axe.
      const needles = col(s, '#2f7448', { hueShift: 8, lift: 0.3 })
      const bark = col(s, '#6a4a30')
      pine(s, needles, bark, 24, 30, 29, 9.5, { tiers: 4 })
      pine(s, needles, bark, 12, 35, 29, 9.5, { tiers: 4 })
      pine(s, needles, bark, 36.5, 36, 28, 9.5, { tiers: 4 })
      pine(s, needles, bark, 6.5, 40, 20, 4.5, { tiers: 3 })
      pine(s, needles, bark, 41.5, 41, 18, 4, { tiers: 3 })
      // Stacked logs, end on.
      const logBark = col(s, '#7a5232')
      const ring = col(s, '#e0bc84', { lift: 0.3 })
      const log = (cx: number, cy: number) => {
        // The log's length runs back (up) behind its end.
        rect(s, logBark, Math.round(cx - 2), Math.round(cy - 4), Math.round(cx + 1), Math.round(cy - 1), 3)
        hline(s, logBark, Math.round(cx - 2), Math.round(cx + 1), Math.round(cy - 4), 4)
        const end = M.circle(cx, cy, 2.6)
        end.each((x, y) => {
          const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy)
          s.paint(x, y, d > 1.9 ? logBark : ring, d > 1.9 ? 2 : d < 0.8 ? 3 : 4)
        })
      }
      for (const x of [16, 21.5, 27, 32.5]) log(x, 40.5)
      for (const x of [19, 24.5, 30]) log(x, 36)
      log(24.5, 31.5)
    },
  },
  {
    id: 'fossil-dig',
    name: 'Fossil Dig',
    page: 'wilds',
    at: { x: 0.74, y: 0.9 },
    paint: (s) => {
      // A sandy pit roped off on stakes, a great fossil skeleton half-uncovered in it, a spade and a pick at its edge.
      const sand = col(s, '#dab776', { lift: 0.3 })
      const boneId = col(s, '#efe4c8', { lift: 0.3 })
      const wood = col(s, '#8a6038')
      const rope = col(s, '#c8a870')
      const iron = col(s, '#8e96a4')
      // Stakes and a rope behind the pit.
      for (const x of [5, 18, 30, 42]) vline(s, wood, x, 14, 22, x < 24 ? 4 : 3)
      for (const [a, b] of [[5, 18], [18, 30], [30, 42]] as const) for (let x = a + 1; x < b; x++) s.paint(x, 15 + Math.round(1.5 * Math.sin(((x - a) / (b - a)) * Math.PI)), rope, 4)
      const mound = M.ellipse(24, 32, 21.5, 11)
      fill(s, mound, sand, 4)
      mound.each((x, y) => {
        if (!mound.get(x, y + 1)) s.paint(x, y, sand, 2)
        else if (!mound.get(x, y - 1)) s.paint(x, y, sand, 5)
      })
      const pit = M.ellipse(24, 33, 17, 7.5)
      pit.each((x, y) => s.paint(x, y, sand, !pit.get(x, y - 1) || !pit.get(x, y - 2) ? 2 : 3))
      for (const [x, y] of pick(s, 'fossil-sand', pit, 18, 3)) s.shift(x, y, 1)
      // The skeleton: a long skull, a spine of vertebrae, ribs and a curling tail.
      const skull = M.poly([[9, 31], [16, 29], [18, 31], [17, 34], [10, 34]])
      fill(s, skull, boneId, 4)
      hline(s, boneId, 10, 16, 30, 5)
      s.paint(15, 31, wood, 1)
      for (let x = 10; x <= 16; x += 2) s.paint(x, 34, boneId, 2)
      for (let x = 18; x <= 34; x++) {
        const y = 31 + Math.round(Math.sin((x - 18) / 5) * 0.8)
        s.paint(x, y, boneId, x % 2 === 0 ? 5 : 3)
        if (x >= 21 && x <= 31 && x % 2 === 1) {
          vline(s, boneId, x, y + 1, y + 4, 4)
          s.paint(x, y + 5, boneId, 2)
        }
      }
      line(s, boneId, 35, 31, 39, 28, (k) => (k % 2 ? 3 : 5))
      s.paint(40, 27, boneId, 4)
      // A spade stuck upright in the sand, and a pick lying at the lip.
      vline(s, wood, 41, 19, 33, 3)
      vline(s, wood, 42, 19, 33, 2)
      hline(s, wood, 40, 43, 18, 4)
      rect(s, iron, 40, 34, 43, 36, 4)
      hline(s, iron, 40, 43, 36, 2)
      line(s, wood, 4, 41, 14, 37, 3)
      line(s, iron, 11, 34, 15, 38, 4)
      line(s, iron, 15, 38, 18, 39, 3)
      // A brush.
      hline(s, wood, 26, 30, 40, 4)
      rect(s, rope, 31, 39, 33, 40, 4)
    },
  },
  {
    id: 'workbench',
    name: 'Workbench',
    page: 'wilds',
    at: { x: 0.3, y: 0.51 },
    paint: (s) => {
      // An open timber shed: a plank roof on posts, a shadowed back wall hung with a saw and tools, a sturdy bench in front.
      const roof = col(s, '#7e5c3a')
      const post = col(s, '#9a6a3c')
      const back = col(s, '#6a4c30')
      const top = col(s, '#c49a64', { lift: 0.3 })
      const steel = col(s, '#c4ccd6', { lift: 0.4 })
      roofSide(s, roof, 3, 44, 9, 18, { back: 3, tex: 'plank' })
      for (let y = 19; y <= 36; y++) for (let x = 6; x <= 41; x++) s.paint(x, y, back, y === 19 ? 1 : (x - 6) % 5 === 4 ? 1 : 2)
      // The saw and tools on the back wall.
      const handle = col(s, '#b0703a')
      for (let x = 10; x <= 20; x++) {
        const h = Math.round(2 + (x - 10) * 0.2)
        for (let k = 0; k < h; k++) s.paint(x, 22 + k, steel, k === 0 ? 5 : 3)
        if (x % 2 === 0) s.paint(x, 22 + h, steel, 2)
      }
      rect(s, handle, 21, 22, 23, 25, 4)
      s.paint(22, 23, back, 1)
      vline(s, handle, 27, 21, 27, 4)
      rect(s, steel, 26, 20, 28, 21, 4)
      vline(s, handle, 31, 21, 26, 3)
      line(s, steel, 30, 20, 33, 21, 4)
      // Rope coil.
      const rope = col(s, '#d8c08a')
      M.circle(37, 24, 2.5).each((x, y) => s.paint(x, y, rope, (x + y) % 2 ? 4 : 3))
      s.paint(37, 24, back, 1)
      // Posts.
      for (const x of [4, 42]) {
        vline(s, post, x, 19, BASE, 4)
        vline(s, post, x + 1, 19, BASE, 2)
      }
      // The bench: lit top, apron, legs, a vise and a plank on it.
      rect(s, top, 9, 30, 38, 31, 4)
      hline(s, top, 9, 38, 30, 5)
      rect(s, top, 9, 32, 38, 33, 3)
      hline(s, top, 9, 38, 34, 2)
      for (const x of [10, 36]) {
        vline(s, top, x, 35, BASE, 3)
        vline(s, top, x + 1, 35, BASE, 2)
      }
      hline(s, top, 12, 35, 40, 2)
      rect(s, steel, 33, 27, 36, 29, 3)
      hline(s, steel, 33, 36, 27, 5)
      const plank = col(s, '#e0bc88')
      rect(s, plank, 13, 28, 27, 29, 4)
      hline(s, plank, 13, 27, 28, 5)
      // Sawdust and offcuts on the ground.
      for (const [x, y] of [[15, 42], [19, 43], [26, 42], [30, 43]] as const) s.paint(x, y, plank, 4)
      // Planks leaning on the left post.
      for (let k = 0; k < 3; k++) line(s, plank, 7 + k * 2, BASE, 10 + k * 2, 22, k === 0 ? 5 : k === 1 ? 4 : 3)
    },
  },
  {
    id: 'forge',
    name: 'Forge',
    page: 'wilds',
    at: { x: 0.7, y: 0.51 },
    paint: (s) => {
      // A stone smithy under dark slate: a broad chimney, an open arch onto the glowing hearth, an anvil on its stump.
      const stone = col(s, '#8e8c8e', { lift: 0.3 })
      const slate = col(s, '#4a4a5a', { lift: 0.32 })
      const dark = col(s, '#1e1618')
      const fire = col(s, '#f27a26', { lift: 0.5 })
      const iron = col(s, '#4c505e', { lift: 0.35 })
      const wood = col(s, '#7a5232')
      const smoke = chimney(s, stone, 8, 3, 14, 6)
      roofSide(s, slate, 3, 44, 11, 22, { back: 3, tex: 'slate' })
      wall(s, stone, 5, 42, 23, BASE, 'stone', 'forge-wall')
      // The arch onto the hearth.
      const arch = M.ellipse(24, 32, 9, 6).union(M.rect(15, 32, 32, BASE))
      arch.each((x, y) => s.paint(x, y, dark, 1))
      for (let x = 14; x <= 33; x++) for (let y = 25; y <= BASE; y++) if (!arch.get(x, y) && (arch.get(x - 1, y) || arch.get(x + 1, y) || arch.get(x, y + 1))) s.paint(x, y, stone, 4)
      // Hearth: a brick bed of coals glowing under a hood.
      rect(s, stone, 18, 34, 29, 37, 2)
      const coals = M.ellipse(23.5, 34.5, 5.5, 2.2)
      coals.each((x, y) => s.paint(x, y, fire, y < 34 ? 5 : (x + y) % 3 === 0 ? 3 : 4))
      rect(s, iron, 19, 27, 28, 29, 2)
      hline(s, iron, 19, 28, 27, 3)
      glow(s, 23.5, 33, 9, 7, '#ff9a3a', 110)
      // Anvil on a stump.
      rect(s, wood, 35, 39, 42, BASE, 3)
      vline(s, wood, 35, 39, BASE, 4)
      vline(s, wood, 42, 39, BASE, 2)
      const anvil = M.poly([[30.5, 33], [44, 33], [44, 35.5], [41, 35.5], [40.5, 37.5], [37.5, 37.5], [37, 35.5], [34, 35.5]])
      anvil.each((x, y) => s.paint(x, y, iron, y === 33 ? 5 : y === 34 ? (x < 34 ? 4 : 3) : x > 40 ? 1 : 2))
      hline(s, iron, 35, 43, 38, 3)
      // Quench barrel.
      barrel(s, wood, iron, 9.5, BASE, 7, 8)
      const waterTop = col(s, '#4a8ac0')
      hline(s, waterTop, 7, 11, 36, 4)
      return { smoke }
    },
  },
]
