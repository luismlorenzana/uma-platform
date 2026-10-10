// Draws the games' app icons into assets/app-icons/<game>/: pnpm art:icons
// Whole-number nearest-neighbour scaling keeps the pixels crisp; the 180 px Apple touch icon trims a 2 px border.
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { encodePng } from '../png.ts'
import { drawUmaRpgIcon, ICON_GRID } from './uma-rpg.ts'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..')

/** Crops `trim` pixels off each side, then scales by `scale` with nearest neighbour. */
function scaled(src: Uint8Array, grid: number, trim: number, scale: number): { size: number; px: Uint8Array } {
  const inner = grid - trim * 2
  const size = inner * scale
  const px = new Uint8Array(size * size * 4)
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const sx = trim + Math.floor(x / scale), sy = trim + Math.floor(y / scale)
      px.set(src.subarray((sy * grid + sx) * 4, (sy * grid + sx) * 4 + 4), (y * size + x) * 4)
    }
  return { size, px }
}

const dir = join(ROOT, 'assets', 'app-icons', 'uma-rpg')
mkdirSync(dir, { recursive: true })
const base = drawUmaRpgIcon()
const outputs: [string, number, number][] = [
  ['icon-64.png', 0, 1],
  ['icon-192.png', 0, 3],
  ['icon-512.png', 0, 8],
  ['apple-touch-icon.png', 2, 3],
]
for (const [name, trim, scale] of outputs) {
  const { size, px } = scaled(base, ICON_GRID, trim, scale)
  writeFileSync(join(dir, name), encodePng(size, size, px))
}
console.log(`Wrote ${outputs.map(([n]) => n).join(', ')} to ${relative(ROOT, dir)}`)
