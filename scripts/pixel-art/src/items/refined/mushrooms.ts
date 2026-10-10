// Refined Mushrooms (Pantry, M.DEF family): uma-rpg docs/design/items.md#mushrooms. Dried mushrooms lie in a small pile
// on a woven bamboo drying tray, each kind with its own silhouette; the truffle is shaved onto a plate and the legendary
// mushrooms are ground into glowing powders.
import { ramp } from '../../color.ts'
import { rng } from '../../rng.ts'
import { Mask, shadeDome } from '../../shape.ts'
import type { Sprite } from '../../sprite.ts'
import type { ItemIcon } from '../types.ts'
import { bowl, box, glassVessel, GOLD, halo, motes, pix, shine, speckle, type Tones } from './pantry-kit.ts'

/** Where the pieces lie on the tray, back to front. */
const SPOTS: readonly (readonly [number, number])[] = [
  [11.4, 15.8],
  [17, 14.6],
  [21.6, 17],
  [13.4, 20],
  [19.2, 20.6],
]

type Piece = (s: Sprite, cx: number, cy: number, i: number) => void

/** A round woven bamboo drying tray with a small pile of pieces on it. */
function tray(s: Sprite, piece: Piece, spots: readonly (readonly [number, number])[] = SPOTS): void {
  const cane = s.addRamp(ramp('#c8a46a', { lift: 0.3, drop: 0.26 }))
  const rim = Mask.ellipse(16, 21.6, 10, 4.4)
  Mask.ellipse(16, 22.6, 10, 4.4).each((x, y) => s.paint(x, y, cane, 1))
  rim.each((x, y) => s.paint(x, y, cane, (x + 0.5 - 16) / 10 + (y + 0.5 - 21.6) / 4.4 < -0.6 ? 4 : 3))
  const floor = Mask.ellipse(16, 21.4, 8.6, 3.4)
  floor.each((x, y) => s.paint(x, y, cane, (Math.floor(x / 2) + y) % 2 === 0 ? 3 : 2))
  spots.forEach(([x, y], i) => piece(s, x, y, i))
}

/**
 * A mushroom sliced top to bottom: the classic cap-and-stem cross-section, pale flesh under a band of cap skin.
 * `scale` grows the slice; `bulb` widens the stem toward its base (porcini).
 */
function slice(flesh: Tones, skin: Tones, o: { scale?: number; bulb?: number; skinRows?: number } = {}): Piece {
  return (s, cx, cy) => {
    const f = s.addRamp(flesh), k = s.addRamp(skin)
    const sc = o.scale ?? 1, bulb = o.bulb ?? 0
    const capY = cy - 0.6 * sc
    const cap = Mask.ellipse(cx, capY + 0.5, 3.8 * sc, 3 * sc).subtract(box(0, Math.round(capY + 0.5), 31, 31))
    const stem = Mask.from((px, py) => {
      const t = (py - capY) / (3.6 * sc)
      return t >= 0 && t <= 1 && Math.abs(px - cx) <= 1.2 * sc + bulb * t
    })
    const m = copyOf(cap).union(stem)
    shadeDome(s, m, f, { relief: 0.5, bias: 0.16 })
    const rows = o.skinRows ?? 1
    cap.each((x, y) => {
      let edge = false
      for (let d = 1; d <= rows; d++) if (!cap.get(x, y - d) || !cap.get(x - d, y) || !cap.get(x + d, y)) edge = true
      if (edge) s.paint(x, y, k, x + 0.5 < cx ? 4 : 3)
    })
    // The gill line where cap meets stem.
    for (let x = Math.floor(cx - 3.8 * sc); x <= Math.ceil(cx + 3.8 * sc); x++) {
      const y = Math.round(capY) - 1
      if (cap.get(x, y) && !cap.get(x, y + 1) && !stem.get(x, y + 1)) s.paint(x, y, f, 2)
    }
  }
}

function copyOf(m: Mask): Mask {
  return new Mask(m.w, m.h).union(m)
}

