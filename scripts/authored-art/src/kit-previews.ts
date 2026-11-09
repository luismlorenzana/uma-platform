// Review compositions use the exported frames at native density, never repainted stand-ins.
import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import sharp from 'sharp'
import { kitProject, renderKit, type RenderedKitFrame } from './kits.js'

const svg = (w: number, h: number, body: string) => Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">${body}</svg>`)
const label = (x: number, y: number, text: string, color: string, size = 14) => `<text x="${x}" y="${y}" fill="${color}" font-family="sans-serif" font-size="${size}">${text}</text>`

export async function kitPreviews(root = kitProject, id = 'kit-forest') {
  const { frames } = await renderKit(root, id), dir = resolve(root, 'assets/authored', id, 'review')
  await mkdir(dir, { recursive: true })
  const width = 2112, margin = 32, placements: { f: RenderedKitFrame; x: number; y: number }[] = []
  let x = margin, y = 86, row = 0
  for (const f of frames) {
    const w = Math.max(160, f.spec.w)
    if (x + w > width - margin) { x = margin; y += row + 58; row = 0 }
    placements.push({ f, x: x + Math.floor((w - f.spec.w) / 2), y })
    x += w + 24; row = Math.max(row, f.spec.h)
  }
  const height = y + row + 70
  for (const [theme, background, ink] of [['light', '#e6e9df', '#273629'], ['dark', '#172329', '#e4e9df']] as const) {
    const labels = [label(margin, 38, `${id} · ${frames.length} original frames · native texels`, ink, 24)]
    const composites: sharp.OverlayOptions[] = []
    for (const { f, x, y } of placements) {
      composites.push({ input: f.png, left: x, top: y })
      labels.push(label(x, y + f.spec.h + 20, f.spec.key, ink), label(x, y + f.spec.h + 38, `${f.spec.w} × ${f.spec.h}`, ink, 12))
    }
    const native = await sharp({ create: { width, height, channels: 4, background } })
      .composite([...composites, { input: svg(width, height, labels.join('')), left: 0, top: 0 }]).png().toBuffer()
    await writeFile(resolve(dir, `${theme}-1x.png`), native)
    await sharp(native).resize(width * 2, height * 2, { kernel: 'nearest' }).png().toFile(resolve(dir, `${theme}-2x.png`))
  }
  const floors = frames.filter(f => f.spec.role === 'floor'), tiles: sharp.OverlayOptions[] = []
  // Four rows cycle every ordered pair across horizontal and vertical neighbours.
  for (let z = 0; z < 8; z++) for (let x = 0; x < 8; x++) {
    const f = floors[(Math.floor(x / 2) + z + (x % 2 ? Math.floor(z / 2) : 0)) % floors.length]!
    tiles.push({ input: f.png, left: x * 128, top: z * 128 })
  }
  await sharp({ create: { width: 1024, height: 1024, channels: 4, background: '#000' } }).composite(tiles).png().toFile(resolve(dir, 'floor-mix-1x.png'))
  if (id === 'kit-forest') {
    const get = (key: string) => frames.find(f => f.spec.key === key)!
    const back = get('battle-back'), ground = get('battle-ground')
    const layers: sharp.OverlayOptions[] = [{ input: back.png, left: 0, top: 0 }]
    for (let i = 0; i < 2; i++) layers.push({ input: ground.png, left: i * 1024, top: 512 })
    for (const [key, fx, fy] of [['battle-mid-1', 180, 540], ['battle-mid-2', 1830, 556], ['battle-mid-3', 1470, 540]] as const) {
      const f = get(key); layers.push({ input: f.png, left: fx - f.spec.foot!.x, top: fy - f.spec.foot!.y })
    }
    await sharp({ create: { width: 2048, height: 768, channels: 4, background: '#596d45' } }).composite(layers).png().toFile(resolve(dir, 'battle-1x.png'))
  }
  await writeFile(resolve(dir, 'index.html'), `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${id} review</title>
<style>body{margin:0;background:#142125;color:#e8eee5;font:16px system-ui}header{padding:28px;max-width:1200px;margin:auto}h1{margin:0 0 12px;font-size:28px}p{line-height:1.5;color:#c2cebf}nav{display:flex;flex-wrap:wrap;gap:8px}button,a{color:inherit;background:#2b4434;border:1px solid #64815f;border-radius:8px;padding:10px 16px;text-decoration:none;font:inherit;cursor:pointer}figure{margin:20px 0;overflow:auto}figcaption{padding:14px 28px}img{display:block;max-width:100%;max-height:80vh;width:auto;height:auto;margin:auto}.actual img,.twice img{max-width:none;max-height:none}footer{padding:28px;color:#bac9b8}</style>
<header><h1>${id === 'kit-forest' ? 'Q7 · Forest kit' : 'Q15 · Warrior town kit'}</h1><p>${frames.length} original painted assets. Tiles are 128 texels; trees are about 320 texels tall. The assembled scene uses uma-quest’s world builder and its fixed 35° camera. The figure is an original stand-in for scale.</p><nav><button data-view="overview">Overview</button><button data-view="actual">Actual size</button><button data-view="twice">2×</button><a href="#assets">All assets</a><a href="dark-1x.png">Dark sheet</a><a href="light-1x.png">Light sheet</a></nav></header>
<main><figure id="scene"><figcaption>Assembled ${id === 'kit-forest' ? 'room' : 'town'} with scale figure</figcaption><img data-file="room-scale" src="room-scale-1x.png" alt="Assembled scene with stand-in figure"></figure><figure><figcaption>Assembled scene without figure</figcaption><img data-file="room" src="room-1x.png" alt="Assembled scene"></figure><figure id="assets"><figcaption>All assets · light</figcaption><img data-file="light" src="light-1x.png" alt="Complete original asset sheet on light"></figure><figure><figcaption>All assets · dark</figcaption><img data-file="dark" src="dark-1x.png" alt="Complete original asset sheet on dark"></figure><figure><figcaption>Mixed floor variants · seam check</figcaption><img src="floor-mix-1x.png" alt="Repeated mixed floor variants"></figure>${id === 'kit-forest' ? '<figure><figcaption>Assembled battle set</figcaption><img src="battle-1x.png" alt="Forest battle set"></figure>' : ''}</main><footer>Original art only. Authored masters and prompts are kept beside this review; runtime atlas is in packages/art/${id}.</footer><script>document.querySelectorAll('button[data-view]').forEach(b=>b.onclick=()=>{document.body.className=b.dataset.view;document.querySelectorAll('img[data-file]').forEach(i=>i.src=i.dataset.file+(b.dataset.view==='twice'?'-2x.png':'-1x.png'));});</script></html>`)
  return { id, frames: frames.length, dir }
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  kitPreviews(kitProject, process.argv[2]).then(console.log).catch((error: unknown) => { console.error(error); process.exitCode = 1 })
}
