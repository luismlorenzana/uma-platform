import { ramp } from '../color.ts'
import { Mask, shadeDome } from '../shape.ts'
import { Sprite } from '../sprite.ts'
import { Img } from '../tiles/image.ts'
import type { CalibrationBiome } from './spec.ts'

export function biomeIcon(biome: CalibrationBiome): Img {
  const s = new Sprite(16, 16)
  s.shadow = { cx: 8, cy: 14.2, rx: 5, ry: 1.2, alpha: 70 }
  if (biome === 'meadow') {
    const green = s.addRamp(ramp('#65ad49', { lift: 0.36, drop: 0.3 }))
    shadeDome(s, Mask.ellipse(8, 10.2, 6, 4.7, 0, 16, 16), green, { bias: 0.05, relief: 0.5, contact: false })
    const white = s.addRamp(ramp('#f5efd7', { lift: 0.4 })), gold = s.addRamp(ramp('#efca4c'))
    for (const [x, y] of [[5, 8], [10, 10]] as const) {
      s.paint(x - 1, y, white, 4); s.paint(x + 1, y, white, 3); s.paint(x, y - 1, white, 5); s.paint(x, y, gold, 4)
    }
  } else if (biome === 'volcano') {
    const rock = s.addRamp(ramp('#3b3035', { lift: 0.3, drop: 0.34 }))
    const cone = Mask.polygon([[2, 14], [6, 5], [8, 7], [10, 4], [14, 14]], 16, 16)
    shadeDome(s, cone, rock, { bias: -0.02, relief: 0.55, contact: false })
    const lava = s.addRamp(ramp('#f05a2a', { lift: 0.5, drop: 0.25 }))
    for (const [x, y, t] of [[7, 7, 5], [8, 8, 4], [8, 9, 5], [9, 10, 4], [9, 11, 3], [10, 12, 3]] as const) s.paint(x, y, lava, t)
  } else {
    const ice = s.addRamp(ramp('#77cbed', { lift: 0.55, drop: 0.3, satShift: 0.02 }))
    const shard = Mask.polygon([[3, 14], [6, 6], [8, 2], [10, 7], [13, 14]], 16, 16)
    shadeDome(s, shard, ice, { bias: 0.1, relief: 0.7, contact: false })
    for (const [x, y] of [[7, 4], [6, 7], [5, 10]] as const) s.paint(x, y, ice, 5)
  }
  return new Img(16, 16, s.render())
}