export const MUSHROOMS_REFINED: ItemIcon[] = [
  {
    id: 'dried-button-mushroom',
    name: 'Dried Button Mushroom',
    grade: 1,
    paint: (s) => tray(s, slice(ramp('#eadcb8', { lift: 0.4, drop: 0.24 }), ramp('#a87a48', { lift: 0.32 })), [[11.6, 15.4], [19.8, 15.2], [12.8, 20.4], [19.6, 20.6]]),
  },
  {
    id: 'dried-shiitake',
    name: 'Dried Shiitake',
    grade: 2,
    paint: (s) =>
      tray(s, (s, cx, cy, i) => {
        // Whole dried caps: dark brown domes crazed with pale cracks.
        const cap = s.addRamp(ramp('#6a4228', { lift: 0.32 }))
        const crack = s.addRamp(ramp('#dcc29a', { lift: 0.3 }))
        const m = Mask.circle(cx, cy, 3.9)
        shadeDome(s, m, cap)
        const r = rng(`shiitake-${i}`)
        for (let k = 0; k < 5; k++) {
          const a = r() * Math.PI * 2, d = 1 + r() * 1.6
          const x = Math.floor(cx + Math.cos(a) * d), y = Math.floor(cy + Math.sin(a) * d)
          if (m.get(x, y)) s.paint(x, y, crack, s.toneAt(x, y) >= 3 ? 4 : 3)
          const x2 = Math.floor(cx + Math.cos(a) * (d + 1)), y2 = Math.floor(cy + Math.sin(a) * (d + 1))
          if (m.get(x2, y2) && r() < 0.6) s.paint(x2, y2, crack, 3)
        }
      }),
  },
  {
    id: 'dried-oyster-mushroom',
    name: 'Dried Oyster Mushroom',
    grade: 3,
    paint: (s) =>
      tray(s, (s, cx, cy, i) => {
        // Pale fans seen gill side up: a scalloped rim, gills radiating down to a short stub.
        const id = s.addRamp(ramp('#bfb09a', { lift: 0.36, drop: 0.3 }))
        const fan = ['.e.eee.e.', 'eaababaab', 'ababababc', '.bcbcbcc.', '..bcbcc..', '...dcd...']
        const art = i % 2 === 1 ? fan.map((row) => [...row].reverse().join('')) : fan
        const x0 = Math.round(cx) - 4, y0 = Math.round(cy) - 3
        // A contact shadow where this fan's rim lies over a piece already on the tray (the tray is ramp 0).
        art.forEach((row, dy) =>
          [...row].forEach((c, dx) => {
            if (c !== '.' && (dy === 0 || art[dy - 1]?.[dx] === '.') && (s.mat[(y0 + dy - 1) * 32 + x0 + dx] ?? 0) > 0) s.shift(x0 + dx, y0 + dy - 1, -2)
          }),
        )
        pix(s, x0, y0, art, { e: [id, 5], a: [id, 4], b: [id, 3], c: [id, 2], d: [id, 1] })
      }, [[11.4, 15.2], [20.4, 14.8], [15.8, 20.2]]),
  },
  {
    id: 'dried-enoki',
    name: 'Dried Enoki',
    grade: 4,
    paint: (s) =>
      tray(s, (s, cx, cy) => {
        // A bunch of long thin stems fanning out from a pinched root, a pin-head cap on each.
        const id = s.addRamp(ramp('#ecdcaa', { lift: 0.4 }))
        const root = s.addRamp(ramp('#b49a62'))
        const x0 = Math.floor(cx) - 5, y0 = Math.floor(cy)
        for (const [dy, len] of [[-3, 9], [-1.5, 10], [0, 10], [1.5, 9]] as const) {
          for (let k = 0; k <= len; k++) s.paint(x0 + k, Math.round(y0 + (dy * k) / len), id, dy < -1 ? 4 : dy > 0 ? 2 : 3)
          pix(s, x0 + len, Math.round(y0 + dy) - 1, ['ab', 'bc'], { a: [id, 5], b: [id, 4], c: [id, 3] })
        }
        pix(s, x0 - 1, y0 - 1, ['ab', 'bc'], { a: [root, 4], b: [root, 3], c: [root, 2] })
      }, [[14.4, 15.4], [18.4, 18.2], [13.6, 21.6]]),
  },
  {
    id: 'dried-chanterelle',
    name: 'Dried Chanterelle',
    grade: 5,
    paint: (s) =>
      tray(s, (s, cx, cy) => {
        // Golden trumpets: a wavy flared top over a tapering stem, ridged underneath.
        const id = s.addRamp(ramp('#e8a03a', { lift: 0.36 }))
        const m = Mask.polygon([[cx - 4.2, cy - 2.2], [cx - 2.4, cy - 3.6], [cx, cy - 3], [cx + 2.4, cy - 3.8], [cx + 4.2, cy - 2.2], [cx + 1.2, cy + 0.8], [cx + 0.9, cy + 3.8], [cx - 0.9, cy + 3.8], [cx - 1.2, cy + 0.8]])
        shadeDome(s, m, id, { relief: 0.8, bias: 0.06 })
        for (const dx of [-2, 0, 2]) for (let dy = -1; dy <= 0; dy++) if (m.get(Math.floor(cx + dx * (1 + dy * 0.4)), Math.floor(cy + dy))) s.shift(Math.floor(cx + dx * (1 + dy * 0.4)), Math.floor(cy + dy), -1)
      }),
  },
  {
    id: 'dried-porcini',
    name: 'Dried Porcini',
    grade: 6,
    paint: (s) => tray(s, slice(ramp('#f2e2b8', { lift: 0.4, drop: 0.24 }), ramp('#6e3a1c', { lift: 0.3 }), { scale: 1.22, bulb: 1.1, skinRows: 2 }), [[11.4, 15.4], [20.4, 15], [15.8, 20]]),
  },
  {
    id: 'dried-morel',
    name: 'Dried Morel',
    grade: 7,
    paint: (s) =>
      tray(s, (s, cx, cy) => {
        // Tall honeycombed cones: rows of dark pits between pale ridges, on a short cream stem.
        const id = s.addRamp(ramp('#a07a4c', { lift: 0.36, drop: 0.3 }))
        const stem = s.addRamp(ramp('#ece0c0', { lift: 0.36 }))
        for (let y = Math.round(cy + 2); y <= Math.round(cy + 4); y++) for (const dx of [-1, 0]) s.paint(Math.floor(cx) + dx, y, stem, dx < 0 ? 4 : 3)
        const cone = Mask.from((px, py) => {
          const t = (py - (cy - 6)) / 8.4
          return t >= 0 && t <= 1 && Math.abs(px - cx) <= 0.6 + 2.6 * Math.sin(Math.min(1, t * 1.15) * Math.PI * 0.62)
        })
        shadeDome(s, cone, id, { bias: 0.14 })
        cone.each((x, y) => {
          if (y % 2 === 1 && (x + ((y >> 1) % 2)) % 2 === 0 && s.toneAt(x, y) > 1) s.paint(x, y, id, 1)
        })
      }, [[11.6, 16.6], [20.4, 16], [16, 20.4]]),
  },
  {
    id: 'shaved-truffle',
    name: 'Shaved Truffle',
    grade: 8,
    paint: (s) => {
      // A small white plate of paper-thin shavings fanned out, marbled with pale veins, beside what is left of the truffle.
      const plate = ramp('#ece8ee', { lift: 0.4, drop: 0.2 })
      bowl(s, { cx: 15.4, rim: 21.4, rx: 9.2, ry: 3.8, depth: 4.4, bowl: plate, mound: 0, contents: plate, bias: 0.3 })
      const knob = s.addRamp(ramp('#3a2c28', { lift: 0.34 }))
      const lump = Mask.circle(21.6, 15.2, 3.4)
      shadeDome(s, lump, knob, { bias: 0.04 })
      lump.each((x, y) => {
        if ((x * 2 + y * 3) % 5 === 0 && s.toneAt(x, y) >= 2) s.shift(x, y, 1)
      })
      const flesh = s.addRamp(ramp('#4e3628', { lift: 0.36 }))
      const vein = s.addRamp(ramp('#e2d2b6', { lift: 0.3 }))
      const shavings: readonly (readonly [number, number, number])[] = [[10.8, 19.4, -10], [16.2, 21.2, 4], [11.2, 23, 6]]
      shavings.forEach(([cx, cy, rot], i) => {
        const m = Mask.ellipse(cx, cy, 3.4, 2, rot)
        shadeDome(s, m, flesh, { relief: 0.4, bias: 0.02 })
        // One meandering pale vein, the paper-thin rim lit along the top.
        const r = rng(`shaving-${i}`)
        let y = cy - 0.4
        for (let x = Math.floor(cx - 3); x <= Math.ceil(cx + 2); x++) {
          if (m.get(x, Math.floor(y))) s.paint(x, Math.floor(y), vein, 4)
          y += r() < 0.5 ? 0.8 : -0.8
          y = Math.max(cy - 1.4, Math.min(cy + 1, y))
        }
        m.each((px, py) => {
          if (!m.get(px, py - 1)) s.paint(px, py, flesh, px < cx ? 4 : 3)
        })
      })
    },
  },
  {
    id: 'glowcap-powder',
    name: 'Glowcap Powder',
    grade: 9,
    paint: (s) => {
      // A slim glass vial of luminous cyan powder, a tiny glowcap on its tag.
      const body = Mask.ellipse(16, 22.2, 5.2, 4.2).union(box(12, 12, 19, 22))
      const neck = box(13, 9, 18, 11)
      const g = glassVessel(s, { body, neck, fill: 14, contents: ramp('#4ff0d0', { lift: 0.5, drop: 0.3 }), glass: ramp('#bfe8e6', { lift: 0.42 }), bias: 0.2 })
      speckle(s, 'glowcap', g.contents, 10, 1, 2)
      const cork = s.addRamp(ramp('#b9875a'))
      pix(s, 13, 6, ['.aab.', 'aaabb', 'abbbc'], { a: [cork, 4], b: [cork, 3], c: [cork, 2] })
      const tag = s.addRamp(ramp('#efe3c4', { lift: 0.4 }))
      const cap = s.addRamp(ramp('#2fb8a8', { lift: 0.4 }))
      pix(s, 13, 17, ['aaaaa', 'abbba', 'aacaa', 'aacaa'], { a: [tag, 4], b: [cap, 4], c: [tag, 2] })
      shine(s, g.shell, { from: 12, to: 24, skip: box(13, 17, 17, 20) })
      halo(s, 16, 17, 10, 12, '#5ff2d8', 90)
      motes(s, [[9, 10], [23, 6], [24, 18], [9, 17]], '#c8fff4', 210)
    },
  },
  {
    id: 'reishi-powder',
    name: 'Reishi Powder',
    grade: 10,
    paint: (s) => {
      // A red-lacquer bowl with a gold rim, heaped with russet powder; a gold reishi crest on the front.
      const lacquer = ramp('#a8202a', { lift: 0.34, drop: 0.3 })
      const { contents, body } = bowl(s, { cx: 16, rim: 17.6, rx: 9, ry: 3.4, depth: 7.6, bowl: lacquer, mound: 4, contents: ramp('#b4542e', { lift: 0.4 }), foot: true, bias: 0.14 })
      speckle(s, 'reishi-a', contents, 8, 1, 2)
      speckle(s, 'reishi-b', contents, 6, -1, 3)
      const gold = s.addRamp(GOLD)
      Mask.ellipse(16, 17.6, 9, 3.4).each((x, y) => {
        if (y >= 18 && !Mask.ellipse(16, 17.6, 7.8, 2.5).get(x, y) && body.get(x, y)) s.paint(x, y, gold, x < 14 ? 5 : 4)
      })
      pix(s, 13, 21, ['.aaaa.', 'abbbba', '..cc..'], { a: [gold, 5], b: [gold, 4], c: [gold, 3] })
      for (let x = 11; x <= 20; x++) if (body.get(x, 26)) s.paint(x, 26, gold, x < 15 ? 4 : 3)
      halo(s, 16, 16, 11.5, 11, '#ffc04d', 85)
      motes(s, [[10, 9], [22, 7], [25, 15]], '#fff1a6', 220)
    },
  },
]
