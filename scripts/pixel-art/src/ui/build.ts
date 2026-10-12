import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { hex } from '../color.ts'
import { encodePng } from '../png.ts'
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
const labels: Record<string, string> = { brawler: 'Brawler', mage: 'Mage', spellblade: 'Spell Blade', cleric: 'Cleric', summoner: 'Summoner',
  'armor-break': 'Armor Break', 'mind-break': 'Mind Break', enfeeble: 'Enfeeble', shatter: 'Shatter', hex: 'Hex', brave: 'Brave', faith: 'Faith', aegis: 'Aegis', breaker: 'Breaker', clarity: 'Clarity' }
const uri = (img: Img) => `data:image/png;base64,${encodePng(img.w, img.h, img.px).toString('base64')}`
const examples = frames.map((f) => `<div class="example" role="img" aria-label="${labels[f.key]}${f.group === 'status' ? ', 2 stacks' : ''}"><img src="${uri(f.img)}" width="${f.w}" height="${f.h}" alt=""><span>${f.group === 'status' ? '2' : labels[f.key]}</span></div>`)
const cards = frames.map((f) => `<figure><img src="${uri(f.img)}" width="${f.w * 3}" height="${f.h * 3}" alt="${f.id} at 3×"><img class="native" src="${uri(f.img)}" width="${f.w}" height="${f.h}" alt="${f.id} at 1×"><figcaption>${labels[f.key]}</figcaption></figure>`).join('')
writeFileSync(join(previews, 'ui.html'), `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Class emblems and status badges</title><style>
:root{color-scheme:dark}body{margin:0;padding:12px;background:#0f141b;color:#e6e9ee;font:14px/1.4 system-ui,sans-serif}h1{font-size:20px}h2{font-size:16px}p,figcaption{color:#a2afbf}img{image-rendering:pixelated;display:block;flex:none}.examples,.cards{display:flex;flex-wrap:wrap;gap:8px}.example{display:flex;align-items:center;gap:6px;background:#18202a;padding:8px;border-radius:4px;min-height:28px}figure{margin:0;padding:10px;background:#18202a;border-radius:5px;display:grid;justify-items:center;align-content:end;gap:8px}figcaption{font-size:11px;text-align:center}.native{margin:auto}
</style></head><body><h1>Class emblems and status badges</h1><p>H11: original 24×24 emblems and 12×12 status glyphs. The examples below are at native size; the full name remains in each accessible label. Debuffs use red-violet badges, buffs gold-teal.</p><h2>Classes, 1×</h2><div class="examples">${examples.slice(0, 5).join('')}</div><h2>Statuses and stacks, 1×</h2><div class="examples">${examples.slice(5).join('')}</div><p>Armor Break · Mind Break · Enfeeble · Shatter · Hex · Brave · Faith · Aegis · Breaker · Clarity</p><h2>All icons, 3× and 1×</h2><div class="cards">${cards}</div></body></html>`)
console.log(`Wrote ${frames.length} ui icons (${atlas.w}×${atlas.h}) to ${relative(ROOT, dir)}; ids and native sizes checked`)
