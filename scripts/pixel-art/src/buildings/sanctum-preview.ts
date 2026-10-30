import { Sprite } from '../sprite.ts'
import { groundTile } from '../tiles/ground.ts'
import { Img } from '../tiles/image.ts'
import { GROUND as TERRAIN } from '../tiles/terrain.ts'
import { BASE, SIZE } from './kit.ts'
import { PLACES } from './places.ts'

/** H135 review only: familiar keep, new temple, familiar chapel on the same native Learning ground. */
export function sanctumPreview(): Img {
  const out = new Img(320, 112), ground = [0, 1, 2, 3].map(v => groundTile(TERRAIN.learning, v))
  for (let y = 0; y < out.h; y++) for (let x = 0; x < out.w; x++) {
    const tile = ground[(Math.floor(x / 32) + 3 * Math.floor(y / 32)) % 4]!
    out.set(x, y, tile.get(Math.floor(x / 2) % 16, Math.floor(y / 2) % 16))
  }
  for (const [i, id] of ['knights-bastion', 'healer-sanctum', 'cleric-chapel'].entries()) {
    const p = PLACES.find(p => p.id === id)
    if (!p) throw new Error(`Missing Sanctum comparison ${id}`)
    const s = new Sprite(SIZE, SIZE)
    s.shadow = { cx: 24, cy: BASE + .5, rx: 20, ry: 3.2, alpha: 72 }
    p.paint(s)
    out.draw(new Img(SIZE, SIZE, s.render()).scaled(2), 8 + i * 104, 8)
  }
  return out
}
