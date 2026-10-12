// World art part 2: atlas + complete 3× frame sheet, nineteen region examples, a three-band continent, and 2× phone plots.
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { hex } from '../color.ts'
import { encodePng } from '../png.ts'
import { Img } from '../tiles/image.ts'
import { packWorld, worldFrames } from './atlas.ts'
import { checkWorldFrames } from './check.ts'
import { biomePlot, regionPreview, sampleContinentStrip } from './maps.ts'
import { BIOME_IDS } from './spec.ts'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..')
const frames = worldFrames(BIOME_IDS, true), problems = checkWorldFrames(frames, BIOME_IDS, true)
if (problems.length) throw new Error(`World contract failed:\n${problems.join('\n')}`)
const { atlas, index } = packWorld(frames)
const dir = join(ROOT, 'packages', 'art', 'world'), previews = join(ROOT, 'assets', 'previews')
mkdirSync(dir, { recursive: true }); mkdirSync(previews, { recursive: true })
writeFileSync(join(dir, 'atlas.png'), encodePng(atlas.w, atlas.h, atlas.px))
writeFileSync(join(dir, 'atlas.json'), `${JSON.stringify({ schemaVersion: 1, width: atlas.w, height: atlas.h, frames: index }, null, 1)}\n`)

const groups = [
  { name: 'Ground', list: frames.filter((f) => f.group === 'ground') },
  { name: 'Props', list: frames.filter((f) => f.group === 'prop') },
  ...['water', 'lava', 'marsh', 'ice', 'void', 'cloud'].map((kind) => ({ name: `Liquid: ${kind} (NW 1, NE 2, SE 4, SW 8)`, list: frames.filter((f) => f.id.startsWith(`liquid/${kind}-`)) })),
  ...['dirt', 'stone', 'boards'].map((kind) => ({ name: `Road: ${kind} (N 1, E 2, S 4, W 8)`, list: frames.filter((f) => f.id.startsWith(`road/${kind}-`)) })),
  { name: 'Stages and frontier', list: frames.filter((f) => f.group === 'marker' && f.h === 16) },
  { name: 'Springs, flags and capital', list: frames.filter((f) => f.group === 'marker' && f.h > 16) },
  { name: 'Biome icons', list: frames.filter((f) => f.group === 'icon') },
]
const maps = BIOME_IDS.map((biome) => ({ biome, img: regionPreview(biome) }))
const continent = sampleContinentStrip()
const plots = BIOME_IDS.map((biome) => ({ biome, img: biomePlot(biome) }))

const PAD = 8, GAP = 12, SLOT = 56, COLS = 16, BG = hex('#0f141b'), CELL = hex('#18202a')
const groupHeights = groups.map((g) => Math.ceil(g.list.reduce((n, f) => n + f.w / 16, 0) / COLS) * (Math.max(...g.list.map((f) => f.h)) * 3 + PAD) + GAP)
const framesH = groupHeights.reduce((n, h) => n + h, PAD)
const MAP_COLUMNS = 5, mapWidth = MAP_COLUMNS * 256 + (MAP_COLUMNS - 1) * GAP
const mapsH = Math.ceil(maps.length / MAP_COLUMNS) * (448 + GAP)
const sheet = new Img(mapWidth + PAD * 2, framesH + mapsH + 192 + PAD * 2).fill(BG)
let top = PAD
groups.forEach((g, gi) => {
  const height = Math.max(...g.list.map((f) => f.h)) * 3, left = Math.floor((sheet.w - COLS * SLOT) / 2)
  let col = 0, row = 0
  for (const f of g.list) {
    const span = f.w / 16
    if (col + span > COLS) { col = 0; row++ }
    const x = left + col * SLOT, y = top + row * (height + PAD)
    sheet.copy(new Img(span * SLOT - PAD, height).fill(CELL), x, y)
    sheet.draw(f.img.scaled(3), x, y + height - f.h * 3)
    col += span
  }
  top += groupHeights[gi]!
})
maps.forEach((m, i) => sheet.draw(m.img, PAD + (i % MAP_COLUMNS) * (256 + GAP), framesH + Math.floor(i / MAP_COLUMNS) * (448 + GAP)))
sheet.draw(continent, Math.floor((sheet.w - continent.w) / 2), framesH + mapsH)
writeFileSync(join(previews, 'world.png'), encodePng(sheet.w, sheet.h, sheet.px))
for (const { biome, img } of maps) {
  const scaled = img.scaled(2)
  writeFileSync(join(previews, `world-${biome}.png`), encodePng(scaled.w, scaled.h, scaled.px))
}
const strip = continent.scaled(2)
writeFileSync(join(previews, 'world-continent.png'), encodePng(strip.w, strip.h, strip.px))
const plotSheet = new Img(5 * 128 + 6 * PAD, Math.ceil(plots.length / 5) * (96 + PAD) + PAD).fill(BG)
plots.forEach((p, i) => plotSheet.draw(p.img.scaled(2), PAD + (i % 5) * (128 + PAD), PAD + Math.floor(i / 5) * (96 + PAD)))
writeFileSync(join(previews, 'world-plots.png'), encodePng(plotSheet.w, plotSheet.h, plotSheet.px))
const markerFrames = frames.filter((f) => f.group === 'marker')
const markerSheet = new Img(markerFrames.reduce((n, f) => n + f.w + 4, 4), 56).fill(BG)
let markerX = 4
for (const f of markerFrames) { markerSheet.draw(f.img, markerX, 52 - f.h); markerX += f.w + 4 }
writeFileSync(join(previews, 'world-markers-1x.png'), encodePng(markerSheet.w, markerSheet.h, markerSheet.px))

