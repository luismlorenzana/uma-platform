// Builds uma-cyberpunk's cabin art (CY14, P164): packages/art/cabin-icons and packages/art/cabin-room (atlas.png and
// atlas.json each), plus the review sheets, six mock cabins and assets/previews/cabins.html.
// Run from the repo root: pnpm art:draw (or pnpm --filter @uma-platform/pixel-art exec tsx src/cabins/build.ts)
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { encodePng } from '../png.ts'
import type { Img } from '../tiles/image.ts'
import { ROOM_SIZE, packIcons, packRoom } from './atlas.ts'
import { DECOR_NAME, DECOR_STYLES, FURNITURE, GIFT_NAME, GIFTS, KEEPSAKES, SLOT_NAME } from './items.ts'
import { LIGHT, NIGHT, diorama, iconSheet, roomSheet } from './preview.ts'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..')
const png = (img: Img) => encodePng(img.w, img.h, img.px)
const uri = (img: Img) => `data:image/png;base64,${png(img).toString('base64')}`

const icons = packIcons(), room = packRoom()
for (const [family, packed] of [['cabin-icons', icons], ['cabin-room', room]] as const) {
  const dir = join(ROOT, 'packages', 'art', family)
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, 'atlas.png'), png(packed.atlas))
  writeFileSync(join(dir, 'atlas.json'), `${JSON.stringify({ schemaVersion: 1, width: packed.atlas.w, height: packed.atlas.h, frames: packed.frames }, null, 1)}\n`)
}

const previews = join(ROOT, 'assets', 'previews')
mkdirSync(previews, { recursive: true })
const written: string[] = []
const save = (name: string, img: Img) => { writeFileSync(join(previews, name), png(img)); written.push(name) }
for (const scale of [1, 2, 4]) {
  save(`cabin-icons-night-${scale}x.png`, iconSheet(icons.drawn, scale, NIGHT))
  save(`cabin-icons-light-${scale}x.png`, iconSheet(icons.drawn, scale, LIGHT))
}
for (const scale of [1, 2]) save(`cabin-room-${scale}x.png`, roomSheet(room.drawn, scale))
DECOR_STYLES.forEach((style, i) => save(`cabin-diorama-${style}.png`, diorama(style, room.drawn, room.frames, icons.drawn.get(KEEPSAKES[i % KEEPSAKES.length]!.id)!)))

