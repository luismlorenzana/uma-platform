// Builds shared Hub terrain: 16×16 ground, path and stream autotiles plus props, packed into
// packages/art/tiles/atlas.png + atlas.json, with a 3× contact sheet and sample pages in assets/previews/tiles.{png,html}.
// Run from the repo root: pnpm --filter @uma-platform/pixel-art exec tsx src/tiles/build.ts
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { hex } from '../color.ts'
import { encodePng } from '../png.ts'
import { Sprite } from '../sprite.ts'
import { MASKS } from './autotile.ts'
import { battleHubMap } from './battle-map.ts'
import { autotileSeams, groundSeams } from './check.ts'
import { groundTile } from './ground.ts'
import { Img } from './image.ts'
import { MAP_COLS, MAP_ROWS, pathNetwork, type PropSprite, sampleMap, stream } from './maps.ts'
import { TILE } from './noise.ts'
import { FARMLANDS_PROPS } from './props/farmlands.ts'
import { BATTLE_PROPS } from './props/battle.ts'
import { LEARNING_PROPS } from './props/learning.ts'
import { RACING_PROPS } from './props/racing.ts'
import { TOWN_PROPS } from './props/town.ts'
import type { Prop } from './props/types.ts'
import { WILDS_PROPS } from './props/wilds.ts'
import { racingHubMap } from './racing-map.ts'
import { GROUND, type Page, PAGES, PATH, WATER } from './terrain.ts'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..')
const PROPS: Record<Page, readonly Prop[]> = { farmlands: FARMLANDS_PROPS, wilds: WILDS_PROPS, learning: LEARNING_PROPS, town: TOWN_PROPS, racing: RACING_PROPS, battle: BATTLE_PROPS }

/** How props are scattered on the sample pages: beside the paths or out in the open, and how often. */
const PLACEMENT: Record<string, [PropSprite['near'], number]> = {
  'farmlands/bush': ['open', 3], 'farmlands/flowers-a': ['open', 3], 'farmlands/flowers-b': ['open', 2], 'farmlands/hay-bale': ['open', 1],
  'farmlands/fence': ['path', 2], 'farmlands/tree': ['open', 3], 'farmlands/rock': ['open', 1],
  'wilds/pine': ['open', 5], 'wilds/boulder': ['open', 1], 'wilds/rock': ['open', 2], 'wilds/grass-tuft': ['open', 3],
  'wilds/mushrooms': ['open', 1], 'wilds/log': ['path', 1],
  'learning/lamp': ['path', 3], 'learning/hedge': ['open', 3], 'learning/bench': ['path', 2], 'learning/banner': ['path', 1],
  'learning/flower-bed': ['open', 2],
  'town/lamp': ['path', 3], 'town/barrel': ['path', 2], 'town/crate': ['path', 2], 'town/flower-pot': ['path', 2],
  'town/bench': ['path', 2], 'town/tree': ['open', 3],
  'racing/rail': ['path', 3], 'racing/furlong-post': ['path', 2], 'racing/pennant': ['open', 1],
  'racing/flower-box': ['path', 2],
  'battle/banner': ['path', 1], 'battle/weapon-rack': ['path', 2], 'battle/training-dummy': ['open', 2],
  'battle/torch': ['path', 2], 'battle/crate': ['open', 1], 'battle/shield-stand': ['path', 1],
}

type Kind = 'ground' | 'path' | 'water' | 'prop'
interface Frame {
  id: string
  page: Page
  kind: Kind
  img: Img
  col: number
  row: number
}

function drawProp(p: Prop): Img {
  const s = new Sprite(p.w, p.h)
  s.shadow = p.shadow
  p.paint(s)
  return new Img(p.w, p.h, s.render())
}

// ------------------------------------------------------------------------------------------------- draw and check

