// The stand-in kits (Q5): a biome kit and a town kit drawn in code to the kit spec's frames (docs/design/kits.md), so the
// builder runs before ChatGPT's forest kit (Q7) and town kit (Q15) land. Flat colours and simple marks, no art. The layout
// is pure (tests use it without a browser); the drawing needs a canvas.
import type { KitAtlas, KitFrame, KitRole } from '../formats/index.js'

interface Spec { name: string; role: KitRole; w: number; h: number; foot?: [number, number]; blocks?: boolean; light?: KitFrame['light']; weight?: number }

const T = 128
const tile = (name: string, role: KitRole, weight?: number): Spec => ({ name, role, w: T, h: T, ...(weight ? { weight } : {}) })
const prop = (name: string, w: number, h: number, blocks: boolean, light?: KitFrame['light']): Spec =>
  ({ name, role: 'prop', w, h, foot: [Math.round(w / 2), h - 6], blocks, ...(light ? { light } : {}) })

const SHARED: Spec[] = [
  tile('floor-1', 'floor', 4), tile('floor-2', 'floor', 3), tile('floor-3', 'floor', 2), tile('floor-4', 'floor', 1),
  tile('wall-top', 'wall-top'), tile('riser-1', 'riser', 3), tile('riser-2', 'riser', 1), tile('stairs', 'stairs'),
  { name: 'wall-1', role: 'wall', w: T, h: 2 * T, weight: 3 }, { name: 'wall-2', role: 'wall', w: T, h: 2 * T, weight: 1 },
  prop('lantern', 64, 192, true, { color: '#ffc46b', radius: 4, flicker: true }),
  prop('flowers', 96, 48, false), prop('rock', 128, 96, true),
]
const BIOME: Spec[] = [
  ...SHARED, tile('void', 'void'),
  prop('tree-1', 192, 320, true), prop('tree-2', 160, 288, true), prop('bush', 128, 96, true), prop('stump', 96, 64, true),
  prop('chest-closed', 96, 80, true), prop('chest-open', 96, 96, true), prop('spring', 192, 128, true, { color: '#8fdcff', radius: 3 }),
  prop('waystone', 96, 176, true, { color: '#7ff0e0', radius: 3 }), prop('stairs-down', 128, 96, false), prop('stairs-up', 128, 96, false),
  { name: 'battle-ground', role: 'battle-ground', w: 1024, h: 256 }, { name: 'battle-back', role: 'battle-back', w: 2048, h: 512 },
  { name: 'battle-mid-1', role: 'battle-mid', w: 256, h: 256, foot: [128, 250] },
]
const TOWN: Spec[] = [
  ...SHARED,
  tile('building-wall-1', 'building-wall', 3), tile('building-wall-2', 'building-wall', 1), tile('window-1', 'window', 2), tile('window-2', 'window', 1),
  tile('roof-1', 'roof', 2), tile('roof-2', 'roof', 1), { name: 'door', role: 'door', w: T, h: 2 * T },
  { name: 'sign-inn', role: 'sign', w: 128, h: 80, foot: [64, 80] }, { name: 'sign-shop', role: 'sign', w: 128, h: 80, foot: [64, 80] },
  prop('well', 160, 176, true), prop('stall', 192, 192, true), prop('fence', 128, 96, true), prop('barrel', 80, 96, true), prop('tree-1', 192, 320, true),
]

export const STAND_IN_PAGE = 2048

/** Shelf-packs the frames onto one page, row by row, 2 px apart, in list order. */
function pack(specs: Spec[]): Record<string, KitFrame> {
  const frames: Record<string, KitFrame> = {}
  let x = 0, y = 0, row = 0
  for (const s of specs) {
    if (x + s.w > STAND_IN_PAGE) { x = 0; y += row + 2; row = 0 }
    frames[s.name] = { page: 0, x, y, w: s.w, h: s.h, role: s.role, ...(s.weight ? { weight: s.weight } : {}),
      ...(s.foot ? { foot: { x: s.foot[0], y: s.foot[1] } } : {}), ...(s.blocks !== undefined ? { blocks: s.blocks } : {}), ...(s.light ? { light: s.light } : {}) }
    x += s.w + 2
    row = Math.max(row, s.h)
  }
  if (y + row > STAND_IN_PAGE) throw new Error('the stand-in kit outgrew its page')
  return frames
}

export function standInKitAtlas(kind: 'biome' | 'town'): KitAtlas {
  return { formatVersion: 1, id: kind === 'biome' ? 'kit-standin-forest' : 'kit-standin-town', kind, tile: 128,
    pages: [{ file: 'standin.png', width: STAND_IN_PAGE, height: STAND_IN_PAGE }], frames: pack(kind === 'biome' ? BIOME : TOWN) }
}

// --- Drawing -------------------------------------------------------------------------------------------------------------

