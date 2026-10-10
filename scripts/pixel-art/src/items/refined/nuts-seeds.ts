// Refined Nuts & Seeds (Pantry, Limit Break family): uma-rpg docs/design/items.md#nuts--seeds. Pastes and butters in
// squat screw-lid jars, each with the whole nut sitting in front; oils in tall corked bottles, the legendary ones
// charged with lightning or glowing with the world tree's green gold.
import { hex, ramp } from '../../color.ts'
import { rng } from '../../rng.ts'
import { Mask, shadeDome } from '../../shape.ts'
import type { Sprite } from '../../sprite.ts'
import type { ItemIcon } from '../types.ts'
import { band, box, capsule, CORK, glassVessel, halo, lid, motes, PAPER, pix, rays, roundBox, shine, speckle, type Tones } from './pantry-kit.ts'

type Nut = (s: Sprite) => void

interface PasteSpec {
  id: string
  name: string
  grade: number
  paste: Tones
  lid: Tones
  label: Tones
  /** Chunky pastes get flecks of nut. */
  chunks?: Tones
  nut: Nut
}

/** A squat screw-lid jar of paste: a swirl shows at the glass top, a colored label wraps the middle. */
function pasteJar(spec: PasteSpec): (s: Sprite) => void {
  return (s) => {
    const body = roundBox(8, 13, 21, 26, 2)
    const neck = box(9, 12, 20, 12)
    const g = glassVessel(s, { body, neck, fill: 13, contents: spec.paste, bias: 0.06 })
    // A ridge of paste pressed against the glass, swirling under the lid.
    for (const [x, y] of [[10, 14], [11, 14], [12, 15], [13, 15], [14, 14], [15, 14], [16, 15], [17, 15], [18, 14]] as const) s.shift(x, y, 1)
    if (spec.chunks) {
      const id = s.addRamp(spec.chunks)
      const r = rng(`${spec.id}-chunks`)
      for (let i = 0; i < 6; i++) {
        const x = 10 + Math.floor(r() * 10), y = r() < 0.5 ? 14 + Math.floor(r() * 2) : 23 + Math.floor(r() * 2)
        if (g.contents.get(x, y)) s.paint(x, y, id, 3 + (r() < 0.5 ? 1 : 0))
      }
    }
    const l = band(s, body, 17, 21, spec.label)
    shine(s, g.shell, { skip: l.mask, from: 13, to: 24 })
    lid(s, 8, 8, 21, 11, spec.lid, { ridges: true })
    spec.nut(s)
  }
}

// Whole nuts sitting in front of the jar, at the lower right.

const peanut: Nut = (s) => {
  const id = s.addRamp(ramp('#d8b47a', { lift: 0.34 }))
  const m = Mask.circle(21.2, 21.4, 2.4).union(Mask.circle(24.2, 24.2, 2.4), capsule(21.2, 21.4, 24.2, 24.2, 1.9))
  shadeDome(s, m, id)
  m.each((x, y) => {
    if ((x + y) % 3 === 0 && (x - y) % 2 === 0 && s.toneAt(x, y) > 2) s.shift(x, y, -1)
  })
}

const sesame: Nut = (s) => {
  const id = s.addRamp(ramp('#efe0b8', { lift: 0.4 }))
  for (const [x, y] of [[20, 25], [22, 24], [24, 25], [21, 23], [23, 22], [25, 23], [19, 23], [24, 21]] as const) pix(s, x, y, ['ab'], { a: [id, 5], b: [id, 3] })
}

const walnut: Nut = (s) => {
  const id = s.addRamp(ramp('#b0824e', { lift: 0.32 }))
  const m = Mask.circle(22.6, 22.4, 3.6)
  shadeDome(s, m, id)
  const r = rng('walnut-wrinkles')
  m.each((x, y) => {
    if (r() < 0.3 && s.toneAt(x, y) > 1) s.shift(x, y, -1)
  })
  for (let y = 19; y <= 25; y++) if (m.get(22, y)) s.paint(22, y, id, 2)
}

