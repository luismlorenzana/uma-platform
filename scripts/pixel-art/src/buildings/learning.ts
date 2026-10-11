// Learning District: five class halls and four armories. Cooler stone and plaster under blue and violet roofs.
import type { Point } from '../shape.ts'
import type { Sprite } from '../sprite.ts'
import {
  BASE,
  battlements,
  col,
  dome,
  door,
  dot,
  fill,
  glow,
  hline,
  line,
  M,
  patch,
  rect,
  roofCone,
  roofGable,
  roofHip,
  roofSide,
  vline,
  wall,
  logEnds,
  window,
} from './kit.ts'
import type { Place } from './types.ts'

/** A training dummy: a padded head on a crossbar of arms, a straw-wrapped torso, a post. */
function dummy(s: Sprite, wood: number, pad: number, cloth: number, cx: number): void {
  vline(s, wood, cx, 36, BASE, 4)
  vline(s, wood, cx + 1, 36, BASE, 2)
  for (let y = 31; y <= 37; y++) for (let x = cx - 1; x <= cx + 2; x++) s.paint(x, y, pad, x === cx - 1 ? 4 : x === cx + 2 ? 2 : y % 2 ? 3 : 4)
  hline(s, wood, cx - 1, cx + 2, 34, 1)
  hline(s, wood, cx - 2, cx + 3, 30, 3)
  s.paint(cx - 2, 30, wood, 4)
  s.paint(cx - 2, 31, wood, 3)
  s.paint(cx + 3, 31, wood, 2)
  dome(s, M.circle(cx + 0.5, 27.5, 2.2), cloth, { contact: false, bias: 0.1 })
}

/** A rack: two posts and a rail holding a row of shafts with heads drawn by `head`. */
function rack(s: Sprite, wood: number, shaft: number, x0: number, x1: number, top: number, head: (x: number, y: number) => void): void {
  for (let x = x0 + 1; x < x1; x += 2) {
    vline(s, shaft, x, top, BASE - 1, 3)
    head(x, top)
  }
  for (const x of [x0, x1]) vline(s, wood, x, top + 6, BASE, x === x0 ? 4 : 2)
  hline(s, wood, x0, x1, top + 7, 4)
  hline(s, wood, x0, x1, top + 8, 2)
  hline(s, wood, x0, x1, BASE - 2, 3)
}