/** A tiny deterministic noise, so the same kit draws the same every time. */
function noise(seed: number): () => number {
  let s = seed >>> 0
  return () => { s = (Math.imul(s ^ (s >>> 15), 2_246_822_507) + 0x9e3779b9) >>> 0; return (s & 0xffff) / 0x10000 }
}

function draw(g: CanvasRenderingContext2D, name: string, f: KitFrame, kind: KitAtlas['kind']): void {
  const { x, y, w, h } = f
  const r = noise(name.length * 977 + w * 31 + h)
  const fill = (c: string, ax = 0, ay = 0, aw = w, ah = h) => { g.fillStyle = c; g.fillRect(x + ax, y + ay, aw, ah) }
  const dots = (c: string, n: number, size = 4) => { g.fillStyle = c; for (let i = 0; i < n; i++) g.fillRect(x + Math.floor(r() * (w - size)), y + Math.floor(r() * (h - size)), size, size) }
  const ellipse = (c: string, cx: number, cy: number, rx: number, ry: number) => { g.fillStyle = c; g.beginPath(); g.ellipse(x + cx, y + cy, rx, ry, 0, 0, Math.PI * 2); g.fill() }
  switch (f.role) {
    case 'floor': {
      if (kind === 'town') { fill(['#a3977f', '#9c8f78', '#a89c84', '#958a73'][Number(name.slice(-1)) - 1] ?? '#a3977f'); fill('#857a64', 0, 0, w, 3); fill('#857a64', 0, 0, 3, h); dots('#b3a78e', 12, 6); break }
      fill(['#4f7d4a', '#4a7545', '#557f4c', '#5b7a43'][Number(name.slice(-1)) - 1] ?? '#4f7d4a')
      dots('#6a9a5a', 26); dots('#3d6338', 18); break
    }
    case 'wall-top': fill('#6f7380'); dots('#7d8290', 20); dots('#5d616c', 14); break
    case 'riser': fill('#6e5038'); dots('#5a402c', 22, 6); fill('#5d8a4e', 0, 0, w, 14); fill('#4a7545', 0, 12, w, 4); break
    case 'stairs': for (let s = 0; s < 4; s++) { fill(s % 2 ? '#8d8f99' : '#a0a2ad', 0, s * 32, w, 32); fill('#6f7380', 0, s * 32 + 28, w, 4) } break
    case 'void': fill('#0b1018'); break
    case 'wall': {
      fill('#7b7f8c')
      for (let row = 0; row < 8; row++) { fill('#666a76', 0, row * 32 + 30, w, 2); const off = row % 2 ? 0 : 32; for (let c = off; c < w; c += 64) fill('#666a76', c, row * 32, 2, 32) }
      dots('#8a8e9b', 16); break
    }
    case 'building-wall': fill('#d9c9a8'); fill('#7a5a3a', 0, 0, 10, h); fill('#7a5a3a', w - 10, 0, 10, h); fill('#7a5a3a', 0, h - 10, w, 10); break
    case 'window': fill('#d9c9a8'); fill('#7a5a3a', 0, 0, 10, h); fill('#7a5a3a', w - 10, 0, 10, h); fill('#5a3d24', 30, 26, 68, 64); fill('#8fc4e8', 36, 32, 56, 52); fill('#5a3d24', 62, 32, 4, 52); break
    case 'door': fill('#d9c9a8'); fill('#5a3d24', 18, 40, 92, 216); fill('#8a5f3a', 26, 48, 76, 208); dots('#7a5230', 10); fill('#e0b85a', 86, 150, 8, 8); break
    case 'roof': for (let s = 0; s < 4; s++) fill(s % 2 ? '#9a4c3a' : '#b0583f', 0, s * 32, w, 32); for (let c = 0; c < w; c += 32) fill('#7e3c2e', c, 0, 2, h); break
    case 'sign': fill('#5a3d24'); fill('#c9a46a', 6, 6, w - 12, h - 12); g.fillStyle = '#3a2614'; g.font = 'bold 30px sans-serif'; g.textAlign = 'center'; g.fillText(name === 'sign-inn' ? 'INN' : 'SHOP', x + w / 2, y + h / 2 + 11); break
    case 'battle-ground': fill('#4f7d4a'); dots('#6a9a5a', 200); dots('#3d6338', 160); break
    case 'battle-back': {
      fill('#1e3a2c')
      for (let i = 0; i < 26; i++) { const cx = (i * 83) % w, cy = 300 + (i % 3) * 30; ellipse(i % 2 ? '#2c5440' : '#244a38', cx, cy, 90, 140) }
      fill('#3e6a48', 0, h - 60, w, 60); break
    }
    case 'battle-mid': ellipse('#3e6e40', 128, 170, 110, 80); ellipse('#4f8250', 110, 150, 70, 50); break
    case 'prop': drawProp(g, name, f, fill, ellipse); break
  }
}

