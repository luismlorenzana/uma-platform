// `pnpm --filter @uma-platform/kit-art review:kits [ids…]`: the review sheets for uma-quest's code-drawn kits (Q32, Q33)
// under assets/authored/<id>/review/: the kit on light and dark; the painted template (Warrior town, forest) beside the
// code-drawn kit, for the owner's look decision; for a town, a one- and a two-storey building with its door and sign
// and the stand-in traveler for scale; for a biome, its battle set with the traveler. The rooms and towns uma-quest's
// own builder draws are captured by `review-kits/`. Sheets carry no text; the names are on the page.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { hex, type RGBA } from './color.js'
import { drawWave, type DrawnFrame } from './farm/index.js'
import { KITS, kitById, type KitDef } from './kits.js'
import { Canvas, circle, poly, rect } from './paint.js'
import { decodePng, encodePngFiltered } from './png.js'
import { kitSheet } from './review.js'

const AUTHORED = new URL('../../../assets/authored/', import.meta.url)
const ART = new URL('../../../packages/art/', import.meta.url)
const png = (c: Canvas) => encodePngFiltered(c.w, c.h, c.rgba8(0))

/** uma-quest's stand-in traveler at its 256 cell, foot on row 240 (as review.ts draws it). */
function traveler(coat = '#4f86e8'): Canvas {
  const c = new Canvas(256, 256), cx = 128, foot = 241
  c.fill(rect(cx - 22, foot - 48, 16, 48), [...hex('#2b2f3a'), 1]).fill(rect(cx + 6, foot - 48, 16, 48), [...hex('#2b2f3a'), 1])
  c.fill(rect(cx - 40, 118, 80, foot - 48 - 118 + 8, 18), [...hex(coat), 1])
  c.fill(rect(cx - 40, 170, 80, foot - 48 - 170 + 8), [0, 0, 0, 0.18], 'atop')
  c.fill(poly([[cx - 34, 70], [cx - 22, 28], [cx - 10, 62]]), [...hex('#7a4a2a'), 1]).fill(poly([[cx + 34, 70], [cx + 22, 28], [cx + 10, 62]]), [...hex('#7a4a2a'), 1])
  c.fill(circle(cx, 88, 38), [...hex('#f3dcc0'), 1])
  c.fill({ box: [cx - 40, 36, cx + 40, 77], sd: (x, y) => Math.max(Math.hypot(x - cx, y - 76) - 39, y - 76) }, [...hex('#7a4a2a'), 1])
  c.fill(rect(cx - 16, 92, 7, 10), [...hex('#1b1406'), 1]).fill(rect(cx + 9, 92, 7, 10), [...hex('#1b1406'), 1])
  return c
}
const stand = (out: Canvas, c: Canvas, foot: { x: number; y: number }, x: number, ground: number) => out.draw(c, Math.round(x - foot.x), Math.round(ground - foot.y))

/** A town's sample: a one-storey and a two-storey building on its street, signs beside the doors, props and the
 * traveler, at one texel a pixel. */