const chestnut: Nut = (s) => {
  const id = s.addRamp(ramp('#7a3a22', { lift: 0.36 }))
  const base = s.addRamp(ramp('#d8c098', { lift: 0.3 }))
  const m = Mask.polygon([[22.6, 18.6], [26, 22.4], [25.4, 25.6], [19.6, 25.6], [19, 22.4]])
  shadeDome(s, m, id, { bias: 0.08 })
  for (let x = 20; x <= 25; x++) if (m.get(x, 25)) s.paint(x, 25, base, x < 23 ? 4 : 3)
  s.paint(22, 19, id, 5)
  s.paint(21, 21, id, 5)
}

const almond: Nut = (s) => {
  const id = s.addRamp(ramp('#c08452', { lift: 0.34 }))
  const m = Mask.from((px, py) => {
    const u = (px - 22.4) / 2.6, v = (py - 22.6) / 4
    return u * u + v * v <= 1 && (v > -0.2 || Math.abs(u) <= (v + 1) * 0.9)
  })
  shadeDome(s, m, id)
  speckle(s, 'almond', m, 4, -1, 3)
}

const pistachio: Nut = (s) => {
  const shell = s.addRamp(ramp('#e2d0a8', { lift: 0.36 }))
  const kernel = s.addRamp(ramp('#8abf3a', { lift: 0.36 }))
  const skin = s.addRamp(ramp('#8a4a6a'))
  const m = Mask.ellipse(22.6, 22.6, 3.6, 2.8, -30)
  shadeDome(s, m, shell)
  const gap = Mask.ellipse(22.4, 22.4, 2.4, 1.1, -30)
  gap.each((x, y) => s.paint(x, y, kernel, x < 22 ? 4 : 3))
  s.paint(24, 21, skin, 3)
}

const macadamia: Nut = (s) => {
  const id = s.addRamp(ramp('#efe2c0', { lift: 0.4, drop: 0.24 }))
  const m = Mask.circle(22.6, 22.6, 3.3)
  shadeDome(s, m, id)
  s.paint(23, 23, id, 2)
  s.paint(24, 23, id, 2)
}

const PASTES: PasteSpec[] = [
  { id: 'peanut-butter', name: 'Peanut Butter', grade: 1, paste: ramp('#c0823e', { lift: 0.36 }), lid: ramp('#d0402e'), label: ramp('#f2d36a', { lift: 0.3 }), nut: peanut },
  { id: 'sesame-paste', name: 'Sesame Paste', grade: 3, paste: ramp('#d9c29a', { lift: 0.36, drop: 0.24 }), lid: ramp('#3a3a42', { lift: 0.3 }), label: ramp('#e86a3a'), nut: sesame },
  { id: 'walnut-paste', name: 'Walnut Paste', grade: 4, paste: ramp('#8a5a34', { lift: 0.34 }), lid: ramp('#3f7a4a'), label: PAPER, chunks: ramp('#d8b88a'), nut: walnut },
  { id: 'chestnut-paste', name: 'Chestnut Paste', grade: 5, paste: ramp('#9a5a3a', { lift: 0.34 }), lid: ramp('#c8a03a', { lift: 0.4 }), label: ramp('#e8d8c0', { lift: 0.35 }), nut: chestnut },
  { id: 'almond-paste', name: 'Almond Paste', grade: 6, paste: ramp('#ecdcb8', { lift: 0.4, drop: 0.22 }), lid: ramp('#6a8ac8'), label: ramp('#f2c0c8', { lift: 0.35 }), nut: almond },
  { id: 'pistachio-paste', name: 'Pistachio Paste', grade: 7, paste: ramp('#9ab84a', { lift: 0.38 }), lid: ramp('#8a4a6a'), label: ramp('#f2ead0', { lift: 0.35 }), chunks: ramp('#c8e07a'), nut: pistachio },
  { id: 'macadamia-butter', name: 'Macadamia Butter', grade: 8, paste: ramp('#f0e2bc', { lift: 0.42, drop: 0.22 }), lid: ramp('#5a3a2a', { lift: 0.3 }), label: ramp('#4f9a8a', { lift: 0.3 }), nut: macadamia },
]

