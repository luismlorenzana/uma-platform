// Herbs & Spices (Herb Garden, M.ATK family): uma-rpg docs/design/items.md#herbs--spices.
import { ramp } from '../color.ts'
import { rng } from '../rng.ts'
import { Mask, shadeDome } from '../shape.ts'
import type { Sprite } from '../sprite.ts'
import { along, curvePixels, front, stroke, type Pt } from './grains.ts'
import type { ItemIcon } from './types.ts'

/** A leaf from its base along heading `deg`: an ellipse `len` long and `wid` wide, with a midrib. Returns its mask. */
function herbLeaf(s: Sprite, id: number, base: Pt, deg: number, len: number, wid: number, rib = true): Mask {
  const [cx, cy] = along(base[0], base[1], deg, len / 2)
  const m = Mask.ellipse(cx, cy, wid / 2, len / 2, deg)
  front(s, () => {
    shadeDome(s, m, id, { contact: false, bias: 0.08 })
    if (rib) for (const [x, y] of curvePixels([base, along(base[0], base[1], deg, len * 0.8)])) if (m.get(x, y) && s.toneAt(x, y) > 2) s.shift(x, y, -1)
  })
  return m
}

/** A tube along a Bézier curve whose half-width is `radius(t)` (t from 0 to 1 along the curve). */
function tube(ctrl: readonly Pt[], radius: (t: number) => number): Mask {
  const px = curvePixels(ctrl)
  const m = new Mask()
  px.forEach(([x, y], i) => m.union(Mask.circle(x + 0.5, y + 0.5, radius(i / Math.max(1, px.length - 1)))))
  return m
}

/** Notches every other edge pixel of a mask out of the sprite, for a serrated edge. */
function serrate(s: Sprite, m: Mask): void {
  m.each((x, y) => {
    const edge = !m.get(x - 1, y) || !m.get(x + 1, y) || !m.get(x, y - 1) || !m.get(x, y + 1)
    if (edge && (x + y) % 2 === 0) s.mat[y * s.w + x] = -1
  })
}

function basil(s: Sprite): void {
  const stemId = s.addRamp(ramp('#5c8f2e'))
  const leafId = s.addRamp(ramp('#3aa845', { lift: 0.34, hueShift: 10 }))
  stroke(s, stemId, [[16, 26], [16, 18], [16, 6]], 3)
  // broad, cupped leaves that droop outward in pairs
  herbLeaf(s, leafId, [15, 19], -118, 10, 6.4)
  herbLeaf(s, leafId, [17, 18], 116, 10, 6.4)
  herbLeaf(s, leafId, [15, 12], -100, 7.5, 5)
  herbLeaf(s, leafId, [17, 11], 98, 7.5, 5)
  herbLeaf(s, leafId, [16, 8], -28, 5.5, 4)
  herbLeaf(s, leafId, [16, 8], 30, 5, 3.6)
}

function mint(s: Sprite): void {
  const stemId = s.addRamp(ramp('#7a5a7a'))
  const leafId = s.addRamp(ramp('#62c79a', { hueShift: 12, lift: 0.3 }))
  stroke(s, stemId, [[16, 26], [16, 16], [16, 5]], 3)
  // pointed, serrated leaves that reach upward, with deep side veins
  for (const [b, deg, len, wid] of [
    [[15, 22], -62, 10, 5.4],
    [[17, 21], 60, 10, 5.4],
    [[15, 14], -48, 8, 4.6],
    [[17, 13], 46, 8, 4.6],
    [[16, 8], -14, 5.5, 3.6],
    [[16, 8], 18, 5, 3.4],
  ] as const) {
    const m = herbLeaf(s, leafId, b, deg, len, wid)
    serrate(s, m)
    if (len > 6)
      for (const f of [0.35, 0.6])
        for (const side of [-1, 1]) {
          const [vx, vy] = along(b[0], b[1], deg, len * f)
          for (const [x, y] of curvePixels([[vx, vy], along(vx, vy, deg + side * 45, wid * 0.45)])) if (m.get(x, y) && s.toneAt(x, y) > 2) s.shift(x, y, -1)
        }
  }
}