const frames: Frame[] = []
const problems: string[] = []
const maps: Record<string, Img> = {}
let row = 0
for (const page of PAGES) {
  const ground = [0, 1, 2, 3].map((v) => groundTile(GROUND[page], v))
  const base = ground[0] ?? new Img(TILE, TILE)
  const paths = MASKS.map((m) => PATH[page](m, base))
  problems.push(...groundSeams(page, ground), ...autotileSeams(`${page}/path`, paths, base))
  paths.forEach((img, m) => frames.push({ id: `${page}/path-${m}`, page, kind: 'path', img, col: m, row }))
  row++
  let water: Img[] = []
  if (page === 'wilds') {
    water = MASKS.map((m) => WATER(m, base))
    problems.push(...autotileSeams(`${page}/water`, water, base))
    water.forEach((img, m) => frames.push({ id: `${page}/water-${m}`, page, kind: 'water', img, col: m, row }))
    row++
  }
  ground.forEach((img, v) => frames.push({ id: `${page}/ground-${v}`, page, kind: 'ground', img, col: v, row }))
  // Short props follow the ground on its row; tall props take two rows at the end.
  const props = PROPS[page].map((p) => ({ p, img: drawProp(p) }))
  let col = 4
  for (const { p, img } of [...props.filter((q) => q.p.h <= TILE), ...props.filter((q) => q.p.h > TILE)]) frames.push({ id: `${page}/${p.id}`, page, kind: 'prop', img, col: col++, row })
  row += 2

  // A sample page.
  const sprites: PropSprite[] = props.map(({ p, img }) => {
    const [near, weight] = PLACEMENT[`${page}/${p.id}`] ?? ['open', 1]
    return { id: p.id, img, near, weight }
  })
  const wet = page === 'wilds' ? stream(page) : new Set<string>()
  const nearWater = (x: number, y: number) => [-1, 0, 1].some((dx) => [-1, 0, 1].some((dy) => wet.has(`${x + dx},${y + dy}`)))
  const dry = pathNetwork(page, nearWater, page === 'wilds' ? 7 : MAP_COLS - 1)
  const layers = [{ cells: dry, on: (x: number, y: number) => dry.has(`${x},${y}`), tiles: paths }]
  if (water.length) layers.push({ cells: wet, on: (x: number, y: number) => wet.has(`${x},${y}`), tiles: water })
  maps[page] = sampleMap(page, ground, layers, sprites)
  if (page === 'racing') maps['racing-hub'] = racingHubMap(ground, paths, sprites)
  if (page === 'battle') maps['battle-hub'] = battleHubMap(ground, paths, sprites)
}
if (problems.length) {
  console.error(`Seam check failed:\n${problems.join('\n')}`)
  process.exit(1)
}

// ------------------------------------------------------------------------------------------------- atlas

const COLS = 16
const atlas = new Img(COLS * TILE, row * TILE)
const index: Record<string, { x: number; y: number; w: number; h: number; page: Page; kind: Kind }> = {}
const KINDS: readonly Kind[] = ['ground', 'path', 'water', 'prop']
const listed = [...frames].sort((a, b) => PAGES.indexOf(a.page) - PAGES.indexOf(b.page) || KINDS.indexOf(a.kind) - KINDS.indexOf(b.kind))
for (const f of listed) {
  atlas.copy(f.img, f.col * TILE, f.row * TILE)
  index[f.id] = { x: f.col * TILE, y: f.row * TILE, w: f.img.w, h: f.img.h, page: f.page, kind: f.kind }
}
const atlasDir = join(ROOT, 'packages', 'art', 'tiles')
mkdirSync(atlasDir, { recursive: true })
writeFileSync(join(atlasDir, 'atlas.png'), encodePng(atlas.w, atlas.h, atlas.px))
writeFileSync(join(atlasDir, 'atlas.json'), `${JSON.stringify({ schemaVersion: 1, width: atlas.w, height: atlas.h, frames: index }, null, 1)}\n`)

// ------------------------------------------------------------------------------------------------- previews

