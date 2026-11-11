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
import { CLASSES } from './spec.ts'
import { CLASS_LABELS, CLASS_TREE, classesV3Preview } from './classes-v3-preview.ts'
import { starsPreview } from './stars-preview.ts'
import { yardPreview } from './yard-preview.ts'
import { FARM_MARK_IDS, FARM_PREVIEW_CROPS, farmPreview, seededCrop } from './farm-preview.ts'
import { ROMANCE_MARK_IDS, romancePreview } from './romance-preview.ts'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..')
const frames = uiFrames(), problems = checkUi(frames)
if (problems.length) throw new Error(`Ui contract failed:\n${problems.join('\n')}`)
const { atlas, index } = packUi(frames), dir = join(ROOT, 'packages', 'art', 'ui'), previews = join(ROOT, 'assets', 'previews')
mkdirSync(dir, { recursive: true }); mkdirSync(previews, { recursive: true })
writeFileSync(join(dir, 'atlas.png'), encodePng(atlas.w, atlas.h, atlas.px))
writeFileSync(join(dir, 'atlas.json'), `${JSON.stringify({ schemaVersion: 1, width: atlas.w, height: atlas.h, frames: index }, null, 1)}\n`)

const BG = hex('#0f141b'), CELL = hex('#18202a'), PAD = 8
for (const [name, scale] of [['ui', 3], ['ui-1x', 1]] as const) {
  // H11's five; the Paladin has her own sheets below (H54), so these stay byte-identical.
  const classes = frames.filter((f) => (CLASSES as readonly string[]).includes(f.key)), statuses = frames.filter((f) => f.group === 'status')
  const width = Math.max(classes.length * (24 * scale + PAD), statuses.length * (12 * scale + PAD)) + PAD
  const sheet = new Img(width, 36 * scale + PAD * 3).fill(BG)
  for (const row of [classes, statuses]) {
    const size = row[0]!.w * scale, top = row === classes ? PAD : 24 * scale + PAD * 2
    row.forEach((f, i) => { const x = PAD + i * (size + PAD); sheet.copy(new Img(size, size).fill(CELL), x, top); sheet.draw(f.img.scaled(scale), x, top) })
  }
  writeFileSync(join(previews, `${name}.png`), encodePng(sheet.w, sheet.h, sheet.px))
}
// A02's six marks on the account bar's white panel and its inverse stage background, at exact integer scales.
const marks = frames.filter(f => (f.group === 'currency' && f.key !== 'laurel' && f.key !== 'card-ticket' && f.key !== 'gold') || f.group === 'tier')
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
// H31: retain A02's previews; compare the new wreath beside all three racer currencies on light/dark chips.
const currencies = frames.filter(f => f.group === 'currency' && f.key !== 'card-ticket' && f.key !== 'gold')
for (const scale of [1, 2, 4]) {
  const cell = 24 * scale, sheet = new Img(currencies.length * (cell + PAD) + PAD, 2 * (cell + PAD) + PAD).fill(BG)
  for (const [row, color] of ['#ffffff', '#17202b'].entries()) currencies.forEach((f, i) => {
    const left = PAD + i * (cell + PAD), top = PAD + row * (cell + PAD)
    sheet.copy(new Img(cell, cell).fill(hex(color)), left, top)
    sheet.draw(f.img.scaled(scale), left + (cell - f.w * scale) / 2, top + (cell - f.h * scale) / 2)
  })
  writeFileSync(join(previews, `laurel-marks-${scale}x.png`), encodePng(sheet.w, sheet.h, sheet.px))
}
// H38: the four front crests, then the eleven achievement badges, on white and dark chips, as laurel-marks lays out.
const rift = frames.filter(f => f.group === 'front' || f.group === 'achievement')
for (const scale of [1, 2, 4]) {
  const cell = 24 * scale, sheet = new Img(rift.length * (cell + PAD) + PAD, 2 * (cell + PAD) + PAD).fill(BG)
  for (const [row, color] of ['#ffffff', '#17202b'].entries()) rift.forEach((f, i) => {
    const left = PAD + i * (cell + PAD), top = PAD + row * (cell + PAD)
    sheet.copy(new Img(cell, cell).fill(hex(color)), left, top)
    sheet.draw(f.img.scaled(scale), left + (cell - f.w * scale) / 2, top + (cell - f.h * scale) / 2)
  })
  writeFileSync(join(previews, `rift-marks-${scale}x.png`), encodePng(sheet.w, sheet.h, sheet.px))
}
// H54: the six class emblems in game order, the Paladin last, on white and dark chips, as rift-marks lays out.
const emblems = frames.filter(f => f.group === 'class' && ((CLASSES as readonly string[]).includes(f.key) || f.key === 'paladin'))
for (const scale of [1, 2, 4]) {
  const cell = 24 * scale, sheet = new Img(emblems.length * (cell + PAD) + PAD, 2 * (cell + PAD) + PAD).fill(BG)
  for (const [row, color] of ['#ffffff', '#17202b'].entries()) emblems.forEach((f, i) => {
    const left = PAD + i * (cell + PAD), top = PAD + row * (cell + PAD)
    sheet.copy(new Img(cell, cell).fill(hex(color)), left, top)
    sheet.draw(f.img.scaled(scale), left, top)
  })
  writeFileSync(join(previews, `paladin-emblems-${scale}x.png`), encodePng(sheet.w, sheet.h, sheet.px))
}
for (const scale of [1, 2, 4]) {
  const sheet = classesV3Preview(scale)
  writeFileSync(join(previews, `classes-v3-emblems-${scale}x.png`), encodePng(sheet.w, sheet.h, sheet.px))
}
for (const scale of [1, 2, 4]) {
  const sheet = starsPreview(scale)
  writeFileSync(join(previews, `star-crests-${scale}x.png`), encodePng(sheet.w, sheet.h, sheet.px))
}
for (const scale of [1, 2, 4]) {
  const sheet = yardPreview(scale)
  writeFileSync(join(previews, `racer-yard-marks-${scale}x.png`), encodePng(sheet.w, sheet.h, sheet.px))
}
for (const scale of [1, 2, 4]) {
  const sheet = farmPreview(scale)
  writeFileSync(join(previews, `farm-m4-marks-${scale}x.png`), encodePng(sheet.w, sheet.h, sheet.px))
}
for (const scale of [1, 2, 4]) {
  const sheet = romancePreview(scale)
  writeFileSync(join(previews, `farm-romance-marks-${scale}x.png`), encodePng(sheet.w, sheet.h, sheet.px))
}
const itemSheet = new Img(3 * (64 + PAD) + PAD, 64 + PAD * 2).fill(CELL)
const references = [FAMILIES[0]!.raw[0]!, FAMILIES[1]!.raw[0]!]
;[speedTicketItem(), ...references.map(drawIcon)].forEach((px, i) => itemSheet.draw(new Img(32, 32, px).scaled(2), PAD + i * (64 + PAD), PAD))
writeFileSync(join(previews, 'racer-ticket-items-2x.png'), encodePng(itemSheet.w, itemSheet.h, itemSheet.px))
const labels: Record<string, string> = { brawler: 'Brawler', mage: 'Mage', spellblade: 'Spell Blade', cleric: 'Cleric', summoner: 'Summoner', paladin: 'Paladin',
  recruit: 'Warrior', duelist: 'Spellblade', acolyte: 'Healer', caller: 'Summoner', apprentice: 'Mage', tomeblade: 'Tome Spellblade', armsummoner: 'Arms Summoner',
  'armor-break': 'Armor Break', 'mind-break': 'Mind Break', enfeeble: 'Enfeeble', shatter: 'Shatter', hex: 'Hex', brave: 'Brave', faith: 'Faith', aegis: 'Aegis', breaker: 'Breaker', clarity: 'Clarity',
  'prize-money': 'Prize Money', 'speed-ticket': 'Speed Ticket', 'uma-ticket': 'Uma Ticket', laurel: 'Laurels', 'card-ticket': 'Card Ticket', fatigue: 'Fatigue', rest: 'Rest', '1': 'Tier 1', '2': 'Tier 2', '3': 'Tier 3',
  iron: 'Iron front', arcane: 'Arcane front', duel: 'Duel front', horde: 'Horde front',
  'seal-iron': 'Iron seal', 'seal-arcane': 'Arcane seal', 'seal-duel': 'Duel seal', 'seal-horde': 'Horde seal', 'rift-conquered': 'Rift conquered',
  'iron-will': 'Iron Will', 'arcane-purity': 'Arcane Purity', untouched: 'Untouched', 'swift-convergence': 'Swift Convergence', bestiary: 'Bestiary', crossover: 'Crossover',
  planet: 'Planet', prowess: 'Prowess', vigor: 'Vigor', guard: 'Guard', template: '★ Her moon',
  hp: 'HP', mp: 'MP', atk: 'ATK', matk: 'M.ATK', def: 'DEF', mdef: 'M.DEF', evasion: 'Evasion', limit: 'Limit start',
  gold: 'Gold', 'seed-packet': 'Seed packet', star: 'Quality star', 'heart-bond': 'Bond', 'heart-affinity': 'Affinity', rank: 'Farm Rank',
  spring: 'Spring', summer: 'Summer', autumn: 'Autumn', winter: 'Winter',
  farmhouse: 'Farmhouse', house: 'House', 'ring-bench': 'Ring bench', friendship: 'Friendship', romance: 'Romance', spouse: 'Spouse',
  banked: 'Banked', ready: 'Ready', evening: 'Evening', invitation: 'Invitation', 'memory-frame': 'Memory frame',
  cast: 'Cast', pick: 'Pick', rhythm: 'Rhythm', walk: 'Walk', choose: 'Choose' }
