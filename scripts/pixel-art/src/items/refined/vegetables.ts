// Refined Vegetables (Pantry, DEF family): uma-rpg docs/design/items.md#vegetables. Cut vegetables lie on a wooden
// cutting board (coins, cubes, shreds, rings, slices, spears); purées are served in bowls, the legendary ones gilded.
import { ramp } from '../../color.ts'
import { rng } from '../../rng.ts'
import { Mask, shadeDome } from '../../shape.ts'
import type { Sprite } from '../../sprite.ts'
import type { ItemIcon } from '../types.ts'
import { board, bowl, capsule, GOLD, halo, motes, pix, rays, speckle, type Tones, WOOD } from './pantry-kit.ts'

/** A round slice seen from above: a thin dark side under the cut face; `core` paints a pale center ring. */
function coin(s: Sprite, cx: number, cy: number, rx: number, ry: number, id: number, core?: number): Mask {
  Mask.ellipse(cx, cy + 1, rx, ry).each((x, y) => s.paint(x, y, id, 1))
  const face = Mask.ellipse(cx, cy, rx, ry)
  face.each((x, y) => {
    const lit = (x + 0.5 - cx) / rx + (y + 0.5 - cy) / ry
    s.paint(x, y, id, lit < -0.7 ? 4 : lit < 0.7 ? 3 : 2)
  })
  if (core !== undefined) {
    Mask.ellipse(cx, cy, rx * 0.55, ry * 0.55).each((x, y) => s.paint(x, y, core, 4))
    s.paint(Math.floor(cx - 0.5), Math.floor(cy - 0.5), core, 5)
  }
  return face
}

/** A small cube: lit top, base left face, shadowed right face. */
function cube(s: Sprite, x: number, y: number, n: number, id: number): void {
  for (let dy = 0; dy < n; dy++)
    for (let dx = 0; dx < n; dx++) {
      const tone = dy === 0 ? (dx === 0 ? 5 : 4) : dx >= n - 1 ? 2 : 3
      s.paint(x + dx, y + dy, id, tone)
    }
}

/** A ring slice (bell pepper): a glossy lobed band, pale on its inner wall, with a hole showing the board. */
function ring(s: Sprite, cx: number, cy: number, rx: number, ry: number, id: number): void {
  const lobed = (px: number, py: number, k: number) => {
    const a = Math.atan2((py - cy) / ry, (px - cx) / rx)
    const r = Math.hypot((px - cx) / rx, (py - cy) / ry)
    return r <= k * (1 + 0.07 * Math.cos(4 * a))
  }
  const outer = Mask.from((px, py) => lobed(px, py, 1))
  const hole = Mask.from((px, py) => lobed(px, py, 0.52))
  Mask.from((px, py) => lobed(px, py - 0.9, 1)).subtract(outer).each((x, y) => s.paint(x, y, id, 2))
  outer.subtract(hole)
  outer.each((x, y) => {
    const inner = hole.get(x - 1, y) || hole.get(x + 1, y) || hole.get(x, y - 1) || hole.get(x, y + 1)
    const lit = (x + 0.5 - cx) / rx + (y + 0.5 - cy) / ry
    s.paint(x, y, id, inner ? (lit > 0 ? 5 : 3) : lit < -0.5 ? 5 : lit < 0.6 ? 4 : 3)
  })
  hole.each((x, y) => s.shift(x, y, -1))
}

function puree(s: Sprite, o: { bowl: Tones; puree: Tones; swirl?: boolean; foot?: boolean; seed: string }): { contents: Mask; body: Mask; bowlId: number } {
  const parts = bowl(s, { cx: 16, rim: 17.8, rx: 9.2, ry: 3.6, depth: 7, bowl: o.bowl, mound: 1.4, contents: o.puree, foot: o.foot ?? true, bias: -0.04 })
  if (o.swirl ?? true) {
    const id = s.mat[17 * 32 + 16] ?? 0
    for (const [x, y, d] of [[13, 16, 1], [14, 15, 1], [15, 15, 1], [16, 15, 1], [17, 16, 1], [17, 17, -1], [16, 17, -1], [15, 17, -1], [14, 16, -1], [18, 15, 1], [19, 16, -1], [12, 17, -1]] as const)
      if (parts.contents.get(x, y)) s.paint(x, y, id, d > 0 ? 4 : 2)
  }
  speckle(s, o.seed, parts.contents, 3, 1, 3)
  return parts
}

