// Refined Grains (Pantry, HP family): uma-rpg docs/design/items.md#grains. Open cloth sacks heaped with the milled
// product; each sack carries a colored band and a stamped grain mark, and each heap its own texture.
import { ramp } from '../../color.ts'
import { rng } from '../../rng.ts'
import type { Mask } from '../../shape.ts'
import type { Sprite } from '../../sprite.ts'
import type { ItemIcon } from '../types.ts'
import { halo, motes, pix, rays, sack, scatter, speckle, type Tones } from './pantry-kit.ts'

const SACK = ramp('#a97d4b', { lift: 0.28, drop: 0.26 })

type Texture = 'flour' | 'flakes' | 'beads' | 'grains' | 'meal' | 'specks' | 'needles'

interface SackSpec {
  id: string
  name: string
  grade: number
  cloth: Tones
  contents: Tones
  texture: Texture
  band: Tones
  mark: readonly string[]
  heap?: number
  bias?: number
  glow?: (s: Sprite) => void
}

/** Textures the heap so each product reads differently: smooth flour, flat flakes, round beads, long grains. */
function texture(s: Sprite, kind: Texture, heap: Mask, id: number, seed: string): void {
  const r = rng(`${seed}-texture`)
  if (kind === 'flour') speckle(s, seed, heap, 4, 1, 3)
  if (kind === 'specks') {
    const hull = s.addRamp(ramp('#3a302c'))
    for (const [x, y] of scatter(seed, heap, 11)) s.paint(x, y, hull, 3)
  }
  if (kind === 'meal') {
    speckle(s, seed, heap, 12, 1, 2)
    speckle(s, `${seed}-b`, heap, 10, -1, 3)
  }
  if (kind === 'beads')
    heap.each((x, y) => {
      if ((x + y) % 2 === 0 && y % 2 === 0) s.paint(x, y, id, Math.min(5, s.toneAt(x, y) + 2))
      else if ((x + y) % 2 === 1 && y % 2 === 1) s.shift(x, y, -1)
    })
  if (kind === 'flakes')
    for (const [x, y] of scatter(seed, heap, 11)) {
      s.paint(x, y, id, 5)
      if (heap.get(x + 1, y)) s.paint(x + 1, y, id, 4)
      if (heap.get(x, y + 1)) s.paint(x, y + 1, id, 2)
      if (heap.get(x + 1, y + 1)) s.paint(x + 1, y + 1, id, 2)
    }
  if (kind === 'grains' || kind === 'needles') {
    const count = kind === 'needles' ? 10 : 8
    for (const [x, y] of scatter(seed, heap, count)) {
      const dx = r() < 0.5 ? 1 : -1
      const up = kind === 'needles' ? 2 : 1
      s.paint(x, y, id, kind === 'needles' ? 4 : 5)
      if (heap.get(x + dx, y - 1) && up > 0) s.paint(x + dx, y - 1, id, kind === 'needles' ? 3 : 4)
      if (kind === 'needles' && heap.get(x + 2 * dx, y - 2)) s.paint(x + 2 * dx, y - 2, id, 3)
      if (heap.get(x - dx, y + 1) && kind === 'grains') s.shift(x - dx, y + 1, -1)
    }
  }
}

function paintSack(spec: SackSpec): (s: Sprite) => void {
  return (s) => {
    const { heap, heapId, front } = sack(s, { cloth: spec.cloth, contents: spec.contents, heap: spec.heap, bias: spec.bias })
    texture(s, spec.texture, heap, heapId, spec.id)
    // Colored band across the sack, then the stamped mark in the band's ink, both following the cloth's light.
    const bandId = s.addRamp(spec.band)
    front.each((x, y) => {
      if (y === 16 || y === 17) s.paint(x, y, bandId, s.toneAt(x, y) + (y === 16 ? 0 : -1))
    })
    const ink = s.addRamp(spec.band)
    pix(s, 14, 19, spec.mark, { a: [ink, 4], b: [ink, 3], c: [ink, 5] })
    spec.glow?.(s)
  }
}

