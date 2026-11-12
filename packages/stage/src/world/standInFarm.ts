// The farm's stand-in kit (ST2; uma-farm kit-farm.md §4, §6): every wave-1 and wave-2 frame at its KF8 size, building
// pieces in their sets (KF3), drawn in code in flat colours, no art, so the band stage runs before ChatGPT's kit-farm
// (uma-farm F9) lands. Its own module, so a game that never draws a farm (uma-quest) never carries it. The layout is
// pure; the drawing needs a canvas.
import { CanvasTexture } from 'three'
import { FARM_WAVE_1, FARM_WAVE_2, type KitAtlas, type KitFrame, type KitRole } from '../formats/index.js'
import { pixelTexture, type LoadedKit } from './kits.js'
import { noise, pack, STAND_IN_PAGE, T, tile, type Spec } from './standInShared.js'

const at = (name: string, w: number, h: number, blocks: boolean | undefined, foot?: [number, number], light?: KitFrame['light']): Spec =>
  ({ name, role: 'prop', w, h, foot: foot ?? [Math.round(w / 2), h - 6], ...(blocks !== undefined ? { blocks } : {}), ...(light ? { light } : {}) })
const FARM_SIZES: Readonly<Record<string, [number, number, boolean | undefined, [number, number]?, KitFrame['light']?]>> = {
  'tree-1': [256, 384, true], 'tree-2': [256, 384, true], 'tree-3': [256, 384, true], stump: [128, 96, true], 'rock-small': [96, 64, false],
  'mushroom-patch': [128, 64, false], 'herb-patch': [128, 64, false], scarecrow: [128, 256, true], dock: [256, 128, false], reeds: [128, 128, false],
  // Mounted pieces stand at their foot: the sails turn on their hub, the boxes hang from their top.
  'mill-sails': [384, 384, undefined, [192, 192]], chimney: [64, 192, undefined], 'forge-chimney': [96, 256, undefined, undefined, { color: '#ff8a3d', radius: 3, flicker: true }],
  smoker: [128, 192, true], furnace: [192, 256, true, undefined, { color: '#ff7b2e', radius: 4, flicker: true }], 'log-pile': [256, 128, true], 'saw-bench': [192, 128, true],
  bin: [128, 128, true], crates: [192, 160, true], barrel: [96, 128, true], sack: [96, 96, true], 'gate-arch': [384, 384, false],
  'fence-1': [128, 128, true], 'fence-2': [128, 128, true], 'fence-broken': [128, 128, false], 'stall-awning': [256, 192, false], awning: [384, 192, undefined, [192, 8]],
  porch: [256, 192, false], 'flower-box': [128, 64, undefined, [64, 8]], 'herb-box': [128, 64, undefined, [64, 8]], 'lot-stakes': [384, 128, false],
  'weeds-1': [128, 128, false], 'weeds-2': [128, 128, false], brambles: [192, 160, true], 'flowers-1': [128, 64, false], 'flowers-2': [128, 64, false],
  'bush-1': [160, 128, true], 'bush-2': [160, 128, true], lantern: [64, 192, true, undefined, { color: '#ffc46b', radius: 4, flicker: true }],
  'mine-mouth': [384, 384, undefined], 'ore-cart': [192, 160, true], 'quarry-rock-1': [192, 192, true], 'quarry-rock-2': [192, 192, true], 'stone-stack': [192, 128, true],
  grindstone: [160, 160, true], anvil: [160, 128, true], 'ring-bench': [192, 128, true], trough: [192, 96, true], 'hay-bale': [160, 128, true],
  'cafe-table': [192, 160, true], bunting: [384, 192, false], flagpole: [64, 384, true], signpost: [96, 192, true], 'notice-board': [128, 192, true],
  'crop-sprout': [128, 64, false], 'crop-growing': [128, 96, false], 'crop-withered': [128, 96, false], 'crop-root': [128, 96, false], 'crop-leafy': [128, 96, false],
  'crop-herb': [128, 96, false], 'crop-grain': [128, 160, false], 'crop-rice': [128, 128, false], 'crop-staked-red': [128, 192, false], 'crop-staked-green': [128, 192, false],
  'crop-staked-purple': [128, 192, false], 'crop-corn': [128, 192, false], 'crop-sunflower': [128, 192, false], 'crop-spear': [128, 128, false], 'crop-gourd': [128, 96, false],
}
const SET_OF = /^(?:building-wall|window|door-wide|door|roof)-([a-z]+)(?:-\d+)?$/
function farmSpec(name: string): Spec {
  const sized = FARM_SIZES[name]
  if (sized) return at(name, ...sized)
  if (name === 'door-shop') return { name, role: 'door', w: T, h: 2 * T, set: 'plaster' }
  const set = SET_OF.exec(name)?.[1]
  if (set) {
    const role: KitRole = name.startsWith('building-wall') ? 'building-wall' : name.startsWith('window') ? 'window' : name.startsWith('door') ? 'door' : 'roof'
    return { name, role, w: name.startsWith('door-wide') ? 2 * T : T, h: role === 'door' ? 2 * T : T, set }
  }
  if (name === 'wall-rock') return { name, role: 'wall', w: T, h: 2 * T }
  if (name === 'wall-top-rock') return { name, role: 'wall-top', w: T, h: T }
  return tile(name, name.startsWith('riser') ? 'riser' : 'floor')
}
const FARM: Spec[] = [...FARM_WAVE_1, ...FARM_WAVE_2].map(farmSpec)

