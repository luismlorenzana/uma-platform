// Refined Fish (Pantry, ATK family): uma-rpg docs/design/items.md#fish. Fillets laid on a broad leaf: each fish
// shows its own flesh color, muscle lines and skin edge; the legendary fillets shimmer.
import { hex, ramp } from '../../color.ts'
import { Mask, shadeDome } from '../../shape.ts'
import type { Sprite } from '../../sprite.ts'
import type { ItemIcon } from '../types.ts'
import { halo, leafPlate, motes, type Tones } from './pantry-kit.ts'

const LEAF = ramp('#4f9a43', { lift: 0.3 })

/** A fillet seen from a little above, lying along a gently sloping axis: rounded cut at the head end (left), tapering to the tail. */
interface Fillet {
  cx: number
  cy: number
  /** Half length along the axis, and the axis slope in degrees (positive: the tail sits lower). */
  len: number
  angle?: number
  /** Half thickness at the thickest point, and how far the back arches up at the middle. */
  half: number
  bow?: number
  /** An S-curve along the length (eel), in px. */
  wave?: number
  /** Where along the fillet it is thickest (0–1), and how blunt the tail is (0 pointed … 1 square). */
  peak?: number
  tail?: number
}

const AXIS = 16

/** Axis coordinates of a point: s (0 head … 1 tail), v across (+ toward the skin), and the fillet's edges there. */
function profile(f: Fillet, px: number, py: number): { s: number; v: number; top: number; bottom: number } | null {
  const a = ((f.angle ?? AXIS) * Math.PI) / 180, c = Math.cos(a), sn = Math.sin(a)
  const dx = px - f.cx, dy = py - f.cy
  const s = (dx * c + dy * sn) / (2 * f.len) + 0.5
  if (s < 0 || s > 1) return null
  const v = -dx * sn + dy * c
  const head = Math.sqrt(Math.min(1, s / 0.12))
  const peak = f.peak ?? 0.3
  const body = s < peak ? 1 : Math.max(f.tail ?? 0.1, 1 - ((s - peak) / (1 - peak)) ** 1.7) ** 0.75
  const mid = -(f.bow ?? 0) * Math.sin(Math.PI * s) + (f.wave ?? 0) * Math.sin(2 * Math.PI * s)
  const h = f.half * head * body
  return { s, v, top: mid - h * 0.9, bottom: mid + h }
}

function filletMask(f: Fillet): Mask {
  return Mask.from((px, py) => {
    const p = profile(f, px, py)
    return !!p && p.v >= p.top && p.v <= p.bottom
  })
}

/** The pixel at axis coordinates (s, v). */
function at(f: Fillet, s: number, v: number): [number, number] {
  const a = ((f.angle ?? AXIS) * Math.PI) / 180, c = Math.cos(a), sn = Math.sin(a)
  const u = (s - 0.5) * 2 * f.len
  return [Math.floor(f.cx + u * c - v * sn), Math.floor(f.cy + u * sn + v * c)]
}

interface FilletLook {
  flesh: Tones
  skin: Tones
  /** Muscle lines: 'dark' (tone down), 'fat' (pale stripes, like salmon) or 'none'. */
  lines?: 'dark' | 'fat' | 'none'
  fat?: Tones
  /** Picks a ramp per skin pixel (s = 0 head … 1 tail) to pattern the skin. */
  skinPattern?: (x: number, y: number, s: number, skinId: number) => number
  skinRows?: number
  bias?: number
  /** Columns where muscle lines start, as fractions of the length. */
  stripes?: readonly number[]
}

function fillet(s: Sprite, f: Fillet, look: FilletLook): { mask: Mask; skin: Mask } {
  const m = filletMask(f)
  const fleshId = s.addRamp(look.flesh)
  const skinId = s.addRamp(look.skin)
  const fatId = s.addRamp(look.fat ?? ramp('#fbeee6', { lift: 0.4, drop: 0.2 }))
  shadeDome(s, m, fleshId, { bias: look.bias ?? 0.08, relief: 0.8 })
  const lines = look.lines ?? 'dark'
  if (lines !== 'none')
    for (const k of look.stripes ?? [0.24, 0.44, 0.64, 0.82]) {
      const done = new Set<number>()
      for (let v = -f.half; v <= f.half; v += 0.4) {
        const [x, y] = at(f, k - (v + f.half) * 0.045, v)
        if (done.has(y * 32 + x) || !m.get(x, y) || !m.get(x, y - 1) || !m.get(x, y + 1)) continue
        done.add(y * 32 + x)
        if (lines === 'fat') s.paint(x, y, fatId, Math.min(5, Math.max(3, s.toneAt(x, y) + 1)))
        else s.shift(x, y, -1)
      }
    }
  const skin = new Mask()
  const rowsOfSkin = look.skinRows ?? 1.5
  m.each((x, y) => {
    const p = profile(f, x + 0.5, y + 0.5)
    if (!p || p.v < p.bottom - rowsOfSkin) return
    skin.set(x, y)
    const id = look.skinPattern ? look.skinPattern(x, y, p.s, skinId) : skinId
    s.paint(x, y, id, m.get(x, y + 1) ? 3 : 2)
  })
  return { mask: m, skin }
}

