// Refined Fruits (Pantry, MP family): uma-rpg docs/design/items.md#fruits. Glass jars of preserves, each with its
// own jar shape, top (cloth, lid or wax), contents texture and label.
import { ramp } from '../../color.ts'
import { Mask } from '../../shape.ts'
import type { Sprite } from '../../sprite.ts'
import type { ItemIcon } from '../types.ts'
import {
  band,
  box,
  clothTop,
  fleck,
  type Glass,
  glassVessel,
  GOLD,
  halo,
  lid,
  PAPER,
  pix,
  roundBox,
  shine,
  SILVER,
  spans,
  type Tones,
} from './pantry-kit.ts'

type Shape = 'mason' | 'round' | 'squat' | 'hex'

interface JarGeo {
  body: Mask
  neck: Mask
  lid: [number, number, number, number]
  label: [number, number]
  fill: number
}

const SHAPES: Record<Shape, () => JarGeo> = {
  mason: () => ({ body: roundBox(9, 10, 22, 26, 1).union(box(10, 9, 21, 9)), neck: box(11, 8, 20, 8), lid: [10, 5, 21, 7], label: [16, 21], fill: 11 }),
  round: () => ({ body: Mask.ellipse(16, 19, 7.8, 7.6), neck: box(11, 10, 20, 11), lid: [10, 7, 21, 9], label: [17, 21], fill: 13 }),
  squat: () => ({ body: roundBox(8, 13, 23, 26, 2), neck: box(10, 12, 21, 12), lid: [9, 9, 22, 11], label: [18, 22], fill: 14 }),
  hex: () => ({ body: roundBox(10, 10, 21, 26, 1).union(box(11, 9, 20, 9)), neck: box(12, 8, 19, 8), lid: [11, 5, 20, 7], label: [16, 20], fill: 11 }),
}

type Top = { kind: 'cloth'; tones: Tones; pattern: 'gingham' | 'dots' | 'stripes' } | { kind: 'lid'; tones: Tones; ridges?: boolean } | { kind: 'wax'; tones: Tones }

interface PreserveSpec {
  shape: Shape
  contents: Tones
  top: Top
  label?: { tones: Tones; motif: readonly string[]; fruit: Tones; leaf?: Tones }
  texture?: (s: Sprite, g: Glass, seed: string) => void
  /** Vertical facet lines (a cut-glass jelly jar). */
  facets?: boolean
}

const LEAF = ramp('#5fae3c')
const STEM = ramp('#7b5330')

/** Fruit chunks: small pale lumps suspended in the jam. */
function chunks(tones: Tones, count: number): (s: Sprite, g: Glass, seed: string) => void {
  return (s, g, seed) => {
    const id = s.addRamp(tones)
    const inner = new Mask()
    g.contents.each((x, y) => {
      if (g.contents.get(x - 1, y) && g.contents.get(x + 2, y) && g.contents.get(x, y - 1) && g.contents.get(x, y + 1)) inner.set(x, y)
    })
    fleck(s, `${seed}-chunks`, inner, count, id)
    fleck(s, `${seed}-chunks-b`, inner, Math.ceil(count / 2), id, 1)
  }
}

function preserve(id: string, spec: PreserveSpec): (s: Sprite) => void {
  return (s) => {
    const geo = SHAPES[spec.shape]()
    const g = glassVessel(s, { body: geo.body, neck: geo.neck, fill: geo.fill, contents: spec.contents })
    spec.texture?.(s, g, id)
    if (spec.facets) {
      const sp = spans(geo.body)
      for (const [y, [a, b]] of sp) for (const x of [a + 3, b - 3]) if (y > geo.fill) s.shift(x, y, x < 16 ? 1 : -1)
    }
    let labelMask: Mask | undefined
    if (spec.label) {
      const l = band(s, geo.body, geo.label[0], geo.label[1], spec.label.tones, { inset: spec.shape === 'round' ? 1 : 0 })
      labelMask = l.mask
      const fruit = s.addRamp(spec.label.fruit)
      const leaf = s.addRamp(spec.label.leaf ?? LEAF)
      const stem = s.addRamp(STEM)
      pix(s, 13, geo.label[0] + 1, spec.label.motif, { r: [fruit, 3], R: [fruit, 4], d: [fruit, 2], g: [leaf, 3], s: [stem, 2] })
    }
    shine(s, g.shell, { skip: labelMask })
    const [x0, y0, x1, y1] = geo.lid
    if (spec.top.kind === 'lid') lid(s, x0, y0, x1, y1, spec.top.tones, { ridges: spec.top.ridges })
    else if (spec.top.kind === 'cloth') clothTop(s, x0 - 1, x1 + 1, y0 - 2, y1 + 1, y1 + 3, spec.top.tones, { pattern: spec.top.pattern })
    else {
      const wax = lid(s, x0, y0, x1, y1, spec.top.tones, { bias: 0.2 })
      for (const [x, len] of [[x0 + 1, 3], [x0 + 5, 2], [x1 - 2, 4]] as const) for (let k = 1; k <= len; k++) s.paint(x, y1 + k, wax, k === len ? 2 : 3)
    }
  }
}