function rosemary(s: Sprite): void {
  const stemId = s.addRamp(ramp('#7a5a3a'))
  const needleId = s.addRamp(ramp('#3f7350', { hueShift: 10, lift: 0.34 }))
  const sprig = (ctrl: readonly Pt[], from: number) => {
    const px = stroke(s, stemId, ctrl, 3)
    px.forEach(([x, y], i) => {
      if (i < from) return
      const next = px[Math.min(px.length - 1, i + 1)] ?? [x, y]
      const head = (Math.atan2(next[0] - x, -(next[1] - y)) * 180) / Math.PI
      const len = i > px.length - 4 ? 2 : 3.4
      for (const side of [-1, 1]) {
        const tones = side < 0 ? [4, 4, 5] : [3, 2, 2]
        curvePixels([[x, y], along(x, y, head + side * 42, len)]).forEach(([nx, ny], k) => {
          if (k > 0) s.paint(nx, ny, needleId, tones[Math.min(2, k - 1)] ?? 3)
        })
      }
    })
  }
  front(s, () => sprig([[18, 22], [21, 16], [24, 11]], 1))
  front(s, () => sprig([[10, 26], [13, 16], [19, 4]], 3))
}

function thyme(s: Sprite): void {
  const stemId = s.addRamp(ramp('#8a6a4a'))
  const leafId = s.addRamp(ramp('#78a85a', { hueShift: 8, lift: 0.34 }))
  const tieId = s.addRamp(ramp('#d9c27a'))
  // a tied bunch of wiry, branching stems dotted with tiny leaf pairs
  const stems: Pt[][] = [
    [[15, 21], [11, 14], [8, 7]],
    [[16, 21], [15, 12], [15, 3]],
    [[17, 21], [21, 13], [24, 7]],
    [[11, 14], [13, 9], [12, 6]],
    [[15, 12], [18, 8], [20, 4]],
  ]
  for (const st of stems) stroke(s, stemId, st, 3)
  for (const st of stems) {
    const px = curvePixels(st)
    px.forEach(([x, y], i) => {
      const t = i / px.length
      if (t < 0.25 || i % 2 === 1) return
      for (const side of [-1, 1]) if (!s.filled(x + side, y)) s.paint(x + side, y, leafId, side < 0 ? 4 : 3)
    })
    const [tx, ty] = px[px.length - 1] ?? [0, 0]
    s.paint(tx, ty - 1, leafId, 5)
    s.paint(tx, ty, leafId, 4)
  }
  for (const [x0, x1] of [[15, 14], [16, 16], [17, 18]] as const) stroke(s, stemId, [[x0, 23], [x1, 26]], x0 < 16 ? 3 : 2)
  front(s, () => {
    for (let x = 14; x <= 18; x++) {
      s.paint(x, 21, tieId, x < 16 ? 4 : 3)
      s.paint(x, 22, tieId, x < 16 ? 3 : 2)
    }
  })
}

function ginger(s: Sprite): void {
  const id = s.addRamp(ramp('#d6ae74', { hueShift: 8 }))
  const tipId = s.addRamp(ramp('#e8a0a0'))
  const knobs: [number, number, number, number, number][] = [
    [12, 16, 2.6, 4, -35],
    [20, 14.5, 2.6, 4.2, 30],
    [24, 19, 2.4, 3.2, 70],
    [16, 20, 8.6, 4, -6],
    [9, 21, 3.4, 3, 10],
  ]
  for (const [x, y, rx, ry, rot] of knobs) front(s, () => shadeDome(s, Mask.ellipse(x, y, rx, ry, rot), id, { contact: false }), 2)
  for (const [x, y] of [[11, 13], [21, 11]] as const) {
    s.paint(x, y, tipId, 4)
    s.paint(x + 1, y, tipId, 3)
  }
  const body = Mask.ellipse(16, 20, 8.6, 4, -6)
  body.each((x, y) => {
    if ((x === 13 || x === 19) && s.toneAt(x, y) > 2) s.shift(x, y, -1)
  })
}

