// Mushrooms (Mushroom Cave, M.DEF family): uma-rpg docs/design/items.md#mushrooms. Freshly picked, standing on their stems.
import { ramp } from '../color.ts'
import { rng } from '../rng.ts'
import { Mask, shadeDome, type Point } from '../shape.ts'
import type { Sprite } from '../sprite.ts'
import type { ItemIcon } from './types.ts'

/** Shades a mask as an upright cylinder: lit just left of center, darkening to the right edge. */
function shadeStem(s: Sprite, mask: Mask, id: number | ((x: number, y: number) => number), shine = true): void {
  for (let y = 0; y < mask.h; y++) {
    let x0 = mask.w, x1 = -1
    for (let x = 0; x < mask.w; x++)
      if (mask.get(x, y)) {
        x0 = Math.min(x0, x)
        x1 = Math.max(x1, x)
      }
    if (x1 < 0) continue
    const w = x1 - x0 + 1
    for (let x = x0; x <= x1; x++) {
      if (!mask.get(x, y)) continue
      const p = (x - x0 + 0.5) / w
      const tone = w <= 2 ? (x === x0 ? 4 : 2) : p < 0.2 ? 3 : p < 0.45 ? (shine && w >= 5 ? 5 : 4) : p < 0.72 ? 3 : p < 0.9 ? 2 : 1
      s.paint(x, y, typeof id === 'number' ? id : id(x, y), tone)
    }
  }
}

/** A 1 px line between two points. */
function stroke(s: Sprite, a: Point, b: Point, id: number, tone: number, keep?: (x: number, y: number) => boolean): void {
  const steps = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) * 2))
  for (let k = 0; k <= steps; k++) {
    const x = Math.floor(a[0] + ((b[0] - a[0]) * k) / steps)
    const y = Math.floor(a[1] + ((b[1] - a[1]) * k) / steps)
    if (keep && !keep(x, y)) continue
    s.paint(x, y, id, tone)
  }
}

/** Pixels of `mask` at or above row `y` (for flat-bottomed caps). */
function above(mask: Mask, y: number): Mask {
  return mask.subtract(Mask.from((_px, py) => py > y))
}

function buttonMushroom(s: Sprite, cx: number, top: number, w: number, h: number, stemH: number): void {
  const capId = s.addRamp(ramp('#efe7da', { lift: 0.35, drop: 0.2, hueShift: 6 }))
  const stemId = s.addRamp(ramp('#e2d6c2', { lift: 0.3, drop: 0.2 }))
  const capBottom = top + h
  const stem = Mask.from((px, py) => py > capBottom - 1 && py < capBottom + stemH && Math.abs(px - cx) < w * 0.24 + (py - capBottom) * 0.12)
  shadeStem(s, stem, stemId)
  const cap = above(Mask.ellipse(cx, top + h * 0.95, w / 2, h), capBottom)
  shadeDome(s, cap, capId, { contact: false })
  // The closed cap curls under along its bottom row.
  for (let x = Math.floor(cx - w / 2 + 1); x < cx + w / 2 - 1; x++) if (cap.get(x, Math.floor(capBottom))) s.shift(x, Math.floor(capBottom), -1)
}

function shiitake(s: Sprite): void {
  const capId = s.addRamp(ramp('#7c4a2a', { lift: 0.28, hueShift: 6 }))
  const crackId = s.addRamp(ramp('#e8d2b0', { lift: 0.3 }))
  const gillId = s.addRamp(ramp('#efe2c8', { lift: 0.3, drop: 0.2 }))
  const stemId = s.addRamp(ramp('#d9c29c', { lift: 0.3, drop: 0.22 }))
  shadeStem(s, Mask.polygon([[14.2, 15], [18.2, 15], [17.6, 25.6], [14.6, 25.6]]), stemId)
  // Gills under the cap, seen from slightly below.
  const gills = Mask.ellipse(16, 15.2, 9.4, 2.4).subtract(Mask.from((_x, y) => y < 15))
  gills.each((x, y) => s.paint(x, y, gillId, Math.abs(x - 16) < 2 ? 2 : x % 2 === 0 ? 4 : 3))
  const cap = above(Mask.ellipse(16, 15.6, 10.8, 9.2), 15)
  shadeDome(s, cap, capId, { contact: false, relief: 0.8 })
  // The curled rim, a shade lighter.
  cap.each((x, y) => {
    if (y >= 14 && cap.get(x, y - 1)) s.paint(x, y, capId, Math.min(4, s.toneAt(x, y) + 1))
  })
  // Pale cracks crazing the top of the cap.
  const r = rng('shiitake-cracks')
  for (let i = 0; i < 9; i++) {
    const a = r() * Math.PI * 2, d = 1.5 + r() * 6
    const x0 = 15 + Math.cos(a) * d * 1.3, y0 = 10 + Math.sin(a) * d * 0.55
    const b = a + (r() - 0.5) * 2
    const len = 1.5 + r() * 2
    stroke(s, [x0, y0], [x0 + Math.cos(b) * len, y0 + Math.sin(b) * len * 0.6], crackId, s.toneAt(Math.floor(x0), Math.floor(y0)) >= 4 ? 4 : 3, (x, y) => cap.get(x, y) && y < 14 && cap.get(x, y - 1))
  }
}

