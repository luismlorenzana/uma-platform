// Builds the dish icons (uma-rpg's cooked dishes): one 320×320 atlas on a 32 px grid and its JSON index in
// packages/art/dishes, plus a 3× contact sheet and an HTML preview in assets/previews.
// Rows 0–7: the eight farming families' planet dishes, grade 1–10 left to right. Row 8: the first ten duo dishes.
// Row 9: the last six duo dishes, then the four feasts.
// Run from the repo root: pnpm --filter @uma-platform/pixel-art exec tsx src/dishes/build.ts
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { hex } from '../color.ts'
import { GLINTS, ICON_SIZE, drawIcon } from '../icon.ts'
import { encodePng } from '../png.ts'
import { contactSheet } from '../sheet.ts'
import { Sprite } from '../sprite.ts'
import { BREADS } from './breads.ts'
import { CAKES } from './cakes.ts'
import { COOKIES } from './cookies.ts'
import { CURRIES } from './curries.ts'
import { DUOS } from './duos.ts'
import { FEASTS } from './feasts.ts'
import { GRILLS } from './grills.ts'
import type { Dish } from './kit.ts'
import { SALADS } from './salads.ts'
import { SOUPS } from './soups.ts'
import { TARTS } from './tarts.ts'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..')
const SIZE = ICON_SIZE
const COLUMNS = 10

const FAMILY_ROWS: readonly (readonly [string, string, Dish[]])[] = [
  ['grains', 'Grains · bread', BREADS],
  ['fruits', 'Fruits · tarts', TARTS],
  ['fish', 'Fish · grills', GRILLS],
  ['herbs-spices', 'Herbs & Spices · curries', CURRIES],
  ['vegetables', 'Vegetables · salads', SALADS],
  ['mushrooms', 'Mushrooms · soups', SOUPS],
  ['sweets', 'Sweets · cakes', CAKES],
  ['nuts-seeds', 'Nuts & Seeds · cookies', COOKIES],
]
const ROWS: readonly (readonly [string, Dish[]])[] = [
  ...FAMILY_ROWS.map(([, label, dishes]) => [label, dishes] as const),
  ['Duo platters', DUOS.slice(0, 10)],
  ['Duo platters · feasts', [...DUOS.slice(10), ...FEASTS]],
]

// Sanity: 100 unique ids, planet rows in grade order, every row ten wide.
const seen = new Set<string>()
ROWS.forEach(([label, dishes], r) => {
  if (dishes.length !== COLUMNS) throw new Error(`${label}: ${dishes.length} dishes, expected ${COLUMNS}`)
  dishes.forEach((d, c) => {
    if (seen.has(d.id)) throw new Error(`duplicate id ${d.id}`)
    seen.add(d.id)
    if (r < FAMILY_ROWS.length && d.grade !== c + 1) throw new Error(`${d.id}: grade ${d.grade} in column ${c + 1}`)
  })
})

/**
 * Legendary glints must land on empty canvas. Reports any grade 9–10 dish that paints under a glint pixel (F) or puts
 * its outline there (o).
 */
function glintClashes(d: Dish): string[] {
  if (d.grade < 9) return []
  const s = new Sprite(SIZE, SIZE)
  d.paint(s)
  const out = new Set<string>()
  for (const [gx, gy, size] of GLINTS)
    for (let k = -size; k <= size; k++)
      for (const [x, y] of [[gx + k, gy], [gx, gy + k]] as const) {
        if (s.filled(x, y)) out.add(`F${x},${y}`)
        else if (s.filled(x - 1, y) || s.filled(x + 1, y) || s.filled(x, y - 1) || s.filled(x, y + 1)) out.add(`o${x},${y}`)
      }
  return [...out]
}

const atlas = new Uint8Array(COLUMNS * SIZE * ROWS.length * SIZE * 4)
const frames: Record<string, Record<string, string | number>> = {}
const sheetRows: Uint8Array[][] = []
const sections: string[] = []

ROWS.forEach(([label, dishes], row) => {
  const icons: Uint8Array[] = []
  const figures: string[] = []
  dishes.forEach((d, col) => {
    const px = drawIcon(d)
    for (let y = 0; y < SIZE; y++) atlas.set(px.subarray(y * SIZE * 4, (y + 1) * SIZE * 4), ((row * SIZE + y) * COLUMNS * SIZE + col * SIZE) * 4)
    frames[d.id] = { x: col * SIZE, y: row * SIZE, w: SIZE, h: SIZE, name: d.name, kind: d.kind, grade: d.grade, ...(d.family ? { family: d.family } : {}) }
    icons.push(px)
    const clash = glintClashes(d)
    if (clash.length) console.warn(`  ${d.id}: glint area touched at ${clash.join(' ')}`)
    const uri = `data:image/png;base64,${encodePng(SIZE, SIZE, px).toString('base64')}`
    figures.push(`<figure class="${d.grade >= 9 ? 'legendary' : ''}"><img src="${uri}" width="96" height="96" alt=""><img class="x1" src="${uri}" width="32" height="32" alt=""><figcaption>${d.name}<span>${d.kind} · grade ${d.grade}</span></figcaption></figure>`)
  })
  sheetRows.push(icons)
  sections.push(`<section><h2>${label}</h2><div class="grid">${figures.join('')}</div></section>`)
})

const atlasDir = join(ROOT, 'packages', 'art', 'dishes')
mkdirSync(atlasDir, { recursive: true })
const W = COLUMNS * SIZE, H = ROWS.length * SIZE
writeFileSync(join(atlasDir, 'atlas.png'), encodePng(W, H, atlas))
writeFileSync(join(atlasDir, 'atlas.json'), `${JSON.stringify({ schemaVersion: 1, width: W, height: H, frames }, null, 1)}\n`)

const previews = join(ROOT, 'assets', 'previews')
mkdirSync(previews, { recursive: true })
const contact = contactSheet(sheetRows, 3, 8, hex('#0f141b'), hex('#18202a'))
writeFileSync(join(previews, 'dishes.png'), encodePng(contact.w, contact.h, contact.px))
writeFileSync(
  join(previews, 'dishes.html'),
  `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Dish icons</title><style>
:root{color-scheme:dark}body{margin:0;padding:16px;background:#0f141b;color:#e6e9ee;font:14px/1.4 system-ui,sans-serif}
h1{font-size:18px;margin:0 0 4px}p{color:#9aa4b2;margin:0 0 16px}h2{font-size:15px;margin:20px 0 8px}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:10px}
figure{margin:0;padding:10px;background:#18202a;border-radius:8px;display:grid;justify-items:center;gap:6px}
figure.legendary{box-shadow:inset 0 0 0 1px #c9a24a}img{image-rendering:pixelated}img.x1{opacity:.9}
figcaption{text-align:center;font-weight:600}figcaption span{display:block;color:#9aa4b2;font-weight:400;font-size:12px}
</style></head><body><h1>Dish icons</h1><p>32×32 originals shown at 3× and 1×, in atlas order. Generated by uma-platform scripts/pixel-art.</p>${sections.join('')}</body></html>`,
)
console.log(`Wrote ${seen.size} dishes to ${relative(ROOT, atlasDir)} and previews to ${relative(ROOT, previews)}`)