const APPLE = ['..g..', '.Rrr.', '.rrd.', '..d..']
const PEAR = ['..s..', '..R..', '.Rrr.', '.rrd.']
const PEACH = ['...g.', '.Rrr.', '.rrr.', '..dd.']
const PLUM = ['..s..', '.Rr..', '.rrd.', '..d..']
const SLICE = ['.ddd.', 'dRrRd', 'drRrd', '.ddd.']
const GRAPES = ['..s..', '.RrR.', '..rr.', '..r..']
const MANGO = ['..Rr.', '.Rrrd', '.rrd.', '.g...']
const POMEGRANATE = ['.r.r.', '.Rrr.', '.rrd.', '..d..']

export const FRUITS_REFINED: ItemIcon[] = [
  {
    id: 'apple-preserve',
    name: 'Apple Preserve',
    grade: 1,
    paint: preserve('apple-preserve', {
      shape: 'mason',
      contents: ramp('#c2412d', { drop: 0.28 }),
      top: { kind: 'cloth', tones: ramp('#d63c39'), pattern: 'gingham' },
      label: { tones: PAPER, motif: APPLE, fruit: ramp('#d63c39') },
      texture: chunks(ramp('#f2cf86'), 6),
    }),
  },
  {
    id: 'pear-preserve',
    name: 'Pear Preserve',
    grade: 2,
    paint: preserve('pear-preserve', {
      shape: 'round',
      contents: ramp('#cdbb4a', { hueShift: 10 }),
      top: { kind: 'lid', tones: SILVER, ridges: true },
      label: { tones: ramp('#d7e8a6', { lift: 0.4 }), motif: PEAR, fruit: ramp('#9fbf3a') },
      texture: chunks(ramp('#f4efb8'), 5),
    }),
  },
  {
    id: 'peach-preserve',
    name: 'Peach Preserve',
    grade: 3,
    paint: preserve('peach-preserve', {
      shape: 'mason',
      contents: ramp('#ec8434'),
      top: { kind: 'cloth', tones: ramp('#4a7fc8'), pattern: 'gingham' },
      label: { tones: PAPER, motif: PEACH, fruit: ramp('#f7a86e') },
      texture: chunks(ramp('#ffc98f'), 6),
    }),
  },
  {
    id: 'plum-preserve',
    name: 'Plum Preserve',
    grade: 4,
    paint: preserve('plum-preserve', {
      shape: 'round',
      contents: ramp('#6c2152', { hueShift: 6 }),
      top: { kind: 'cloth', tones: ramp('#8d6cc0'), pattern: 'dots' },
      label: { tones: ramp('#e6dcf2', { lift: 0.4 }), motif: PLUM, fruit: ramp('#7d3b94') },
      texture: chunks(ramp('#c0548c'), 5),
    }),
  },
  {
    id: 'orange-marmalade',
    name: 'Orange Marmalade',
    grade: 5,
    paint: preserve('orange-marmalade', {
      shape: 'squat',
      contents: ramp('#f39a1c', { lift: 0.34 }),
      top: { kind: 'cloth', tones: ramp('#4f9a43'), pattern: 'gingham' },
      label: { tones: PAPER, motif: SLICE, fruit: ramp('#f28c1f') },
      texture: (s, g) => {
        const peel = s.addRamp(ramp('#c4500c'))
        for (const [x, y] of [[11, 15], [12, 16], [17, 15], [18, 14], [21, 16], [12, 24], [13, 25], [18, 24], [19, 23]] as const) if (g.contents.get(x, y)) s.paint(x, y, peel, 3)
      },
    }),
  },
  {
    id: 'grape-jelly',
    name: 'Grape Jelly',
    grade: 6,
    paint: preserve('grape-jelly', {
      shape: 'hex',
      contents: ramp('#5b2a8c', { hueShift: 6, lift: 0.34 }),
      top: { kind: 'lid', tones: GOLD, ridges: true },
      label: { tones: ramp('#f3e6c8', { lift: 0.4 }), motif: GRAPES, fruit: ramp('#7042ab') },
      facets: true,
    }),
  },
  {
    id: 'mango-pulp',
    name: 'Mango Pulp',
    grade: 7,
    paint: preserve('mango-pulp', {
      shape: 'mason',
      contents: ramp('#f6ad24', { lift: 0.3 }),
      top: { kind: 'lid', tones: ramp('#2f9a8f') },
      label: { tones: ramp('#2f9a8f', { lift: 0.3 }), motif: MANGO, fruit: ramp('#f5b83a') },
      texture: (s, g) => {
        for (const [x, y] of [[11, 12], [12, 13], [13, 13], [14, 12], [15, 12], [16, 13], [17, 14], [12, 23], [13, 24], [14, 24], [15, 23], [16, 23], [17, 24]] as const) if (g.contents.get(x, y)) s.shift(x, y, 1)
      },
    }),
  },
  {
    id: 'pomegranate-molasses',
    name: 'Pomegranate Molasses',
    grade: 8,
    paint: preserve('pomegranate-molasses', {
      shape: 'squat',
      contents: ramp('#6a1428', { lift: 0.36, drop: 0.3 }),
      top: { kind: 'wax', tones: ramp('#c4243a') },
      label: { tones: PAPER, motif: POMEGRANATE, fruit: ramp('#bb2532') },
    }),
  },
  {
    id: 'starpeach-nectar',
    name: 'Starpeach Nectar',
    grade: 9,
    paint: (s) => {
      // A slender carafe: teardrop belly, long neck, gold collar and stopper, a gold star on the belly. The nectar is
      // pale gold, blushing pink toward the bottom right like the fruit.
      const body = Mask.ellipse(16, 21.2, 6, 5.2).union(Mask.polygon([[11, 20.6], [14.6, 11.6], [17.4, 11.6], [21, 20.6]]))
      const neck = box(15, 6, 16, 11)
      const g = glassVessel(s, { body, neck, fill: 13, contents: ramp('#ffd49c', { lift: 0.42, drop: 0.2, satShift: 0.02 }), glass: ramp('#f2e6f0', { lift: 0.42 }), bias: 0.2 })
      const blush = s.addRamp(ramp('#ffaec4', { lift: 0.4, drop: 0.2, satShift: 0.02 }))
      g.contents.each((x, y) => {
        const b = (x - 9 + (y - 13) * 0.9) / 14
        if (b > 1.05 || (b > 0.9 && (x + y) % 2 === 0)) s.paint(x, y, blush, s.toneAt(x, y))
      })
      const gold = s.addRamp(GOLD)
      for (let x = 14; x <= 17; x++) s.paint(x, 6, gold, x < 16 ? 4 : 2)
      pix(s, 14, 2, ['.ab.', 'abbc', '.bc.'], { a: [gold, 5], b: [gold, 4], c: [gold, 2] })
      pix(s, 13, 18, ['..a..', 'aabaa', '.aaa.', '.a.a.'], { a: [gold, 4], b: [gold, 5] })
      shine(s, g.shell, { from: 13, to: 24, skip: box(13, 18, 17, 21) })
      halo(s, 16, 17, 10.5, 11.5, '#ffc8c0', 80)
    },
  },
  {
    id: 'golden-apple-preserve',
    name: 'Golden Apple Preserve',
    grade: 10,
    paint: (s) => {
      preserve('golden-apple-preserve', {
        shape: 'round',
        contents: ramp('#f2b030', { lift: 0.42, drop: 0.3, hueShift: 12 }),
        top: { kind: 'lid', tones: GOLD, ridges: true },
        label: { tones: ramp('#fff4d6', { lift: 0.4 }), motif: APPLE, fruit: GOLD, leaf: ramp('#a9c43c') },
        texture: chunks(ramp('#fff0a8', { lift: 0.5 }), 6),
      })(s)
      halo(s, 16, 17, 11, 11.5, '#ffd34d', 80)
    },
  },
]