/** A fan-shaped cap growing from `base`: a wedge widening out to a wavy, rounded rim. Angles in degrees, 0 = right, −90 = up. */
function fan(base: Point, dir: number, spread: number, reach: number, wave: number): Mask {
  return Mask.from((px, py) => {
    const dx = px - base[0], dy = py - base[1]
    const r = Math.hypot(dx, dy)
    let a = (Math.atan2(dy, dx) * 180) / Math.PI - dir
    a = ((a + 540) % 360) - 180
    const k = a / spread
    if (Math.abs(k) > 1) return false
    const edge = reach * (1 - 0.22 * k * k) + wave * Math.sin(k * 7.5)
    return r <= edge && r >= 1.5 + 2.4 * Math.abs(k)
  })
}

function oysterMushroom(s: Sprite): void {
  const capId = s.addRamp(ramp('#8b919b', { lift: 0.3, hueShift: 6, satShift: 0.03 }))
  const gillId = s.addRamp(ramp('#e8e0cf', { lift: 0.3, drop: 0.24 }))
  const stemId = s.addRamp(ramp('#d6cdb9', { lift: 0.3, drop: 0.22 }))
  // One curved stem carrying a stack of side-on shelves: a grey domed top over a band of gills that run back to the stem.
  shadeStem(s, Mask.from((px, py) => py > 9 && py < 25.8 && Math.abs(px - (11.6 + ((py - 25) / 16) ** 2 * 1.6)) < 1.7 + (py > 22 ? (py - 22) * 0.35 : 0)), stemId, false)
  const shelf = (cx: number, cy: number, rx: number, up: number, down: number, root: number, seed: number) => {
    const edge = (px: number) => 1 + 0.08 * Math.sin(px * 1.9 + seed)
    // The shelf droops a little toward its outer edge.
    const mid = (px: number) => cy + Math.max(0, px - root) * 0.1
    const top = Mask.from((px, py) => {
      const u = (px - cx) / rx, v = (py - mid(px)) / up
      return py < mid(px) && u * u + v * v <= edge(px)
    })
    const gills = Mask.from((px, py) => {
      const u = (px - cx) / rx, v = (py - mid(px)) / down
      return py >= mid(px) && u * u + v * v <= edge(px)
    })
    gills.each((x, y) => {
      const a = Math.atan2(y + 0.5 - mid(x) + 0.8, x + 0.5 - root) * 6
      s.paint(x, y, gillId, !gills.get(x, y - 1) ? 5 : Math.abs(a - Math.round(a)) < 0.3 ? 2 : 4)
    })
    shadeDome(s, top, capId, { contact: false, relief: 0.8 })
  }
  shelf(16.2, 10.2, 9.2, 5, 2.4, 11.6, 0)
  shelf(17.8, 16.6, 7.6, 4, 2.2, 12, 1.7)
  shelf(15.4, 22, 6.2, 3.4, 2, 12.4, 3.1)
}

function enoki(s: Sprite): void {
  const stemId = s.addRamp(ramp('#f1ead6', { lift: 0.3, drop: 0.22 }))
  const capId = s.addRamp(ramp('#f6efdc', { lift: 0.4, drop: 0.24, hueShift: 6 }))
  const baseId = s.addRamp(ramp('#c9ad7a', { lift: 0.28 }))
  const tips: Point[] = [[8.5, 8], [11, 5], [13.8, 7.5], [16.4, 4], [19, 6.5], [21.6, 4.8], [24, 8.4], [12.2, 10.5], [20.6, 10.6]]
  for (const [i, [tx, ty]] of tips.entries()) {
    const bx = 14.6 + (tx - 16) * 0.12, by = 21.5
    // Each stem bows gently outward.
    const mx = (bx + tx) / 2 + (tx - 16) * 0.12, my = (by + ty) / 2
    stroke(s, [bx, by], [mx, my], stemId, i % 2 === 0 ? 4 : 3)
    stroke(s, [mx, my], [tx, ty + 1], stemId, i % 2 === 0 ? 4 : 3)
  }
  for (const [tx, ty] of tips) {
    const x = Math.floor(tx), y = Math.floor(ty)
    s.paint(x - 1, y, capId, 4)
    s.paint(x, y, capId, 5)
    s.paint(x + 1, y, capId, 3)
    s.paint(x, y - 1, capId, 4)
  }
  // The bundled base, still holding a little substrate.
  const base = Mask.polygon([[12.2, 19.5], [19.8, 19.5], [20.8, 24.8], [19.6, 25.8], [12.4, 25.8], [11.2, 24.8]])
  shadeStem(s, base, (_x, y) => (y >= 24 ? baseId : stemId))
  for (let x = 12; x <= 20; x += 2) s.shift(x, 20, -1)
}

