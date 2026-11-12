// The live grade (uma-platform ST2; uma-farm F57's ask 12, KF10): the light and colour a game sets per scene, so the
// farm's four seasons, and its nights, are light rather than repainted tiles. The kit is lit by the sky and key lights,
// the sprites and standees are tinted, the sky behind the world takes the background, and the kit's lamps fade in and
// out. Pure: the values and their blend; the stage applies them.

export interface StageGrade {
  /** The sky light's colours, from above and from the ground, and its strength. */
  sky: string
  ground: string
  skyLight: number
  /** The key light (the sun, top front-left) and its strength. */
  sun: string
  sunLight: number
  /** The sprites' and standees' base tint ('#ffffff' leaves them as drawn). */
  tint: string
  /** What shows behind the world. */
  background: string
  /** The kit's live lights (lanterns, the forge), 0 off to 1 full. */
  lamps: number
}

/** uma-quest's light (its engine's), the grade a stage starts in. */
export const DAY_GRADE: StageGrade = {
  sky: '#dfe8ff', ground: '#3a3226', skyLight: 1.5, sun: '#fff1d6', sunLight: 1.3, tint: '#ffffff', background: '#232a38', lamps: 1,
}

const hex = (c: string): [number, number, number] => {
  const n = Number.parseInt(c.replace('#', ''), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}
const mixHex = (a: string, b: string, t: number): string => {
  const x = hex(a), y = hex(b)
  return `#${x.map((v, i) => Math.round(v + (y[i]! - v) * t).toString(16).padStart(2, '0')).join('')}`
}
const mix = (a: number, b: number, t: number) => a + (b - a) * t

/** A grade `t` (0–1) of the way from `a` to `b`. */
export function mixGrade(a: StageGrade, b: StageGrade, t: number): StageGrade {
  const k = Math.min(1, Math.max(0, t))
  return {
    sky: mixHex(a.sky, b.sky, k), ground: mixHex(a.ground, b.ground, k), skyLight: mix(a.skyLight, b.skyLight, k),
    sun: mixHex(a.sun, b.sun, k), sunLight: mix(a.sunLight, b.sunLight, k), tint: mixHex(a.tint, b.tint, k),
    background: mixHex(a.background, b.background, k), lamps: mix(a.lamps, b.lamps, k),
  }
}

/** Whether a grade's colours are all '#rrggbb' and its strengths in range. */
export function validGrade(g: StageGrade): boolean {
  const c = /^#[0-9a-f]{6}$/i
  return [g.sky, g.ground, g.sun, g.tint, g.background].every((x) => c.test(x)) && g.skyLight >= 0 && g.sunLight >= 0 && g.lamps >= 0 && g.lamps <= 1
}