function buildingSheet(frames: readonly DrawnFrame[]): Canvas {
  const get = (n: string) => frames.find((f) => f.spec.name === n)!
  const out = new Canvas(1536, 832), ground = 704
  out.fill(rect(0, 0, out.w, out.h), [...hex('#cfe3ee'), 1])
  for (let x = 0; x < out.w; x += 128) out.draw(get(['floor-1', 'floor-2', 'floor-3', 'floor-4'][(x / 128) % 4]!).canvas, x, ground)
  const building = (x0: number, storeys: number, sign: 'sign-inn' | 'sign-shop') => {
    const cols = [['building-wall-1', 'window-1'], ['door', ''], ['building-wall-2', 'window-2']] as const
    cols.forEach(([low, high], i) => {
      const x = x0 + i * 128
      for (let s = 0; s < storeys; s++) {
        const base = ground - s * 256
        if (s === 0 && low === 'door') out.draw(get('door').canvas, x, base - 256)
        else { out.draw(get(s === 1 && low !== 'door' ? 'building-wall-3' : low === 'door' ? 'building-wall-2' : low).canvas, x, base - 128); out.draw(get(low === 'door' ? 'window-1' : high).canvas, x, base - 256) }
      }
      out.draw(get(i % 2 ? 'roof-2' : 'roof-1').canvas, x, ground - storeys * 256 - 128)
    })
    const sg = get(sign)
    out.draw(sg.canvas, x0 + 256 + 8, ground - 180)
  }
  building(40, 1, 'sign-inn')
  building(760, 2, 'sign-shop')
  for (const [name, x] of [['lantern', 520], ['bench', 620], ['barrel', 1200], ['crate', 1290], ['flower-box', 1420]] as const) stand(out, get(name).canvas, get(name).spec.foot!, x, ground + 20)
  stand(out, traveler(), { x: 128, y: 240 }, 470, ground + 30)
  return out
}
/** A biome's fight: the far layer, the ground strip under it, the three middle pieces and two travelers. */
function battleSheet(frames: readonly DrawnFrame[]): Canvas {
  const get = (n: string) => frames.find((f) => f.spec.name === n)!
  const out = new Canvas(2048, 768)
  out.draw(get('battle-back').canvas, 0, 0)
  out.draw(get('battle-ground').canvas, 0, 512); out.draw(get('battle-ground').canvas, 1024, 512)
  for (const [name, x, y] of [['battle-mid-1', 180, 560], ['battle-mid-2', 1830, 576], ['battle-mid-3', 1470, 560]] as const) stand(out, get(name).canvas, get(name).spec.foot!, x, y)
  stand(out, traveler(), { x: 128, y: 240 }, 760, 660)
  stand(out, traveler('#c95b8a'), { x: 128, y: 240 }, 1180, 650)
  return out
}
/** The painted template's frames beside the code-drawn kit's, same names, for the owner's decision (Q32, Q33). */
function besideSheet(kit: KitDef, frames: readonly DrawnFrame[]): Canvas {
  const template = kit.kind === 'town' ? 'kit-town-warrior' : 'kit-forest'
  const atlas = JSON.parse(readFileSync(new URL(`${template}/atlas.json`, ART), 'utf8')) as { frames: Record<string, { x: number; y: number; w: number; h: number }> }
  const page = decodePng(readFileSync(new URL(`${template}/atlas.png`, ART)))
  const names = kit.kind === 'town' ? ['floor-1', 'wall-1', 'building-wall-1', 'window-2', 'door', 'roof-1', 'tree-1', 'well', 'lantern'] : ['floor-1', 'wall-1', 'riser-1', 'void', 'chest-closed', 'spring', 'waystone', 'stairs-up', 'lantern']
  const cell = (name: string) => { const f = atlas.frames[name]!; const c = new Canvas(f.w, f.h); for (let y = 0; y < f.h; y++) for (let x = 0; x < f.w; x++) { const i = ((f.y + y) * page.w + f.x + x) * 4, j = (y * f.w + x) * 4, a = page.px[i + 3]! / 255; for (let k = 0; k < 3; k++) c.px[j + k] = (page.px[i + k]! / 255) * a; c.px[j + 3] = a } return c }
  const width = names.reduce((s, n) => s + Math.max(atlas.frames[n]!.w, frames.find((f) => f.spec.name === n)!.spec.w) + 24, 24)
  const tall = Math.max(...names.map((n) => atlas.frames[n]!.h)), out = new Canvas(width, tall * 2 + 72)
  out.fill(rect(0, 0, out.w, out.h), [...hex('#e6e9df'), 1])
  out.fill(rect(0, tall + 36, out.w, tall + 36), [...hex('#dde2d6'), 1] as RGBA)
  let x = 24
  for (const n of names) {
    const mine = frames.find((f) => f.spec.name === n)!, theirs = cell(n), w = Math.max(theirs.w, mine.spec.w)
    out.draw(theirs, x, 24 + tall - theirs.h)
    out.draw(mine.canvas, x, tall + 48 + tall - mine.spec.h)
    x += w + 24
  }
  return out
}