function chanterelle(s: Sprite, cx: number, top: number, w: number, h: number, lean: number): void {
  const id = s.addRamp(ramp('#f2aa36', { lift: 0.32, hueShift: 8 }))
  const rimY = top + 2.2
  const half = w / 2
  // The trumpet: a wavy rim tapering down into the stem.
  const body = Mask.from((px, py) => {
    if (py < rimY || py > top + h) return false
    const t = (py - rimY) / (h - 2.2)
    const hw = Math.max(1.6, half * Math.pow(1 - t, 1.7) + 1.3 * t)
    const c = cx + lean * t
    return Math.abs(px - c) <= hw
  })
  const rim = Mask.from((px, py) => {
    const dx = (px - cx) / half, dy = (py - rimY) / 2.4
    const wave = 0.12 * Math.sin(px * 1.6)
    return dx * dx + dy * dy <= 1 + wave
  })
  shadeStem(s, body, id)
  // False gills: ridges running down the outside of the funnel.
  body.each((x, y) => {
    if (y < rimY + 1 || y > top + h * 0.7) return
    const t = (y + 0.5 - rimY) / (h - 2.2)
    const c = cx + lean * t
    const hw = Math.max(1.6, half * Math.pow(1 - t, 1.7) + 1.3 * t)
    const u = (x + 0.5 - c) / hw
    if (Math.abs(Math.round(u * 3.4) - u * 3.4) < 0.18) s.shift(x, y, -1)
  })
  shadeDome(s, rim, id, { contact: false, bias: 0.1 })
  // The cup's hollow, darker toward the back.
  Mask.ellipse(cx + 0.4, rimY - 0.2, half - 2, 1.3).each((x, y) => s.paint(x, y, id, 2))
}

function porcini(s: Sprite): void {
  const capId = s.addRamp(ramp('#8b5230', { lift: 0.3, hueShift: 6 }))
  const poreId = s.addRamp(ramp('#e8d28c', { lift: 0.3 }))
  const stemId = s.addRamp(ramp('#e3d2ae', { lift: 0.3, drop: 0.2 }))
  const stem = Mask.ellipse(16, 20.5, 6.6, 5.4).union(Mask.polygon([[12, 13], [20, 13], [21.6, 20], [10.4, 20]]))
  shadeStem(s, stem, stemId)
  // A fine net on the upper stem.
  stem.each((x, y) => {
    if (y > 13 && y < 20 && (x + y * 2) % 5 === 0 && s.toneAt(x, y) >= 3) s.shift(x, y, -1)
  })
  Mask.ellipse(16, 13.2, 8.6, 1.7).subtract(Mask.from((_x, y) => y < 13)).each((x, y) => s.paint(x, y, poreId, x < 13 ? 4 : 3))
  const cap = above(Mask.ellipse(16, 13.6, 10.2, 9.2), 13)
  shadeDome(s, cap, capId, { contact: false })
}

function morel(s: Sprite): void {
  const ridgeId = s.addRamp(ramp('#a8814e', { lift: 0.3, hueShift: 6 }))
  const pitId = s.addRamp(ramp('#4c3420', { lift: 0.2 }))
  const stemId = s.addRamp(ramp('#efe4c8', { lift: 0.3, drop: 0.2 }))
  shadeStem(s, Mask.polygon([[12.4, 19], [19.6, 19], [20.6, 25.8], [11.4, 25.8]]), stemId)
  const cap = Mask.from((px, py) => {
    if (py < 3.4 || py > 21) return false
    const t = (py - 3.4) / 17.6
    const hw = 7 * Math.sin(Math.min(1, t * 1.25) * Math.PI * 0.5) ** 0.75 * (t > 0.85 ? 1 - (t - 0.85) * 1.6 : 1)
    return Math.abs(px - 16) <= hw
  })
  shadeDome(s, cap, ridgeId, { relief: 1.2 })
  // Honeycomb pits: staggered cells, each a dark hollow inside a lit ridge.
  cap.each((x, y) => {
    const row = Math.floor((y - 3) / 3.2)
    const off = row % 2 === 0 ? 0 : 1.5
    const cx = ((x + off) % 3 + 3) % 3
    const cy = (((y - 3) % 3.2) + 3.2) % 3.2
    if (cx >= 1 && cy >= 1.2) s.paint(x, y, pitId, s.toneAt(x, y) >= 4 ? 3 : 2)
  })
}

