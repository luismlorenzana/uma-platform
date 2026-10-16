// Draws uma-rpg's 36 Hub places as 48×48 map sprites into packages/art/buildings (atlas.png + atlas.json), with a
// preview in assets/previews/buildings.{png,html}: a 3× contact sheet and one mock page per Hub page.
// Run from the repo root: pnpm --filter @uma-platform/pixel-art exec tsx src/buildings/build.ts
// Set REVIEW_DIR to also write larger per-page review sheets there.
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { hex, type RGBA } from '../color.ts'
import { encodePng } from '../png.ts'
import { Sprite } from '../sprite.ts'
import { BASE, GROUND, SIZE } from './kit.ts'
import { PLACES } from './places.ts'
import type { Page, PaintExtras } from './types.ts'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..')
const COLUMNS = 6

interface Image {
  w: number
  h: number
  px: Uint8Array
}

function image(w: number, h: number, bg: RGBA): Image {
  const px = new Uint8Array(w * h * 4)
  for (let i = 0; i < w * h; i++) px.set(bg, i * 4)
  return { w, h, px }
}

/** Alpha-blends `src` (SIZE×SIZE) onto `dst` at (ox, oy), scaled by `scale` with nearest neighbour. */
function stamp(dst: Image, src: Uint8Array, ox: number, oy: number, scale = 1): void {
  for (let y = 0; y < SIZE * scale; y++)
    for (let x = 0; x < SIZE * scale; x++) {
      const dx = ox + x, dy = oy + y
      if (dx < 0 || dy < 0 || dx >= dst.w || dy >= dst.h) continue
      const i = (Math.floor(y / scale) * SIZE + Math.floor(x / scale)) * 4
      const a = (src[i + 3] ?? 0) / 255
      if (a === 0) continue
      const o = (dy * dst.w + dx) * 4
      for (let k = 0; k < 3; k++) dst.px[o + k] = Math.round((src[i + k] ?? 0) * a + (dst.px[o + k] ?? 0) * (1 - a))
    }
}

function scaleImage(src: Image, scale: number): Image {
  const out = image(src.w * scale, src.h * scale, [0, 0, 0, 255])
  for (let y = 0; y < out.h; y++)
    for (let x = 0; x < out.w; x++) {
      const i = (Math.floor(y / scale) * src.w + Math.floor(x / scale)) * 4
      out.px.set(src.px.subarray(i, i + 4), (y * out.w + x) * 4)
    }
  return out
}

function paste(dst: Image, src: Image, ox: number, oy: number): void {
  for (let y = 0; y < src.h; y++) dst.px.set(src.px.subarray(y * src.w * 4, (y + 1) * src.w * 4), ((oy + y) * dst.w + ox) * 4)
}

// ---------------------------------------------------------------------------------------------------------------
// Draw every place.

const problems: string[] = []
const drawn = PLACES.map((place) => {
  const s = new Sprite(SIZE, SIZE)
  // A soft contact shadow under the footprint; painters may resize it.
  s.shadow = { cx: SIZE / 2, cy: BASE + 0.5, rx: 20, ry: 3.2, alpha: 72 }
  const extras: PaintExtras = place.paint(s) ?? {}
  const px = s.render()
  // Nothing may touch the frame's edge columns or rows, so no frame bleeds into its neighbour when sampled.
  for (let i = 0; i < SIZE; i++)
    for (const [x, y] of [[i, 0], [0, i], [SIZE - 1, i], [i, SIZE - 1]] as const)
      if ((px[(y * SIZE + x) * 4 + 3] ?? 0) > 0) problems.push(`${place.id} touches the frame edge at ${x},${y}`)
  return { place, px, extras }
})

// ---------------------------------------------------------------------------------------------------------------
// Atlas: six across, in Hub order.

const rows = Math.ceil(drawn.length / COLUMNS)
const atlas = image(COLUMNS * SIZE, rows * SIZE, [0, 0, 0, 0])
const frames: Record<string, { x: number; y: number; w: number; h: number; page: Page; anchorY: number; smoke?: { x: number; y: number } }> = {}
drawn.forEach(({ place, px, extras }, i) => {
  const x = (i % COLUMNS) * SIZE, y = Math.floor(i / COLUMNS) * SIZE
  for (let r = 0; r < SIZE; r++) atlas.px.set(px.subarray(r * SIZE * 4, (r + 1) * SIZE * 4), ((y + r) * atlas.w + x) * 4)
  frames[place.id] = { x, y, w: SIZE, h: SIZE, page: place.page, anchorY: GROUND, ...(extras.smoke ? { smoke: extras.smoke } : {}) }
})
const atlasDir = join(ROOT, 'packages', 'art', 'buildings')
mkdirSync(atlasDir, { recursive: true })
const atlasPng = encodePng(atlas.w, atlas.h, atlas.px)
writeFileSync(join(atlasDir, 'atlas.png'), atlasPng)
writeFileSync(join(atlasDir, 'atlas.json'), `${JSON.stringify({ schemaVersion: 1, width: atlas.w, height: atlas.h, frames }, null, 1)}\n`)