export const VEGETABLES_REFINED: ItemIcon[] = [
  {
    id: 'chopped-carrot',
    name: 'Chopped Carrot',
    grade: 1,
    paint: (s) => {
      board(s)
      const carrot = s.addRamp(ramp('#ef7d22', { lift: 0.34 }))
      const core = s.addRamp(ramp('#f7a640', { lift: 0.4 }))
      for (const [x, y] of [[11.2, 15.4], [17.4, 14.8], [9.8, 20.2], [15.6, 19.6], [21.2, 19.2]] as const) coin(s, x, y, 3, 2.1, carrot, core)
      // The leafy top that was cut off.
      const leaf = s.addRamp(ramp('#5fae3c'))
      pix(s, 19, 22, ['...a.a', '..ab.a', 'cccb..', 'ccc...'], { a: [leaf, 4], b: [leaf, 2], c: [carrot, 3] })
    },
  },
  {
    id: 'diced-potato',
    name: 'Diced Potato',
    grade: 2,
    paint: (s) => {
      board(s)
      const flesh = s.addRamp(ramp('#ecd48a', { lift: 0.36 }))
      const skin = s.addRamp(ramp('#a9733f'))
      const spots: readonly (readonly [number, number])[] = [[10, 14], [14, 13], [18, 14], [12, 17], [16, 17], [20, 17], [9, 20], [13, 20], [17, 20], [21, 20]]
      spots.forEach(([x, y], i) => {
        cube(s, x, y, 4, flesh)
        if (i % 3 === 1) for (let k = 0; k < 4; k++) s.paint(x + 3, y + k, skin, 3)
      })
    },
  },
  {
    id: 'shredded-cabbage',
    name: 'Shredded Cabbage',
    grade: 3,
    paint: (s) => {
      board(s)
      const green = s.addRamp(ramp('#a9d47a', { lift: 0.4 }))
      const heap = Mask.ellipse(14.6, 18.6, 7.8, 4.8)
      shadeDome(s, heap, green, { relief: 0.9, bias: 0.06 })
      // Thin curling strands, light and dark.
      const r = rng('cabbage')
      for (let i = 0; i < 16; i++) {
        const x = 8 + Math.floor(r() * 14), y = 14 + Math.floor(r() * 9)
        const light = r() < 0.55
        for (let k = 0; k < 3; k++) if (heap.get(x + k, y + (k === 1 ? -1 : 0))) s.paint(x + k, y + (k === 1 ? -1 : 0), green, light ? 5 : 2)
      }
      // A few loose strands on the board.
      for (const [x, y, t] of [[20, 22, 4], [21, 21, 5], [22, 21, 4], [23, 22, 3], [18, 23, 4], [19, 23, 3]] as const) s.paint(x, y, green, t)
    },
  },
  {
    id: 'diced-onion',
    name: 'Diced Onion',
    grade: 4,
    paint: (s) => {
      board(s)
      // Half an onion at the back, its cut face showing the rings.
      const skin = s.addRamp(ramp('#b0703a'))
      const flesh = s.addRamp(ramp('#efe4f0', { lift: 0.4, drop: 0.2 }))
      Mask.ellipse(19.6, 15.4, 4.4, 3.4).each((x, y) => s.paint(x, y, skin, y > 15 ? 2 : 3))
      const face = Mask.ellipse(19.6, 14.6, 3.8, 2.8)
      face.each((x, y) => {
        const d = Math.hypot((x + 0.5 - 19.6) / 3.8, (y + 0.5 - 14.6) / 2.8)
        s.paint(x, y, flesh, Math.floor(d * 4) % 2 === 0 ? 4 : 3)
      })
      s.paint(19, 14, flesh, 5)
      const dice = s.addRamp(ramp('#e8dcef', { lift: 0.42, drop: 0.22 }))
      for (const [x, y] of [[9, 17], [12, 16], [15, 18], [10, 20], [13, 20], [17, 21], [20, 20], [8, 22], [15, 22], [11, 23]] as const) cube(s, x, y, 2, dice)
    },
  },
  {
    id: 'tomato-puree',
    name: 'Tomato Purée',
    grade: 5,
    paint: (s) => {
      puree(s, { bowl: WOOD, puree: ramp('#d8341f', { lift: 0.32 }), seed: 'tomato' })
      // A basil leaf on top.
      const leaf = s.addRamp(ramp('#4f9a43'))
      shadeDome(s, Mask.ellipse(20, 15.2, 2.2, 1.2, -25), leaf, { bias: 0.12, contact: false })
    },
  },
  {
    id: 'sliced-bell-pepper',
    name: 'Sliced Bell Pepper',
    grade: 6,
    paint: (s) => {
      board(s)
      const red = s.addRamp(ramp('#d8302a', { lift: 0.32 }))
      const yellow = s.addRamp(ramp('#f2c22a', { lift: 0.36 }))
      const green = s.addRamp(ramp('#4f9a3a', { lift: 0.34 }))
      ring(s, 11.6, 16.2, 4, 2.9, green)
      ring(s, 19.4, 15.6, 4, 2.9, yellow)
      ring(s, 14.8, 20.8, 4.2, 3, red)
    },
  },
  {
    id: 'sliced-eggplant',
    name: 'Sliced Eggplant',
    grade: 7,
    paint: (s) => {
      board(s)
      const skin = s.addRamp(ramp('#4a2a62', { lift: 0.3 }))
      const flesh = s.addRamp(ramp('#ece0b8', { lift: 0.36, drop: 0.2 }))
      const seed = s.addRamp(ramp('#b49a5a'))
      for (const [cx, cy] of [[11.8, 16.4], [19, 15.6], [14.6, 20.8]] as const) {
        Mask.ellipse(cx, cy + 0.9, 4, 2.9).each((x, y) => s.paint(x, y, skin, 2))
        Mask.ellipse(cx, cy, 4, 2.9).each((x, y) => s.paint(x, y, skin, x + 0.5 < cx && y + 0.5 < cy ? 4 : 3))
        const face = Mask.ellipse(cx, cy, 3.1, 2.1)
        shadeDome(s, face, flesh, { contact: false, relief: 0.4, bias: 0.15 })
        for (const [dx, dy] of [[-1, -1], [1, -1], [-2, 0], [1, 1], [-1, 1]] as const) s.paint(Math.floor(cx) + dx, Math.floor(cy) + dy, seed, 3)
      }
    },
  },
  {
    id: 'trimmed-asparagus',
    name: 'Trimmed Asparagus',
    grade: 8,
    paint: (s) => {
      board(s)
      const green = s.addRamp(ramp('#5c9e34', { lift: 0.3 }))
      const tip = s.addRamp(ramp('#6e6a3a', { lift: 0.3 }))
      const cut = s.addRamp(ramp('#d8e6a8', { lift: 0.4 }))
      for (let i = 0; i < 3; i++) {
        const x0 = 7.6 + (i % 2), y0 = 15.6 + i * 3.6, x1 = 19.4 + (i % 2), y1 = 14 + i * 3.6
        const m = capsule(x0, y0, x1, y1, 1.15)
        // Lit upper edge, shadowed lower edge, a few scale leaves, a tapered bud and a pale trimmed end.
        m.each((x, y) => s.paint(x, y, green, !m.get(x, y - 1) ? 4 : !m.get(x, y + 1) ? 2 : 3))
        for (const k of [0.35, 0.62]) s.paint(Math.round(x0 + (x1 - x0) * k), Math.round(y0 + (y1 - y0) * k) - 1, tip, 3)
        const bx = Math.round(x1) + 1, by = Math.round(y1) - 1
        pix(s, bx, by, ['ab..', 'bccd', 'cd..'], { a: [tip, 4], b: [tip, 3], c: [tip, 2], d: [tip, 3] })
        for (let dy = -1; dy <= 1; dy++) if (m.get(Math.round(x0) - 1, Math.round(y0) + dy)) s.paint(Math.round(x0) - 1, Math.round(y0) + dy, cut, dy < 1 ? 5 : 4)
      }
      // The woody ends that were trimmed off.
      const wood = s.addRamp(ramp('#a8a46a'))
      pix(s, 21, 23, ['ab', '.a'], { a: [wood, 4], b: [wood, 2] })
    },
  },
  {
    id: 'golden-carrot-puree',
    name: 'Golden Carrot Purée',
    grade: 9,
    paint: (s) => {
      puree(s, { bowl: GOLD, puree: ramp('#ffaa2a', { lift: 0.45 }), seed: 'golden-carrot' })
      const leaf = s.addRamp(ramp('#8fcf4a', { lift: 0.4 }))
      pix(s, 18, 12, ['a.a', '.b.', '.b.'], { a: [leaf, 4], b: [leaf, 3] })
      halo(s, 16, 17, 11, 10, '#ffd34d', 90)
      motes(s, [[10, 11], [23, 7], [25, 16]], '#fff1a6', 210)
    },
  },
  {
    id: 'pumpkin-puree',
    name: 'Pumpkin Purée',
    grade: 10,
    paint: (s) => {
      // A royal-purple porcelain bowl with a gold rim and foot, a gold crown on its front.
      const { body } = puree(s, { bowl: ramp('#5a3a9a', { lift: 0.36, drop: 0.3 }), puree: ramp('#f2861e', { lift: 0.42 }), seed: 'pumpkin' })
      const gold = s.addRamp(GOLD)
      Mask.ellipse(16, 18, 9, 3.4).each((x, y) => {
        if (y >= 18 && !body.get(x, y + 1)) return
        if (y >= 19 && y <= 20 && !Mask.ellipse(16, 18, 7.8, 2.4).get(x, y)) s.paint(x, y, gold, x < 14 ? 5 : 4)
      })
      for (let x = 11; x <= 20; x++) if (body.get(x, 26)) s.paint(x, 26, gold, 3)
      for (let x = 10; x <= 21; x++) if (body.get(x, 25)) s.paint(x, 25, gold, x < 14 ? 4 : 3)
      pix(s, 14, 21, ['a.a.a', 'abbba', '.bbb.'], { a: [gold, 5], b: [gold, 4] })
      const seed = s.addRamp(ramp('#f4e6b8', { lift: 0.4 }))
      pix(s, 13, 15, ['a..', '..a', '.a.'], { a: [seed, 5] })
      halo(s, 16, 17, 11.5, 10.5, '#ffb84d', 85)
      rays(s, 16, 14, 8, 11, [-90, -55, -125], '#ffe27a', 130)
    },
  },
]
