// A sprite is a grid of (ramp, tone) cells. Rendering adds a drop shadow, a selective outline
// (each edge takes the darkest tone of the object it borders) and overlays such as sparkles.
import { hex, type RGBA } from './color.ts'

export interface Shadow {
  cx: number
  cy: number
  rx: number
  ry: number
  alpha: number
}

interface Overlay {
  x: number
  y: number
  color: RGBA
}

export const TONE = { outline: 0, deep: 1, shadow: 2, base: 3, light: 4, highlight: 5 } as const

export class Sprite {
  readonly w: number
  readonly h: number
  readonly ramps: RGBA[][] = []
  readonly mat: Int16Array
  readonly tone: Uint8Array
  readonly overlays: Overlay[] = []
  shadow: Shadow | null = null

  constructor(w = 32, h = 32) {
    this.w = w
    this.h = h
    this.mat = new Int16Array(w * h).fill(-1)
    this.tone = new Uint8Array(w * h)
  }

  addRamp(tones: RGBA[]): number {
    this.ramps.push(tones)
    return this.ramps.length - 1
  }

  inside(x: number, y: number): boolean {
    return x >= 0 && y >= 0 && x < this.w && y < this.h
  }

  filled(x: number, y: number): boolean {
    return this.inside(x, y) && (this.mat[y * this.w + x] ?? -1) >= 0
  }

  toneAt(x: number, y: number): number {
    return this.filled(x, y) ? (this.tone[y * this.w + x] ?? 0) : -1
  }

  paint(x: number, y: number, ramp: number, tone: number): void {
    if (!this.inside(x, y)) return
    const i = y * this.w + x
    this.mat[i] = ramp
    this.tone[i] = Math.min(5, Math.max(1, Math.round(tone)))
  }

  /** Darkens (negative) or lightens (positive) a painted pixel, staying within tones 1–5. */
  shift(x: number, y: number, delta: number): void {
    if (!this.filled(x, y)) return
    const i = y * this.w + x
    this.tone[i] = Math.min(5, Math.max(1, (this.tone[i] ?? 3) + delta))
  }

  overlay(x: number, y: number, color: RGBA): void {
    if (this.inside(x, y)) this.overlays.push({ x, y, color })
  }

  /** A four-pointed glint: white core, pale gold arms fading out. */
  sparkle(cx: number, cy: number, size = 1): void {
    this.overlay(cx, cy, hex('#ffffff'))
    for (let d = 1; d <= size; d++) {
      const alpha = d === 1 ? 230 : 130
      const arm = hex('#fff1a6', alpha)
      this.overlay(cx + d, cy, arm)
      this.overlay(cx - d, cy, arm)
      this.overlay(cx, cy + d, arm)
      this.overlay(cx, cy - d, arm)
    }
  }

  render(): Uint8Array {
    const { w, h } = this
    const px = new Uint8Array(w * h * 4)
    const blend = (x: number, y: number, c: RGBA) => {
      const i = (y * w + x) * 4
      const sa = c[3] / 255
      const da = (px[i + 3] ?? 0) / 255
      const oa = sa + da * (1 - sa)
      if (oa === 0) return
      for (let k = 0; k < 3; k++) px[i + k] = Math.round(((c[k] ?? 0) * sa + (px[i + k] ?? 0) * da * (1 - sa)) / oa)
      px[i + 3] = Math.round(oa * 255)
    }
    const set = (x: number, y: number, c: RGBA) => {
      const i = (y * w + x) * 4
      px.set(c, i)
    }
    if (this.shadow) {
      const s = this.shadow
      for (let y = 0; y < h; y++)
        for (let x = 0; x < w; x++) {
          const dx = (x + 0.5 - s.cx) / s.rx
          const dy = (y + 0.5 - s.cy) / s.ry
          if (dx * dx + dy * dy <= 1) blend(x, y, [12, 10, 24, s.alpha])
        }
    }
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const i = y * w + x
        const m = this.mat[i] ?? -1
        if (m >= 0) set(x, y, this.ramps[m]?.[this.tone[i] ?? 3] ?? [255, 0, 255, 255])
      }
    const neighbors = [[0, -1], [-1, 0], [1, 0], [0, 1]] as const
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        if (this.filled(x, y)) continue
        for (const [dx, dy] of neighbors) {
          if (!this.filled(x + dx, y + dy)) continue
          const m = this.mat[(y + dy) * w + x + dx] ?? 0
          set(x, y, this.ramps[m]?.[0] ?? [0, 0, 0, 255])
          break
        }
      }
    for (const o of this.overlays) blend(o.x, o.y, o.color)
    return px
  }
}
