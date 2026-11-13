// `pnpm art:kit-farm` and `pnpm art:code-kits` (or the draw script with kit ids): draws kits and writes packages/art/<id>/atlas.png and atlas.json
// (P147). The code is the master; the same code writes the same pixels every run (P97).
import { mkdirSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { pack } from './atlas.js'
import { drawWave } from './farm/index.js'
import { KITS, kitById } from './kits.js'
import { encodePng, encodePngFiltered } from './png.js'

export const ART = new URL('../../../packages/art/', import.meta.url)

export function exportKit(id: string): { frames: number; bytes: number } {
  const kit = kitById(id)
  const { atlas, rgba } = pack(kit.id, drawWave(kit.specs, kit.drawers), kit.kind)
  const dir = new URL(`${kit.id}/`, ART)
  mkdirSync(dir, { recursive: true })
  const png = (kit.filtered ? encodePngFiltered : encodePng)(atlas.pages[0]!.width, atlas.pages[0]!.height, rgba)
  writeFileSync(new URL('atlas.png', dir), png)
  writeFileSync(new URL('atlas.json', dir), `${JSON.stringify(atlas, null, 2)}\n`)
  return { frames: Object.keys(atlas.frames).length, bytes: png.length }
}
/** kit-farm alone (its script), or the kits named, or every kit. */
export const exportKitFarm = () => exportKit('kit-farm')

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const ids = process.argv.slice(2).length ? process.argv.slice(2) : ['kit-farm']
  for (const id of ids[0] === 'all' ? KITS.map((k) => k.id) : ids) {
    const t0 = Date.now(), r = exportKit(id)
    console.log(`${id}: ${r.frames} frames, ${(r.bytes / 1e6).toFixed(2)} MB, ${Date.now() - t0} ms`)
  }
}
