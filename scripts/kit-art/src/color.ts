// Colours for the kit painter: '#rrggbb' to 0–1 RGB, mixes and shades. Pure.
export type RGB = [number, number, number]
export type RGBA = [number, number, number, number]

export function hex(c: string): RGB {
  const n = Number.parseInt(c.slice(1), 16)
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]
}
export const mix = (a: RGB, b: RGB, t: number): RGB => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]
/** Lighter (t > 0, toward white) or darker (t < 0, toward black). */
export const shade = (c: RGB, t: number): RGB => (t >= 0 ? mix(c, [1, 1, 1], t) : mix(c, [0, 0, 0], -t))
/** A warm or cool tint: toward a light's colour. */
export const tint = (c: RGB, toward: RGB, t: number): RGB => mix(c, toward, t)
export const rgba = (c: RGB, a = 1): RGBA => [c[0], c[1], c[2], a]
export const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v)
export const smooth = (e0: number, e1: number, x: number) => { const t = clamp01((x - e0) / (e1 - e0)); return t * t * (3 - 2 * t) }