export function writeKitReview(id: string): string[] {
  const kit = kitById(id), frames = drawWave(kit.specs, kit.drawers), dir = new URL(`${id}/review/`, AUTHORED), written: string[] = []
  mkdirSync(dir, { recursive: true })
  const put = (name: string, c: Canvas) => { writeFileSync(new URL(name, dir), png(c)); written.push(name) }
  for (const [theme, ground] of [['light', '#e6e9df'], ['dark', '#172329']] as const) put(`${theme}-1x.png`, kitSheet(frames, ground).canvas)
  put('beside-1x.png', besideSheet(kit, frames))
  if (kit.kind === 'town') put('building-1x.png', buildingSheet(frames))
  else put('battle-1x.png', battleSheet(frames))
  return written
}

const TITLES: Record<string, [string, string]> = {
  'kit-town-spellblade': ['Spellblade town', 'The knight’s road, a meadow town: pale limestone and white plaster, slate-blue roofs, blue and silver cloth, trimmed hedges, iron lanterns.'],
  'kit-town-mage': ['Mage town', 'The scholar’s road, an old academy among ruins: warm sandstone, arched windows, teal glazed tiles with violet ones among them, scroll-violet cloth, cool blue-white lamps, a fountain.'],
  'kit-town-summoner': ['Summoner town', 'The wilds, a marsh town: dark timber and boardwalk streets, log terraces, reed thatch, moss green and amber cloth, a rain barrel on its post, a willow, amber lamps.'],
  'kit-town-healer': ['Healer town', 'The pilgrim’s road, a coast town: whitewash with sea-blue trim, terracotta roofs with blue glazed tiles, sandy flagstones, pale gold cloth, a domed well, a palm, shrine lamps.'],
  'kit-meadow': ['Meadow biome', 'Fresh greens and wildflowers: grass with a worn path, hedge rows and a drystone wall, a stream for its void, flowers, grass, a bush, a rock and a fence.'],
  'kit-ruins': ['Ruins biome', 'Warm sandstone and moss: cracked flagstones, broken masonry with fallen drums, a dark collapsed drop, a broken pillar, rubble, an urn, a bookcase and grass.'],
  'kit-marsh': ['Marsh biome', 'Deep greens, browns and still water: mud with boardwalk planks and puddles, reed beds and twisted roots, murky water, reeds, a stump, lilies, a log and mushrooms.'],
  'kit-coast': ['Coast biome', 'Pale sand, white rock and sea blue: sand and wet rock, rock shelves and a wreck’s timbers, a tide pool, rocks, a shell, driftwood and seaweed.'],
}
/** One kit's review page: its sheets, the scene uma-quest's builder draws, and every frame by name. */
function kitPage(kit: KitDef): string {
  const [title, look] = TITLES[kit.id]!, town = kit.kind === 'town', packet = town ? 'Q32' : 'Q33'
  const rows = kit.specs.map((f) => `<tr><td>${f.name}</td><td>${f.role}</td><td>${f.w} × ${f.h}</td><td>${f.foot ? `${f.foot.x}, ${f.foot.y}` : ''}</td><td>${f.blocks === undefined ? '' : f.blocks ? 'yes' : 'no'}</td><td>${f.light ? `${f.light.color} r${f.light.radius}` : ''}</td></tr>`).join('')
  const fig = (file: string, caption: string) => `<figure><figcaption>${caption}</figcaption><img src="${file}" alt="${caption}"></figure>`
  return `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${kit.id} review</title>
<style>body{margin:0;background:#142125;color:#e8eee5;font:16px/1.5 system-ui}header,main{max-width:1240px;margin:auto;padding:24px}h1{margin:0 0 8px;font-size:28px}p{color:#c2cebf}a{color:#9fd8ef}
figure{margin:0 0 32px}figcaption{margin:0 0 8px;font-weight:600}img{display:block;max-width:100%;border-radius:6px}table{border-collapse:collapse;width:100%;font-size:14px}td,th{border-bottom:1px solid #2c3d42;padding:4px 8px;text-align:left}</style>
<header><p><a href="../../code-kits.html">All eight kits</a></p><h1>${packet} · ${title} (${kit.id})</h1><p>${look}</p><p>${kit.specs.length} original frames drawn by code (P147, P151), ${town ? 'the Warrior town kit’s 32 by name, size, foot and blocking' : 'the forest kit’s roles, sizes and feet, and its five decorations'}. No text, no Uma art. The owner approves the look here.</p></header>
<main>${fig(town ? 'town-1x.png' : 'room-1x.png', `uma-quest’s test ${town ? 'town' : 'room'} built from this kit by uma-stage’s StageEngine (the stand-in party for scale)`)}
${fig(town ? 'building-1x.png' : 'battle-1x.png', town ? 'A one- and a two-storey building with their doors and signs, props and the stand-in traveler' : 'The fight: the far layer, the ground strip, the three middle pieces and two stand-in travelers')}
${fig('beside-1x.png', `Beside the painted ${town ? 'Warrior town' : 'forest'} kit (top) the same frames drawn in code (bottom): for the look decision`)}
${fig('light-1x.png', 'Every frame on light')}${fig('dark-1x.png', 'Every frame on dark')}
<h2>The frames</h2><table><tr><th>Name</th><th>Role</th><th>Size</th><th>Foot</th><th>Blocks</th><th>Light</th></tr>${rows}</table></main></html>
`
}
/** The page for all eight: what each is, and a link to its review. */
function hubPage(kits: readonly KitDef[]): string {
  const card = (k: KitDef) => { const [title, look] = TITLES[k.id]!, scene = k.kind === 'town' ? 'town-1x.png' : 'room-1x.png'; return `<a class="card" href="${k.id}/review/index.html"><img src="${k.id}/review/${scene}" alt="${title}"><h3>${title}</h3><p>${look}</p></a>` }
  return `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Code-drawn kits, Q32 and Q33</title>
<style>body{margin:0;background:#142125;color:#e8eee5;font:16px/1.5 system-ui}header,main{max-width:1240px;margin:auto;padding:24px}h1{font-size:28px;margin:0 0 8px}p{color:#c2cebf}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:20px}.card{display:block;background:#1d2e33;border-radius:10px;padding:12px;color:inherit;text-decoration:none}.card img{width:100%;border-radius:6px}.card h3{margin:10px 0 4px}.card p{font-size:14px;margin:0}</style>
<header><h1>uma-quest’s eight code-drawn kits</h1><p>Q32’s four region towns (by the Warrior town kit’s 32 frames) and Q33’s four band-1 biomes (by the forest kit’s roles), drawn in code by Claude (P147, P151) and published in uma-art. Each page shows the kit in uma-quest’s own test scene, its sample, the painted kit beside it for the look decision, and every frame. <strong>The owner approves each look.</strong></p></header>
<main><h2>Q32 · Towns</h2><div class="grid">${kits.filter((k) => k.kind === 'town').map(card).join('')}</div><h2>Q33 · Biomes</h2><div class="grid">${kits.filter((k) => k.kind === 'biome').map(card).join('')}</div></main></html>
`
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const kits = KITS.filter((k) => k.kind !== 'farm'), ids = process.argv.slice(2).length ? process.argv.slice(2) : kits.map((k) => k.id)
  for (const id of ids) console.log(id, writeKitReview(id).join(' '))
  for (const k of kits) writeFileSync(new URL(`${k.id}/review/index.html`, AUTHORED), kitPage(k))
  writeFileSync(new URL('code-kits.html', AUTHORED), hubPage(kits))
}