function peppercorn(s: Sprite): void {
  const blackId = s.addRamp(ramp('#4a3428', { lift: 0.38, hueShift: 10 }))
  const redId = s.addRamp(ramp('#b8333a', { lift: 0.4 }))
  const r = rng('peppercorn')
  // a heap of black corns, two of them red, stacked in rows from the top down
  const corns: [number, number, boolean][] = [
    [16, 12.5, false],
    [13.5, 16.2, false],
    [18.5, 16.2, true],
    [11, 19.9, false],
    [16, 19.9, false],
    [21, 19.9, false],
    [8.5, 23.6, true],
    [13.5, 23.6, false],
    [18.5, 23.6, false],
    [23.5, 23.6, false],
  ]
  for (const [x0, y, red] of corns) {
    const m = Mask.circle(x0 + (r() - 0.5) * 0.6, y, 2.5)
    const id = red ? redId : blackId
    front(s, () => {
      shadeDome(s, m, id, { contact: false, bias: 0.06 })
      // wrinkles: a couple of dark pits in the lit part of each corn
      const cells: [number, number][] = []
      m.each((cx, cy) => {
        if (s.toneAt(cx, cy) >= 3) cells.push([cx, cy])
      })
      for (let i = 0; i < 2 && cells.length; i++) {
        const [cx, cy] = cells.splice(Math.floor(r() * cells.length), 1)[0] ?? [0, 0]
        s.shift(cx, cy, -1)
      }
    })
  }
}

function cinnamon(s: Sprite): void {
  const barkId = s.addRamp(ramp('#a8582c', { hueShift: 8 }))
  const twineId = s.addRamp(ramp('#e2cf96'))
  // quills of rolled bark on the 45° pixel diagonal: x + y is constant across a quill and x − y runs along it.
  // Each is lit on its upper-left side; its cut end shows the bark scrolled round a dark hollow.
  const quill = (c: number, from: number, to: number) => {
    const across = [4, 3, 2, 1]
    const face = [4, 1, 5, 2]
    for (let x = 0; x < 32; x++)
      for (let y = 0; y < 32; y++) {
        const k = x + y - c + 2, j = x - y
        if (k < 0 || k > 3 || j < from || j > to) continue
        s.paint(x, y, barkId, j >= to - 1 ? (face[k] ?? 3) : j <= from ? 2 : (across[k] ?? 3) - (k === 1 && (j - from) % 6 === 3 ? 1 : 0))
      }
  }
  for (const [c, from, to] of [[27, -12, 14], [32, -16, 15], [37, -15, 11]] as const) front(s, () => quill(c, from, to))
  front(s, () => {
    for (let x = 0; x < 32; x++)
      for (let y = 0; y < 32; y++) {
        const j = x - y, k = x + y
        if ((j === -3 || j === -2) && k >= 25 && k <= 41) s.paint(x, y, twineId, j === -3 ? 4 : 2)
      }
  })
}

function saffron(s: Sprite): void {
  const leafId = s.addRamp(ramp('#5f9a3a'))
  const petalId = s.addRamp(ramp('#9b6fd0', { hueShift: 8, lift: 0.32 }))
  const threadId = s.addRamp(ramp('#e0401f', { lift: 0.35 }))
  const stamenId = s.addRamp(ramp('#f2c230'))
  stroke(s, leafId, [[16, 26], [16, 16]], 3)
  stroke(s, leafId, [[15, 26], [11, 18], [10, 13]], 4)
  stroke(s, leafId, [[17, 26], [21, 19], [22, 14]], 2)
  // back petals, then the cup in front
  for (const [deg, len] of [[-40, 7], [40, 7], [0, 8]] as const) herbLeaf(s, petalId, [16, 15], deg, len, 4.6, false)
  stroke(s, stamenId, [[16, 13], [16, 9]], 4)
  for (const end of [[12, 4], [16, 3], [20, 4]] as const) stroke(s, threadId, [[16, 12], [(16 + end[0]) / 2, 8], end], (t) => (t < 0.7 ? 3 : 4))
  for (const [deg, len] of [[-20, 7], [20, 7]] as const) herbLeaf(s, petalId, [16, 16], deg, len, 4.4, false)
}