export const LEARNING: Place[] = [
  {
    id: 'brawler-dojo',
    name: 'Brawler Dojo',
    page: 'learning',
    at: { x: 0.24, y: 0.1 },
    paint: (s) => {
      // A broad timber dojo under two tiers of blue tile with upturned corners, paper panels, dummies in the yard.
      const tile = col(s, '#3d5e9a', { hueShift: 6, lift: 0.3 })
      const wood = col(s, '#8a5a38')
      const paper = col(s, '#ece4cc', { lift: 0.3 })
      const dark = col(s, '#2a2230')
      const straw = col(s, '#d8b46a')
      const canvas = col(s, '#eadcbc', { lift: 0.3 })
      roofHip(s, tile, 15, 32, 5, 11, { inset: 4, tex: 'tile', back: 2 })
      wall(s, wood, 18, 29, 12, 15, 'boards')
      for (const x of [19, 23, 27]) rect(s, paper, x, 13, x + 1, 15, 4)
      roofHip(s, tile, 7, 40, 16, 25, { inset: 6, tex: 'tile', back: 1 })
      // Upturned corners.
      for (const [x, d] of [[7, -1], [40, 1]] as const) {
        s.paint(x + d, 24, tile, 4)
        s.paint(x + d, 23, tile, 5)
      }
      wall(s, wood, 9, 38, 26, BASE, 'plain')
      // Paper panels between posts.
      for (const [x0, x1] of [[11, 16], [31, 36]] as const) {
        rect(s, paper, x0, 28, x1, 39, 4)
        for (let x = x0 + 2; x < x1; x += 3) vline(s, paper, x, 28, 39, 3)
        hline(s, paper, x0, x1, 33, 3)
        hline(s, paper, x0, x1, 28, 2)
      }
      // The open sliding door.
      rect(s, dark, 19, 29, 28, BASE, 1)
      rect(s, paper, 26, 29, 28, BASE, 4)
      vline(s, paper, 27, 29, BASE, 3)
      hline(s, wood, 9, 38, 40, 2)
      hline(s, wood, 9, 38, BASE, 2)
      // The name board over the door.
      rect(s, wood, 19, 26, 28, 27, 5)
      hline(s, dark, 21, 26, 27, 2)
      dummy(s, wood, straw, canvas, 4)
      dummy(s, wood, straw, canvas, 42)
    },
  },
  {
    id: 'mage-tower',
    name: 'Mage Tower',
    page: 'learning',
    at: { x: 0.76, y: 0.11 },
    paint: (s) => {
      // A slender round tower of pale blue stone, a tall violet cone with a gold star, windows lit from within.
      const stone = col(s, '#aeb0c8', { hueShift: 8, lift: 0.3 })
      const roof = col(s, '#6a44b2', { hueShift: 8, lift: 0.3 })
      const gold = col(s, '#e8b844', { lift: 0.4 })
      const lit = col(s, '#ffd666', { lift: 0.4 })
      const wood = col(s, '#5a3a5a')
      s.shadow = { cx: 24, cy: BASE + 0.5, rx: 12, ry: 3, alpha: 76 }
      const body = (x0: number, x1: number, y0: number, y1: number) => {
        for (let y = y0; y <= y1; y++)
          for (let x = x0; x <= x1; x++) {
            const t = (x + 0.5 - (x0 + x1 + 1) / 2) / ((x1 - x0 + 1) / 2)
            let tone = t < -0.55 ? 4 : t < 0.15 ? 3 : t < 0.7 ? 2 : 1
            if ((y - y0) % 4 === 3) tone = Math.max(1, tone - 1)
            else if ((x + Math.floor((y - y0) / 4) * 2) % 5 === 0 && t > -0.8 && t < 0.8) tone = Math.max(1, tone - 1)
            s.paint(x, y, stone, tone)
          }
      }
      body(17, 30, 19, BASE)
      // A wider base course.
      body(15, 32, 39, BASE)
      hline(s, stone, 15, 32, 39, 4)
      // A balcony ring.
      body(16, 31, 27, 28)
      hline(s, stone, 16, 31, 27, 5)
      hline(s, stone, 17, 30, 29, 1)
      window(s, stone, lit, 23, 21, 2, 4, { lit: true, arch: true })
      window(s, stone, lit, 20, 32, 2, 3, { lit: true, arch: true })
      window(s, stone, lit, 26, 32, 2, 3, { lit: true, arch: true })
      door(s, wood, 22, BASE, 4, 5, { arch: true })
      roofCone(s, roof, 24, 10, 19, 14, { flare: 1.5 })
      // A gold star on the finial.
      vline(s, gold, 24, 4, 5, 3)
      s.paint(24, 2, gold, 5)
      s.paint(23, 3, gold, 4)
      s.paint(25, 3, gold, 3)
      s.paint(24, 3, gold, 5)
      for (const [x, y] of [[11, 10], [36, 8], [38, 22], [9, 26]] as const) dot(s, x, y, '#e4d0ff', 200)
      glow(s, 24, 23, 4, 4, '#ffd666', 50)
    },
  },
  {
    id: 'spell-blade-salle',
    name: 'Spell Blade Salle',
    page: 'learning',
    at: { x: 0.22, y: 0.31 },
    paint: (s) => {
      // A pale stone fencing hall under violet slate, tall arched windows, a crest of two crossed blades over the door.
      const roof = col(s, '#5a4c9e', { hueShift: 6, lift: 0.3 })
      const stone = col(s, '#dcd6cc', { lift: 0.3 })
      const glass = col(s, '#3c4a78')
      const wood = col(s, '#5a3a4a')
      const navy = col(s, '#2e3a7a')
      const steel = col(s, '#dfe8f4', { lift: 0.45 })
      const gold = col(s, '#e2b444', { lift: 0.4 })
      roofSide(s, roof, 3, 44, 10, 23, { back: 3, tex: 'slate' })
      wall(s, stone, 5, 42, 24, BASE, 'brick', 'salle')
      for (const x of [8, 14, 31, 37]) window(s, stone, glass, x, 28, 3, 8, { arch: true, mullion: false })
      door(s, wood, 20, BASE, 8, 11, { arch: true, leaves: 2, frame: stone })
      // The crest: a navy shield rimmed in gold, two blades crossed point-up.
      const shield: Point[] = [[16, 11], [32, 11], [32, 19], [24, 27], [16, 19]]
      fill(s, M.poly(shield), navy, 3)
      M.poly(shield).each((x, y) => {
        const m = M.poly(shield)
        if (!m.get(x - 1, y) || !m.get(x + 1, y) || !m.get(x, y - 1) || !m.get(x, y + 1)) s.paint(x, y, gold, y < 15 || x < 24 ? 4 : 3)
      })
      line(s, steel, 19, 22, 29, 12, 5)
      line(s, steel, 20, 22, 30, 12, 3)
      line(s, steel, 29, 22, 19, 12, 4)
      line(s, steel, 28, 22, 18, 12, 2)
      for (const [x, y, d] of [[19, 22, -1], [28, 22, 1]] as const) {
        line(s, gold, x - 1, y - 2, x + 2, y + 1, 5)
        s.paint(x + d, y + 1, gold, 3)
      }
      glow(s, 24, 17, 7, 6, '#9ab8ff', 50)
    },
  },
  {
    id: 'cleric-chapel',
    name: 'Cleric Chapel',
    page: 'learning',
    at: { x: 0.78, y: 0.31 },
    paint: (s) => {
      // A small white chapel under a blue gable, a belfry with a golden bell, a round window and an arched door.
      const roof = col(s, '#4a6cba', { hueShift: 6, lift: 0.3 })
      const plaster = col(s, '#f0ece4', { lift: 0.3 })
      const bell = col(s, '#ecb83c', { lift: 0.4 })
      const wood = col(s, '#7a5232')
      const glass = col(s, '#6a9ae4', { lift: 0.35 })
      const dark = col(s, '#2a2a40')
      const gable = roofGable(s, roof, 8, 39, 27, 12, 9, { tex: 'slate', wallTop: 28 })
      fill(s, gable.subtract(M.rect(0, 0, 9, 47)).subtract(M.rect(38, 0, 47, 47)), plaster, 4)
      wall(s, plaster, 10, 37, 28, BASE, 'plaster', 'chapel')
      // A rose window in the gable.
      const rose = M.circle(24, 22, 2.6)
      rose.each((x, y) => s.paint(x, y, glass, (x + y) % 2 === 0 ? 4 : 3))
      s.paint(23, 21, glass, 5)
      for (const x of [13, 33]) window(s, plaster, glass, x, 31, 2, 6, { arch: true })
      door(s, wood, 21, BASE, 6, 10, { arch: true, leaves: 2, frame: plaster })
      // The belfry on the gable: a small tower with an open arch and a bell, under a pointed cap.
      for (let y = 7; y <= 16; y++) for (let x = 20; x <= 27; x++) s.paint(x, y, plaster, x === 20 ? 5 : x === 27 ? 2 : 4)
      rect(s, dark, 22, 10, 25, 15, 1)
      s.paint(22, 10, plaster, 4)
      s.paint(25, 10, plaster, 3)
      const b = M.ellipse(23.5, 14, 2.2, 3).subtract(M.rect(0, 15, 47, 47))
      dome(s, b, bell, { contact: false, bias: 0.15 })
      hline(s, bell, 21, 26, 15, 4)
      hline(s, plaster, 19, 28, 16, 4)
      roofCone(s, roof, 24, 5.5, 7, 4, { flare: 1, courses: false })
      s.paint(24, 2, bell, 5)
      s.paint(24, 3, bell, 3)
    },
  },
  {
    id: 'summoner-circle',
    name: 'Summoner Circle',
    page: 'learning',
    at: { x: 0.5, y: 0.5 },
    paint: (s) => {
      // A round paved dais with a glowing rune ring set in it, ringed by four obelisks with shining glyphs.
      const paving = col(s, '#a6a2b4', { lift: 0.3 })
      const obelisk = col(s, '#5e5a7a', { lift: 0.34 })
      const rune = col(s, '#e47aff', { lift: 0.55 })
      const top = M.ellipse(24, 32, 21, 9.5)
      patch(s, top, paving, 3, 4)
      // Paving joints: rings and spokes.
      top.each((x, y) => {
        const dx = (x + 0.5 - 24) / 21, dy = (y + 0.5 - 32) / 9.5
        const d = Math.hypot(dx, dy)
        if (Math.abs(d - 0.92) < 0.05) s.paint(x, y, paving, 3)
      })
      // The rune ring: two glowing ellipses with marks between, and a four-point star inside.
      const ring = (rx: number, ry: number) => {
        M.ellipse(24, 32, rx, ry).each((x, y) => {
          const m = M.ellipse(24, 32, rx, ry)
          if (!m.get(x - 1, y) || !m.get(x + 1, y) || !m.get(x, y - 1) || !m.get(x, y + 1)) s.paint(x, y, rune, 5)
        })
      }
      ring(16, 7)
      ring(12.5, 5.2)
      for (let k = 0; k < 12; k++) {
        const a = (k / 12) * Math.PI * 2
        s.paint(Math.round(24 + Math.cos(a) * 14.3 - 0.5), Math.round(32 + Math.sin(a) * 6.1 - 0.5), rune, 4)
      }
      for (const [x0, y0, x1, y1] of [[24, 27, 24, 37], [13, 32, 35, 32]] as const) line(s, rune, x0, y0, x1, y1, 3)
      line(s, rune, 18, 29, 30, 35, 3)
      line(s, rune, 30, 29, 18, 35, 3)
      glow(s, 24, 32, 18, 8.5, '#e070ff', 110)
      // Obelisks: back pair first, then the front pair.
      const ob = (cx: number, bot: number, h: number) => {
        const x0 = cx - 2, x1 = cx + 1
        for (let y = bot - h + 3; y <= bot; y++) for (let x = x0; x <= x1; x++) s.paint(x, y, obelisk, x === x0 ? 4 : x === x1 ? 2 : 3)
        // Pyramidion.
        s.paint(cx - 1, bot - h + 1, obelisk, 5)
        s.paint(cx, bot - h + 1, obelisk, 3)
        hline(s, obelisk, x0, cx - 1, bot - h + 2, 5)
        hline(s, obelisk, cx, x1, bot - h + 2, 2)
        for (let y = bot - h + 5; y <= bot - 4; y += 3) {
          s.paint(cx - 1, y, rune, 5)
          s.paint(cx, y, rune, 4)
          s.paint(cx - 1, y + 1, rune, 4)
        }
        glow(s, cx - 0.5, bot - h / 2, 3, h / 2, '#e070ff', 60)
      }
      ob(12, 26, 18)
      ob(36, 26, 18)
      ob(5, 37, 17)
      ob(43, 37, 17)
      for (const [x, y] of [[20, 22], [28, 19], [24, 16], [16, 25], [32, 24]] as const) dot(s, x, y, '#f4c8ff', 220)
    },
  },
  {
    id: 'rangers-lodge',
    name: 'Ranger\'s Lodge',
    page: 'learning',
    at: { x: 0.24, y: 0.7 },
    paint: (s) => {
      // A log lodge under teal shingles, a bow and quiver by the door, an archery target on a stand.
      const roof = col(s, '#3a7488', { hueShift: 6, lift: 0.3 })
      const logs = col(s, '#9a6a40')
      const ends = col(s, '#dcb47c', { lift: 0.3 })
      const wood = col(s, '#5e3e26')
      const glass = col(s, '#34445e')
      roofSide(s, roof, 2, 41, 10, 22, { back: 3, tex: 'shingle' })
      wall(s, logs, 5, 38, 23, BASE, 'logs')
      logEnds(s, ends, 5, 38, 23, BASE)
      door(s, wood, 18, BASE, 6, 11, { frame: ends })
      window(s, ends, glass, 9, 28, 4, 4, { mullion: true, shutters: wood })
      window(s, ends, glass, 29, 28, 4, 4, { mullion: true, shutters: wood })
      // Crossed arrows over the door.
      const shaft = col(s, '#c89a5a')
      const fletch = col(s, '#e04a3a')
      const steel = col(s, '#d8e0ea')
      line(s, shaft, 17, 26, 24, 23, 4)
      line(s, shaft, 17, 23, 24, 26, 3)
      for (const [x, y] of [[24, 23], [24, 26]] as const) s.paint(x + 1, y, steel, 5)
      for (const [x, y] of [[17, 26], [17, 23]] as const) {
        s.paint(x - 1, y, fletch, 4)
        s.paint(x - 1, y + (y === 23 ? -1 : 1), fletch, 3)
      }
      // A longbow and a quiver leaning by the door.
      const bow = col(s, '#c27c3c', { lift: 0.3 })
      for (let y = 28; y <= 42; y++) {
        const x = Math.round(13 - 2.6 * Math.sin(((y - 28) / 14) * Math.PI))
        s.paint(x, y, bow, y < 35 ? 4 : 3)
        s.paint(x + 1, y, bow, 2)
      }
      vline(s, steel, 14, 29, 41, 5)
      const quiver = col(s, '#7a4a2a')
      rect(s, quiver, 15, 35, 16, 42, 3)
      vline(s, quiver, 15, 35, 42, 4)
      s.paint(15, 34, fletch, 4)
      s.paint(16, 33, fletch, 3)
      // The target on its stand.
      const legs = col(s, '#8a6038')
      line(s, legs, 40, 34, 37, BASE, 3)
      line(s, legs, 40, 34, 44, BASE, 2)
      const rings = ['#f2ead4', '#d8443a', '#f2ead4', '#3a6ad0', '#f4c838']
      const ids = rings.map((c) => col(s, c, { lift: 0.3 }))
      for (let k = 0; k < rings.length; k++) {
        const r = 5.4 - k * 1.1
        M.ellipse(40, 31, r, r).each((x, y) => s.paint(x, y, ids[k] ?? 0, x + y < 40 + 31 - r * 0.5 ? 4 : 3))
      }
      line(s, shaft, 36, 27, 40, 31, 4)
      s.paint(35, 26, fletch, 4)
    },
  },
  {
    id: 'lancers-barracks',
    name: 'Lancer\'s Barracks',
    page: 'learning',
    at: { x: 0.76, y: 0.7 },
    paint: (s) => {
      // A long barracks under slate-blue roofing, a row of small windows, a pennant on the ridge, spear racks either side.
      const roof = col(s, '#4c5c82', { lift: 0.3 })
      const stone = col(s, '#b4b0a6', { lift: 0.3 })
      const plaster = col(s, '#e2dccc')
      const wood = col(s, '#6e4a30')
      const glass = col(s, '#33405a')
      const steel = col(s, '#d8e0ea', { lift: 0.45 })
      const pennant = col(s, '#3a5cc0', { lift: 0.3 })
      // Pennant on a pole at the ridge.
      vline(s, wood, 36, 3, 13, 3)
      for (let x = 37; x <= 43; x++) {
        const h = Math.max(1, 3 - Math.floor((x - 37) / 2.5))
        for (let k = 0; k < h; k++) s.paint(x, 4 + k + Math.round(Math.sin((x - 37) / 2) * 0.6), pennant, k === 0 ? 4 : 3)
      }
      roofSide(s, roof, 2, 45, 13, 24, { back: 3, tex: 'slate' })
      wall(s, plaster, 4, 43, 25, 35, 'plaster', 'barracks')
      wall(s, stone, 4, 43, 36, BASE, 'stone', 'barracks-base')
      hline(s, stone, 4, 43, 36, 4)
      for (const x of [7, 13, 32, 38]) window(s, wood, glass, x, 28, 3, 4)
      door(s, wood, 21, BASE, 6, 12, { frame: stone, leaves: 2 })
      const tassel = col(s, '#c83a3a')
      const spear = (x: number, y: number) => {
        s.paint(x, y - 4, steel, 5)
        s.paint(x, y - 3, steel, 5)
        s.paint(x - 1, y - 2, steel, 4)
        s.paint(x, y - 2, steel, 4)
        s.paint(x + 1, y - 2, steel, 2)
        s.paint(x, y - 1, steel, 3)
        s.paint(x, y, tassel, 4)
        s.paint(x, y + 1, tassel, 2)
      }
      const shaftId = col(s, '#b08458')
      rack(s, wood, shaftId, 3, 13, 22, spear)
      rack(s, wood, shaftId, 34, 44, 22, spear)
    },
  },
  {
    id: 'arcane-armory',
    name: 'Arcane Armory',
    page: 'learning',
    at: { x: 0.26, y: 0.9 },
    paint: (s) => {
      // A dark stone armory under a bright blue hipped roof, a glowing glyph over the iron-bound door, racks of gem staves.
      const roof = col(s, '#3c6ad6', { hueShift: 6, lift: 0.3 })
      const stone = col(s, '#8c889c', { lift: 0.3 })
      const iron = col(s, '#3a3a4a')
      const wood = col(s, '#6a4a34')
      const shaft = col(s, '#a87a4a')
      roofHip(s, roof, 3, 44, 9, 23, { inset: 9, tex: 'tile', back: 2 })
      wall(s, stone, 5, 42, 24, BASE, 'stone', 'armory')
      door(s, wood, 20, BASE, 8, 11, { leaves: 2, frame: stone })
      for (const y of [35, 40]) hline(s, iron, 20, 27, y, 2)
      // The glyph: a ring with a diamond inside.
      const glyph = col(s, '#6ff0ff', { lift: 0.5 })
      const ringM = M.circle(24, 28, 2.6)
      ringM.each((x, y) => {
        if (!ringM.get(x - 1, y) || !ringM.get(x + 1, y) || !ringM.get(x, y - 1) || !ringM.get(x, y + 1)) s.paint(x, y, glyph, 4)
      })
      s.paint(23, 27, glyph, 5)
      s.paint(24, 28, glyph, 5)
      glow(s, 24, 28, 4, 4, '#6ff0ff', 70)
      for (const x of [9, 36]) window(s, stone, iron, x, 28, 3, 5, { arch: true })
      // Two tubs bristling with staves, each crowned with a glowing orb.
      const gems = ['#e24a5a', '#4a8ae8', '#4ac46a', '#b05ae8', '#f0c040', '#4ad0e0'].map((c) => col(s, c, { lift: 0.45 }))
      const glows = ['#ff7080', '#70a8ff', '#70e090', '#d080ff', '#ffd860', '#70f0ff']
      const tub = col(s, '#7a5236')
      let g = 0
      const staves = (cx: number, leans: number[]) => {
        leans.forEach((lean, i) => {
          const x0 = cx - 2 + i * 2, top = 22 + (i % 2) * 3
          line(s, shaft, x0, 38, x0 + lean, top + 2, i % 2 ? 3 : 4)
          const id = gems[g % gems.length] ?? 0
          dome(s, M.circle(x0 + lean + 0.5, top + 0.5, 1.6), id, { contact: false, bias: 0.25 })
          glow(s, x0 + lean + 0.5, top + 0.5, 3, 3, glows[g % glows.length] ?? '#ffffff', 70)
          g++
        })
        const body = M.rect(cx - 4, 37, cx + 4, BASE)
        body.each((x, y) => s.paint(x, y, tub, x === cx - 4 ? 4 : x === cx + 4 ? 2 : 3))
        hline(s, tub, cx - 4, cx + 4, 37, 5)
        for (const y of [39, 42]) hline(s, iron, cx - 4, cx + 4, y, 3)
      }
      staves(8, [-1, 0, 0, 1])
      staves(39, [-1, 0, 0, 1])
    },
  },
  {
    id: 'knights-bastion',
    name: 'Knight\'s Bastion',
    page: 'learning',
    at: { x: 0.74, y: 0.9 },
    paint: (s) => {
      // A square stone keep with battlements and arrow slits, low curtain walls, a blue banner over the gate.
      const stone = col(s, '#b4b0a6', { lift: 0.3 })
      const dark = col(s, '#2a2830')
      const wood = col(s, '#6e4a30')
      const banner = col(s, '#3858b8', { lift: 0.3 })
      const gold = col(s, '#e6b640', { lift: 0.4 })
      // Curtain walls.
      wall(s, stone, 3, 12, 27, BASE, 'stone', 'bastion-l')
      wall(s, stone, 35, 44, 27, BASE, 'stone', 'bastion-r')
      battlements(s, stone, 3, 12, 27, 2, 2, 2)
      battlements(s, stone, 35, 44, 27, 2, 2, 2)
      hline(s, stone, 3, 12, 27, 4)
      hline(s, stone, 35, 44, 27, 4)
      // The keep.
      wall(s, stone, 11, 36, 10, BASE, 'stone', 'bastion-keep')
      hline(s, stone, 11, 36, 10, 4)
      hline(s, stone, 10, 37, 11, 2)
      battlements(s, stone, 10, 37, 10, 3, 2, 3)
      for (const [x, y] of [[14, 15], [32, 15], [14, 27], [32, 27]] as const) {
        vline(s, dark, x, y, y + 3, 1)
        s.paint(x, y - 1, stone, 2)
      }
      // The gate.
      door(s, wood, 19, BASE, 10, 11, { arch: true, leaves: 2, frame: stone })
      for (const y of [36, 40]) for (let x = 19; x <= 28; x += 2) s.paint(x, y, dark, 1)
      // The banner: hung from a gold rod, a swallowtail hem, a gold star.
      hline(s, gold, 18, 29, 13, 4)
      for (let y = 14; y <= 28; y++)
        for (let x = 19; x <= 28; x++) {
          if (y > 25 && Math.abs(x - 23.5) < (y - 25) * 1.2) continue
          s.paint(x, y, banner, x === 19 ? 4 : x === 28 ? 2 : 3)
        }
      const star: Point[] = [[23.5, 16], [25, 19.5], [28, 20], [25.5, 22], [26.5, 25.5], [23.5, 23.5], [20.5, 25.5], [21.5, 22], [19, 20], [22, 19.5]]
      fill(s, M.poly(star), gold, 4)
      // A pennant on the roof.
      vline(s, wood, 34, 2, 7, 3)
      for (let x = 35; x <= 40; x++) for (let k = 0; k < Math.max(1, 3 - Math.floor((x - 35) / 2)); k++) s.paint(x, 2 + k, banner, k === 0 ? 4 : 3)
    },
  },
]