const uri = (img: Img) => `data:image/png;base64,${encodePng(img.w, img.h, img.px).toString('base64')}`
const classesV3 = `<section id="classes-v3"><h2>Classes v3</h2><p>Tier 0 above Tier 1, physical to magical, on white and dark chips. Each emblem also appears at native size beside its full name.</p>${CLASS_TREE.map((row, tier) => `<h3>Tier ${tier}</h3><div class="examples">${row.map(key => {
  const f = frames.find(f => f.id === `class/${key}`)!
  return `<div class="example"><img src="${uri(f.img)}" width="24" height="24" alt=""><span>${CLASS_LABELS[key]} · ${key}</span></div>`
}).join('')}</div>`).join('')}${[1, 2, 4].map(scale => `<h3>${scale}×</h3><img src="classes-v3-emblems-${scale}x.png" alt="Thirteen class emblems: five Tier 0 above eight Tier 1, on white and dark chips">`).join('')}</section>`
const examples = (group: string) => frames.filter(f => f.group === group).map((f) => `<div class="example" role="img" aria-label="${labels[f.key]}${f.group === 'status' ? ', 2 stacks' : ''}"><img src="${uri(f.img)}" width="${f.w}" height="${f.h}" alt=""><span>${f.group === 'status' ? '2' : labels[f.key]}</span></div>`).join('')
const starCrests = `<section id="star-crests"><h2>Star crests and stat marks (H141)</h2><p>Native 24px crests and 16px marks. Each sheet: crests then stats on white; crests then stats on #17202b; crests on the #101a24 night sky. Columns follow the named rows below.</p><div class="examples">${examples('star')}</div><div class="examples">${examples('stat')}</div>${[1, 2, 4].map(scale => `<h3>${scale}×</h3><img src="star-crests-${scale}x.png" alt="Planet, Prowess, Vigor, Guard, her moon; HP, MP, ATK, M.ATK, DEF, M.DEF, Evasion, Limit start, on white and dark; crests on night sky">`).join('')}</section>`
const yardMarks = `<section id="racer-yard"><h2>Card Ticket and Training Yard (A05)</h2><p>First two rows: Prize Money, Speed Ticket, Uma Ticket, Card Ticket, Laurels, on white and stage navy. Last three rows: Fatigue, Rest, on stage #101a24, light sunken #e4eaf2 and dark sunken #0b1118. Native 16px currencies and 24px Yard marks; 2× Yard is the game's 48pt size.</p><div class="examples">${examples('yard')}</div>${[1, 2, 4].map(scale => `<h3>${scale}×</h3><img src="racer-yard-marks-${scale}x.png" alt="Five currencies, then Fatigue sweat drop and Rest folded towel on their actual tile colours">`).join('')}</section>`
const farmM4 = `<section id="farm-m4"><h2>The farm's M4 marks (uma-farm F25 part A)</h2><p>Gold, the seed-packet badge, quality star, bond and affinity hearts, Farm Rank and the four seasons, native 16px. The full review, with the badge over five crops, a mock account bar and the Dorm and shipping bin, is <a href="farm-m4.html">farm-m4.html</a>.</p><div class="examples">${frames.filter(f => (FARM_MARK_IDS as readonly string[]).includes(f.id)).map(f => `<div class="example"><img src="${uri(f.img)}" width="16" height="16" alt=""><span>${labels[f.key]}</span></div>`).join('')}</div></section>`
const cards = frames.map((f) => `<figure><img src="${uri(f.img)}" width="${f.w * 3}" height="${f.h * 3}" alt="${f.id} at 3×"><img class="native" src="${uri(f.img)}" width="${f.w}" height="${f.h}" alt="${f.id} at 1×"><figcaption>${labels[f.key]}</figcaption></figure>`).join('')
writeFileSync(join(previews, 'ui.html'), `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Class emblems and status badges</title><style>
:root{color-scheme:dark}body{margin:0;padding:12px;background:#0f141b;color:#e6e9ee;font:14px/1.4 system-ui,sans-serif}h1{font-size:20px}h2{font-size:16px}p,figcaption{color:#a2afbf}img{image-rendering:pixelated;display:block;flex:none}.examples,.cards{display:flex;flex-wrap:wrap;gap:8px}.example{display:flex;align-items:center;gap:6px;background:#18202a;padding:8px;border-radius:4px;min-height:28px}figure{margin:0;padding:10px;background:#18202a;border-radius:5px;display:grid;justify-items:center;align-content:end;gap:8px}figcaption{font-size:11px;text-align:center}.native{margin:auto}
</style></head><body><h1>UI marks, emblems and badges</h1><p>Original pixel marks at native size; full names remain in accessible labels. Debuffs use red-violet badges, buffs gold-teal.</p><h2>Classes, 1×</h2><div class="examples">${examples('class')}</div>${classesV3}${starCrests}${yardMarks}${farmM4}<h2>Statuses and stacks, 1×</h2><div class="examples">${examples('status')}</div><h2>Currencies, 1×</h2><div class="examples">${examples('currency')}</div><h2>Tiers, 1×</h2><div class="examples">${examples('tier')}</div><h2>Rift fronts, 1×</h2><div class="examples">${examples('front')}</div><h2>Achievements, 1×</h2><div class="examples">${examples('achievement')}</div><h2>All icons, 3× and 1×</h2><div class="cards">${cards}</div><h2>Racer marks on white and dark panels</h2>${[1, 2, 4].map(scale => `<h3>${scale}×</h3><img src="racer-marks-${scale}x.png" alt="Prize Money, Speed Ticket, Uma Ticket, Tier 1, Tier 2, Tier 3">`).join('')}<h2>Rift fronts and achievements on white and dark chips</h2>${[1, 2, 4].map(scale => `<h3>${scale}×</h3><img src="rift-marks-${scale}x.png" alt="Iron, Arcane, Duel and Horde front crests, then the four front seals, Rift conquered, Iron Will, Arcane Purity, Untouched, Swift Convergence, Bestiary and Crossover">`).join('')}<h2>The six class emblems on white and dark chips</h2>${[1, 2, 4].map(scale => `<h3>${scale}×</h3><img src="paladin-emblems-${scale}x.png" alt="Brawler, Mage, Spell Blade, Cleric, Summoner and Paladin">`).join('')}<h2>Speed Ticket, Wheat and Apple, 2×</h2><img src="racer-ticket-items-2x.png" alt="Speed Ticket beside existing Wheat and Apple item icons"></body></html>`)
// uma-farm F25's review page: every piece at native size and 2×, on light and dark, with the badge over five crops.
const farmFrames = FARM_MARK_IDS.map(id => frames.find(f => f.id === id)!)
writeFileSync(join(previews, 'farm-m4.html'), `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Farm M4 art</title><style>
:root{color-scheme:dark}body{margin:0;padding:16px;background:#0f141b;color:#e6e9ee;font:14px/1.5 system-ui,sans-serif;max-width:1100px}h1{font-size:22px}h2{font-size:16px;margin-top:28px}p,figcaption,li{color:#a2afbf}img{image-rendering:pixelated;display:block}.examples{display:flex;flex-wrap:wrap;gap:8px}.example{display:flex;align-items:center;gap:8px;background:#18202a;padding:8px 10px;border-radius:4px}.light{background:#f4f1ea;color:#28323c}.scroll{overflow-x:auto}
</style></head><body><h1>Farm M4 art: uma-farm F25, part A</h1><p>Original pixel art drawn from code in <code>scripts/pixel-art</code> (uma-platform P126): ten 16px marks in uma-art's <code>ui</code> sheet and two 48px places on the <code>buildings</code> sheet's farmlands page. Part B, the cast's three busts, adds its section here when ChatGPT draws it.</p>
<h2>The ten marks at native size</h2><div class="examples">${farmFrames.map(f => `<div class="example"><img src="${uri(f.img)}" width="16" height="16" alt=""><span>${labels[f.key]} · <code>${f.id}</code></span></div>`).join('')}</div><div class="examples" style="margin-top:8px">${farmFrames.map(f => `<div class="example light"><img src="${uri(f.img)}" width="16" height="16" alt=""><span>${labels[f.key]}</span></div>`).join('')}</div>
<h2>The seed-packet badge over five crops, native</h2><div class="examples">${FARM_PREVIEW_CROPS.map(id => `<div class="example"><img src="${uri(seededCrop(id))}" width="32" height="32" alt=""><span>${id}</span></div>`).join('')}</div>
${[1, 2, 4].map(scale => `<h2>Marks, badge and account bar, ${scale}×</h2><p>Rows: the ten marks on white, then on the account bar's navy; the badge over wheat, carrot, potato, tomato and corn on white, then navy; a mock account bar with the gold, season and Farm Rank chips.</p><div class="scroll"><img src="farm-m4-marks-${scale}x.png" alt="The farm's ten marks, the seed badge over five crops, and a mock account bar"></div>`).join('')}
${[1, 2].map(scale => `<h2>The Dorm and the shipping bin, ${scale}×</h2><p>Dorm, shipping bin, then the Pantry, Kitchen and Fields they stand beside, on farmlands ground.</p><div class="scroll"><img src="farm-m4-buildings-${scale}x.png" alt="Dorm, shipping bin, Pantry, Kitchen and Fields on farmlands ground"></div>`).join('')}
</body></html>`)
// uma-farm F55's review page: the romance core's sixteen marks and its two places.
const romanceFrames = ROMANCE_MARK_IDS.map(id => frames.find(f => f.id === id)!)
writeFileSync(join(previews, 'farm-romance.html'), `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Farm romance art</title><style>
:root{color-scheme:dark}body{margin:0;padding:16px;background:#0f141b;color:#e6e9ee;font:14px/1.5 system-ui,sans-serif;max-width:1200px}h1{font-size:22px}h2{font-size:16px;margin-top:28px}p{color:#a2afbf}img{image-rendering:pixelated;display:block}.examples{display:flex;flex-wrap:wrap;gap:8px}.example{display:flex;align-items:center;gap:8px;background:#18202a;padding:8px 10px;border-radius:4px}.light{background:#f4f1ea;color:#28323c}.scroll{overflow-x:auto}
</style></head><body><h1>Romance core art: uma-farm F55</h1><p>Original pixel art drawn from code in <code>scripts/pixel-art</code> (uma-platform P126): sixteen marks in uma-art's <code>ui</code> sheet (new groups <code>homestead</code>, <code>hearts</code> and <code>play</code>, and <code>farm/ring-bench</code>) and two 48px places on the <code>buildings</code> sheet's farmlands page. Nothing here depicts the farmer or an Uma (RS2, RM61).</p>
<h2>The marks at native size</h2><div class="examples">${romanceFrames.map(f => `<div class="example"><img src="${uri(f.img)}" width="${f.w}" height="${f.h}" alt=""><span>${labels[f.key]} · <code>${f.id}</code></span></div>`).join('')}</div><div class="examples" style="margin-top:8px">${romanceFrames.map(f => `<div class="example light"><img src="${uri(f.img)}" width="${f.w}" height="${f.h}" alt=""><span>${labels[f.key]}</span></div>`).join('')}</div>
${[1, 2, 4].map(scale => `<h2>Marks, Hearts rows, picker and Memory frame, ${scale}×</h2><p>Rows: fifteen marks on white, then navy; three mock Hearts rows (friendship, romance, spouse, each a heart, a five-segment bar, a status mark and an invitation); the five plays as a picker, Rhythm pressed; the Memory frame over a sample tile at 48px, then stretched to 96×64 as a 12px nine-slice.</p><div class="scroll"><img src="farm-romance-marks-${scale}x.png" alt="The romance core's marks, Hearts rows, plays picker and Memory frame"></div>`).join('')}
${[1, 2].map(scale => `<h2>The homestead in a map row, ${scale}×</h2><p>The Farmhouse, a house, a house dimmed as a locked lot, then the Dorm and the shipping bin, on farmlands ground.</p><div class="scroll"><img src="farm-romance-buildings-${scale}x.png" alt="Farmhouse, a house, a locked lot, the Dorm and the shipping bin"></div>`).join('')}
</body></html>`)
console.log(`Wrote ${frames.length} ui icons (${atlas.w}×${atlas.h}) to ${relative(ROOT, dir)}; ids and native sizes checked`)
