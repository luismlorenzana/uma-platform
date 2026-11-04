import { Sprite } from '../sprite.ts'
import { groundTile } from '../tiles/ground.ts'
import { Img } from '../tiles/image.ts'
import { GROUND as TERRAIN } from '../tiles/terrain.ts'
import { BASE, SIZE } from './kit.ts'
import { PLACES } from './places.ts'

// New places above their neighbours: Gallery / Trials / Drills, then Sanctum / Scenario Gate / Rift.
export const COLLECTION_COMPARISON = ['gallery', 'trials', 'drill-yard', 'healer-sanctum', 'scenario-gate', 'rift'] as const
export function collectionsPreview(scale: number): Img {
  const pad = 8, cell = SIZE * scale, step = cell + pad
  const out = new Img(3 * step + pad, 2 * step + pad)
  for (const [i, id] of COLLECTION_COMPARISON.entries()) {
    const p = PLACES.find(p => p.id === id)
    if (!p) throw new Error(`Missing collections preview ${id}`)
    const left = pad + i % 3 * step, top = pad + Math.floor(i / 3) * step
    const ground = [0, 1, 2, 3].map(v => groundTile(TERRAIN[p.page], v))
    for (let y = 0; y < cell; y++) for (let x = 0; x < cell; x++) {
      const nx = Math.floor(x / scale), ny = Math.floor(y / scale)
      out.set(left + x, top + y, ground[(Math.floor(nx / 16) + 3 * Math.floor(ny / 16)) % 4]!.get(nx % 16, ny % 16))
    }
    const s = new Sprite(SIZE, SIZE)
    s.shadow = { cx: 24, cy: BASE + .5, rx: 20, ry: 3.2, alpha: 72 }
    p.paint(s)
    out.draw(new Img(SIZE, SIZE, s.render()).scaled(scale), left, top)
  }
  return out
}
