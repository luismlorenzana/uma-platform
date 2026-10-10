// Colors and hue-shifted tone ramps: shadows turn cool, highlights turn warm (classic pixel-art shading).

export type RGBA = readonly [number, number, number, number]

export function hex(value: string, alpha = 255): RGBA {
  const v = value.replace('#', '')
  const full = v.length === 3 ? v.split('').map((c) => c + c).join('') : v
  const n = Number.parseInt(full, 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255, alpha]
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  const rn = r / 255, gn = g / 255, bn = b / 255
  const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn)
  const l = (max + min) / 2
  if (max === min) return [0, 0, l]
  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  let h: number
  if (max === rn) h = (gn - bn) / d + (gn < bn ? 6 : 0)
  else if (max === gn) h = (bn - rn) / d + 2
  else h = (rn - gn) / d + 4
  return [h * 60, s, l]
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const hn = (((h % 360) + 360) % 360) / 360
  if (s === 0) {
    const v = Math.round(l * 255)
    return [v, v, v]
  }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s
  const p = 2 * l - q
  const channel = (t0: number) => {
    const t = (t0 + 1) % 1
    if (t < 1 / 6) return p + (q - p) * 6 * t
    if (t < 1 / 2) return q
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
    return p
  }
  return [Math.round(channel(hn + 1 / 3) * 255), Math.round(channel(hn) * 255), Math.round(channel(hn - 1 / 3) * 255)]
}

const clamp01 = (v: number) => Math.min(1, Math.max(0, v))

/** Turns hue `h` toward `target` by at most `deg` degrees, along the shorter arc. */
function turn(h: number, target: number, deg: number): number {
  const diff = ((target - h + 540) % 360) - 180
  return Math.abs(diff) <= deg ? target : h + Math.sign(diff) * deg
}

export interface RampOptions {
  /** How far each lighter tone moves toward white (0–1). */
  lift?: number
  /** How far each darker tone moves toward black (0–1). */
  drop?: number
  /** Degrees each tone turns toward warm (lighter) or cool (darker). */
  hueShift?: number
  /** Saturation added per darker tone and removed per lighter tone. */
  satShift?: number
}

const WARM = 55
const COOL = 245

/**
 * Six tones, darkest first:
 * 0 outline, 1 deep shadow, 2 shadow, 3 base, 4 light, 5 highlight.
 */
export function ramp(base: string, o: RampOptions = {}): RGBA[] {
  const lift = o.lift ?? 0.26
  const drop = o.drop ?? 0.24
  const hueShift = o.hueShift ?? 8
  const satShift = o.satShift ?? 0.05
  const [r, g, b] = hex(base)
  const [h, s, l] = rgbToHsl(r, g, b)
  const tones: RGBA[] = []
  for (let off = -3; off <= 2; off++) {
    const k = Math.abs(off)
    const hh = off === 0 ? h : turn(h, off < 0 ? COOL : WARM, hueShift * k)
    const ss = clamp01(off < 0 ? s + satShift * k : s - satShift * 1.6 * k)
    let ll = off < 0 ? l * (1 - drop * k) : l + (1 - l) * lift * k
    if (off === -3) ll = Math.min(l * 0.24, 0.16)
    const [rr, gg, bb] = hslToRgb(hh, off === -3 ? clamp01(s * 0.9 + 0.1) : ss, clamp01(ll))
    tones.push([rr, gg, bb, 255])
  }
  return tones
}
