// H29: a dedicated 100-frame 320×320 sheet; never reuse or rewrite the racer's dishes.
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { hex } from '../color.ts'
import { encodePng } from '../png.ts'
import { contactSheet } from '../sheet.ts'
import { Img } from '../tiles/image.ts'
import { gemAtlas } from './atlas.ts'
import { drawGem } from './paint.ts'
import { GEM_SPECS, PLANETS } from './spec.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '../../../..')
const dir = join(root, 'packages/art/gems'), previews = join(root, 'assets/previews')
mkdirSync(dir, { recursive: true }); mkdirSync(previews, { recursive: true })
const { atlas, frames } = gemAtlas()
writeFileSync(join(dir, 'atlas.png'), encodePng(atlas.w, atlas.h, atlas.px))
writeFileSync(join(dir, 'atlas.json'), `${JSON.stringify({ schemaVersion: 1, width: atlas.w, height: atlas.h, frames }, null, 1)}\n`)
const rows = Array.from({ length: 10 }, (_, row) => GEM_SPECS.slice(row * 10, row * 10 + 10).map(drawGem))
for (const scale of [1, 2]) {
  const sheet = contactSheet(rows, scale, 8, hex('#0f141b'), hex('#18202a'))
  writeFileSync(join(previews, `gems-${scale}x.png`), encodePng(sheet.w, sheet.h, sheet.px))
}
// Contrast check against the actual planet fill, not just the dark inventory surface.
const contrast = new Img(8 * 64, 64)
Object.values(PLANETS).forEach((planet, i) => {
  contrast.copy(new Img(64, 64).fill(hex(planet.color)), i * 64, 0)
  contrast.draw(new Img(32, 32, drawGem(GEM_SPECS[i * 10 + 7]!)).scaled(2), i * 64, 0)
})
writeFileSync(join(previews, 'gems-planets-2x.png'), encodePng(contrast.w, contrast.h, contrast.px))
const cards = GEM_SPECS.map(spec => {
  const uri = `data:image/png;base64,${encodePng(32, 32, drawGem(spec)).toString('base64')}`
  return `<figure><img src="${uri}" width="64" height="64" alt="${spec.id} at 2×"><img src="${uri}" width="32" height="32" alt="${spec.id} at 1×"><figcaption>${spec.name}<small>${spec.id} · G${spec.grade}</small></figcaption></figure>`
}).join('')
writeFileSync(join(previews, 'gems.html'), `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Star Gems</title><style>body{background:#0f141b;color:#eef0f5;font:14px system-ui;padding:16px}.grid{display:grid;grid-template-columns:repeat(10,minmax(90px,1fr));gap:8px}figure{margin:0;background:#18202a;padding:8px;display:grid;justify-items:center;gap:6px}img{image-rendering:pixelated}figcaption{text-align:center;font-size:11px}small{display:block;color:#9aa4b2}</style><h1>Star Gems</h1><p>H29: rows HP, MP, ATK, M.ATK, DEF, M.DEF, Speed, Limit; then 16 bridges and 4 Sun prisms. Original 32px painters, 2× and native. Bottom-right 9×9 clear.</p><div class="grid">${cards}</div><h2>Planet backgrounds, G8 at 2×</h2><img src="gems-planets-2x.png" alt="Each planet's gem on its map colour"></html>`)
console.log(`Wrote ${GEM_SPECS.length} Star Gems (320×320), native/2×/planet previews; corners and glint clearances checked`)
