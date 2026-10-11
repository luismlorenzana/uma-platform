// Duo platters: two families' foods side by side on one platter, each half showing its star ingredient. The grade 3
// platters are plain glazed ovals split by a low ridge; the grade 7 Deluxe ones are gilt-edged, banded, split by a gold
// divider and garnished.
import { ramp } from '../color.ts'
import { pix } from '../items/refined/pantry-kit.ts'
import { Mask, shadeDome } from '../shape.ts'
import type { Sprite } from '../sprite.ts'
import { CREAM, CREAMWARE, GOLD, PORCELAIN, RICE, type Dish, type Tones, blob, castShadow, plate } from './kit.ts'

type Mini = (s: Sprite, cx: number, cy: number) => void

const EYE = ramp('#1d1a24')

/** A small dome-shaded shape with a contact line where it overlaps what is already there. */
export function dome(s: Sprite, m: Mask, id: number, bias = 0.1): Mask {
  castShadow(s, m, 1, 1)
  shadeDome(s, m, id, { bias, contact: true })
  return m
}

/** A little fish lying on its side, head to the left. */
export function minnow(s: Sprite, cx: number, cy: number, back: number, belly: number, len = 4.6, h = 1.6, rot = -12): void {
  const a = (rot * Math.PI) / 180, c = Math.cos(a), sn = Math.sin(a)
  const local = (px: number, py: number): [number, number] => [((px - cx) * c + (py - cy) * sn) / len, (-(px - cx) * sn + (py - cy) * c) / h]
  const body = Mask.from((px, py) => {
    const [u, v] = local(px, py)
    return u >= -1 && u <= 1 && Math.abs(v) <= Math.sqrt(Math.max(0, 1 - ((u + 0.1) / 1.1) ** 2))
  })
  const tail = Mask.from((px, py) => {
    const [u, v] = local(px, py)
    return u > 0.85 && u < 1.45 && Math.abs(v) < 0.3 + (u - 0.85) * 1.6
  })
  castShadow(s, new Mask().union(body, tail), 1, 1)
  tail.each((x, y) => s.paint(x, y, back, 2))
  shadeDome(s, body, (x, y) => (local(x + 0.5, y + 0.5)[1] < -0.1 ? back : belly), { contact: true, bias: 0.1, relief: 0.6 })
  body.each((x, y) => {
    const [u] = local(x + 0.5, y + 0.5)
    if (Math.abs(u - 0.1) < 0.12 || Math.abs(u - 0.45) < 0.1) s.shift(x, y, -1)
  })
  s.paint(Math.floor(cx - len * 0.72 * c), Math.floor(cy - len * 0.72 * sn - 0.3), s.addRamp(EYE), 1)
}

// ---------------------------------------------------------------------------------------------------------------
// One mini per star ingredient, drawn around the center of its half of the platter.

