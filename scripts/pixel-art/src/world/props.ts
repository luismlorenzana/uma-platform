import { ramp } from '../color.ts'
import { Mask, cutStone, shadeDome, shadeFacets } from '../shape.ts'
import { Sprite, type Shadow } from '../sprite.ts'
import { Img } from '../tiles/image.ts'
import { add, box, circles, foliage, stroke } from '../tiles/props/kit.ts'

export interface WorldProp {
  id: string
  w: 16
  h: 16 | 32
  shadow: Shadow
  paint: (s: Sprite) => void
}

const shortShadow: Shadow = { cx: 8, cy: 14.4, rx: 5, ry: 1.4, alpha: 72 }
const tallShadow: Shadow = { cx: 8, cy: 30.3, rx: 5.4, ry: 1.5, alpha: 76 }

const PROPS: Record<string, WorldProp> = {
  pine: {
    id: 'pine', w: 16, h: 32, shadow: tallShadow,
    paint: (s) => {
      const bark = add(s, '#805338'), leaf = add(s, '#2f6743', { lift: 0.34, drop: 0.28 })
      box(s, 7, 18, 9, 29, 19, bark)
      for (const [top, bottom, width] of [[3, 13, 4], [8, 19, 6], [14, 25, 7]] as const) {
        const crown = Mask.polygon([[8, top], [8 + width, bottom - 1], [11, bottom], [8, bottom - 1], [5, bottom], [8 - width, bottom - 1]], 16, 32)
        shadeDome(s, crown, leaf, { bias: 0.05, relief: 0.55, contact: false })
        crown.each((x, y) => { if ((x + y * 3) % 7 === 0) s.shift(x, y, -1) })
      }
    },
  },
  stump: {
    id: 'stump', w: 16, h: 16, shadow: shortShadow,
    paint: (s) => {
      const bark = add(s, '#805638'), wood = add(s, '#c79e60')
      box(s, 4, 7, 12, 14, 8, bark, true)
      shadeDome(s, Mask.ellipse(8, 7.5, 4.5, 2.3, 0, 16, 16), wood, { relief: 0.4, contact: false })
      for (const [x, y] of [[6, 7], [7, 6], [9, 6], [10, 7], [9, 8], [7, 8]] as const) s.paint(x, y, wood, 2)
      stroke(s, 4, 11, 2, 14, bark, 3); stroke(s, 12, 11, 14, 14, bark, 2)
      for (const x of [5, 8, 11]) stroke(s, x, 10, x, 13, bark, 2)
    },
  },
  mushrooms: {
    id: 'mushrooms', w: 16, h: 16, shadow: shortShadow,
    paint: (s) => {
      const stem = add(s, '#e1d4b3'), cap = add(s, '#b45b45')
      for (const [x, y, r] of [[5, 8, 3.5], [11, 10, 2.8]] as const) {
        box(s, x - 1, y + 1, x, 14, y + 1, stem)
        shadeDome(s, Mask.ellipse(x, y, r, r * 0.65, 0, 16, 16), cap, { relief: 0.7, contact: false })
        s.paint(x - 1, y - 1, stem, 5); s.paint(x + 1, y, stem, 3)
      }
    },
  },
  palm: {
    id: 'palm', w: 16, h: 32, shadow: tallShadow,
    paint: (s) => {
      const bark = add(s, '#a67c4c'), leaf = add(s, '#54936a', { lift: 0.32, drop: 0.3 })
      for (let y = 10; y <= 29; y++) {
        const x = Math.round(8 + Math.sin((y - 10) / 19 * Math.PI) * 1.2)
        s.paint(x, y, bark, y % 3 === 0 ? 2 : 4); s.paint(x + 1, y, bark, 2)
      }
      const fronds = [[[8, 8], [4, 4], [1, 5], [5, 7]], [[8, 8], [11, 3], [15, 5], [11, 6]], [[8, 8], [3, 8], [1, 13], [5, 10]], [[8, 8], [12, 8], [15, 13], [11, 10]], [[8, 8], [7, 1], [5, 2], [6, 6]]] as const
      for (const points of fronds) shadeDome(s, Mask.polygon(points, 16, 32), leaf, { bias: 0.1, relief: 0.5, contact: false })
      const fruit = add(s, '#825131')
      s.paint(7, 9, fruit, 4); s.paint(8, 10, fruit, 2); s.paint(9, 9, fruit, 3)
    },
  },
  'shell-rock': {
    id: 'shell-rock', w: 16, h: 16, shadow: shortShadow,
    paint: (s) => {
      const stone = add(s, '#b9b49d'), shell = add(s, '#f0d5b8', { lift: 0.4, drop: 0.22 })
      shadeDome(s, Mask.polygon([[2, 13], [4, 8], [8, 7], [13, 10], [14, 14]], 16, 16), stone, { relief: 0.6, contact: false })
      shadeDome(s, Mask.ellipse(8, 9, 3.7, 3.1, -20, 16, 16), shell, { relief: 0.5, contact: false })
      stroke(s, 7, 7, 9, 10, shell, 2); stroke(s, 9, 10, 6, 10, shell, 3)
      s.paint(6, 8, shell, 5)
    },
  },
  driftwood: {
    id: 'driftwood', w: 16, h: 16, shadow: shortShadow,
    paint: (s) => {
      const wood = add(s, '#b99769', { lift: 0.36, drop: 0.25 })
      stroke(s, 2, 13, 13, 7, wood, 4); stroke(s, 3, 14, 14, 8, wood, 2)
      stroke(s, 7, 10, 5, 6, wood, 3); stroke(s, 10, 9, 13, 4, wood, 4)
      s.paint(2, 14, wood, 3); s.paint(13, 8, wood, 5)
    },
  },
  oak: {
    id: 'oak', w: 16, h: 32, shadow: tallShadow,
    paint: (s) => {
      const bark = add(s, '#86512f', { lift: 0.34, drop: 0.3 })
      for (let y = 16; y <= 29; y++) {
        s.paint(7, y, bark, y < 20 ? 4 : 3)
        s.paint(8, y, bark, 2)
        if (y >= 22 && y % 3 !== 0) s.paint(9, y, bark, 2)
      }
      stroke(s, 7, 19, 3, 14, bark, 3)
      stroke(s, 8, 18, 12, 13, bark, 2)
      const leaf = add(s, '#4f9c42', { lift: 0.36, drop: 0.3 })
      const clumps = [[5, 11, 4.7], [10.5, 10.5, 4.4], [7.8, 6.8, 4.8], [4, 7.5, 3.5], [11.8, 6.6, 3.3]] as const
      foliage(s, circles(s, clumps), leaf, clumps, 0.08)
      for (const [x, y] of [[4, 5], [8, 3], [11, 8], [5, 11], [9, 7]] as const) s.shift(x, y, 1)
    },
  },
  flowers: {
    id: 'flowers', w: 16, h: 16, shadow: shortShadow,
    paint: (s) => {
      const stem = add(s, '#3d843f'), white = add(s, '#f7f1df', { lift: 0.4 }), yellow = add(s, '#f0c94c')
      for (const [x, y, flower] of [[5, 8, white], [9, 7, yellow], [12, 10, white], [7, 11, yellow]] as const) {
        stroke(s, x, y + 1, x - 1, 14, stem, 3)
        for (const [dx, dy] of [[0, -1], [-1, 0], [1, 0], [0, 1]] as const) s.paint(x + dx, y + dy, flower, dx + dy < 0 ? 5 : 4)
        s.paint(x, y, yellow, 3)
      }
    },
  },
  rock: {
    id: 'rock', w: 16, h: 16, shadow: shortShadow,
    paint: (s) => {
      const stone = add(s, '#8b9290', { lift: 0.34, drop: 0.3 })
      const m = Mask.polygon([[3, 12], [4, 8], [7, 5], [11, 6], [14, 10], [12, 14], [5, 14]], 16, 16)
      shadeDome(s, m, stone, { bias: 0.03, relief: 0.7, contact: false })
      stroke(s, 7, 7, 5, 10, stone, 5)
    },
  },
  vent: {
    id: 'vent', w: 16, h: 16, shadow: shortShadow,
    paint: (s) => {
      const smoke = add(s, '#767077', { lift: 0.34, drop: 0.28 })
      shadeDome(s, circles(s, [[7, 4, 2.3], [9, 2.5, 2], [10.5, 5, 1.8]]), smoke, { bias: 0.1, relief: 0.5, contact: false })
      const basalt = add(s, '#40373c', { lift: 0.28, drop: 0.32 })
      const cone = Mask.polygon([[2, 14], [5, 8], [11, 8], [14, 14]], 16, 16)
      shadeDome(s, cone, basalt, { bias: -0.02, relief: 0.55, contact: false })
      const glow = add(s, '#e84a25', { lift: 0.5, drop: 0.25 })
      for (const [x, y, t] of [[6, 9, 4], [7, 9, 5], [8, 9, 5], [9, 9, 3], [7, 10, 2], [8, 10, 3]] as const) s.paint(x, y, glow, t)
    },
  },
  obsidian: {
    id: 'obsidian', w: 16, h: 16, shadow: shortShadow,
    paint: (s) => {
      const glass = add(s, '#302947', { lift: 0.42, drop: 0.34, hueShift: 12 })
      const outer = [[3, 13], [5, 6], [8, 3], [11, 7], [13, 13]] as const
      const inner = [[5, 11], [7, 7], [8, 5], [10, 8], [11, 11]] as const
      shadeFacets(s, outer, cutStone(outer, inner, 3), glass)
      s.paint(7, 6, glass, 5)
      s.paint(8, 5, glass, 5)
    },
  },
  'charred-tree': {
    id: 'charred-tree', w: 16, h: 32, shadow: tallShadow,
    paint: (s) => {
      const wood = add(s, '#332526', { lift: 0.26, drop: 0.34 })
      stroke(s, 7, 29, 8, 9, wood, (t) => (t < 0.4 ? 2 : 3))
      stroke(s, 8, 16, 3, 10, wood, 3)
      stroke(s, 4, 11, 2, 7, wood, 2)
      stroke(s, 8, 13, 13, 7, wood, 2)
      stroke(s, 12, 8, 14, 5, wood, 3)
      stroke(s, 8, 20, 4, 17, wood, 4)
      for (const [x, y] of [[7, 29], [8, 28], [6, 29], [9, 29]] as const) s.paint(x, y, wood, y === 28 ? 4 : 2)
    },
  },
  'ice-spire': {
    id: 'ice-spire', w: 16, h: 32, shadow: tallShadow,
    paint: (s) => {
      const ice = add(s, '#72c9ed', { lift: 0.55, drop: 0.3, hueShift: 12, satShift: 0.02 })
      const outer = [[2, 29], [5, 13], [8, 3], [11, 15], [14, 29]] as const
      const inner = [[5, 26], [7, 13], [8, 6], [10, 16], [11, 26]] as const
      shadeFacets(s, outer, cutStone(outer, inner, 5), ice)
      stroke(s, 7, 7, 6, 20, ice, 5)
    },
  },
  snowdrift: {
    id: 'snowdrift', w: 16, h: 16, shadow: shortShadow,
    paint: (s) => {
      const snow = s.addRamp(ramp('#e8f3f8', { lift: 0.55, drop: 0.2, satShift: 0.01 }))
      const drift = new Mask(16, 16).union(Mask.ellipse(6, 11.5, 5, 3.2, -8, 16, 16), Mask.ellipse(11, 12, 4, 2.7, 8, 16, 16))
      shadeDome(s, drift, snow, { bias: 0.16, relief: 0.45, contact: false })
    },
  },
  'ice-block': {
    id: 'ice-block', w: 16, h: 16, shadow: shortShadow,
    paint: (s) => {
      const ice = add(s, '#9bdaf0', { lift: 0.48, drop: 0.28, hueShift: 10, satShift: 0.02 })
      for (let y = 6; y <= 14; y++)
        for (let x = 3; x <= 13; x++) {
          if ((x === 3 || x === 13) && (y === 6 || y === 14)) continue
          const tone = y === 6 ? 5 : x === 3 ? 4 : x === 13 || y === 14 ? 2 : 3
          s.paint(x, y, ice, tone)
        }
      stroke(s, 5, 8, 7, 11, ice, 5)
    },
  },
}

export function worldProp(id: string): WorldProp {
  const prop = PROPS[id]
  if (!prop) throw new Error(`Unknown world prop ${id}`)
  return prop
}

export function drawWorldProp(prop: WorldProp): Img {
  const s = new Sprite(prop.w, prop.h)
  s.shadow = prop.shadow
  prop.paint(s)
  return new Img(prop.w, prop.h, s.render())
}
