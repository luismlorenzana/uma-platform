// A style's materials on one pen: the body in its base colour, the accent as paint and as light, and a few neutrals
// tinted toward the style, so a line of five reads as a set.
import { DECOR_COLORS, type Style } from './items.ts'
import { bodyTones, lightTones, matTones, mix, type Pen } from './kit.ts'

export interface Look {
  base: string
  accent: string
  /** The body: the style's base, lifted for the night wall. */
  body: number
  /** The base a step deeper, for frames, legs and recesses. */
  deep: number
  /** The accent as paint or fabric (not a light). */
  trim: number
  /** The accent as a light source: paint it, then `p.halo` it. */
  light: number
  /** Pale cloth (sheets, paper) tinted toward the accent. */
  cloth: number
  /** Cool metal tinted toward the base. */
  metal: number
}

export function look(p: Pen, style: Style): Look {
  const [base, accent] = DECOR_COLORS[style]
  return {
    base,
    accent,
    body: p.tones(bodyTones(base)),
    deep: p.tones(bodyTones(base, -.02)),
    trim: p.tones(matTones(accent, { lift: .32, drop: .3 })),
    light: p.tones(lightTones(accent)),
    cloth: p.tones(matTones(mix('#d9dcef', accent, .16), { lift: .3, drop: .2 })),
    metal: p.tones(matTones(mix('#7c8698', base, .3), { lift: .34, drop: .3 })),
  }
}