const MINIS: Record<string, Mini> = {
  barley: (s, cx, cy) => {
    // Two small barley rolls with a pale slash.
    const crust = s.addRamp(ramp('#c8903e', { lift: 0.38, hueShift: 10 }))
    const crumb = s.addRamp(ramp('#f0dca8', { lift: 0.4 }))
    for (const [dx, dy] of [[-1.4, -1.8], [1.2, 1.6]] as const) {
      const m = dome(s, Mask.ellipse(cx + dx, cy + dy, 4.4, 3.1, -12), crust)
      const x = Math.floor(cx + dx), y = Math.floor(cy + dy - 1)
      for (const [px, py] of [[x - 2, y + 1], [x - 1, y + 1], [x, y], [x + 1, y], [x + 2, y - 1]] as const) if (m.get(px, py)) s.paint(px, py, crumb, 4)
    }
  },
  buckwheat: (s, cx, cy) => {
    // A stack of speckled buckwheat galettes with a sprig of pink-white buckwheat flowers.
    const cake = s.addRamp(ramp('#9a7c68', { lift: 0.36, hueShift: 8 }))
    for (const [i, dy] of [[0, 2.4], [1, 0.4], [2, -1.6]] as const) {
      const rx = 5.2 - i * 0.3
      Mask.ellipse(cx, cy + dy + 1.2, rx, 2.2).each((x, y) => s.paint(x, y, cake, 1))
      const top = Mask.ellipse(cx, cy + dy, rx, 2.2)
      top.each((x, y) => s.paint(x, y, cake, (x * 3 + y) % 5 === 0 ? 2 : (x + 0.5 - cx) / rx + (y + 0.5 - cy - dy) / 2.2 < -0.4 ? 5 : 4))
    }
    const petal = s.addRamp(ramp('#f7e4ea', { lift: 0.5, drop: 0.2 }))
    const eye = s.addRamp(ramp('#e8768f'))
    const stem = s.addRamp(ramp('#c0393b'))
    pix(s, Math.floor(cx) - 2, Math.floor(cy) - 7, ['.a.a.', 'abcba', '.aba.', '..d..', '..d..'], { a: [petal, 4], b: [petal, 5], c: [eye, 3], d: [stem, 3] })
  },
  cabbage: (s, cx, cy) => {
    // A wedge of crisp pale cabbage over a few torn leaves.
    const green = s.addRamp(ramp('#b9db78', { lift: 0.42, hueShift: 6 }))
    const leaf = s.addRamp(ramp('#6fae44', { lift: 0.36, hueShift: 8 }))
    dome(s, Mask.ellipse(cx, cy + 1.8, 5.4, 2.6), leaf)
    const w = dome(s, Mask.ellipse(cx - 0.4, cy - 0.8, 4.4, 3.8), green, 0.14)
    for (const r of [1.4, 2.8]) Mask.ellipse(cx - 0.4, cy - 0.8, r + 0.6, r).subtract(Mask.ellipse(cx - 0.4, cy - 0.8, r - 0.3, r - 0.8)).each((x, y) => {
      if (w.get(x, y) && y + 0.5 < cy) s.shift(x, y, -1)
    })
  },
  eggplant: (s, cx, cy) => {
    // Grilled eggplant rounds: purple skin, cream flesh, char stripes.
    const skin = s.addRamp(ramp('#5b2b78', { lift: 0.38, hueShift: 6 }))
    const flesh = s.addRamp(ramp('#ece0b8', { lift: 0.36, drop: 0.24 }))
    for (const [dx, dy] of [[-2, -2], [2.2, -1], [0, 2]] as const) {
      const ox = cx + dx, oy = cy + dy
      const m = Mask.ellipse(ox, oy, 3.4, 2.3)
      castShadow(s, m, 1, 1)
      m.each((x, y) => {
        const edge = !m.get(x - 1, y) || !m.get(x + 1, y) || !m.get(x, y - 1) || !m.get(x, y + 1)
        s.paint(x, y, edge ? skin : flesh, edge ? (y + 0.5 < oy ? 4 : 2) : (x - y) % 3 === 0 ? 2 : 4)
      })
    }
  },
  'oyster-mushroom': (s, cx, cy) => {
    // A cluster of grey oyster mushroom fans.
    const cap = s.addRamp(ramp('#8b919b', { lift: 0.38, hueShift: 6, satShift: 0.03 }))
    const gill = s.addRamp(ramp('#e8e0cf', { lift: 0.3, drop: 0.24 }))
    for (const [dx, dy, rot] of [[-1.8, -2, -20], [2.2, -1, 20], [-0.2, 1.8, 0]] as const) {
      const m = dome(s, Mask.ellipse(cx + dx, cy + dy, 3.9, 2.4, rot), cap, 0.14)
      const y = Math.floor(cy + dy + 1.4)
      for (let x = Math.floor(cx + dx - 1.5); x <= cx + dx + 1.5; x++) if (m.get(x, y)) s.paint(x, y, gill, 3)
    }
  },
  morel: (s, cx, cy) => {
    // Two honeycombed morels standing up.
    const ridge = s.addRamp(ramp('#a8814e', { lift: 0.36, hueShift: 6 }))
    const pit = s.addRamp(ramp('#4c3420', { lift: 0.2 }))
    const stem = s.addRamp(ramp('#efe4c8', { lift: 0.3, drop: 0.2 }))
    for (const [dx, dy, sc] of [[-2.2, -1.2, 1], [2.2, 0.6, 0.9]] as const) {
      const ox = cx + dx, oy = cy + dy
      dome(s, Mask.from((px, py) => py > oy + 2 * sc && py < oy + 4.4 * sc && Math.abs(px - ox) < 1.5), stem)
      const m = dome(s, Mask.ellipse(ox, oy - 0.6, 2.6 * sc, 3.9 * sc), ridge)
      m.each((x, y) => {
        if ((x + y * 2) % 3 === 0 && m.get(x, y - 1) && m.get(x, y + 1) && m.get(x - 1, y)) s.paint(x, y, pit, 2)
      })
    }
  },
  peach: (s, cx, cy) => {
    // Peach halves, blushing, one showing its stone.
    const fuzz = s.addRamp(ramp('#f7a86e', { lift: 0.36 }))
    const blush = s.addRamp(ramp('#e85a6b', { lift: 0.34 }))
    const flesh = s.addRamp(ramp('#ffc46a', { lift: 0.42 }))
    const stone = s.addRamp(ramp('#9a4a32'))
    const back = Mask.circle(cx + 1.8, cy - 1.4, 3.4)
    castShadow(s, back, 1, 1)
    shadeDome(s, back, (x, y) => (x + y > cx + cy + 1.6 ? blush : fuzz), { contact: true, bias: 0.08 })
    const cut = Mask.ellipse(cx - 1.4, cy + 1.4, 3.8, 2.8)
    castShadow(s, cut, 1, 1)
    cut.each((x, y) => {
      const edge = !cut.get(x - 1, y) || !cut.get(x + 1, y) || !cut.get(x, y - 1) || !cut.get(x, y + 1)
      s.paint(x, y, edge ? blush : flesh, edge ? 3 : x + 0.5 < cx - 2 ? 5 : 4)
    })
    pix(s, Math.floor(cx - 1.4), Math.floor(cy + 1), ['a', 'a'], { a: [stone, 3] })
  },
  mango: (s, cx, cy) => {
    // A mango cheek cut into a hedgehog of sunny cubes.
    const skin = s.addRamp(ramp('#86b53d', { lift: 0.34 }))
    const cube = s.addRamp(ramp('#ffb627', { lift: 0.42, hueShift: 8 }))
    const base = Mask.ellipse(cx, cy + 1.8, 5.2, 2.6)
    castShadow(s, base, 1, 1)
    base.each((x, y) => s.paint(x, y, skin, y > cy + 2 ? 2 : 3))
    for (const [dx, dy] of [[-4, -0.4], [-1.6, -1.8], [0.8, -1.8], [3.2, -0.4], [-2.8, 1.4], [-0.4, 0.6], [2, 1.4], [-1.6, -4], [0.8, -4]] as const)
      pix(s, Math.floor(cx + dx), Math.floor(cy + dy), ['ab', 'bc'], { a: [cube, 5], b: [cube, 4], c: [cube, 2] })
  },
  rosemary: (s, cx, cy) => {
    // Three sprigs of rosemary and a pinch of pepper.
    const stem = s.addRamp(ramp('#7a5a3a'))
    const needle = s.addRamp(ramp('#3f7350', { hueShift: 10, lift: 0.4 }))
    for (const [dx, dy] of [[-5, 0], [-4.4, 2.6], [-3.4, 5]] as const) {
      for (let i = 0; i < 10; i++) {
        const x = Math.floor(cx + dx + i), y = Math.floor(cy + dy - i * 0.6)
        s.paint(x, y, stem, 3)
        s.paint(x, y - 1, needle, i % 2 === 0 ? 5 : 4)
        s.paint(x, y + 1, needle, i % 2 === 0 ? 3 : 2)
      }
    }
    const pepper = s.addRamp(ramp('#3a2a24'))
    for (const [x, y] of [[Math.floor(cx) - 3, Math.floor(cy) - 4], [Math.floor(cx) + 2, Math.floor(cy) - 6]] as const) s.paint(x, y, pepper, 3)
  },
  cinnamon: (s, cx, cy) => {
    // A bundle of cinnamon quills tied with twine, and a star anise.
    const bark = s.addRamp(ramp('#a8582c', { hueShift: 8, lift: 0.36 }))
    const twine = s.addRamp(ramp('#e2cf96'))
    for (const k of [-2, 0, 2]) {
      for (let i = 0; i < 10; i++) {
        const x = Math.floor(cx - 4.6 + i), y = Math.floor(cy + k - i * 0.45 + 1)
        s.paint(x, y, bark, k < 0 ? 5 : k === 0 ? 4 : 3)
        s.paint(x, y + 1, bark, 2)
      }
    }
    for (let k = -2; k <= 3; k++) s.paint(Math.floor(cx), Math.floor(cy + k), twine, 4)
    const anise = s.addRamp(ramp('#6a3218', { lift: 0.38 }))
    pix(s, Math.floor(cx) + 1, Math.floor(cy) + 2, ['.a.', 'aba', '.a.'], { a: [anise, 3], b: [anise, 5] })
  },
  sardine: (s, cx, cy) => {
    const back = s.addRamp(ramp('#3a68b0', { hueShift: 6, lift: 0.36 }))
    const belly = s.addRamp(ramp('#d3dde6', { lift: 0.45 }))
    minnow(s, cx + 0.2, cy - 2.2, back, belly, 5.4, 2)
    minnow(s, cx - 0.2, cy + 1.8, back, belly, 5.4, 2)
  },
  eel: (s, cx, cy) => {
    // Glazed eel pieces on pads of rice.
    const rice = s.addRamp(RICE)
    const glaze = s.addRamp(ramp('#8a3c16', { lift: 0.36, hueShift: 10 }))
    const skin = s.addRamp(ramp('#3d4834', { hueShift: 6 }))
    for (const [dx, dy] of [[-0.6, -2.2], [0.6, 1.8]] as const) {
      const ox = Math.round(cx + dx - 4.5), oy = Math.round(cy + dy - 1.5)
      dome(s, Mask.ellipse(cx + dx, cy + dy + 0.8, 5, 2.2), rice, 0.2)
      const m = new Mask()
      for (let y = oy; y <= oy + 3; y++) for (let x = ox; x <= ox + 8; x++) m.set(x, y)
      castShadow(s, m, 0, 1)
      m.each((x, y) => s.paint(x, y, y === oy + 3 ? skin : glaze, y === oy ? 4 : y === oy + 3 ? 3 : (x - ox) % 3 === 0 ? 1 : 3))
      s.paint(ox + 1, oy, glaze, 5)
      s.paint(ox + 5, oy, glaze, 5)
    }
  },
  'sugar-beet': (s, cx, cy) => {
    // A pile of white beet-sugar cubes and two meringue kisses, a beet leaf tucked behind.
    blob(s, cx + 2.6, cy - 3, 2.8, 1.3, -30, s.addRamp(ramp('#4f9e3a', { lift: 0.34 })), { contact: true })
    const sugar = s.addRamp(ramp('#f4f2ee', { lift: 0.5, drop: 0.2, hueShift: 10 }))
    for (const [dx, dy] of [[-4, -0.6], [-0.6, 0.2], [-2.4, -3], [1.4, -1.8], [-2.2, 2]] as const)
      pix(s, Math.floor(cx + dx), Math.floor(cy + dy), ['aab', 'aab', 'ccd'], { a: [sugar, 5], b: [sugar, 3], c: [sugar, 2], d: [sugar, 1] })
    const pink = s.addRamp(ramp('#f2a8c4', { lift: 0.45 }))
    for (const [dx, dy] of [[3, 1.6], [1, 3]] as const) dome(s, Mask.circle(cx + dx, cy + dy, 1.8).union(Mask.circle(cx + dx, cy + dy - 1.4, 0.9)), pink, 0.16)
  },
  'agave-heart': (s, cx, cy) => {
    // A small bowl of amber agave syrup beside a slice of pale agave cake.
    const bowl = s.addRamp(ramp('#6fa29a', { lift: 0.36, hueShift: 6 }))
    const syrup = s.addRamp(ramp('#e2952a', { lift: 0.45, hueShift: 8 }))
    const cake = s.addRamp(ramp('#e2e0a8', { lift: 0.42, hueShift: 6 }))
    dome(s, Mask.ellipse(cx + 2, cy - 0.6, 3.4, 2.8), bowl)
    Mask.ellipse(cx + 2, cy - 1.6, 2.4, 1.2).each((x, y) => s.paint(x, y, syrup, y < cy - 1.8 ? 5 : 4))
    const c = Mask.polygon([[cx - 5.4, cy + 0.4], [cx - 1.4, cy - 0.8], [cx + 0.8, cy + 2.4], [cx - 3.2, cy + 3.8]])
    castShadow(s, c, 1, 1)
    c.each((x, y) => s.paint(x, y, cake, !c.get(x, y - 1) ? 5 : !c.get(x, y + 1) ? 2 : (x + y) % 4 === 0 ? 3 : 4))
    for (let x = Math.floor(cx) - 4; x <= Math.floor(cx) - 1; x++) if (c.get(x, Math.floor(cy) + 1)) s.paint(x, Math.floor(cy) + 1, syrup, 4)
  },
  sesame: (s, cx, cy) => {
    // Squares of golden sesame brittle, speckled white and black.
    const brittle = s.addRamp(ramp('#d89a3a', { lift: 0.42, hueShift: 10 }))
    const seed = s.addRamp(ramp('#f3e6c2', { lift: 0.35, drop: 0.28 }))
    const black = s.addRamp(ramp('#3a3230'))
    for (const [dx, dy] of [[-5, -2.6], [0, -3.2], [-3, 1], [2, 0.4]] as const) {
      const x0 = Math.floor(cx + dx), y0 = Math.floor(cy + dy)
      const m = new Mask()
      for (let y = y0; y <= y0 + 3; y++) for (let x = x0; x <= x0 + 4; x++) m.set(x, y)
      castShadow(s, m, 1, 1)
      m.each((x, y) => s.paint(x, y, y > y0 && y < y0 + 3 && (x + y * 2) % 3 === 0 ? (x % 2 ? black : seed) : brittle, y === y0 ? 5 : y === y0 + 3 ? 2 : (x + y * 2) % 3 === 0 ? 5 : 4))
    }
  },
  pistachio: (s, cx, cy) => {
    // A heap of pistachios: cream shells split to show green kernels.
    const shell = s.addRamp(ramp('#e2cca0', { lift: 0.32, drop: 0.24, hueShift: 6 }))
    const kernel = s.addRamp(ramp('#86b83e', { lift: 0.42 }))
    for (const [dx, dy, rot] of [[-3, 1, 20], [0.4, 2, -15], [3.4, 0.8, 30], [-1.4, -1.6, -25], [2, -2, 10], [0.4, -4.4, 20]] as const) {
      const m = dome(s, Mask.ellipse(cx + dx, cy + dy, 2.4, 1.6, rot), shell, 0.12)
      const x = Math.floor(cx + dx), y = Math.floor(cy + dy)
      if (m.get(x, y)) s.paint(x, y, kernel, 4)
      if (m.get(x + 1, y)) s.paint(x + 1, y, kernel, 3)
    }
  },
}

