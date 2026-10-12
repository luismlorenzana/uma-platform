import { ramp } from '../color.ts'
import { Mask, shadeDome } from '../shape.ts'
import { Sprite } from '../sprite.ts'
import { Img } from '../tiles/image.ts'
import { stroke } from '../tiles/props/kit.ts'
import { drawWorldProp, worldProp } from './props.ts'
import { BIOMES, type Biome } from './spec.ts'

export function biomeIcon(biome: Biome): Img {
  const s = new Sprite(16, 16)
  s.shadow = { cx: 8, cy: 14.2, rx: 5, ry: 1.2, alpha: 70 }
  if (biome === 'meadow') {
    const green = s.addRamp(ramp('#65ad49', { lift: 0.36, drop: 0.3 }))
    shadeDome(s, Mask.ellipse(8, 10.2, 6, 4.7, 0, 16, 16), green, { bias: 0.05, relief: 0.5, contact: false })
    const white = s.addRamp(ramp('#f5efd7', { lift: 0.4 })), gold = s.addRamp(ramp('#efca4c'))
    for (const [x, y] of [[5, 8], [10, 10]] as const) {
      s.paint(x - 1, y, white, 4); s.paint(x + 1, y, white, 3); s.paint(x, y - 1, white, 5); s.paint(x, y, gold, 4)
    }
  } else if (biome === 'forest') {
    const green = s.addRamp(ramp('#32754a')), bark = s.addRamp(ramp('#8b6844'))
    stroke(s, 8, 10, 8, 14, bark, 3)
    for (const [top, bottom, width] of [[2, 8, 3], [5, 12, 5]] as const)
      shadeDome(s, Mask.polygon([[8, top], [8 + width, bottom], [8 - width, bottom]], 16, 16), green, { relief: 0.5, contact: false })
  } else if (biome === 'coast') {
    const sand = s.addRamp(ramp('#dac99b')), sea = s.addRamp(ramp('#4bb3b0')), leaf = s.addRamp(ramp('#5b9865')), bark = s.addRamp(ramp('#a67c4c'))
    shadeDome(s, Mask.ellipse(8, 12, 6, 2.5, 0, 16, 16), sea, { relief: 0.4, contact: false })
    shadeDome(s, Mask.ellipse(7, 11, 4, 2, 0, 16, 16), sand, { relief: 0.3, contact: false })
    stroke(s, 7, 11, 8, 5, bark, 4)
    for (const [x, y] of [[3, 5], [5, 3], [11, 3], [13, 6], [11, 8]] as const) stroke(s, 8, 5, x, y, leaf, x < 8 ? 4 : 2)
  } else if (biome === 'volcano') {
    const rock = s.addRamp(ramp('#3b3035', { lift: 0.3, drop: 0.34 }))
    const cone = Mask.polygon([[2, 14], [6, 5], [8, 7], [10, 4], [14, 14]], 16, 16)
    shadeDome(s, cone, rock, { bias: -0.02, relief: 0.55, contact: false })
    const lava = s.addRamp(ramp('#f05a2a', { lift: 0.5, drop: 0.25 }))
    for (const [x, y, t] of [[7, 7, 5], [8, 8, 4], [8, 9, 5], [9, 10, 4], [9, 11, 3], [10, 12, 3]] as const) s.paint(x, y, lava, t)
  } else if (biome === 'glacier') {
    const ice = s.addRamp(ramp('#77cbed', { lift: 0.55, drop: 0.3, satShift: 0.02 }))
    const shard = Mask.polygon([[3, 14], [6, 6], [8, 2], [10, 7], [13, 14]], 16, 16)
    shadeDome(s, shard, ice, { bias: 0.1, relief: 0.7, contact: false })
    for (const [x, y] of [[7, 4], [6, 7], [5, 10]] as const) s.paint(x, y, ice, 5)
  } else {
    // The biome's signature landmark at icon scale, on a small ground chip. Native alpha is preserved.
    const chip = s.addRamp(ramp(BIOMES[biome].base, { lift: 0.28, drop: 0.22 }))
    shadeDome(s, Mask.ellipse(8, 13, 6, 2, 0, 16, 16), chip, { relief: 0.3, contact: false })
    const landmark = drawWorldProp(worldProp(BIOMES[biome].props[0]!)).scaled(0.5)
    return new Img(16, 16, s.render()).draw(landmark, 4, 15 - landmark.h)
  }
  return new Img(16, 16, s.render())
}
