import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { hex } from '../color.ts'
import { encodePng } from '../png.ts'
import { drawIcon } from '../icon.ts'
import { FAMILIES } from '../items/index.ts'
import { speedTicketItem } from '../items/tickets.ts'
import { Img } from '../tiles/image.ts'
import { checkUi, packUi, uiFrames } from './atlas.ts'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..')
const frames = uiFrames(), problems = checkUi(frames)
if (problems.length) throw new Error(`Ui contract failed:\n${problems.join('\n')}`)
const { atlas, index } = packUi(frames), dir = join(ROOT, 'packages', 'art', 'ui'), previews = join(ROOT, 'assets', 'previews')
mkdirSync(dir, { recursive: true }); mkdirSync(previews, { recursive: true })
writeFileSync(join(dir, 'atlas.png'), encodePng(atlas.w, atlas.h, atlas.px))
writeFileSync(join(dir, 'atlas.json'), `${JSON.stringify({ schemaVersion: 1, width: atlas.w, height: atlas.h, frames: index }, null, 1)}\n`)

const BG = hex('#0f141b'), CELL = hex('#18202a'), PAD = 8
for (const [name, scale] of [['ui', 3], ['ui-1x', 1]] as const) {
  const classes = frames.filter((f) => f.group === 'class'), statuses = frames.filter((f) => f.group === 'status')
  const width = Math.max(classes.length * (24 * scale + PAD), statuses.length * (12 * scale + PAD)) + PAD
  const sheet = new Img(width, 36 * scale + PAD * 3).fill(BG)
  for (const row of [classes, statuses]) {
    const size = row[0]!.w * scale, top = row === classes ? PAD : 24 * scale + PAD * 2
    row.forEach((f, i) => { const x = PAD + i * (size + PAD); sheet.copy(new Img(size, size).fill(CELL), x, top); sheet.draw(f.img.scaled(scale), x, top) })
  }
  writeFileSync(join(previews, `${name}.png`), encodePng(sheet.w, sheet.h, sheet.px))
}
// A02's six marks on the account bar's white panel and its inverse stage background, at exact integer scales.
const marks = frames.filter(f => f.group === 'currency' || f.group === 'tier')
for (const scale of [1, 2, 4]) {
  const cell = 24 * scale, sheet = new Img(marks.length * (cell + PAD) + PAD, 2 * (cell + PAD) + PAD).fill(BG)
  for (const [row, color] of ['#ffffff', '#101a24'].entries()) {
    sheet.copy(new Img(sheet.w - PAD * 2, cell).fill(hex(color)), PAD, PAD + row * (cell + PAD))
    marks.forEach(f => {
      const i = marks.indexOf(f)
      sheet.draw(f.img.scaled(scale), PAD + i * (cell + PAD) + (cell - f.w * scale) / 2, PAD + row * (cell + PAD) + (cell - f.h * scale) / 2)
    })
  }
  writeFileSync(join(previews, `racer-marks-${scale}x.png`), encodePng(sheet.w, sheet.h, sheet.px))
}
const itemSheet = new Img(3 * (64 + PAD) + PAD, 64 + PAD * 2).fill(CELL)
const references = [FAMILIES[0]!.raw[0]!, FAMILIES[1]!.raw[0]!]
;[speedTicketItem(), ...references.map(drawIcon)].forEach((px, i) => itemSheet.draw(new Img(32, 32, px).scaled(2), PAD + i * (64 + PAD), PAD))
writeFileSync(join(previews, 'racer-ticket-items-2x.png'), encodePng(itemSheet.w, itemSheet.h, itemSheet.px))
const labels: Record<string, string> = { brawler: 'Brawler', mage: 'Mage', spellblade: 'Spell Blade', cleric: 'Cleric', summoner: 'Summoner',
  'armor-break': 'Armor Break', 'mind-break': 'Mind Break', enfeeble: 'Enfeeble', shatter: 'Shatter', hex: 'Hex', brave: 'Brave', faith: 'Faith', aegis: 'Aegis', breaker: 'Breaker', clarity: 'Clarity',
  'prize-money': 'Prize Money', 'speed-ticket': 'Speed Ticket', 'uma-ticket': 'Uma Ticket', '1': 'Tier 1', '2': 'Tier 2', '3': 'Tier 3' }
const uri = (img: Img) => `data:image/png;base64,${encodePng(img.w, img.h, img.px).toString('base64')}`
const examples = (group: string) => frames.filter(f => f.group === group).map((f) => `<div class="example" role="img" aria-label="${labels[f.key]}${f.group === 'status' ? ', 2 stacks' : ''}"><img src="${uri(f.img)}" width="${f.w}" height="${f.h}" alt=""><span>${f.group === 'status' ? '2' : labels[f.key]}</span></div>`).join('')
const cards = frames.map((f) => `<figure><img src="${uri(f.img)}" width="${f.w * 3}" height="${f.h * 3}" alt="${f.id} at 3×"><img class="native" src="${uri(f.img)}" width="${f.w}" height="${f.h}" alt="${f.id} at 1×"><figcaption>${labels[f.key]}</figcaption></figure>`).join('')
writeFileSync(join(previews, 'ui.html'), `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Class emblems and status badges</title><style>
:root{color-scheme:dark}body{margin:0;padding:12px;background:#0f141b;color:#e6e9ee;font:14px/1.4 system-ui,sans-serif}h1{font-size:20px}h2{font-size:16px}p,figcaption{color:#a2afbf}img{image-rendering:pixelated;display:block;flex:none}.examples,.cards{display:flex;flex-wrap:wrap;gap:8px}.example{display:flex;align-items:center;gap:6px;background:#18202a;padding:8px;border-radius:4px;min-height:28px}figure{margin:0;padding:10px;background:#18202a;border-radius:5px;display:grid;justify-items:center;align-content:end;gap:8px}figcaption{font-size:11px;text-align:center}.native{margin:auto}
</style></head><body><h1>UI marks, emblems and badges</h1><p>Original pixel marks at native size; full names remain in accessible labels. Debuffs use red-violet badges, buffs gold-teal.</p><h2>Classes, 1×</h2><div class="examples">${examples('class')}</div><h2>Statuses and stacks, 1×</h2><div class="examples">${examples('status')}</div><h2>Currencies, 1×</h2><div class="examples">${examples('currency')}</div><h2>Tiers, 1×</h2><div class="examples">${examples('tier')}</div><h2>All icons, 3× and 1×</h2><div class="cards">${cards}</div><h2>Racer marks on white and dark panels</h2>${[1, 2, 4].map(scale => `<h3>${scale}×</h3><img src="racer-marks-${scale}x.png" alt="Prize Money, Speed Ticket, Uma Ticket, Tier 1, Tier 2, Tier 3">`).join('')}<h2>Speed Ticket, Wheat and Apple, 2×</h2><img src="racer-ticket-items-2x.png" alt="Speed Ticket beside existing Wheat and Apple item icons"></body></html>`)
console.log(`Wrote ${frames.length} ui icons (${atlas.w}×${atlas.h}) to ${relative(ROOT, dir)}; ids and native sizes checked`)