// ---------------------------------------------------------------------------------------------------------------
// Previews: the contact sheet at 3×, then each Hub page mocked at 1× (195×350) and shown at 2×.

const PAGES: Page[] = ['farmlands', 'wilds', 'learning', 'town', 'racing']
const GROUND_COLORS: Record<Page, [string, string]> = {
  farmlands: ['#5f9440', '#8a6a44'],
  wilds: ['#5d7a3e', '#7a6648'],
  learning: ['#4f8a52', '#9a9484'],
  town: ['#6a9446', '#a08a62'],
  racing: ['#5ca66c', '#b88b60'],
}
const TINTS: Record<Page, string> = { farmlands: '#2a2219', wilds: '#1c241a', learning: '#1a2030', town: '#262019', racing: '#192c24' }

const CELL = SIZE * 3
const PAD = 8
const sheet = image(COLUMNS * CELL + (COLUMNS + 1) * PAD, rows * CELL + (rows + 1) * PAD, hex('#0f1620'))
drawn.forEach(({ place, px }, i) => {
  const ox = PAD + (i % COLUMNS) * (CELL + PAD), oy = PAD + Math.floor(i / COLUMNS) * (CELL + PAD)
  const tint = hex(TINTS[place.page])
  for (let y = 0; y < CELL; y++) for (let x = 0; x < CELL; x++) sheet.px.set(tint, ((oy + y) * sheet.w + ox + x) * 4)
  stamp(sheet, px, ox, oy, 3)
})

const PAGE_W = 195, PAGE_H = 350
function mockPage(page: Page): Image {
  const [grass, path] = GROUND_COLORS[page]
  const img = image(PAGE_W, PAGE_H, hex(grass))
  // A plain cross of paths so the composition reads as a map.
  const pathRgba = hex(path)
  for (let y = 0; y < PAGE_H; y++)
    for (let x = 0; x < PAGE_W; x++) {
      const onPath = Math.abs(x - PAGE_W / 2) < 5 || Math.abs(y - PAGE_H * 0.5) < 5
      if (onPath) img.px.set(pathRgba, (y * PAGE_W + x) * 4)
    }
  for (const { place, px } of drawn) {
    if (place.page !== page) continue
    stamp(img, px, Math.round(place.at.x * PAGE_W - SIZE / 2), Math.round(place.at.y * PAGE_H - SIZE / 2))
  }
  return img
}
const mocks = PAGES.map((p) => scaleImage(mockPage(p), 2))
const mockW = mocks.reduce((w, m) => w + m.w, 0) + (mocks.length + 1) * PAD
const preview = image(Math.max(sheet.w, mockW), sheet.h + (mocks[0]?.h ?? 0) + PAD, hex('#0f1620'))
paste(preview, sheet, Math.floor((preview.w - sheet.w) / 2), 0)
mocks.reduce((x, m) => {
  paste(preview, m, x, sheet.h)
  return x + m.w + PAD
}, PAD)
const previews = join(ROOT, 'assets', 'previews')
mkdirSync(previews, { recursive: true })
writeFileSync(join(previews, 'buildings.png'), encodePng(preview.w, preview.h, preview.px))

// A01 review contract: additions above four familiar neighbours, all at exactly 2×.
const comparison = image(4 * SIZE * 2 + 5 * PAD, 2 * SIZE * 2 + 3 * PAD, hex('#18202a'))
;['card-library', 'gym', 'racecourse', 'trophy-hall', 'stable', 'observatory', 'brawler-dojo', 'scenario-gate'].forEach((id, i) => {
  const d = drawn.find((p) => p.place.id === id)
  if (!d) throw new Error(`Missing A01 comparison building: ${id}`)
  stamp(comparison, d.px, PAD + (i % 4) * (SIZE * 2 + PAD), PAD + Math.floor(i / 4) * (SIZE * 2 + PAD), 2)
})
writeFileSync(join(previews, 'racer-buildings-2x.png'), encodePng(comparison.w, comparison.h, comparison.px))