const BASE: Fillet = { cx: 16.2, cy: 18.4, len: 10, half: 4.5, bow: 0.8 }

function plate(s: Sprite, tones: Tones = LEAF): void {
  leafPlate(s, tones, { cx: 16.6, cy: 21.6, rx: 10.6, ry: 3.9, rot: AXIS })
}

/** Bright diagonal glints along the skin, for the shimmering legendary fillets. */
function shimmer(s: Sprite, skin: Mask): void {
  skin.each((x, y) => {
    if ((x + y) % 4 === 0) s.paint(x, y, s.mat[y * s.w + x] ?? 0, 5)
  })
}

export const FISH_REFINED: ItemIcon[] = [
  {
    id: 'carp-fillet',
    name: 'Carp Fillet',
    grade: 1,
    paint: (s) => {
      plate(s)
      const scale = s.addRamp(ramp('#d7b45a', { lift: 0.34 }))
      fillet(s, BASE, {
        flesh: ramp('#efdccb', { lift: 0.38, drop: 0.2 }),
        skin: ramp('#a8813a', { lift: 0.34 }),
        skinRows: 2,
        skinPattern: (x, y, _s, id) => ((x + y) % 2 === 0 ? scale : id),
      })
    },
  },
  {
    id: 'trout-fillet',
    name: 'Trout Fillet',
    grade: 2,
    paint: (s) => {
      plate(s)
      const spots = s.addRamp(ramp('#3d3a36'))
      fillet(s, BASE, {
        flesh: ramp('#f08668', { lift: 0.32 }),
        skin: ramp('#a4ab88', { lift: 0.34 }),
        lines: 'fat',
        fat: ramp('#fcd6c6', { lift: 0.4 }),
        skinRows: 2,
        skinPattern: (x, y, _s, id) => ((x * 2 + y) % 5 === 0 ? spots : id),
      })
    },
  },
  {
    id: 'sardine-fillet',
    name: 'Sardine Fillet',
    grade: 3,
    paint: (s) => {
      plate(s)
      const dark = s.addRamp(ramp('#2f4f8a'))
      const look: FilletLook = {
        flesh: ramp('#c97c6c', { lift: 0.3 }),
        skin: ramp('#8fb0d8', { lift: 0.45 }),
        skinRows: 2,
        lines: 'none',
        skinPattern: (x, y, _s, id) => (y % 2 === 1 && x % 3 !== 0 ? dark : id),
      }
      fillet(s, { cx: 15, cy: 16, len: 7.8, half: 2.7, bow: 0.4 }, look)
      fillet(s, { cx: 17.6, cy: 20.8, len: 7.8, half: 2.7, bow: 0.4 }, look)
    },
  },
  {
    id: 'mackerel-fillet',
    name: 'Mackerel Fillet',
    grade: 4,
    paint: (s) => {
      plate(s)
      const dark = s.addRamp(ramp('#1d3b4a'))
      fillet(s, BASE, {
        flesh: ramp('#e2b2a0', { lift: 0.32 }),
        skin: ramp('#3fa49e', { lift: 0.36 }),
        skinRows: 2.6,
        skinPattern: (x, y, _s, id) => ((x - (y % 3)) % 3 === 0 ? dark : id),
      })
    },
  },
  {
    id: 'salmon-fillet',
    name: 'Salmon Fillet',
    grade: 5,
    paint: (s) => {
      plate(s)
      fillet(s, { ...BASE, half: 5 }, { flesh: ramp('#f6773c', { lift: 0.3 }), skin: ramp('#a3acb8', { lift: 0.4 }), lines: 'fat', fat: ramp('#ffe0cc', { lift: 0.4 }), stripes: [0.18, 0.34, 0.5, 0.66, 0.8] })
    },
  },
  {
    id: 'sea-bream-fillet',
    name: 'Sea Bream Fillet',
    grade: 6,
    paint: (s) => {
      plate(s)
      fillet(s, BASE, { flesh: ramp('#f7e7e0', { lift: 0.42, drop: 0.2 }), skin: ramp('#e2546a', { lift: 0.3 }), skinRows: 2.2, lines: 'dark' })
    },
  },
  {
    id: 'eel-fillet',
    name: 'Eel Fillet',
    grade: 7,
    paint: (s) => {
      plate(s)
      fillet(
        s,
        { cx: 16.2, cy: 18.8, len: 10.8, half: 2.7, wave: 1.8, peak: 0.4, tail: 0.75 },
        { flesh: ramp('#ead2a8', { lift: 0.34 }), skin: ramp('#3b3328', { lift: 0.32 }), skinRows: 1.8, lines: 'none' },
      )
    },
  },
  {
    id: 'tuna-fillet',
    name: 'Tuna Fillet',
    grade: 8,
    paint: (s) => {
      plate(s)
      // A loin block (saku) along the same axis: a lit top face over a darker cut side, pale sinew lines and the dark
      // blood line.
      const a = (AXIS * Math.PI) / 180, c = Math.cos(a), sn = Math.sin(a)
      const pt = (u: number, v: number, drop = 0): [number, number] => [16.2 + u * c - v * sn, 16.8 + u * sn + v * c + drop]
      const red = s.addRamp(ramp('#c42039', { lift: 0.3, drop: 0.28 }))
      const top = Mask.polygon([pt(-9, -3), pt(8.4, -3), pt(8.4, 1.8), pt(-9, 1.8)])
      const side = Mask.polygon([pt(-9, 1.8), pt(8.4, 1.8), pt(8.4, 1.8, 3.6), pt(-9, 1.8, 3.6)])
      const end = Mask.polygon([pt(8.4, -3), pt(8.4, 1.8), pt(8.4, 1.8, 3.6), pt(8.4, -3, 3.6)])
      end.each((x, y) => s.paint(x, y, red, 1))
      side.each((x, y) => s.paint(x, y, red, 2))
      top.each((x, y) => s.paint(x, y, red, 3))
      for (let u = -8.6; u <= 7; u += 0.5) {
        const [x, y] = pt(u, -2.6).map(Math.floor) as [number, number]
        if (top.get(x, y)) s.paint(x, y, red, 4)
      }
      for (const u0 of [-5, -1, 3, 7]) for (let d = 0; d <= 3.4; d += 0.5) {
        const [x, y] = pt(u0 - d * 0.7, 1.9, d).map(Math.floor) as [number, number]
        if (side.get(x, y)) s.paint(x, y, red, 3)
      }
      const blood = s.addRamp(ramp('#6e1022'))
      for (let u = -4; u <= 8; u += 0.5) {
        const [x, y] = pt(u, 0.6).map(Math.floor) as [number, number]
        if (top.get(x, y) && top.get(x, y + 1)) s.paint(x, y, blood, 3)
      }
    },
  },
  {
    id: 'silverfin-fillet',
    name: 'Silverfin Fillet',
    grade: 9,
    paint: (s) => {
      plate(s, ramp('#5fa88a', { lift: 0.34 }))
      const { skin } = fillet(s, { ...BASE, half: 4.8 }, { flesh: ramp('#f3e8f0', { lift: 0.42, drop: 0.2 }), skin: ramp('#b9c8e0', { lift: 0.55, drop: 0.32 }), skinRows: 2.6, lines: 'dark' })
      shimmer(s, skin)
      for (const [x, y] of [[11, 14], [16, 15]] as const) s.overlay(x, y, hex('#ffffff', 200))
      halo(s, 16.5, 18, 11.5, 8.5, '#cfe3ff', 70)
      motes(s, [[25, 14], [9, 10]], '#ffffff', 210)
    },
  },
  {
    id: 'rainbow-koi-fillet',
    name: 'Rainbow Koi Fillet',
    grade: 10,
    paint: (s) => {
      plate(s, ramp('#3f9a74', { lift: 0.32 }))
      const bands = ['#e8455a', '#f59a2e', '#f2d23a', '#5fc46a', '#3f9ae0', '#8a5ad6'].map((c) => s.addRamp(ramp(c, { lift: 0.4 })))
      const { skin } = fillet(s, { ...BASE, half: 4.8 }, {
        flesh: ramp('#fde3d2', { lift: 0.42, drop: 0.2 }),
        skin: ramp('#e8455a'),
        skinRows: 2.6,
        lines: 'fat',
        fat: ramp('#fff6ee', { lift: 0.4 }),
        skinPattern: (_x, _y, t) => bands[Math.min(bands.length - 1, Math.max(0, Math.floor(t * bands.length)))] ?? 0,
      })
      shimmer(s, skin)
      halo(s, 16.5, 18, 12, 9, '#ffd8f0', 70)
      motes(s, [[25, 14], [10, 10]], '#ffffff', 210)
    },
  },
]