// The review page: every piece named, at both sizes, then the sheets and the cabins.
const card = (id: string, sub: string, big?: Img) => {
  const icon = icons.drawn.get(id)!.img, name = icons.frames[id]!.name
  const roomImg = big ? `<img class="room" src="${uri(big)}" width="${big.w}" height="${big.h}" alt="${name} at room size">` : ''
  return `<figure>${roomImg}<div class="icons"><img src="${uri(icon)}" width="128" height="128" alt="${name} icon at 2×"><img src="${uri(icon)}" width="64" height="64" alt="${name} icon at 1×"></div><figcaption>${name}<span><code>${id}</code> · ${sub}</span></figcaption></figure>`
}
const lines = DECOR_STYLES.map((style) => {
  const cards = FURNITURE.filter((f) => f.style === style).map((f) => {
    const fr = room.frames[f.id]!
    return card(f.id, `${SLOT_NAME[f.slot]} · ${fr.mount} · ${ROOM_SIZE[f.slot]} px · foot ${fr.foot.x},${fr.foot.y} w${fr.foot.w}`, room.drawn.get(f.id)!.img)
  }).join('')
  return `<section><h3>${DECOR_NAME[style]}</h3><div class="grid">${cards}</div></section>`
}).join('')
const sheets = (kind: string, label: string) => [1, 2, 4].map((s) => `<h3>${label}, ${s}×</h3><div class="scroll"><img src="cabin-icons-${kind}-${s}x.png" alt="All 48 cabin icons at ${s}× on ${label.toLowerCase()}: six lines, keepsakes, gifts"></div>`).join('')
const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Cabin furniture art</title><style>
:root{color-scheme:dark}body{margin:0;padding:16px;background:${NIGHT};color:#e8e4f4;font:14px/1.5 system-ui,sans-serif;max-width:1500px}
h1{font-size:22px;margin:0 0 6px}h2{font-size:17px;margin:32px 0 8px}h3{font-size:14px;margin:18px 0 8px;color:#cfc8ea}p,li{color:#a8a2c4}code{color:#d6cff2}
img{image-rendering:pixelated;display:block}.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:10px}
figure{margin:0;padding:10px;background:#16132a;border-radius:8px;display:grid;justify-items:center;align-content:end;gap:8px}
.icons{display:flex;align-items:end;gap:8px}figcaption{text-align:center;font-weight:600}figcaption span{display:block;color:#a8a2c4;font-weight:400;font-size:12px}
.scroll{overflow-x:auto}.cabins{display:grid;grid-template-columns:repeat(auto-fill,minmax(640px,1fr));gap:12px}.zoom img{width:1280px;height:720px}
</style></head><body>
<h1>Cabin furniture, keepsakes and gifts (uma-cyberpunk CY14)</h1>
<p>Original pixel art drawn in code in <code>scripts/pixel-art/src/cabins</code> (uma-platform P164, P126/P147), keyed by uma-cyberpunk's item ids
(its <code>packages/domain/src/cabins/items.ts</code> at 891e50e). Two uma-art families: <code>cabin-icons</code> (all 48 items, 64 px, eight across,
512 × 384) and <code>cabin-room</code> (the 30 furniture pieces at room size: Bed, Desk and Floor 150 px, Wall and Light 96 px, one row per slot,
900 × 642). Each piece is drawn natively at both sizes from the same geometry, never resampled. Room frames carry <code>mount</code>
(floor, wall or ceiling) and <code>foot</code> (where a standing piece meets the floor; a rug's whole cell). No characters, no master data.</p>
<h2>The six lines, each a set (room size, then the icon at 2× and 1×)</h2>${lines}
<h2>Keepsakes</h2><div class="grid">${KEEPSAKES.map((k) => card(k.id, 'Keepsake')).join('')}</div>
<h2>Gifts</h2><div class="grid">${GIFTS.map((g) => card(g.id, `Gift · ${GIFT_NAME[g.gift]}`)).join('')}</div>
<h2>Contact sheets</h2><p>Rows: Neon, Classic, Cozy, Sporty, Tech and Wild lines (Bed, Desk, Wall, Floor, Light), then the six keepsakes, then the twelve gifts in two rows.</p>
${sheets('night', 'Night ground')}${sheets('light', 'Light ground')}
<h2>Room size by line</h2><p>Each row one line: Bed, Desk, Floor (150 px), then Wall and Light (96 px), on a common baseline.</p>
${[1, 2].map((s) => `<h3>${s}×</h3><div class="scroll"><img src="cabin-room-${s}x.png" alt="The 30 furniture pieces at room size, by line, at ${s}×"></div>`).join('')}
<h2>Mock cabins (640 × 360)</h2><p>A plain code-drawn room with one full line placed by its frames: the rug centred on the floor, the desk by its <code>foot</code>
at y 324, the bed by its <code>foot</code> at y 342, the wall piece over the bed, the light hung from the ceiling (the Classic sconce on the wall), a keepsake icon on a ledge.
The room itself is only for review; the game draws its own.</p>
<div class="cabins">${DECOR_STYLES.map((s) => `<figure><img src="cabin-diorama-${s}.png" width="640" height="360" alt="A mock cabin with the ${DECOR_NAME[s]} line"><figcaption>${DECOR_NAME[s]}</figcaption></figure>`).join('')}</div>
<h3>Neon and Cozy at 2×</h3>${['neon', 'cozy'].map((s) => `<div class="scroll zoom"><img src="cabin-diorama-${s}.png" alt="The ${s} cabin at 2×"></div>`).join('')}
</body></html>
`
writeFileSync(join(previews, 'cabins.html'), html)
console.log(`Wrote ${Object.keys(icons.frames).length} cabin icons (${icons.atlas.w}×${icons.atlas.h}) and ${Object.keys(room.frames).length} room pieces (${room.atlas.w}×${room.atlas.h}) to packages/art, previews ${written.length} PNGs + cabins.html in ${relative(ROOT, previews)}`)