const uri = (img: Img) => `data:image/png;base64,${encodePng(img.w, img.h, img.px).toString('base64')}`
const cards = groups.map((g) => `<section><h2>${g.name}</h2><div class="cards">${g.list.map((f) => `<figure><img src="${uri(f.img)}" width="${f.w * 3}" height="${f.h * 3}" alt="${f.id}"><figcaption>${f.id}</figcaption></figure>`).join('')}</div></section>`).join('')
const plotCards = plots.map((p) => `<figure><img src="${uri(p.img)}" width="128" height="96" alt="${p.biome}, 4 by 3 tiles at 2×"><figcaption>${p.biome}</figcaption></figure>`).join('')
const regionCards = maps.map((m) => `<section id="${m.biome}"><h2>${m.biome}: region, 2×</h2><div class="region"><img src="${uri(m.img)}" width="512" height="896" alt="${m.biome} region at 2×"></div><details><summary>Full region, 1×</summary><img src="${uri(m.img)}" width="256" height="448" alt="${m.biome} at 1×"></details></section>`).join('')
writeFileSync(join(previews, 'world.html'), `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>World atlas — part 2</title><style>
:root{color-scheme:dark}body{margin:0;padding:8px;background:#0f141b;color:#e6e9ee;font:14px/1.4 system-ui,sans-serif}h1{font-size:20px}h2{font-size:16px;margin:24px 0 8px}p,figcaption{color:#a1acba}img{image-rendering:pixelated;display:block}figure{margin:0;padding:6px;background:#18202a;border-radius:5px}figcaption{font-size:11px;margin-top:5px}.cards,.plots{display:flex;flex-wrap:wrap;gap:8px;align-items:flex-end}.region{width:min(100%,512px);overflow:hidden;border:1px solid #293545}.region img{max-width:none}@media(max-width:520px){.region img{margin-left:-96px}}.strip{overflow:auto}details{margin:10px 0}a{color:#d9c999}
</style></head><body><h1>World atlas, part 2</h1><p>All nineteen biomes and ocean. All 310 frames are shown at 3×; comparison plots and maps are 2×. The first four stages are cleared, stage five wears the frontier ring, and the elite and boss remain locked. Original code-drawn art only.</p><nav>${BIOME_IDS.map((b) => `<a href="#${b}">${b}</a>`).join(' · ')}</nav><h2>4×3-tile plots, 2×</h2><div class="plots">${plotCards}</div><h2>Markers, native 1×</h2><img src="${uri(markerSheet)}" width="${markerSheet.w}" height="${markerSheet.h}" alt="Nine stage symbols, two rings, Springs, flags and capital at 1×"><h2>Three level bands, 2×</h2><div class="strip"><img src="${uri(continent)}" width="512" height="384" alt="Three-band continent with alternating connectors and a ready Spring"></div>${regionCards}${cards}</body></html>`)
console.log(`Wrote ${frames.length} world frames (${atlas.w}×${atlas.h}) to ${relative(ROOT, dir)} and 2× previews; seams and ground lines clean`)
