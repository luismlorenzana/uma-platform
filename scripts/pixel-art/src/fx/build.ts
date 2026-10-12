import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { hex } from '../color.ts'
import { encodePng } from '../png.ts'
import { contactSheet } from '../sheet.ts'
import { checkFx, fxFrames, packFx } from './atlas.ts'
import { KINDS } from './spec.ts'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..')
const frames = fxFrames(), problems = checkFx(frames)
if (problems.length) throw new Error(`Fx contract failed:\n${problems.join('\n')}`)
const { atlas, index } = packFx(frames), dir = join(ROOT, 'packages', 'art', 'fx'), previews = join(ROOT, 'assets', 'previews')
mkdirSync(dir, { recursive: true }); mkdirSync(previews, { recursive: true })
writeFileSync(join(dir, 'atlas.png'), encodePng(atlas.w, atlas.h, atlas.px))
writeFileSync(join(dir, 'atlas.json'), `${JSON.stringify({ schemaVersion: 1, width: atlas.w, height: atlas.h, frames: index }, null, 1)}\n`)
const rows = KINDS.map((kind) => frames.filter((f) => f.kind === kind).map((f) => f.img.px))
for (const [name, scale] of [['fx', 3], ['fx-1x', 1]] as const) {
  const sheet = contactSheet(rows, scale, 8, hex('#0f141b'), hex('#18202a'))
  writeFileSync(join(previews, `${name}.png`), encodePng(sheet.w, sheet.h, sheet.px))
}
const uri = (png: Buffer) => `data:image/png;base64,${png.toString('base64')}`
const atlasUri = uri(encodePng(atlas.w, atlas.h, atlas.px))
const animationRows = KINDS.map((kind, i) => `<div class="animated-row" style="--row:${-i * 96}px"><strong>${kind}</strong><div class="animation hit" role="img" aria-label="${kind} four-frame impact"></div><div class="animation familiar" role="img" aria-label="${kind} two-frame familiar"></div></div>`).join('')
const cards = KINDS.map((kind) => `<section><h2>${kind}</h2><div class="cards">${frames.filter((f) => f.kind === kind).map((f) => `<figure><img src="${uri(encodePng(32, 32, f.img.px))}" width="96" height="96" alt="${f.id}"><img class="x1" src="${uri(encodePng(32, 32, f.img.px))}" width="32" height="32" alt="${f.id} at native size"><figcaption>${f.id}</figcaption></figure>`).join('')}</div></section>`).join('')
writeFileSync(join(previews, 'fx.html'), `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Battle pixel effects</title><style>
:root{color-scheme:dark}body{margin:0;padding:12px;background:#0f141b;color:#e6e9ee;font:14px/1.4 system-ui,sans-serif}h1{font-size:20px}h2{font-size:16px}p,figcaption{color:#a2afbf}img{image-rendering:pixelated;display:block;margin:auto}figure{margin:0;padding:8px;border-radius:5px;background:#18202a;text-align:center}.x1{margin-top:8px}figcaption{font-size:11px;margin-top:6px}.cards{display:flex;flex-wrap:wrap;gap:8px}.animated-row{display:flex;gap:12px;align-items:center;margin:8px 0}.animated-row strong{width:88px}.animation{width:96px;height:96px;background-image:url('${atlasUri}');background-size:576px 960px;background-position-y:var(--row);image-rendering:pixelated;background-color:#18202a;border-radius:4px}.hit{animation:hit var(--hit-time,360ms) steps(1,end) infinite}.familiar{animation:familiar var(--idle-time,800ms) steps(1,end) infinite}@keyframes hit{0%{background-position-x:0}25%{background-position-x:-96px}50%{background-position-x:-192px}75%{background-position-x:-288px}100%{background-position-x:0}}@keyframes familiar{0%{background-position-x:-384px}50%{background-position-x:-480px}100%{background-position-x:-384px}}@media(prefers-reduced-motion:reduce){.animation{animation:none}.hit{background-position-x:-288px}.familiar{background-position-x:-480px}}.speeds{display:flex;gap:8px;align-items:center;margin:16px 0}.speeds button{min-width:44px;min-height:44px;border:1px solid #526377;border-radius:5px;background:#18202a;color:#e6e9ee}.speeds button[aria-pressed=true]{border-color:#e6c774}.preview-static .animation{animation:none}.preview-static .hit{background-position-x:-288px}.preview-static .familiar{background-position-x:-480px}
</style></head><body><h1>Battle pixel effects</h1><p>H10: four target-local impact frames and two familiar poses per kind. Every frame is 32×32 with a centre anchor. Animation previews below; static frames at 3× and 1× follow. Reduced motion shows the final pose.</p><div class="speeds" aria-label="Preview speed"><button type="button" data-speed="1" aria-pressed="true">1×</button><button type="button" data-speed="2" aria-pressed="false">2×</button><button type="button" data-speed="4" aria-pressed="false">4×</button><label><input id="static-preview" type="checkbox">Reduced motion</label></div>${animationRows}${cards}<script>for(const b of document.querySelectorAll('[data-speed]'))b.addEventListener('click',()=>{const speed=Number(b.dataset.speed);document.documentElement.style.setProperty('--hit-time',360/speed+'ms');document.documentElement.style.setProperty('--idle-time',800/speed+'ms');for(const other of document.querySelectorAll('[data-speed]'))other.setAttribute('aria-pressed',String(other===b));});document.querySelector('#static-preview').addEventListener('change',e=>document.body.classList.toggle('preview-static',e.target.checked));</script></body></html>`)
console.log(`Wrote ${frames.length} fx frames (${atlas.w}×${atlas.h}) to ${relative(ROOT, dir)}; ids, sizes, poses and clear bounds checked`)