const EAR = ['..c..', '.cab.', '.cab.', '..a..', '..b..']
const OAT = ['.c.c.', 'c.a.b', '..a..', '.a.b.', '..b..']
const BEADS = ['.ca..', '.ab.c', '...ab', 'ca...', 'ab...']
const RICE = ['...c.', '..ab.', '.c.b.', 'cab..', '.b...']
const COB = ['..c..', '.cab.', '.cab.', '.cab.', 'b.a.b']
const RYE = ['c...c', '.c.b.', '..a..', '..a..', '..b..']
const PYRAMID = ['..c..', '.cab.', '.cab.', 'caaab', '.....']
const STALK = ['c...c', '.a.a.', '..a..', '.a.b.', 'b...b']
const MOON = ['.cc..', 'c....', 'c....', 'c...b', '.abb.']
const SUN = ['c.c.c', '.aaa.', 'caaab', '.abb.', 'c.b.b']

const SPECS: SackSpec[] = [
  { id: 'wheat-flour', name: 'Wheat Flour', grade: 1, cloth: SACK, contents: ramp('#f6f2ea', { lift: 0.5, drop: 0.12 }), texture: 'flour', band: ramp('#3f6fb8'), mark: EAR },
  { id: 'rolled-oats', name: 'Rolled Oats', grade: 2, cloth: ramp('#c49c64', { lift: 0.28, drop: 0.26 }), contents: ramp('#d6ae66', { lift: 0.38, drop: 0.26 }), texture: 'flakes', band: ramp('#4f9a43'), mark: OAT },
  { id: 'pearl-barley', name: 'Pearl Barley', grade: 3, cloth: ramp('#94704a', { lift: 0.3, drop: 0.26 }), contents: ramp('#e4d6ae', { lift: 0.42, drop: 0.24 }), texture: 'beads', band: ramp('#c4433a'), mark: BEADS },
  { id: 'polished-rice', name: 'Polished Rice', grade: 4, cloth: ramp('#e4dccb', { lift: 0.3, drop: 0.22 }), contents: ramp('#f6f3ea', { lift: 0.5, drop: 0.12 }), texture: 'grains', band: ramp('#d0473e'), mark: RICE },
  { id: 'cornmeal', name: 'Cornmeal', grade: 5, cloth: SACK, contents: ramp('#f0c142', { lift: 0.36 }), texture: 'meal', band: ramp('#2f8a7a'), mark: COB },
  { id: 'rye-flour', name: 'Rye Flour', grade: 6, cloth: ramp('#76563a', { lift: 0.3 }), contents: ramp('#ad9a80', { lift: 0.38, drop: 0.22 }), texture: 'flour', band: ramp('#7b4aa0'), mark: RYE },
  { id: 'buckwheat-flour', name: 'Buckwheat Flour', grade: 7, cloth: ramp('#8c8270', { lift: 0.3 }), contents: ramp('#d2c8b6', { lift: 0.4, drop: 0.2 }), texture: 'specks', band: ramp('#c47a2a'), mark: PYRAMID },
  { id: 'hulled-wild-rice', name: 'Hulled Wild Rice', grade: 8, cloth: ramp('#7e8a5a'), contents: ramp('#3e3029', { lift: 0.32, drop: 0.3 }), texture: 'needles', band: ramp('#e0c070'), mark: STALK, bias: 0.12 },
  {
    id: 'moonrice-flour',
    name: 'Moonrice Flour',
    grade: 9,
    cloth: ramp('#3f4f8f', { lift: 0.3 }),
    contents: ramp('#cfe0ff', { lift: 0.55, drop: 0.2, satShift: 0.02 }),
    texture: 'flour',
    band: ramp('#c9d8ff', { lift: 0.4 }),
    mark: MOON,
    bias: 0.15,
    glow: (s) => {
      halo(s, 16, 11, 10, 7.5, '#a9c8ff', 90)
      motes(s, [[11, 5], [20, 4], [23, 8]], '#e6f0ff', 210)
    },
  },
  {
    id: 'sunwheat-flour',
    name: 'Sunwheat Flour',
    grade: 10,
    cloth: ramp('#f2e6c6', { lift: 0.36, drop: 0.24 }),
    contents: ramp('#ffcf3f', { lift: 0.5, drop: 0.26, hueShift: 10 }),
    texture: 'flour',
    band: ramp('#e09a1a'),
    mark: SUN,
    bias: 0.15,
    glow: (s) => {
      rays(s, 16, 10.5, 7.5, 11, [-90, -55, -125, -20, -160], '#ffe27a', 150)
      halo(s, 16, 11, 11, 8, '#ffd34d', 80)
    },
  },
]

export const GRAINS_REFINED: ItemIcon[] = SPECS.map((spec) => ({ id: spec.id, name: spec.name, grade: spec.grade, paint: paintSack(spec) }))
