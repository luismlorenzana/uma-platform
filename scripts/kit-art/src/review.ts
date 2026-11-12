// `pnpm --filter @uma-platform/kit-art review`: kit-farm's review sheets (KF13, kits.md §8) under
// assets/authored/kit-farm/review/: the kit on light and dark, every floor family tiled in mixed order, the ripe crops on
// their soil, and a scale sheet with uma-quest's stand-in traveler beside a door, a tree and the bin. The sheets carry no
// text (names are on the page). The sample band is captured from uma-stage's BandStage by `review-band/`.
import { mkdirSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { hex, type RGBA } from './color.js'
import { drawWave, type DrawnFrame } from './farm/index.js'
import { WAVE_1 } from './farm/spec.js'
import { Canvas, circle, poly, rect } from './paint.js'
import { encodePng } from './png.js'

export const REVIEW = new URL('../../../assets/authored/kit-farm/review/', import.meta.url)
const png = (c: Canvas) => encodePng(c.w, c.h, c.rgba8(0))

/** Every frame on a ground, in kit-farm.md §6's order, rows wrapped at the sheet's width. */
export function kitSheet(frames: readonly DrawnFrame[], ground: string): { canvas: Canvas; places: { name: string; x: number; y: number; w: number; h: number }[] } {
  const width = 2112, gap = 24, places: { name: string; x: number; y: number; w: number; h: number }[] = []
  let x = gap, y = gap, row = 0
  for (const f of frames) {
    if (x + f.spec.w > width - gap) { x = gap; y += row + gap * 2; row = 0 }
    places.push({ name: f.spec.name, x, y, w: f.spec.w, h: f.spec.h }); x += f.spec.w + gap; row = Math.max(row, f.spec.h)
  }
  const canvas = new Canvas(width, y + row + gap)
  canvas.fill(rect(0, 0, canvas.w, canvas.h), [...hex(ground), 1])
  for (const p of places) canvas.draw(frames.find((f) => f.spec.name === p.name)!.canvas, p.x, p.y)
  return { canvas, places }
}
/** Each floor family laid 4 × 4 in a mixed order (every ordered pair side by side and stacked), families in a row. */
function floorSheet(frames: readonly DrawnFrame[]): Canvas {
  const families = ['grass', 'path', 'tilled', 'forest-floor', 'water', 'paving']
  const out = new Canvas(families.length * (512 + 24) + 24, 512 + 48)
  out.fill(rect(0, 0, out.w, out.h), [...hex('#1d2a2e'), 1])
  families.forEach((fam, i) => {
    const tiles = frames.filter((f) => new RegExp(`^${fam}-\\d$`).test(f.spec.name))
    for (let z = 0; z < 4; z++) for (let x = 0; x < 4; x++) out.draw(tiles[(x + z * 2 + Math.floor(x / 2)) % tiles.length]!.canvas, 24 + i * 536 + x * 128, 24 + z * 128)
  })
  return out
}
/** The ripe crop families and the three stages, each on its own tilled tile. */
function cropSheet(frames: readonly DrawnFrame[]): Canvas {
  const crops = frames.filter((f) => f.spec.name.startsWith('crop-')), soil = frames.find((f) => f.spec.name === 'tilled-1')!.canvas
  const out = new Canvas(crops.length * 136 + 8, 128 + 200 + 16)
  out.fill(rect(0, 0, out.w, out.h), [...hex('#e6e9df'), 1])
  crops.forEach((f, i) => {
    const x = 8 + i * 136, ground = 200
    out.draw(soil, x, ground)
    out.draw(f.canvas, x, ground + 64 - f.spec.foot!.y)
  })
  return out
}
/** uma-quest's stand-in traveler (its stage's standIn.ts), drawn at its 256 cell with the foot on row 240. No Uma art. */
function traveler(): Canvas {
  const c = new Canvas(256, 256), cx = 128, foot = 241
  c.fill(rect(cx - 22, foot - 48, 16, 48), [...hex('#2b2f3a'), 1]).fill(rect(cx + 6, foot - 48, 16, 48), [...hex('#2b2f3a'), 1])
  c.fill(rect(cx - 40, 118, 80, foot - 48 - 118 + 8, 18), [...hex('#4f86e8'), 1])
  c.fill(rect(cx - 40, 170, 80, foot - 48 - 170 + 8), [0, 0, 0, 0.18], 'atop')
  c.fill(poly([[cx - 34, 70], [cx - 22, 28], [cx - 10, 62]]), [...hex('#7a4a2a'), 1]).fill(poly([[cx + 34, 70], [cx + 22, 28], [cx + 10, 62]]), [...hex('#7a4a2a'), 1])
  c.fill(circle(cx, 88, 38), [...hex('#f3dcc0'), 1])
  c.fill({ box: [cx - 40, 36, cx + 40, 77], sd: (x, y) => Math.max(Math.hypot(x - cx, y - 76) - 39, y - 76) }, [...hex('#7a4a2a'), 1])
  c.fill(rect(cx - 16, 92, 7, 10), [...hex('#1b1406'), 1]).fill(rect(cx + 9, 92, 7, 10), [...hex('#1b1406'), 1])
  return c
}
/** The stand-in traveler on the grass beside a plank house's door, a tree and the bin, at one texel a pixel. */
function scaleSheet(frames: readonly DrawnFrame[]): Canvas {
  const get = (n: string) => frames.find((f) => f.spec.name === n)!, out = new Canvas(1024, 520), ground = 448
  out.fill(rect(0, 0, out.w, out.h), [...hex('#cfe3ee'), 1])
  for (let x = 0; x < out.w; x += 128) { out.draw(get(x % 256 ? 'grass-2' : 'grass-1').canvas, x, ground); out.draw(get('grass-3').canvas, x, ground - 128) }
  // A plank front: wall, window, door and wall, two levels.
  const front = [['building-wall-plank-1', 'window-plank-1'], ['door-plank', null], ['building-wall-plank-2', 'window-plank-2']] as const
  front.forEach(([low, high], i) => {
    const x = 24 + i * 128
    if (low === 'door-plank') out.draw(get(low).canvas, x, ground - 256)
    else { out.draw(get(low).canvas, x, ground - 128); out.draw(get(high!).canvas, x, ground - 256) }
  })
  const stand = (c: Canvas, foot: { x: number; y: number }, at: number) => out.draw(c, at - foot.x, ground - foot.y)
  stand(traveler(), { x: 128, y: 240 }, 470)
  stand(get('tree-1').canvas, get('tree-1').spec.foot!, 700)
  stand(get('bin').canvas, get('bin').spec.foot!, 920)
  out.fill(rect(0, ground, out.w, 1), [0, 0, 0, 0.12] as RGBA)
  return out
}

export function writeReview(): string[] {
  const frames = drawWave(WAVE_1), written: string[] = []
  mkdirSync(REVIEW, { recursive: true })
  const put = (name: string, c: Canvas) => { writeFileSync(new URL(name, REVIEW), png(c)); written.push(name) }
  for (const [theme, ground] of [['light', '#e6e9df'], ['dark', '#172329']] as const) {
    const { canvas } = kitSheet(frames, ground)
    put(`${theme}-1x.png`, canvas)
  }
  put('floors-1x.png', floorSheet(frames))
  put('crops-1x.png', cropSheet(frames))
  put('scale-1x.png', scaleSheet(frames))
  writeFileSync(new URL('index.html', REVIEW), page())
  return [...written, 'index.html']
}

/** The review page: every sheet, then every frame by name, role, size and set. */
function page(): string {
  const rows = WAVE_1.map((f) => `<tr><td>${f.name}</td><td>${f.role}</td><td>${f.w} × ${f.h}</td><td>${f.set ?? ''}</td><td>${f.foot ? `${f.foot.x}, ${f.foot.y}` : ''}</td><td>${f.blocks === undefined ? '' : f.blocks ? 'yes' : 'no'}</td><td>${f.light ? `${f.light.color} r${f.light.radius}` : ''}</td></tr>`).join('')
  const fig = (file: string, caption: string) => `<figure><figcaption>${caption}</figcaption><img src="${file}" alt="${caption}"></figure>`
  return `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>kit-farm review</title>
<style>body{margin:0;background:#142125;color:#e8eee5;font:16px/1.5 system-ui}header,main{max-width:1240px;margin:auto;padding:24px}h1{margin:0 0 8px;font-size:28px}p{color:#c2cebf}
figure{margin:0 0 32px}figcaption{margin:0 0 8px;font-weight:600}img{display:block;max-width:100%;image-rendering:auto;border-radius:6px}body.twice img{max-width:none;width:auto;zoom:2;image-rendering:pixelated}
.phones{display:flex;gap:24px;flex-wrap:wrap}.phones img{width:375px}button{font:inherit;border:0;border-radius:8px;padding:6px 12px;margin-right:6px}
table{border-collapse:collapse;width:100%;font-size:14px}td,th{border-bottom:1px solid #2c3d42;padding:4px 8px;text-align:left}</style>
<header><h1>F9 · kit-farm, wave 1</h1><p>87 original frames drawn by code (P147, uma-farm D66): 17 ground, 20 building pieces in sets, 35 props and mounted pieces, 15 crops. One 2048 page, 128 texels a tile, lit from the top front-left in a neutral late-spring light; the seasons are the stage's grade (KF10). No text, no Uma art. The owner approves the look here (KF13).</p>
<p><button onclick="document.body.className=''">Native</button><button onclick="document.body.className='twice'">2×</button></p></header>
<main>${fig('band-1x.png', 'The sample band at one texel a pixel: the Fields, the Mill (plaster, thatch, sails mounted), the overgrown Coop and the path row, rendered by uma-stage’s BandStage with stand-in figures')}
<div class="phones">${fig('farm-phone.png', 'The stand-in farm on a 2× phone, fit to width (uma-stage 0.3.0)')}${fig('farm-phone-night.png', 'The same farm under a night grade: the lanterns lit')}</div>
${fig('scale-1x.png', 'Scale: uma-quest’s stand-in traveler beside a plank front and its door, a tree and the bin')}
${fig('crops-1x.png', 'The crops: three stages and twelve ripe families, each on a tilled tile')}
${fig('floors-1x.png', 'Floors tiled 4 × 4 in mixed variant order: grass, path, tilled, forest floor, water, paving')}
${fig('light-1x.png', 'Every frame on light')}${fig('dark-1x.png', 'Every frame on dark')}
<h2>The frames</h2><table><tr><th>Name</th><th>Role</th><th>Size</th><th>Set</th><th>Foot</th><th>Blocks</th><th>Light</th></tr>${rows}</table></main></html>
`
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) console.log(writeReview().join('\n'))

