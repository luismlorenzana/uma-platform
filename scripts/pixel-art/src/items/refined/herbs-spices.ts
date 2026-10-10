// Refined Herbs & Spices (Pantry, M.ATK family): uma-rpg docs/design/items.md#herbs--spices. Leafy herbs are dried
// in bundles tied with twine; roots, seeds and bark are ground into small blue bowls; the rare spices get vessels of
// their own (a saffron dish, a mandrake vial, a fiery phoenix jar).
import { ramp } from '../../color.ts'
import { rng } from '../../rng.ts'
import { Mask, shadeDome } from '../../shape.ts'
import type { Sprite } from '../../sprite.ts'
import type { ItemIcon } from '../types.ts'
import { bowl, box, capsule, glassVessel, GOLD, halo, lid, motes, pix, rays, shine, speckle, TWINE, type Tones } from './pantry-kit.ts'

// ---------------------------------------------------------------------------------------------------------------
// Dried bundles: sprigs fan out to the upper left from a twine tie; the cut stems poke out to the lower right.

const TIE: readonly [number, number] = [19.5, 19.5]
const STEM = ramp('#7d6a3e', { lift: 0.3 })

type Leaves = 'broad' | 'pointed' | 'needles' | 'tiny'

interface BundleSpec {
  leaf: Tones
  stem?: Tones
  leaves: Leaves
  twine?: Tones
  /** Sprig angles (degrees, screen space; 225 points to the upper left) and lengths. */
  sprigs: readonly (readonly [number, number])[]
}

function sprigPoint(angle: number, d: number): [number, number] {
  const a = (angle * Math.PI) / 180
  return [TIE[0] + Math.cos(a) * d, TIE[1] + Math.sin(a) * d]
}

function bundle(spec: BundleSpec): (s: Sprite) => void {
  return (s) => {
    const stem = s.addRamp(spec.stem ?? STEM)
    const leaf = s.addRamp(spec.leaf)
    const r = rng(`bundle-${spec.leaves}`)
    // Back sprigs (the outer ones) first, so the middle ones overlap them.
    const order = [...spec.sprigs].sort((a, b) => Math.abs(b[0] - 225) - Math.abs(a[0] - 225))
    for (const [angle, length] of order) {
      for (let d = 0; d <= length; d += 0.5) {
        const [x, y] = sprigPoint(angle, d)
        s.paint(Math.floor(x), Math.floor(y), stem, 2)
      }
      const a = (angle * Math.PI) / 180
      if (spec.leaves === 'broad' || spec.leaves === 'pointed') {
        const broad = spec.leaves === 'broad'
        let side = r() < 0.5 ? 1 : -1
        for (let d = 3; d <= length; d += broad ? 2.6 : 2.2) {
          const [x, y] = sprigPoint(angle, d)
          const off = broad ? 1.8 : 1.5
          const m = Mask.ellipse(x + Math.cos(a + side * 1.1) * off, y + Math.sin(a + side * 1.1) * off, broad ? 2.5 : 2.1, broad ? 1.6 : 1.15, angle + side * 38)
          shadeDome(s, m, leaf, { bias: 0.04 })
          if (!broad) speckle(s, `mint-${angle}-${d}`, m, 2, 1, 2)
          side = -side
        }
        const [tx, ty] = sprigPoint(angle, length + 1)
        shadeDome(s, Mask.ellipse(tx, ty, broad ? 2 : 1.7, broad ? 1.3 : 1, angle), leaf, { bias: 0.12 })
      } else if (spec.leaves === 'needles') {
        for (let d = 3; d <= length + 1; d += 1) {
          const [x, y] = sprigPoint(angle, d)
          for (const side of [-1, 1]) {
            const reach = d > length - 1 ? 1.2 : 1.6
            const nx = x + Math.cos(a + side * 0.75) * reach, ny = y + Math.sin(a + side * 0.75) * reach
            s.paint(Math.floor(nx), Math.floor(ny), leaf, side < 0 ? 4 : 2)
          }
          if (d % 2 === 0) s.paint(Math.floor(x), Math.floor(y), leaf, 3)
        }
      } else {
        for (let d = 2.5; d <= length + 1; d += 0.7) {
          const [x, y] = sprigPoint(angle, d)
          const side = r() < 0.5 ? -1 : 1
          const spread = 0.8 + r() * 1.4
          const lx = x + Math.cos(a + side * 1.4) * spread, ly = y + Math.sin(a + side * 1.4) * spread
          s.paint(Math.floor(lx), Math.floor(ly), leaf, r() < 0.35 ? 4 : r() < 0.6 ? 2 : 3)
        }
      }
    }
    // Cut stems poking out below the tie, parallel, with pale cut ends.
    for (const [ox, oy, len] of [[-1, 0, 5], [0, 0, 6], [0, -1, 5], [1, -1, 4]] as const)
      for (let k = 0; k <= len; k++) s.paint(Math.floor(TIE[0] + ox + k * 0.75), Math.floor(TIE[1] + oy + k * 0.75), stem, k === len ? 5 : k % 2 === 0 ? 3 : 2)
    // Twine wrapped across the stems, with a bow.
    const twine = s.addRamp(spec.twine ?? TWINE)
    pix(s, 17, 17, ['....b', '...ab', '..ab.', '.ab..', 'ab...', 'b....'], { a: [twine, 4], b: [twine, 2] })
    pix(s, 21, 15, ['ab.', 'b.a', '.ab'], { a: [twine, 4], b: [twine, 3] })
    pix(s, 15, 22, ['ab', '.a'], { a: [twine, 3], b: [twine, 4] })
  }
}

