// Builds every item icon: 32×32 PNGs in assets/items/<family>/, plus a 3× contact sheet and an HTML preview, and the
// published atlas (packages/art/items: one PNG on a 32 px grid and its JSON index, P37).
// Run from the repo root: pnpm art:draw
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { hex } from './color.ts'
import { FAMILIES } from './items/index.ts'
import { speedTicketItem } from './items/tickets.ts'
import { TONICS } from './items/tonics.ts'
import { TONIC_PREVIEW_SIZES, tonicPreview, tonicPreviewHtml } from './items/tonic-previews.ts'
import { ACCESSORY_SETTINGS, ARMOR_FITTINGS, BRANCH_GEM, WEAPON_GEMS } from './items/made.ts'
import { MADE_PREVIEW_SCALES, madePreview, madePreviewHtml } from './items/made-previews.ts'
import type { ItemIcon } from './items/types.ts'
import { encodePng } from './png.ts'
import { drawIcon, ICON_SIZE } from './icon.ts'
import { contactSheet } from './sheet.ts'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..')
const OUT = join(ROOT, 'assets', 'items')
const SIZE = ICON_SIZE

const rows: Uint8Array[][] = []
// The atlas: ten grades across, one row per family side (raw, then refined), families in catalog order.
const ATLAS_COLUMNS = 10
const atlasRows = FAMILIES.length * 2 + 6
const atlas = new Uint8Array(ATLAS_COLUMNS * SIZE * atlasRows * SIZE * 4)
type ItemFrame = { x: number; y: number; name: string; family: string; side: string; effect: string; grade: number; refined: boolean }
  | { x: number; y: number; name: string; kind: 'ticket' }
  | { x: number; y: number; w: number; h: number; name: string; kind: 'tonic'; grade: number }
  | { x: number; y: number; w: number; h: number; name: string; kind: 'made'; line: string; grade: number }
const frames: Record<string, ItemFrame> = {}
function blit(px: Uint8Array, col: number, row: number): void {
  for (let y = 0; y < SIZE; y++) {
    const from = y * SIZE * 4
    atlas.set(px.subarray(from, from + SIZE * 4), ((row * SIZE + y) * ATLAS_COLUMNS * SIZE + col * SIZE) * 4)
  }
}
const cards: string[] = []
function card(item: ItemIcon, uri: string): string {
  return `<figure class="${item.grade >= 9 ? 'legendary' : ''}"><img src="${uri}" width="96" height="96" alt=""><img class="x1" src="${uri}" width="32" height="32" alt=""><figcaption>${item.name}<span>Grade ${item.grade}</span></figcaption></figure>`
}

for (const family of FAMILIES) {
  const dir = join(OUT, family.id)
  mkdirSync(dir, { recursive: true })
  const sections: string[] = []
  for (const [label, items] of [['Raw', family.raw], ['Refined', family.refined]] as const) {
    const row: Uint8Array[] = []
    const atlasRow = FAMILIES.indexOf(family) * 2 + (label === 'Refined' ? 1 : 0)
    const figures = items.map((item) => {
      const px = drawIcon(item)
      const png = encodePng(SIZE, SIZE, px)
      writeFileSync(join(dir, `${item.id}.png`), png)
      blit(px, item.grade - 1, atlasRow)
      frames[item.id] = { x: (item.grade - 1) * SIZE, y: atlasRow * SIZE, name: item.name, family: family.id, side: family.side, effect: family.effect, grade: item.grade, refined: label === 'Refined' }
      row.push(px)
      return card(item, `data:image/png;base64,${png.toString('base64')}`)
    })
    rows.push(row)
    sections.push(`<h3>${label}</h3><div class="grid">${figures.join('')}</div>`)
  }
  cards.push(`<section><h2>${family.name} <small>${family.side} · ${family.effect}</small></h2>${sections.join('')}</section>`)
}

// Non-graded utility icons append after all 320 material frames; never invent a material family or grade for them.
const ticket = speedTicketItem(), ticketPng = encodePng(SIZE, SIZE, ticket)
const ticketDir = join(OUT, 'tickets')
mkdirSync(ticketDir, { recursive: true })
writeFileSync(join(ticketDir, 'speed-ticket.png'), ticketPng)
blit(ticket, 0, FAMILIES.length * 2)
frames['speed-ticket'] = { x: 0, y: FAMILIES.length * 2 * SIZE, name: 'Speed Ticket', kind: 'ticket' }
rows.push([ticket])
cards.push(`<section><h2>Tickets</h2><div class="grid"><figure><img src="data:image/png;base64,${ticketPng.toString('base64')}" width="96" height="96" alt="Speed Ticket at 3×"><img class="x1" src="data:image/png;base64,${ticketPng.toString('base64')}" width="32" height="32" alt="Speed Ticket at 1×"><figcaption>Speed Ticket</figcaption></figure></div></section>`)

// A04 gets a new complete row, including retaining the old utility row's empty cells verbatim.
const tonicDir = join(OUT, 'tonics'), tonicRow = FAMILIES.length * 2 + 1
if (TONICS.length !== ATLAS_COLUMNS || TONICS.some((item, col) => item.grade !== col + 1 || item.id !== `tonic-${col + 1}`)) throw new Error('Expected tonic-1…10 in grade order')
mkdirSync(tonicDir, { recursive: true })
const tonicPixels = TONICS.map((item, col) => {
  const px = drawIcon(item), png = encodePng(SIZE, SIZE, px)
  blit(px, col, tonicRow)
  frames[item.id] = { x: col * SIZE, y: tonicRow * SIZE, w: SIZE, h: SIZE, name: item.name, kind: 'tonic', grade: item.grade }
  writeFileSync(join(tonicDir, `${item.id}.png`), png)
  return px
})
rows.push(tonicPixels)
cards.push(`<section><h2>Tonics</h2><div class="grid">${TONICS.map((item, index) => card(item, `data:image/png;base64,${encodePng(SIZE, SIZE, tonicPixels[index]!).toString('base64')}`)).join('')}</div></section>`)