function drawProp(g: CanvasRenderingContext2D, name: string, f: KitFrame,
  fill: (c: string, ax?: number, ay?: number, aw?: number, ah?: number) => void, ellipse: (c: string, cx: number, cy: number, rx: number, ry: number) => void): void {
  const { w, h } = f, foot = f.foot ?? { x: w / 2, y: h }
  if (name.startsWith('tree')) { fill('#6b4a2e', w / 2 - 14, h * 0.55, 28, h * 0.45 - 6); ellipse('#2f6b3a', w / 2, h * 0.36, w * 0.46, h * 0.32); ellipse('#3f8048', w * 0.4, h * 0.3, w * 0.28, h * 0.2) }
  else if (name === 'bush') { ellipse('#3a7a42', w / 2, h * 0.6, w * 0.46, h * 0.36); ellipse('#4b8f50', w * 0.4, h * 0.5, w * 0.24, h * 0.2) }
  else if (name === 'rock') { ellipse('#7d808a', w / 2, h * 0.62, w * 0.44, h * 0.32); ellipse('#9295a0', w * 0.42, h * 0.52, w * 0.22, h * 0.16) }
  else if (name === 'stump') { fill('#6b4a2e', 18, 18, w - 36, h - 24); ellipse('#a8865a', w / 2, 20, w / 2 - 18, 10) }
  else if (name === 'flowers') { for (let i = 0; i < 7; i++) ellipse(['#f2d14b', '#f28bb0', '#ffffff'][i % 3]!, 10 + i * 12, 20 + (i % 2) * 10, 6, 6); fill('#3d6338', 0, h - 12, w, 6) }
  else if (name === 'lantern') { fill('#3a3a44', w / 2 - 4, 40, 8, h - 46); fill('#3a3a44', 12, 18, w - 24, 34); fill('#ffd27a', 18, 22, w - 36, 26) }
  else if (name.startsWith('chest')) { fill('#7a4e2a', 6, h - 54, w - 12, 48); fill('#d4a840', 6, h - 34, w - 12, 6); if (name === 'chest-open') fill('#5a3a1e', 6, 6, w - 12, 30); else fill('#8a5a32', 6, h - 72, w - 12, 22) }
  else if (name === 'spring') { ellipse('#7d808a', w / 2, h * 0.6, w * 0.48, h * 0.34); ellipse('#5cb8e8', w / 2, h * 0.58, w * 0.38, h * 0.24); ellipse('#a8e4ff', w * 0.42, h * 0.54, w * 0.12, h * 0.06) }
  else if (name === 'waystone') { fill('#8a8d98', 18, 16, w - 36, h - 22); fill('#7ff0e0', w / 2 - 6, 50, 12, 60); fill('#6a6d78', 10, h - 20, w - 20, 14) }
  else if (name === 'stairs-down') { fill('#20242c', 8, 20, w - 16, h - 26); for (let s = 0; s < 3; s++) fill('#4a4e58', 16 + s * 8, 28 + s * 18, w - 32 - s * 16, 8) }
  else if (name === 'stairs-up') { for (let s = 0; s < 4; s++) fill(s % 2 ? '#9a9ca6' : '#b0b2bc', 10 + s * 6, h - 24 - s * 18, w - 20 - s * 12, 18) }
  else if (name === 'well') { fill('#7d808a', 16, h - 70, w - 32, 64); fill('#3a5a78', 30, h - 66, w - 60, 14); fill('#6b4a2e', 20, 20, 10, h - 90); fill('#6b4a2e', w - 30, 20, 10, h - 90); fill('#9a4c3a', 8, 6, w - 16, 22) }
  else if (name === 'stall') { fill('#7a4e2a', 16, h - 90, w - 32, 84); fill('#c94f4f', 0, 20, w, 44); for (let c = 0; c < w; c += 32) fill('#f2e6d0', c, 20, 16, 44) }
  else if (name === 'fence') { for (let c = 8; c < w; c += 30) fill('#8a6a42', c, 20, 10, h - 26); fill('#8a6a42', 0, 36, w, 8); fill('#8a6a42', 0, 64, w, 8) }
  else if (name === 'barrel') { fill('#7a4e2a', 8, 10, w - 16, h - 16); fill('#4a4e58', 8, 24, w - 16, 6); fill('#4a4e58', 8, h - 30, w - 16, 6) }
  void foot; void g
}

/** The stand-in kit's page, drawn. */
export function drawStandInKit(kit: KitAtlas): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = STAND_IN_PAGE
  canvas.height = STAND_IN_PAGE
  const g = canvas.getContext('2d')!
  for (const [name, f] of Object.entries(kit.frames)) {
    g.save()
    g.beginPath(); g.rect(f.x, f.y, f.w, f.h); g.clip()
    draw(g, name, f, kit.kind)
    g.restore()
  }
  return canvas
}