function truffle(s: Sprite): void {
  const skinId = s.addRamp(ramp('#2e221e', { lift: 0.2, drop: 0.2, hueShift: 10, satShift: 0.02 }))
  const fleshId = s.addRamp(ramp('#4a2c26', { lift: 0.3 }))
  const veinId = s.addRamp(ramp('#ece0cc', { lift: 0.3 }))
  const r = rng('truffle')
  // A knobby lump: a cluster of overlapping rounds, with knobs breaking the outline.
  const lump = Mask.ellipse(14.4, 15.6, 7.6, 6.8)
  for (let i = 0; i < 11; i++) {
    const a = (i / 11) * Math.PI * 2 + r() * 0.3
    lump.union(Mask.circle(14.4 + Math.cos(a) * 7, 15.6 + Math.sin(a) * 6.2, 1.7 + r() * 0.9))
  }
  shadeDome(s, lump, skinId, { bias: -0.06 })
  // Warts: small pyramids, each lit on its upper left and shadowed below right.
  lump.each((x, y) => {
    if ((x + (Math.floor(y / 3) % 2) * 2) % 4 === 0 && y % 3 === 0 && lump.get(x + 1, y + 1) && lump.get(x - 1, y - 1)) {
      s.shift(x, y, 1)
      s.shift(x + 1, y + 1, -1)
    }
  })
  // A slice in front shows the marbled inside.
  const slice = Mask.ellipse(20.6, 22.4, 6.2, 3.8)
  slice.each((x, y) => {
    const edge = !slice.get(x - 1, y) || !slice.get(x + 1, y) || !slice.get(x, y - 1) || !slice.get(x, y + 1)
    s.paint(x, y, edge ? skinId : fleshId, edge ? 2 : y < 22 ? 4 : 3)
  })
  for (const [a, b] of [[[16, 21.4], [19.4, 22.4]], [[19.4, 22.4], [22, 21]], [[22, 21], [25, 22.4]], [[17.4, 23.6], [20.6, 23.2]], [[20.6, 23.2], [23.4, 24.2]], [[19.4, 22.4], [20.6, 23.2]]] as [Point, Point][])
    stroke(s, a, b, veinId, 4, (x, y) => slice.get(x, y) && slice.get(x - 1, y) && slice.get(x + 1, y) && slice.get(x, y - 1) && slice.get(x, y + 1))
}

function glowcap(s: Sprite, cx: number, top: number, w: number, h: number, stemH: number, lean: number): void {
  const capId = s.addRamp(ramp('#2fd6ec', { lift: 0.5, drop: 0.3, hueShift: 6 }))
  const glowId = s.addRamp(ramp('#b8fbff', { lift: 0.5, drop: 0.24 }))
  const stemId = s.addRamp(ramp('#cfeef0', { lift: 0.4, drop: 0.24, hueShift: 4 }))
  const capBottom = top + h
  const stem = Mask.from((px, py) => py >= capBottom - 1 && py <= capBottom + stemH && Math.abs(px - (cx + lean * ((py - capBottom) / stemH) ** 2)) < Math.max(1.1, w * 0.12))
  shadeStem(s, stem, stemId)
  // Glowing gills: the underside is the brightest part.
  Mask.ellipse(cx, capBottom, w / 2 - 0.6, 1.4)
    .subtract(Mask.from((_x, y) => y < capBottom))
    .each((x, y) => s.paint(x, y, glowId, x % 2 === 0 ? 5 : 4))
  // A bell cap with a flared rim.
  const cap = Mask.from((px, py) => {
    if (py > capBottom || py < top) return false
    const t = (py - top) / h
    const hw = (w / 2) * (Math.sqrt(t) * 0.86 + (t > 0.75 ? (t - 0.75) * 0.6 : 0))
    return Math.abs(px - cx) <= hw
  })
  shadeDome(s, cap, capId, { contact: false, bias: 0.12 })
  // Luminous spots.
  const r = rng(`glowcap-${cx}`)
  cap.each((x, y) => {
    if (r() < 0.16 && y < capBottom - 1 && cap.get(x - 1, y) && cap.get(x + 1, y)) s.paint(x, y, glowId, 5)
  })
}