function mandrake(s: Sprite): void {
  const rootId = s.addRamp(ramp('#dcc3a6', { hueShift: 18, lift: 0.3 }))
  const leafId = s.addRamp(ramp('#3f7a52', { hueShift: 16 }))
  const faceId = s.addRamp(ramp('#5a2f62'))
  for (const [deg, len, wid] of [[-56, 7.4, 4.4], [56, 7.4, 4.4], [-26, 9, 4.6], [26, 9, 4.6], [0, 9, 4.4]] as const) herbLeaf(s, leafId, [16, 11], deg, len, wid)
  // a forked root with arms and legs; its face is only hollows in the skin
  const body = Mask.ellipse(16, 15.8, 5, 6)
  const legs = Mask.polygon([[12.5, 19], [13, 26], [14.8, 26], [16, 21.5], [17.2, 26], [19, 26], [19.5, 19]])
  const arms = Mask.polygon([[11.5, 14], [8.6, 19], [9.8, 20], [12.5, 17]]).union(Mask.polygon([[20.5, 14], [23.4, 19], [22.2, 20], [19.5, 17]]))
  front(s, () => shadeDome(s, body.union(legs, arms), rootId, { contact: false }))
  for (const [x, y, t] of [[14, 14, 1], [14, 15, 2], [18, 14, 1], [18, 15, 2], [16, 17, 2], [15, 18, 1], [16, 18, 1], [17, 18, 2]] as const) s.paint(x, y, faceId, t)
  // rootlets at the hands and feet
  stroke(s, rootId, [[9, 20], [9, 21]], 2)
  stroke(s, rootId, [[23, 20], [24, 21]], 2)
  stroke(s, rootId, [[13, 26], [12, 27]], 2)
  stroke(s, rootId, [[18, 26], [19, 27]], 2)
}

function phoenixPepper(s: Sprite): void {
  const id = s.addRamp(ramp('#e6361c', { lift: 0.48, hueShift: 14 }))
  const outerId = s.addRamp(ramp('#ff7a1a', { lift: 0.55, hueShift: 10 }))
  const innerId = s.addRamp(ramp('#ffd84a', { lift: 0.6, hueShift: 6 }))
  // a hooked chili, glossy, tapering to a point
  const body = tube([[15, 11], [20, 15], [19, 23], [11, 25]], (t) => 0.6 + 3.4 * (1 - t) ** 0.7)
  shadeDome(s, body, id, { relief: 1.3 })
  for (const [x, y] of curvePixels([[14, 13], [16, 17], [15, 21]])) if (body.get(x, y) && s.toneAt(x, y) >= 3) s.paint(x, y, id, 5)
  // instead of a stem, flames: three tongues licking up, yellow at the core
  const tongue = (x: number, y: number, h: number, lean: number) =>
    Mask.polygon([[x - 2.4, y], [x - 1.8, y - h * 0.5], [x + lean, y - h], [x + 1.4, y - h * 0.45], [x + 2.4, y]])
  const outer = tongue(11.5, 12, 6, -2.2).union(tongue(16, 12, 9, 1), tongue(20, 12.5, 6.5, 2.2), Mask.ellipse(15.8, 11.5, 5, 2.2))
  const inner = tongue(16, 12, 6, 0.6).union(tongue(12.5, 12, 3.5, -1.2), tongue(19.2, 12.4, 3.8, 1.2))
  front(s, () => {
    outer.each((x, y) => s.paint(x, y, outerId, y < 6 ? 4 : 3))
    inner.each((x, y) => s.paint(x, y, innerId, y < 8 ? 5 : 4))
  })
}

export const HERBS_SPICES: ItemIcon[] = [
  { id: 'basil', name: 'Basil', grade: 1, paint: basil },
  { id: 'mint', name: 'Mint', grade: 2, paint: mint },
  { id: 'rosemary', name: 'Rosemary', grade: 3, paint: rosemary },
  { id: 'thyme', name: 'Thyme', grade: 4, paint: thyme },
  { id: 'ginger', name: 'Ginger', grade: 5, paint: ginger },
  { id: 'peppercorn', name: 'Peppercorn', grade: 6, paint: peppercorn },
  { id: 'cinnamon', name: 'Cinnamon', grade: 7, paint: cinnamon },
  { id: 'saffron', name: 'Saffron', grade: 8, paint: saffron },
  { id: 'mandrake', name: 'Mandrake', grade: 9, paint: mandrake },
  { id: 'phoenix-pepper', name: 'Phoenix Pepper', grade: 10, paint: phoenixPepper },
]