/** The farm's stand-in atlas, with both its waves (`kitMissing(kit, FARM_WAVE_2)` is empty). */
export function standInFarmAtlas(): KitAtlas {
  const { frames, height } = pack(FARM, true)
  return { formatVersion: 1, id: 'kit-standin-farm', kind: 'farm', tile: 128, pages: [{ file: 'standin.png', width: STAND_IN_PAGE, height }], frames }
}

// --- Drawing -------------------------------------------------------------------------------------------------------------

// Flat ground by family, building pieces by set, and a simple shape a prop.
const GROUND: Readonly<Record<string, [string, string, string]>> = {
  grass: ['#6aa84f', '#7dbb5c', '#58913f'], path: ['#c9a874', '#d8ba88', '#b08f5c'], tilled: ['#7a5636', '#8a6442', '#65462a'],
  'forest-floor': ['#4d6b3a', '#5b7a44', '#3e5a2e'], water: ['#4f97c9', '#7cc0e8', '#3d7fae'], paving: ['#a9a49a', '#bcb7ac', '#8f8a80'],
  paddock: ['#9cbf5a', '#c8c06a', '#86a84a'], quarry: ['#a39a88', '#b8af9c', '#8a816f'], 'wall-top-rock': ['#8a8d94', '#9da0a8', '#74777e'],
}
const WALLS: Readonly<Record<string, [string, string]>> = { plank: ['#9a6a40', '#7a4f2c'], plaster: ['#efe4cc', '#8a6a48'], stone: ['#9a9ca4', '#6f727a'] }
const ROOFS: Readonly<Record<string, [string, string]>> = { red: ['#b8553e', '#8e3d2c'], thatch: ['#dcb85a', '#b08f3a'], shingle: ['#6f7d4c', '#545f38'], slate: ['#5f7186', '#46546a'] }
const CROPS: Readonly<Record<string, string>> = {
  root: '#e08a3a', leafy: '#7ccf5a', herb: '#4fae6a', grain: '#e2c25a', rice: '#cfe08a', 'staked-red': '#e0483a', 'staked-green': '#5abf4a',
  'staked-purple': '#8a4ab8', corn: '#f0d040', sunflower: '#f4c430', spear: '#7ab85a', gourd: '#e8952e', sprout: '#8ad86a', growing: '#5fbf4a', withered: '#9a8a5a',
}