interface DuoSpec {
  id: string
  name: string
  grade: number
  left: string
  right: string
  /** Platter glaze. */
  tones: Tones
  band?: Tones
}

function duo(o: DuoSpec): Dish {
  const deluxe = o.grade >= 7
  return {
    id: o.id,
    name: o.name,
    kind: 'duo',
    grade: o.grade,
    paint: (s) => {
      const p = plate(s, { cy: 21.6, rx: 13, ry: 5, tones: o.tones, band: o.band, edge: deluxe ? GOLD : undefined, well: 0.76, depth: deluxe ? 2 : 1 })
      // The divider: a low ridge of the platter, or a gilt rail on the Deluxe platters.
      const rail = deluxe ? s.addRamp(GOLD) : p.id
      for (let y = Math.ceil(p.cy - p.ry * 0.76); y <= p.cy + p.ry * 0.76; y++) {
        const x = Math.round(16.4 - (y - p.cy) * 0.35)
        if (p.well.get(x, y)) {
          s.paint(x, y, rail, deluxe ? 4 : 5)
          if (p.well.get(x + 1, y)) s.paint(x + 1, y, rail, deluxe ? 2 : 3)
        }
      }
      const ml = MINIS[o.left], mr = MINIS[o.right]
      if (!ml || !mr) throw new Error(`${o.id}: no mini for ${o.left} or ${o.right}`)
      ml(s, 9.8, 17.6)
      mr(s, 22.2, 17.6)
      if (deluxe) {
        // A sprig of herbs where the halves meet, and a cream rosette.
        const leaf = s.addRamp(ramp('#4f9a3a', { lift: 0.36, hueShift: 10 }))
        pix(s, 15, 11, ['a.a', '.b.', '.b.'], { a: [leaf, 5], b: [leaf, 3] })
        const cream = s.addRamp(CREAM)
        pix(s, 15, 24, ['.a.', 'aba'], { a: [cream, 4], b: [cream, 5] })
      }
    },
  }
}