// ---------------------------------------------------------------------------------------------------------------
// Ground spices: a small blue ceramic bowl heaped with powder, the whole spice beside it.

const CERAMIC = ramp('#6d8ab8', { lift: 0.32, drop: 0.28 })

function spiceBowl(s: Sprite, powder: Tones, seed: string, grain = 6): Mask {
  const { contents } = bowl(s, { cx: 15, rim: 19.2, rx: 8.4, ry: 2.9, depth: 6.8, bowl: CERAMIC, mound: 3.6, contents: powder, foot: true, bias: 0 })
  speckle(s, `${seed}-a`, contents, grain, 1, 2)
  speckle(s, `${seed}-b`, contents, grain, -1, 3)
  return contents
}

export const HERBS_SPICES_REFINED: ItemIcon[] = [
  {
    id: 'dried-basil',
    name: 'Dried Basil',
    grade: 1,
    paint: bundle({ leaf: ramp('#6c8a35', { lift: 0.3 }), leaves: 'broad', sprigs: [[196, 9], [214, 11], [232, 12], [250, 11], [268, 8]] }),
  },
  {
    id: 'dried-mint',
    name: 'Dried Mint',
    grade: 2,
    paint: bundle({ leaf: ramp('#5d9e6e', { lift: 0.32 }), leaves: 'pointed', twine: ramp('#c8463c'), sprigs: [[198, 9], [216, 11], [234, 12], [252, 11], [268, 8]] }),
  },
  {
    id: 'dried-rosemary',
    name: 'Dried Rosemary',
    grade: 3,
    paint: bundle({ leaf: ramp('#7f9f88', { lift: 0.34 }), stem: ramp('#6e5634'), leaves: 'needles', twine: ramp('#5a7fc0'), sprigs: [[198, 10], [222, 13], [246, 12], [268, 9]] }),
  },
  {
    id: 'dried-thyme',
    name: 'Dried Thyme',
    grade: 4,
    paint: bundle({ leaf: ramp('#8f9a58', { lift: 0.32 }), stem: ramp('#8a6c4a'), leaves: 'tiny', twine: ramp('#e8dcc0', { lift: 0.3 }), sprigs: [[196, 9], [210, 11], [224, 12], [238, 12], [252, 11], [266, 9]] }),
  },
  {
    id: 'ground-ginger',
    name: 'Ground Ginger',
    grade: 5,
    paint: (s) => {
      spiceBowl(s, ramp('#dca552', { lift: 0.34 }), 'ginger')
      // A ginger "hand" in front of the bowl: knobbly fingers, ring marks, one pale cut end.
      const root = s.addRamp(ramp('#cfa468', { lift: 0.34 }))
      const cut = s.addRamp(ramp('#f2dc8a', { lift: 0.4 }))
      pix(s, 18, 20, ['..ab...ab', '.abbc.abc', 'eabbbbbbc', 'ebbcbbbcc', '.cc.cccc.'], { a: [root, 5], b: [root, 3], c: [root, 2], e: [cut, 4] })
    },
  },
  {
    id: 'ground-pepper',
    name: 'Ground Pepper',
    grade: 6,
    paint: (s) => {
      const contents = spiceBowl(s, ramp('#55504c', { lift: 0.36 }), 'pepper', 10)
      speckle(s, 'pepper-light', contents, 6, 2, 2)
      const corn = s.addRamp(ramp('#3a302c', { lift: 0.35 }))
      for (const [x, y] of [[22, 24], [24, 22], [25, 25]] as const) {
        pix(s, x, y, ['ab', 'bc'], { a: [corn, 4], b: [corn, 3], c: [corn, 2] })
      }
    },
  },
  {
    id: 'ground-cinnamon',
    name: 'Ground Cinnamon',
    grade: 7,
    paint: (s) => {
      // Two rolled bark quills crossed behind the bowl: a pale curled edge runs along each one.
      const bark = s.addRamp(ramp('#8f4c26', { lift: 0.32 }))
      for (const [x0, y0, x1, y1] of [[15, 19, 25, 8], [21, 19, 13, 9]] as const) {
        const m = capsule(x0, y0, x1, y1, 1.2)
        shadeDome(s, m, bark, { relief: 1.2, contact: false })
        const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0))
        for (let k = 0; k <= n; k++) {
          const x = Math.round(x0 + ((x1 - x0) * k) / n), y = Math.round(y0 + ((y1 - y0) * k) / n)
          if (m.get(x, y)) s.paint(x, y, bark, k % 3 === 0 ? 3 : 4)
        }
        pix(s, Math.round(x1) - 1, Math.round(y1) - 1, ['ab', 'ca'], { a: [bark, 5], b: [bark, 3], c: [bark, 1] })
      }
      spiceBowl(s, ramp('#b0602f', { lift: 0.34 }), 'cinnamon')
    },
  },
  {
    id: 'saffron-threads',
    name: 'Saffron Threads',
    grade: 8,
    paint: (s) => {
      // A small white porcelain dish with a gold rim, seen from above so its floor shows, holding a loose tangle of
      // thin red threads with paler tips.
      const porcelain = ramp('#efeaf2', { lift: 0.4, drop: 0.2 })
      const { contents } = bowl(s, { cx: 16, rim: 18.8, rx: 9.6, ry: 5, depth: 6.6, bowl: porcelain, mound: 0, contents: porcelain, foot: true, bias: 0.25 })
      const gold = s.addRamp(GOLD)
      Mask.ellipse(16, 18.8, 9.6, 5).subtract(Mask.ellipse(16, 18.6, 8.6, 4.1)).each((x, y) => s.paint(x, y, gold, y < 18 ? 3 : x < 13 ? 5 : 4))
      const thread = s.addRamp(ramp('#c8241a', { lift: 0.34 }))
      const tip = s.addRamp(ramp('#f5a52a', { lift: 0.4 }))
      const r = rng('saffron')
      for (let i = 0; i < 15; i++) {
        let x = 10.5 + r() * 11, y = 15.5 + r() * 5.5
        const a = r() * Math.PI * 2, bend = (r() - 0.5) * 0.7
        const len = 4 + Math.floor(r() * 3)
        for (let k = 0; k < len; k++) {
          const px = Math.floor(x), py = Math.floor(y)
          if (contents.get(px, py)) s.paint(px, py, k === len - 1 ? tip : thread, k === len - 1 ? 4 : k % 2 === 0 ? 3 : 2)
          x += Math.cos(a + bend * k)
          y += Math.sin(a + bend * k) * 0.7
        }
      }
    },
  },
  {
    id: 'mandrake-powder',
    name: 'Mandrake Powder',
    grade: 9,
    paint: (s) => {
      // A round-bellied violet vial, sealed with wax, a root sigil on its tag.
      const body = Mask.ellipse(16, 20.4, 6.2, 6)
      const neck = box(14, 10, 17, 14)
      const g = glassVessel(s, { body, neck, fill: 17, contents: ramp('#9a5ad8', { lift: 0.42 }), glass: ramp('#c9b6e8', { lift: 0.42 }), bias: 0.1 })
      speckle(s, 'mandrake', g.contents, 8, 1, 2)
      const wax = s.addRamp(ramp('#4a2a6a', { lift: 0.36 }))
      pix(s, 13, 7, ['.aab.', 'aaabb', '.bbc.'], { a: [wax, 4], b: [wax, 3], c: [wax, 2] })
      const cork = s.addRamp(ramp('#b9875a'))
      for (let x = 14; x <= 17; x++) s.paint(x, 10, cork, x < 16 ? 4 : 2)
      const tag = s.addRamp(ramp('#efe3c4', { lift: 0.4 }))
      const ink = s.addRamp(ramp('#5a3a2a'))
      pix(s, 13, 19, ['aaaaa', 'abaca', 'aabaa', 'abbba', 'babab'], { a: [tag, 4], b: [ink, 3], c: [ink, 3] })
      shine(s, g.shell, { from: 15, to: 24, skip: box(13, 19, 17, 23) })
      halo(s, 16, 18.5, 10.5, 10.5, '#c08cff', 80)
      motes(s, [[23, 6], [9, 12], [25, 18]], '#e6ccff', 200)
    },
  },
  {
    id: 'phoenix-spice',
    name: 'Phoenix Spice',
    grade: 10,
    paint: (s) => {
      // A squat jar of glowing ember powder: red at the bottom, gold at the top, flames licking above the lid.
      const body = Mask.ellipse(16, 20.6, 7.6, 5.8).union(box(10, 15, 21, 18))
      const neck = box(11, 13, 20, 14)
      const ember = [s.addRamp(ramp('#d42a1a', { lift: 0.4 })), s.addRamp(ramp('#f26a1a', { lift: 0.45 })), s.addRamp(ramp('#ffb52e', { lift: 0.5 }))]
      const g = glassVessel(s, { body, neck, fill: 15, contents: ramp('#f26a1a', { lift: 0.45 }), glass: ramp('#ffd9b0', { lift: 0.4 }), bias: 0.15 })
      g.contents.each((x, y) => {
        const band = y > 22 ? 0 : y > 18 ? 1 : 2
        s.paint(x, y, ember[band] ?? 0, s.toneAt(x, y))
      })
      speckle(s, 'phoenix', g.contents, 10, 1, 2)
      lid(s, 10, 11, 21, 12, GOLD, { ridges: true })
      const flame = [s.addRamp(ramp('#ff7a1a', { lift: 0.5 })), s.addRamp(ramp('#ffd04a', { lift: 0.55 }))]
      const f0 = flame[0] ?? 0, f1 = flame[1] ?? 0
      pix(s, 11, 4, ['...a......', '..ab...a..', '..abb.aba.', '.abcbaabb.', '.abccbbcba', 'abbccccbba'], { a: [f0, 3], b: [f0, 4], c: [f1, 5] })
      shine(s, g.shell, { from: 14, to: 24 })
      halo(s, 16, 15, 11, 12, '#ff9a3a', 85)
      rays(s, 16, 8, 6, 9, [-90, -60, -120], '#ffcf5a', 140)
      motes(s, [[9, 9], [23, 5], [24, 14]], '#ffd27a', 220)
    },
  },
]