// H73 appends three complete grade rows and one Branch Gem. These are crafting outputs, not another material family.
const madeDir = join(OUT, 'made'), madeFirstRow = FAMILIES.length * 2 + 2
mkdirSync(madeDir, { recursive: true })
for (const [offset, line, label, items] of [
  [0, 'weapon-gem', 'Weapon Gems', WEAPON_GEMS],
  [1, 'armor-fittings', 'Armor Fittings', ARMOR_FITTINGS],
  [2, 'accessory-setting', 'Accessory Settings', ACCESSORY_SETTINGS],
] as const) {
  if (items.length !== ATLAS_COLUMNS || items.some((item, col) => item.grade !== col + 1 || item.id !== `${line}-g${col + 1}`)) throw new Error(`Expected ${line}-g1…10 in grade order`)
  const pixels = items.map((item, col) => {
    const px = drawIcon(item), png = encodePng(SIZE, SIZE, px)
    blit(px, col, madeFirstRow + offset)
    frames[item.id] = { x: col * SIZE, y: (madeFirstRow + offset) * SIZE, w: SIZE, h: SIZE, name: item.name, kind: 'made', line, grade: item.grade }
    writeFileSync(join(madeDir, `${item.id}.png`), png)
    return px
  })
  rows.push(pixels)
  cards.push(`<section><h2>${label}</h2><div class="grid">${items.map((item, index) => card(item, `data:image/png;base64,${encodePng(SIZE, SIZE, pixels[index]!).toString('base64')}`)).join('')}</div></section>`)
}
const branch = drawIcon(BRANCH_GEM), branchPng = encodePng(SIZE, SIZE, branch), branchRow = madeFirstRow + 3
blit(branch, 0, branchRow)
frames[BRANCH_GEM.id] = { x: 0, y: branchRow * SIZE, w: SIZE, h: SIZE, name: BRANCH_GEM.name, kind: 'made', line: 'branch-gem', grade: BRANCH_GEM.grade }
writeFileSync(join(madeDir, `${BRANCH_GEM.id}.png`), branchPng)
rows.push([branch])
cards.push(`<section><h2>Branch Gem</h2><div class="grid">${card(BRANCH_GEM, `data:image/png;base64,${branchPng.toString('base64')}`)}</div></section>`)

const atlasDir = join(ROOT, 'packages', 'art', 'items')
mkdirSync(atlasDir, { recursive: true })
writeFileSync(join(atlasDir, 'atlas.png'), encodePng(ATLAS_COLUMNS * SIZE, atlasRows * SIZE, atlas))
writeFileSync(join(atlasDir, 'atlas.json'), `${JSON.stringify({ schemaVersion: 1, cell: SIZE, width: ATLAS_COLUMNS * SIZE, height: atlasRows * SIZE, frames }, null, 1)}\n`)

const previews = join(ROOT, 'assets', 'previews')
mkdirSync(previews, { recursive: true })
for (const size of TONIC_PREVIEW_SIZES) {
  const sheet = tonicPreview(size)
  writeFileSync(join(previews, `racer-tonics-${size}px.png`), encodePng(sheet.w, sheet.h, sheet.px))
}
writeFileSync(join(previews, 'racer-tonics.html'), tonicPreviewHtml())
for (const scale of MADE_PREVIEW_SCALES) {
  const sheet = madePreview(scale)
  writeFileSync(join(previews, `made-items-${scale}x.png`), encodePng(sheet.w, sheet.h, sheet.px))
}
writeFileSync(join(previews, 'made-items.html'), madePreviewHtml())
const contact = contactSheet(rows, 3, 8, hex('#0f141b'), hex('#18202a'))
writeFileSync(join(previews, 'items.png'), encodePng(contact.w, contact.h, contact.px))
writeFileSync(
  join(previews, 'items.html'),
  `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Item icons</title><style>
:root{color-scheme:dark}body{margin:0;padding:16px;background:#0f141b;color:#e6e9ee;font:14px/1.4 system-ui,sans-serif}
h1{font-size:18px;margin:0 0 4px}p{color:#9aa4b2;margin:0 0 16px}h2{font-size:15px;margin:20px 0 8px}h3{font-size:12px;color:#9aa4b2;margin:10px 0 6px;font-weight:600}h2 small{color:#9aa4b2;font-weight:400}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:10px}
figure{margin:0;padding:10px;background:#18202a;border-radius:8px;display:grid;justify-items:center;gap:6px}
figure.legendary{box-shadow:inset 0 0 0 1px #c9a24a}img{image-rendering:pixelated}img.x1{opacity:.9}
figcaption{text-align:center;font-weight:600}figcaption span{display:block;color:#9aa4b2;font-weight:400;font-size:12px}
</style></head><body><h1>Item icons</h1><p>32×32 originals shown at 3× and 1×. Generated by uma-platform scripts/pixel-art.</p>${cards.join('')}</body></html>`,
)
console.log(`Wrote ${Object.keys(frames).length} icons to ${relative(ROOT, OUT)} and previews to ${relative(ROOT, previews)}`)
