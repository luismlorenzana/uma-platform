// `pnpm art:kit-farm`: draws kit-farm and writes packages/art/kit-farm/atlas.png and atlas.json (P147). The code is the
// master; the same code writes the same pixels every run (P97).
import { mkdirSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { pack } from './atlas.js'
import { drawWave } from './farm/index.js'
import { encodePng } from './png.js'

export const ART = new URL('../../../packages/art/', import.meta.url)

export function exportKitFarm(): { frames: number } {
  const { atlas, rgba } = pack('kit-farm', drawWave())
  const dir = new URL('kit-farm/', ART)
  mkdirSync(dir, { recursive: true })
  writeFileSync(new URL('atlas.png', dir), encodePng(atlas.pages[0]!.width, atlas.pages[0]!.height, rgba))
  writeFileSync(new URL('atlas.json', dir), `${JSON.stringify(atlas, null, 2)}\n`)
  return { frames: Object.keys(atlas.frames).length }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const t0 = Date.now(), r = exportKitFarm()
  console.log(`kit-farm: ${r.frames} frames in ${Date.now() - t0} ms`)
}