const SCALE = 3, PAD = 6, GAP = 18
const BG = hex('#0f141b'), CELL = hex('#18202a')
const cellPx = TILE * SCALE
const bandRows = (page: Page) => frames.filter((f) => f.page === page).reduce((n, f) => Math.max(n, f.row + f.img.h / TILE), 0) - Math.min(...frames.filter((f) => f.page === page).map((f) => f.row))
const sheetW = COLS * (cellPx + PAD) + PAD
const sheetH = PAGES.reduce((h, p) => h + bandRows(p) * (cellPx + PAD) + GAP, PAD)
const mapW = MAP_COLS * TILE, mapH = MAP_ROWS * TILE
const mapsW = PAGES.length * mapW + (PAGES.length - 1) * GAP
const sheet = new Img(Math.max(sheetW, mapsW + 2 * PAD), sheetH + mapH + PAD).fill(BG)
let top = PAD
for (const page of PAGES) {
  const first = Math.min(...frames.filter((f) => f.page === page).map((f) => f.row))
  for (const f of frames.filter((q) => q.page === page)) {
    const x = PAD + f.col * (cellPx + PAD), y = top + (f.row - first) * (cellPx + PAD)
    const h = f.img.h * SCALE + (f.img.h / TILE - 1) * PAD
    sheet.copy(new Img(cellPx, h).fill(CELL), x, y)
    sheet.draw(f.img.scaled(SCALE), x, y + h - f.img.h * SCALE)
  }
  top += bandRows(page) * (cellPx + PAD) + GAP
}
const mapsLeft = Math.floor((sheet.w - mapsW) / 2)
PAGES.forEach((page, i) => {
  const m = maps[page]
  if (m) sheet.copy(m, mapsLeft + i * (mapW + GAP), sheetH)
})
const previews = join(ROOT, 'assets', 'previews')
mkdirSync(previews, { recursive: true })
writeFileSync(join(previews, 'tiles.png'), encodePng(sheet.w, sheet.h, sheet.px))
const racing = maps.racing!.scaled(2)
writeFileSync(join(previews, 'racing-tiles-2x.png'), encodePng(racing.w, racing.h, racing.px))
const hub = maps['racing-hub']!.scaled(2)
writeFileSync(join(previews, 'racing-hub-2x.png'), encodePng(hub.w, hub.h, hub.px))
for (const name of ['battle', 'battle-hub']) {
  const img = maps[name]!.scaled(2)
  writeFileSync(join(previews, `${name === 'battle' ? 'battle-tiles' : name}-2x.png`), encodePng(img.w, img.h, img.px))
}

const uri = (img: Img) => `data:image/png;base64,${encodePng(img.w, img.h, img.px).toString('base64')}`
const sections = PAGES.map((page) => {
  const cards = (kind: Kind) =>
    frames
      .filter((f) => f.page === page && f.kind === kind)
      .map((f) => `<figure class="${kind}"><img src="${uri(f.img)}" width="${f.img.w * 3}" height="${f.img.h * 3}" alt=""><figcaption>${f.id.split('/')[1]}</figcaption></figure>`)
      .join('')
  const m = maps[page]
  const map = m ? `<div class="maps"><img src="${uri(m)}" width="${m.w}" height="${m.h}" alt="Sample ${page} page at 1×"><img src="${uri(m)}" width="${m.w * 2}" height="${m.h * 2}" alt="Sample ${page} page at 2×"></div>` : ''
  return `<section><h2>${page}</h2><h3>Ground</h3><div class="grid">${cards('ground')}</div><h3>Paths (mask: 1 N, 2 E, 4 S, 8 W)</h3><div class="grid">${cards('path')}</div>${page === 'wilds' ? `<h3>Stream</h3><div class="grid">${cards('water')}</div>` : ''}<h3>Props</h3><div class="grid">${cards('prop')}</div><h3>Sample page, 1× and 2× (as in the game)</h3>${map}</section>`
})
writeFileSync(
  join(previews, 'tiles.html'),
  `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Hub tiles</title><style>
:root{color-scheme:dark}body{margin:0;padding:16px;background:#0f141b;color:#e6e9ee;font:14px/1.4 system-ui,sans-serif}
h1{font-size:18px;margin:0 0 4px}p{color:#9aa4b2;margin:0 0 16px}h2{font-size:15px;margin:24px 0 8px;text-transform:capitalize}h3{font-size:12px;color:#9aa4b2;margin:12px 0 6px;font-weight:600}
.grid{display:flex;flex-wrap:wrap;gap:8px;align-items:flex-end}figure{margin:0;padding:6px;background:#18202a;border-radius:6px;display:grid;justify-items:center;gap:4px}
img{image-rendering:pixelated}figcaption{color:#9aa4b2;font-size:11px}.maps{display:flex;gap:16px;align-items:flex-start;overflow-x:auto}
</style></head><body><h1>Hub tiles</h1><p>16×16 terrain and props for the shared Hub pages, shown at 3×; sample pages are ${MAP_COLS} × ${MAP_ROWS} tiles. Generated by uma-platform scripts/pixel-art/src/tiles.</p>${sections.join('')}</body></html>`,
)
console.log(`Wrote ${frames.length} frames (${atlas.w}×${atlas.h}) to ${relative(ROOT, atlasDir)} and previews to ${relative(ROOT, previews)}; seams clean`)