function drawFarm(g: CanvasRenderingContext2D, name: string, f: KitFrame): void {
  const { x, y, w, h } = f
  const r = noise(name.length * 977 + w * 31 + h + name.charCodeAt(0))
  const fill = (c: string, ax = 0, ay = 0, aw = w, ah = h) => { g.fillStyle = c; g.fillRect(x + ax, y + ay, aw, ah) }
  const dots = (c: string, n: number, size = 4) => { g.fillStyle = c; for (let i = 0; i < n; i++) g.fillRect(x + Math.floor(r() * (w - size)), y + Math.floor(r() * (h - size)), size, size) }
  const ellipse = (c: string, cx: number, cy: number, rx: number, ry: number) => { g.fillStyle = c; g.beginPath(); g.ellipse(x + cx, y + cy, rx, ry, 0, 0, Math.PI * 2); g.fill() }
  const family = name.replace(/-\d+$/, '')
  if (f.role === 'floor' || f.role === 'wall-top') {
    const [base, light, dark] = GROUND[family] ?? GROUND.grass!
    fill(base); dots(light, 18, 6); dots(dark, 14, 6)
    if (family === 'tilled') for (let row = 12; row < h; row += 24) fill(dark, 0, row, w, 6)
    if (family === 'water') for (let i = 0; i < 4; i++) fill(light, 14 + i * 26, 20 + i * 24, 34, 4)
    if (family === 'paving') for (let row = 0; row < h; row += 32) { fill(dark, 0, row, w, 2); for (let c = row % 64 ? 0 : 32; c < w; c += 64) fill(dark, c, row, 2, 32) }
    return
  }
  if (f.role === 'riser') {
    const [base, dark] = family === 'riser-bank' ? ['#7d8088', '#5d6068'] : family === 'riser-quarry' ? ['#a39a88', '#7f7766'] : ['#7a5636', '#5f4128']
    fill(base); dots(dark, 22, 6)
    if (family === 'riser-bank') fill('#4f97c9', 0, h - 18, w, 18)
    else if (family !== 'riser-quarry') { fill('#6aa84f', 0, 0, w, 14); fill('#58913f', 0, 12, w, 4) }
    return
  }
  if (f.role === 'wall') { fill('#8a8d94'); for (let row = 0; row < 8; row++) fill('#6f727a', (row * 37) % 60, row * 32 + 8, 60, 6); dots('#9da0a8', 20, 8); return }
  const set = f.set ?? ''
  if (f.role === 'roof') {
    const [a, b] = ROOFS[set] ?? ['#b8553e', '#8e3d2c']
    for (let s = 0; s < 4; s++) fill(s % 2 ? b : a, 0, s * 32, w, 32)
    for (let c = 0; c < w; c += 32) fill(b, c + (set === 'thatch' ? 16 : 0), 0, 2, h)
    return
  }
  const [wall, trim] = WALLS[set] ?? ['#d9c9a8', '#7a5a3a']
  const front = () => {
    fill(wall)
    if (set === 'plank') for (let c = 0; c < w; c += 21) fill(trim, c, 0, 3, h)
    if (set === 'stone') for (let row = 0; row < h; row += 32) { fill(trim, 0, row, w, 3); for (let c = row % 64 ? 16 : 48; c < w; c += 64) fill(trim, c, row, 3, 32) }
    if (set === 'plaster') { fill('#a59a88', 0, h - 22, w, 22); fill(trim, 0, 0, 8, h); fill(trim, w - 8, 0, 8, h) }
  }
  if (f.role === 'building-wall') { front(); return }
  if (f.role === 'window') { front(); fill('#4a3420', 28, 26, 72, 66); fill('#9fd0ee', 34, 32, 60, 54); fill('#4a3420', 62, 32, 4, 54); fill(trim, 22, 90, 84, 8); return }
  if (f.role === 'door') {
    front()
    if (w > T) { fill('#4a3420', 26, 56, w - 52, h - 56); fill('#8a5f3a', 34, 64, w / 2 - 38, h - 64); fill('#8a5f3a', w / 2 + 4, 64, w / 2 - 38, h - 64); fill('#e0b85a', w / 2 - 14, 150, 10, 10); fill('#e0b85a', w / 2 + 4, 150, 10, 10); return }
    fill('#4a3420', 18, 40, 92, 216)
    if (name === 'door-shop') { fill('#8a5f3a', 26, 48, 76, 208); fill('#9fd0ee', 36, 60, 56, 90) } else fill('#8a5f3a', 26, 48, 76, 208)
    fill('#e0b85a', 86, 160, 8, 8); return
  }
  // Props.
  const crop = name.startsWith('crop-') ? CROPS[name.slice(5)] : undefined
  if (crop) {
    const tall = h > 128
    if (name.startsWith('crop-staked') || name === 'crop-corn' || name === 'crop-sunflower') fill('#8a6a42', w / 2 - 3, 10, 6, h - 16)
    for (let i = 0; i < 3; i++) ellipse(name === 'crop-withered' ? '#8a7a4a' : '#4f9a3a', 30 + i * 34, h - 24, 16, tall ? h * 0.4 : h * 0.28)
    if (!['crop-sprout', 'crop-growing', 'crop-withered'].includes(name)) for (let i = 0; i < 3; i++) ellipse(crop, 30 + i * 34, tall ? h * 0.35 : h * 0.45, 12, 12)
    return
  }
  if (name.startsWith('tree')) { fill('#6b4a2e', w / 2 - 16, h * 0.55, 32, h * 0.45 - 6); ellipse(name === 'tree-2' ? '#3f7a3a' : '#2f6b3a', w / 2, h * 0.36, w * 0.46, h * 0.32); ellipse('#4f9048', w * 0.4, h * 0.3, w * 0.26, h * 0.18); return }
  if (name === 'mill-sails') {
    g.save(); g.translate(x + w / 2, y + h / 2)
    for (let k = 0; k < 4; k++) { g.rotate(Math.PI / 2); g.fillStyle = '#6b4a2e'; g.fillRect(-5, 0, 10, 180); g.fillStyle = '#f2ead6'; g.fillRect(8, 40, 44, 136) }
    g.restore(); ellipse('#4a3420', w / 2, h / 2, 16, 16); return
  }
  if (name === 'chimney' || name === 'forge-chimney') { fill('#9a4a36', 6, 0, w - 12, h - 6); for (let row = 10; row < h; row += 24) fill('#7a3626', 6, row, w - 12, 3); if (name === 'forge-chimney') fill('#ff9a4a', 14, 4, w - 28, 12); return }
  if (name === 'gate-arch') { fill('#7a5230', 24, 40, 32, h - 46); fill('#7a5230', w - 56, 40, 32, h - 46); fill('#8e6238', 0, 24, w, 40); fill('#6aa84f', 30, 10, w - 60, 16); return }
  if (name.startsWith('fence')) { const lean = name === 'fence-broken' ? 18 : 0; for (let c = 10; c < w; c += 38) fill('#8a6a42', c, 20 + (c > 60 ? lean : 0), 10, h - 26 - (c > 60 ? lean : 0)); fill('#8a6a42', 0, 44, w - lean * 2, 10); fill('#8a6a42', 0, 80, w, 10); return }
  if (name === 'flower-box' || name === 'herb-box') { fill('#7a4f2c', 8, 22, w - 16, 36); for (let i = 0; i < 6; i++) ellipse(name === 'herb-box' ? '#4fae6a' : ['#f2d14b', '#f28bb0', '#ffffff'][i % 3]!, 20 + i * 18, 18, 9, 9); return }
  if (name === 'lot-stakes') { for (const c of [12, w / 2 - 6, w - 24]) fill('#8a6a42', c, 20, 12, h - 26); fill('#e8dcc0', 12, 40, w - 24, 4); return }
  if (name === 'scarecrow') { fill('#7a5230', w / 2 - 6, 30, 12, h - 36); fill('#7a5230', 10, 90, w - 20, 10); fill('#c94f4f', w / 2 - 26, 70, 52, 70); ellipse('#e8d4a0', w / 2, 52, 22, 22); fill('#8a6a2a', w / 2 - 34, 26, 68, 10); return }
  if (name === 'lantern') { fill('#3a3a44', w / 2 - 4, 40, 8, h - 46); fill('#3a3a44', 12, 18, w - 24, 34); fill('#ffd27a', 18, 22, w - 36, 26); return }
  if (name.startsWith('weeds') || name === 'brambles') { for (let i = 0; i < 9; i++) ellipse(name === 'brambles' ? '#5a6a2a' : '#6f8f3a', 14 + ((i * 41) % (w - 28)), h - 20 - (i % 3) * 22, 14, 22); return }
  if (name.startsWith('flowers')) { for (let i = 0; i < 7; i++) ellipse(['#f2d14b', '#f28bb0', '#ffffff'][i % 3]!, 12 + i * 17, 24 + (i % 2) * 12, 8, 8); fill('#3d6338', 0, h - 12, w, 6); return }
  if (name.startsWith('bush')) { ellipse('#3a7a42', w / 2, h * 0.58, w * 0.46, h * 0.38); ellipse('#4b8f50', w * 0.4, h * 0.48, w * 0.24, h * 0.2); return }
  if (name.includes('rock') || name === 'stone-stack') { ellipse('#7d808a', w / 2, h * 0.62, w * 0.44, h * 0.34); ellipse('#9295a0', w * 0.42, h * 0.52, w * 0.22, h * 0.16); return }
  if (name === 'barrel') { fill('#7a4e2a', 8, 10, w - 16, h - 16); fill('#4a4e58', 8, 28, w - 16, 6); fill('#4a4e58', 8, h - 34, w - 16, 6); return }
  if (name === 'awning' || name === 'stall-awning' || name === 'bunting') { for (let c = 0; c < w; c += 32) fill(c % 64 ? '#f2e6d0' : '#c94f4f', c, 12, 32, name === 'bunting' ? 40 : 60); if (name === 'stall-awning') { fill('#7a4e2a', 16, 72, 12, h - 78); fill('#7a4e2a', w - 28, 72, 12, h - 78) } return }
  if (name === 'dock') { for (let c = 0; c < w; c += 32) fill(c % 64 ? '#9a6a40' : '#8a5a34', c, 20, 30, 70); fill('#5a3a20', 20, 90, 12, 32); fill('#5a3a20', w - 32, 90, 12, 32); return }
  if (name === 'reeds') { for (let i = 0; i < 8; i++) fill('#6f8f3a', 10 + i * 14, 20 + (i % 3) * 14, 6, h - 30); return }
  if (name === 'mine-mouth') { fill('#6b4a2e'); fill('#1a1612', 40, 60, w - 80, h - 60); fill('#8a6238', 0, 30, w, 34); return }
  // Anything else: a crate-like block, coloured from its name.
  const hue = [...name].reduce((s, c) => s + c.charCodeAt(0), 0) % 360
  fill(`hsl(${hue} 35% 38%)`, 8, 8, w - 16, h - 14); fill(`hsl(${hue} 40% 52%)`, 14, 14, w - 28, (h - 26) / 2); fill('rgba(0,0,0,0.25)', 8, h - 14, w - 16, 8)
}

/** The farm stand-in's page, drawn. */
export function drawStandInFarm(kit: KitAtlas): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = kit.pages[0]!.width
  canvas.height = kit.pages[0]!.height
  const g = canvas.getContext('2d')!
  for (const [name, f] of Object.entries(kit.frames)) {
    g.save()
    g.beginPath(); g.rect(f.x, f.y, f.w, f.h); g.clip()
    drawFarm(g, name, f)
    g.restore()
  }
  return canvas
}

/** The farm's stand-in kit, drawn once a call: what a farm builds with until its painted kit loads. */
export function standInFarmKit(): LoadedKit {
  const kit = standInFarmAtlas()
  return { kit, page: pixelTexture(new CanvasTexture(drawStandInFarm(kit))) }
}