// The HTML preview: named cards at 3× and 1×, then the mock pages at 2× with DOM labels as the game shows them.
const atlasUri = `data:image/png;base64,${atlasPng.toString('base64')}`
const sprite = (id: string, scale: number) => {
  const f = frames[id]
  if (!f) return ''
  return `<span class="spr" style="width:${SIZE * scale}px;height:${SIZE * scale}px;background-position:-${f.x * scale}px -${f.y * scale}px;background-size:${atlas.w * scale}px ${atlas.h * scale}px"></span>`
}
const cards = PAGES.map(
  (page) =>
    `<section><h2>${page}</h2><div class="grid">${PLACES.filter((p) => p.page === page)
      .map((p) => `<figure>${sprite(p.id, 3)}${sprite(p.id, 1)}<figcaption>${p.name}<span>${p.id}</span></figcaption></figure>`)
      .join('')}</div></section>`,
).join('')
const pages = PAGES.map((page) => {
  const [grass, path] = GROUND_COLORS[page]
  const pins = PLACES.filter((p) => p.page === page)
    .map((p) => `<div class="pin" style="left:${p.at.x * 100}%;top:${p.at.y * 100}%">${sprite(p.id, 2)}<b>${p.name}</b></div>`)
    .join('')
  return `<div class="page" style="background:linear-gradient(${path},${path}) center/10px 100% no-repeat,linear-gradient(${path},${path}) center/100% 10px no-repeat,${grass}"><h3>${page}</h3>${pins}</div>`
}).join('')
writeFileSync(
  join(previews, 'buildings.html'),
  `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Hub places</title><style>
:root{color-scheme:dark}body{margin:0;padding:16px;background:#0f1620;color:#e6e9ee;font:14px/1.4 system-ui,sans-serif}
h1{font-size:18px;margin:0 0 4px}p{color:#9aa4b2;margin:0 0 16px}h2{font-size:15px;margin:20px 0 8px;text-transform:capitalize}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(170px,1fr));gap:10px}
figure{margin:0;padding:10px;background:#18202a;border-radius:8px;display:grid;justify-items:center;gap:6px}
.spr{display:block;background-image:url(${atlasUri});image-rendering:pixelated}
figcaption{text-align:center;font-weight:600}figcaption span{display:block;color:#9aa4b2;font-weight:400;font-size:12px}
.pages{display:flex;flex-wrap:wrap;gap:16px;margin-top:12px}
.page{position:relative;width:390px;height:700px;border-radius:8px;overflow:hidden;flex:none}
.page h3{position:absolute;left:8px;top:4px;margin:0;font-size:12px;color:#fff8;text-transform:capitalize}
.pin{position:absolute;transform:translate(-50%,-50%);display:grid;justify-items:center}
.pin b{margin-top:-6px;font-size:11px;background:#0f1620cc;padding:1px 6px;border-radius:6px;white-space:nowrap}
</style></head><body><h1>Hub places</h1><p>48×48 map sprites, shown at 3× and 1×, then on mock Hub pages at 2× (as the game draws them). Generated by uma-platform scripts/pixel-art.</p>${cards}<h2>Mock pages</h2><div class="pages">${pages}</div></body></html>`,
)

// Review sheets for iterating: each page at 6×.
const review = process.env.REVIEW_DIR
if (review) {
  mkdirSync(review, { recursive: true })
  for (const page of PAGES) {
    const list = drawn.filter((d) => d.place.page === page)
    const scale = 5
    const cell = SIZE * scale
    const cols = 5
    const img = image(cols * cell + (cols + 1) * PAD, Math.ceil(list.length / cols) * (cell + PAD) + PAD, hex('#0f1620'))
    list.forEach(({ px }, i) => {
      const ox = PAD + (i % cols) * (cell + PAD), oy = PAD + Math.floor(i / cols) * (cell + PAD)
      const g = hex(GROUND_COLORS[page][0])
      for (let y = 0; y < cell; y++) for (let x = 0; x < cell; x++) img.px.set(g, ((oy + y) * img.w + ox + x) * 4)
      stamp(img, px, ox, oy, scale)
    })
    writeFileSync(join(review, `${page}.png`), encodePng(img.w, img.h, img.px))
    const mock = scaleImage(mockPage(page), 2)
    writeFileSync(join(review, `${page}-mock.png`), encodePng(mock.w, mock.h, mock.px))
  }
}

if (problems.length > 0) {
  console.error([...new Set(problems)].join('\n'))
  process.exitCode = 1
}
console.log(`Wrote ${drawn.length} places to ${relative(ROOT, atlasDir)} and previews to ${relative(ROOT, previews)}`)
