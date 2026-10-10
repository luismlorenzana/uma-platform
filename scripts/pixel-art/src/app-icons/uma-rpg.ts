// uma-rpg's app icon: a gold horseshoe over a steel sword, on a night sky. Drawn on a 64×64 grid so it scales by whole
// numbers to 192 (×3) and 512 (×8); the 180 px Apple touch icon is the same grid with a 2 px background border trimmed.
// The crest stays inside the central 80% circle, so maskable (round) launchers never clip it.
import { hex, ramp, type RGBA } from '../color.ts'
import { Mask, shadeDome } from '../shape.ts'
import { Sprite } from '../sprite.ts'

export const ICON_GRID = 64

const BAYER = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
] as const

/** Night sky: a vertical gradient through five navy tones with ordered dithering, a soft halo, and a few stars. */
function background(): Uint8Array {
  const n = ICON_GRID
  const tones: RGBA[] = ['#1d2a4a', '#18233f', '#131c33', '#0f1628', '#0b101e'].map((c) => hex(c))
  const px = new Uint8Array(n * n * 4)
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++) {
      const dx = x + 0.5 - n / 2, dy = y + 0.5 - n * 0.46
      // Brighter towards the centre, darker towards the bottom corners.
      const v = Math.min(0.999, Math.max(0, 0.18 + (y / n) * 0.55 + (Math.hypot(dx, dy) / n) * 0.55 - 0.25))
      const scaled = v * (tones.length - 1)
      const threshold = ((BAYER[y % 4]?.[x % 4] ?? 0) + 0.5) / 16
      const index = Math.min(tones.length - 1, Math.floor(scaled) + (scaled % 1 > threshold ? 1 : 0))
      px.set(tones[index] ?? [0, 0, 0, 255], (y * n + x) * 4)
    }
  const blend = (x: number, y: number, c: RGBA) => {
    if (x < 0 || y < 0 || x >= n || y >= n) return
    const i = (y * n + x) * 4, a = c[3] / 255
    for (let k = 0; k < 3; k++) px[i + k] = Math.round((c[k] ?? 0) * a + (px[i + k] ?? 0) * (1 - a))
  }
  // Warm halo behind the crest.
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++) {
      const d = Math.hypot(x + 0.5 - 32, y + 0.5 - 35) / 24
      if (d < 1) blend(x, y, [242, 190, 92, Math.round(70 * (1 - d) ** 2)])
    }
  // Stars, kept clear of the crest and inside the maskable safe zone's corners on purpose (they may be clipped).
  const stars: [number, number, number][] = [[9, 10, 2], [53, 8, 1], [57, 22, 1], [8, 44, 1], [55, 50, 2], [14, 56, 1], [46, 4, 1]]
  for (const [sx, sy, size] of stars) {
    blend(sx, sy, hex('#fff6d8'))
    for (let d = 1; d <= size; d++) for (const [ox, oy] of [[d, 0], [-d, 0], [0, d], [0, -d]] as const) blend(sx + ox, sy + oy, hex('#ffe9a8', d === 1 ? 170 : 90))
  }
  return px
}

/** The crest on a transparent sprite, so the renderer's selective outline wraps it. */
function crest(): Uint8Array {
  const s = new Sprite(ICON_GRID, ICON_GRID)
  const steel = s.addRamp(ramp('#b9c6d8', { lift: 0.42, drop: 0.3, hueShift: 6 }))
  const gold = s.addRamp(ramp('#e3a93b', { lift: 0.46, drop: 0.32, hueShift: 10, satShift: 0.06 }))
  const grip = s.addRamp(ramp('#7a3f2c'))
  const cx = 32

  // Sword, point down: pommel, grip, crossguard, blade with a bright ridge, and a tapered point.
  shadeDome(s, Mask.circle(cx, 9.5, 2.6, ICON_GRID, ICON_GRID), gold, { contact: false, bias: 0.1 })
  for (let y = 12; y <= 18; y++) {
    s.paint(cx - 1, y, grip, y % 2 === 0 ? 2 : 3)
    s.paint(cx, y, grip, y % 2 === 0 ? 3 : 4)
  }
  shadeDome(s, Mask.polygon([[cx - 11, 19], [cx + 11, 19], [cx + 9.5, 22.5], [cx - 9.5, 22.5]], ICON_GRID, ICON_GRID), gold, { contact: false, relief: 0.6, bias: 0.12 })
  for (let y = 23; y <= 57; y++) {
    const half = y > 53 ? Math.max(0, 57 - y) * 0.5 : 2
    for (let x = Math.round(cx - half - 0.5); x <= Math.round(cx + half - 0.5); x++) {
      const tone = x < cx - 1 ? 4 : x === cx - 1 ? 5 : x === cx ? 3 : 2
      s.paint(x, y, steel, tone)
    }
  }

  // Horseshoe, opening upwards, over the blade: a lower half-annulus plus two arms, with calkins and nail holes.
  const cy = 36, outer = 14.5, inner = 9.5
  const shoe = Mask.from((px, py) => {
    const r = Math.hypot(px - cx, py - cy)
    const ring = r <= outer && r >= inner && py >= cy
    const arm = py >= 24 && py < cy && ((px >= cx - outer && px <= cx - inner) || (px >= cx + inner && px <= cx + outer))
    return ring || arm
  }, ICON_GRID, ICON_GRID)
  shoe.union(Mask.polygon([[cx - outer - 1, 24], [cx - inner + 1, 24], [cx - inner + 1, 27], [cx - outer - 1, 27]], ICON_GRID, ICON_GRID))
  shoe.union(Mask.polygon([[cx + inner - 1, 24], [cx + outer + 1, 24], [cx + outer + 1, 27], [cx + inner - 1, 27]], ICON_GRID, ICON_GRID))
  shadeDome(s, shoe, gold, { relief: 1.3, bias: 0.06 })
  // Nail holes along the middle of the band.
  for (const angle of [200, 228, 256, 284, 312, 340]) {
    const a = (angle * Math.PI) / 180
    const r = (outer + inner) / 2
    const x = Math.round(cx + Math.cos(a) * r - 0.5)
    const y = Math.round(cy - Math.sin(a) * r - 0.5)
    s.paint(x, y, gold, 1)
  }
  for (const y of [29, 33]) {
    s.paint(Math.round(cx - (outer + inner) / 2 - 0.5), y, gold, 1)
    s.paint(Math.round(cx + (outer + inner) / 2 - 0.5), y, gold, 1)
  }
  // Glints on the gold.
  s.sparkle(cx - 12, 25, 1)
  s.sparkle(cx + 6, 8, 1)
  return s.render()
}

/** The full 64×64 icon: sky, then the outlined crest composited over it. */
export function drawUmaRpgIcon(): Uint8Array {
  const n = ICON_GRID
  const px = background()
  const top = crest()
  for (let i = 0; i < n * n; i++) {
    const a = (top[i * 4 + 3] ?? 0) / 255
    if (a === 0) continue
    for (let k = 0; k < 3; k++) px[i * 4 + k] = Math.round((top[i * 4 + k] ?? 0) * a + (px[i * 4 + k] ?? 0) * (1 - a))
  }
  return px
}