/** A tall corked oil bottle with sloping shoulders; returns the glass so callers can add effects. */
function oilBottle(s: Sprite, oil: Tones, o: { label: Tones; motif: readonly string[]; key: Record<string, readonly [number, number]>; glass?: Tones }): void {
  const body = roundBox(11, 14, 20, 26, 2).union(Mask.polygon([[11, 15], [13.6, 10.6], [18.4, 10.6], [21, 15]]))
  const neck = box(14, 6, 17, 10)
  const g = glassVessel(s, { body, neck, fill: 11, contents: oil, glass: o.glass, bias: 0.12 })
  const cork = s.addRamp(CORK)
  pix(s, 14, 3, ['abbc', 'abbc', 'abcc'], { a: [cork, 4], b: [cork, 3], c: [cork, 2] })
  const l = band(s, body, 17, 22, o.label)
  pix(s, 13, 17, o.motif, o.key)
  shine(s, g.shell, { skip: l.mask, from: 8, to: 25 })
}

export const NUTS_SEEDS_REFINED: ItemIcon[] = [
  ...PASTES.slice(0, 1).map((spec) => ({ id: spec.id, name: spec.name, grade: spec.grade, paint: pasteJar(spec) })),
  {
    id: 'sunflower-oil',
    name: 'Sunflower Oil',
    grade: 2,
    paint: (s) => {
      const petal = s.addRamp(ramp('#f5c21a', { lift: 0.4 }))
      const disc = s.addRamp(ramp('#6a3a1a'))
      oilBottle(s, ramp('#f2c43a', { lift: 0.45 }), { label: ramp('#4f8a3a', { lift: 0.3 }), motif: ['.a.a.', 'aabaa', '.bbb.', 'aabaa', '.a.a.'], key: { a: [petal, 4], b: [disc, 3] } })
    },
  },
  ...PASTES.slice(1).map((spec) => ({ id: spec.id, name: spec.name, grade: spec.grade, paint: pasteJar(spec) })),
  {
    id: 'thundernut-oil',
    name: 'Thundernut Oil',
    grade: 9,
    paint: (s) => {
      const bolt = s.addRamp(ramp('#ffe04a', { lift: 0.5 }))
      oilBottle(s, ramp('#5aa8ff', { lift: 0.5, drop: 0.3 }), {
        label: ramp('#2a2a4a', { lift: 0.3 }),
        motif: ['...a.', '..a..', '.aaa.', '..a..', '.a...'],
        key: { a: [bolt, 5] },
        glass: ramp('#d0e4ff', { lift: 0.45 }),
      })
      // Crackling arcs of lightning around the bottle.
      halo(s, 16, 16, 11, 12, '#7ab8ff', 90)
      for (const [x, y] of [[9, 9], [8, 10], [9, 11], [8, 12], [9, 13], [23, 13], [24, 14], [23, 15], [24, 16], [21, 6], [22, 5], [21, 4]] as const) s.overlay(x, y, hex('#fff27a', 235))
      motes(s, [[10, 5], [25, 21], [8, 18]], '#fff6b0', 230)
    },
  },
  {
    id: 'worldseed-oil',
    name: 'Worldseed Oil',
    grade: 10,
    paint: (s) => {
      const leaf = s.addRamp(ramp('#6ad04a', { lift: 0.4 }))
      const trunk = s.addRamp(ramp('#c89a3a', { lift: 0.4 }))
      oilBottle(s, ramp('#b8d83a', { lift: 0.5, drop: 0.3, hueShift: 10 }), {
        label: ramp('#fff4d0', { lift: 0.4 }),
        motif: ['.aaa.', 'aaaaa', '.aba.', '..b..', '.bbb.'],
        key: { a: [leaf, 4], b: [trunk, 3] },
        glass: ramp('#e8f4c0', { lift: 0.45 }),
      })
      // A sprouting seedling on the cork.
      pix(s, 13, 1, ['abb.b', '..cb.'], { a: [leaf, 5], b: [leaf, 4], c: [leaf, 2] })
      halo(s, 16, 15, 11.5, 12.5, '#c8f05a', 90)
      rays(s, 15.5, 4, 3, 6, [-90, -50, -130], '#f0ffa0', 150)
      motes(s, [[9, 6], [24, 5], [25, 20]], '#f8ffd0', 220)
    },
  },
]