function kingReishi(s: Sprite): void {
  const lacquerId = s.addRamp(ramp('#8e2416', { lift: 0.36, hueShift: 8, satShift: 0.04 }))
  const amberId = s.addRamp(ramp('#d4652a', { lift: 0.36, hueShift: 8 }))
  const rimId = s.addRamp(ramp('#f8cc56', { lift: 0.45, hueShift: 6 }))
  const stalkId = s.addRamp(ramp('#6e1c14', { lift: 0.32 }))
  // Fan-shaped shelves; growth bands step from deep lacquer at the stalk through amber to a golden rim.
  const shelf = (base: Point, dir: number, spread: number, reach: number) => {
    const m = fan(base, dir, spread, reach, 0.35)
    const edgeAt = (x: number, y: number) => {
      let a = (Math.atan2(y - base[1], x - base[0]) * 180) / Math.PI - dir
      a = ((a + 540) % 360) - 180
      const k = a / spread
      return reach * (1 - 0.22 * k * k)
    }
    shadeDome(s, m, (x, y) => {
      const d = Math.hypot(x + 0.5 - base[0], y + 0.5 - base[1]), edge = edgeAt(x + 0.5, y + 0.5)
      return d > edge - 1.3 ? rimId : d > edge - 3.4 ? amberId : lacquerId
    }, { relief: 0.8 })
    // Growth rings: fine raised ridges catching the light.
    m.each((x, y) => {
      const d = Math.hypot(x + 0.5 - base[0], y + 0.5 - base[1])
      if (Math.abs(d - Math.round(d / 2.4) * 2.4) < 0.32 && d < edgeAt(x + 0.5, y + 0.5) - 1.6) s.shift(x, y, s.toneAt(x, y) >= 3 ? -1 : 1)
    })
    return m
  }
  // A young shelf behind, then the great one on its short lacquered stalk.
  shadeStem(s, Mask.polygon([[19.6, 20], [21.6, 20], [22, 25.8], [19.4, 25.8]]), stalkId)
  shelf([20.6, 21.4], -34, 44, 6.6)
  shadeStem(s, Mask.polygon([[14.4, 17], [18, 17], [18.8, 25.8], [13.6, 25.8]]), stalkId)
  const big = shelf([16, 19.6], -98, 64, 12.6)
  // Lacquer shine: a bright arc across the upper left.
  big.each((x, y) => {
    const d = Math.hypot(x + 0.5 - 16, y + 0.5 - 19.6)
    const a = (Math.atan2(y + 0.5 - 19.6, x + 0.5 - 16) * 180) / Math.PI
    if (d > 5.6 && d < 6.8 && a > -150 && a < -110) s.paint(x, y, s.mat[y * 32 + x] ?? lacquerId, 5)
  })
}

export const MUSHROOMS: ItemIcon[] = [
  {
    id: 'button-mushroom',
    name: 'Button Mushroom',
    grade: 1,
    paint: (s) => {
      buttonMushroom(s, 13.6, 7.6, 15, 9, 9)
      buttonMushroom(s, 21.6, 16.6, 8.4, 5, 5)
    },
  },
  { id: 'shiitake', name: 'Shiitake', grade: 2, paint: shiitake },
  { id: 'oyster-mushroom', name: 'Oyster Mushroom', grade: 3, paint: oysterMushroom },
  { id: 'enoki', name: 'Enoki', grade: 4, paint: enoki },
  {
    id: 'chanterelle',
    name: 'Chanterelle',
    grade: 5,
    paint: (s) => {
      chanterelle(s, 13.4, 4.4, 15, 21.4, 1.2)
      chanterelle(s, 21.6, 13.4, 8, 12.4, -0.8)
    },
  },
  { id: 'porcini', name: 'Porcini', grade: 6, paint: porcini },
  { id: 'morel', name: 'Morel', grade: 7, paint: morel },
  { id: 'truffle', name: 'Truffle', grade: 8, paint: truffle },
  {
    id: 'glowcap',
    name: 'Glowcap',
    grade: 9,
    paint: (s) => {
      glowcap(s, 14, 5, 15, 9, 11.6, 1)
      glowcap(s, 22, 15, 7.4, 4.6, 6.2, -0.6)
    },
  },
  { id: 'king-reishi', name: 'King Reishi', grade: 10, paint: kingReishi },
]