const CELADON_LIGHT = ramp('#a8d0b8', { lift: 0.42, drop: 0.26 })
const SKY = ramp('#a8c4e0', { lift: 0.42, drop: 0.26 })
const ROSE = ramp('#e4c0c4', { lift: 0.42, drop: 0.24 })
const SAND = ramp('#dcc8a0', { lift: 0.42, drop: 0.24 })
const COBALT_BAND = ramp('#3561b8', { lift: 0.36, drop: 0.28 })
const RUBY_BAND = ramp('#a8283a', { lift: 0.36 })
const GREEN_BAND = ramp('#2f8a5a', { lift: 0.36 })
const PLUM_BAND = ramp('#6a3a8a', { lift: 0.36 })

export const DUOS: Dish[] = [
  duo({ id: 'duo-hp-def-3', name: 'Grain & Garden Platter', grade: 3, left: 'barley', right: 'cabbage', tones: CREAMWARE }),
  duo({ id: 'duo-hp-def-7', name: 'Grain & Garden Platter Deluxe', grade: 7, left: 'buckwheat', right: 'eggplant', tones: PORCELAIN, band: GREEN_BAND }),
  duo({ id: 'duo-def-mdef-3', name: 'Garden & Mushroom Platter', grade: 3, left: 'cabbage', right: 'oyster-mushroom', tones: SAND }),
  duo({ id: 'duo-def-mdef-7', name: 'Garden & Mushroom Platter Deluxe', grade: 7, left: 'eggplant', right: 'morel', tones: PORCELAIN, band: PLUM_BAND }),
  duo({ id: 'duo-mdef-mp-3', name: 'Mushroom & Fruit Platter', grade: 3, left: 'oyster-mushroom', right: 'peach', tones: CELADON_LIGHT }),
  duo({ id: 'duo-mdef-mp-7', name: 'Mushroom & Fruit Platter Deluxe', grade: 7, left: 'morel', right: 'mango', tones: PORCELAIN, band: COBALT_BAND }),
  duo({ id: 'duo-mp-matk-3', name: 'Fruit & Herb Platter', grade: 3, left: 'peach', right: 'rosemary', tones: CREAMWARE }),
  duo({ id: 'duo-mp-matk-7', name: 'Fruit & Herb Platter Deluxe', grade: 7, left: 'mango', right: 'cinnamon', tones: PORCELAIN, band: RUBY_BAND }),
  duo({ id: 'duo-matk-atk-3', name: 'Herb & Fish Platter', grade: 3, left: 'rosemary', right: 'sardine', tones: SKY }),
  duo({ id: 'duo-matk-atk-7', name: 'Herb & Fish Platter Deluxe', grade: 7, left: 'cinnamon', right: 'eel', tones: PORCELAIN, band: COBALT_BAND }),
  duo({ id: 'duo-atk-speed-3', name: 'Fish & Honey Platter', grade: 3, left: 'sardine', right: 'sugar-beet', tones: SKY }),
  duo({ id: 'duo-atk-speed-7', name: 'Fish & Honey Platter Deluxe', grade: 7, left: 'eel', right: 'agave-heart', tones: PORCELAIN, band: GREEN_BAND }),
  duo({ id: 'duo-speed-limit-3', name: 'Honey & Nut Platter', grade: 3, left: 'sugar-beet', right: 'sesame', tones: ROSE }),
  duo({ id: 'duo-speed-limit-7', name: 'Honey & Nut Platter Deluxe', grade: 7, left: 'agave-heart', right: 'pistachio', tones: PORCELAIN, band: RUBY_BAND }),
  duo({ id: 'duo-limit-hp-3', name: 'Nut & Grain Platter', grade: 3, left: 'sesame', right: 'barley', tones: SAND }),
  duo({ id: 'duo-limit-hp-7', name: 'Nut & Grain Platter Deluxe', grade: 7, left: 'pistachio', right: 'buckwheat', tones: PORCELAIN, band: PLUM_BAND }),
]

export { MINIS }
