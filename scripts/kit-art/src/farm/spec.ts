// kit-farm's wave 1 (uma-farm kit-farm.md §4, §6, KF3, KF8, KF12): every frame's name, role, size, set, foot, blocking
// and light, as uma-stage 0.2.1's parser reads them. The names are the farm's API (KF14). Pure.

export type Role = 'floor' | 'riser' | 'building-wall' | 'window' | 'door' | 'roof' | 'prop' | 'sign'
export interface FrameSpec {
  name: string
  role: Role
  w: number
  h: number
  /** Building pieces: the set a design picks (KF3). */
  set?: string
  /** Props and mounted pieces: the point that stands on the ground, or where it's fixed. */
  foot?: { x: number; y: number }
  blocks?: boolean
  light?: { color: string; radius: number; flicker?: boolean }
  weight?: number
}

const tile = (name: string, role: Role, weight?: number): FrameSpec => ({ name, role, w: 128, h: 128, ...(weight ? { weight } : {}) })
const piece = (name: string, role: Role, set: string, w = 128, h = 128): FrameSpec => ({ name, role, w, h, set })
/** A prop standing on its bottom middle, 6 texels up (kits.md's foot). */
const prop = (name: string, w: number, h: number, blocks: boolean, light?: FrameSpec['light']): FrameSpec =>
  ({ name, role: 'prop', w, h, foot: { x: w / 2, y: h - 6 }, blocks, ...(light ? { light } : {}) })
/** A mounted piece (decision 3): role `sign`, fixed at its foot. */
const mount = (name: string, w: number, h: number, foot: { x: number; y: number }): FrameSpec => ({ name, role: 'sign', w, h, foot })

const GROUND: FrameSpec[] = [
  tile('grass-1', 'floor', 4), tile('grass-2', 'floor', 3), tile('grass-3', 'floor', 2), tile('grass-4', 'floor', 1),
  tile('path-1', 'floor', 3), tile('path-2', 'floor', 1), tile('tilled-1', 'floor', 2), tile('tilled-2', 'floor', 1),
  tile('forest-floor-1', 'floor', 2), tile('forest-floor-2', 'floor', 1), tile('water-1', 'floor', 2), tile('water-2', 'floor', 1),
  tile('paving-1', 'floor', 2), tile('paving-2', 'floor', 1),
  tile('riser-grass-1', 'riser', 3), tile('riser-grass-2', 'riser', 1), tile('riser-bank', 'riser'),
]
const BUILDINGS: FrameSpec[] = [
  piece('building-wall-plank-1', 'building-wall', 'plank'), piece('building-wall-plank-2', 'building-wall', 'plank'),
  piece('window-plank-1', 'window', 'plank'), piece('window-plank-2', 'window', 'plank'),
  piece('door-plank', 'door', 'plank', 128, 256), piece('door-wide-plank', 'door', 'plank', 256, 256),
  piece('building-wall-plaster-1', 'building-wall', 'plaster'), piece('building-wall-plaster-2', 'building-wall', 'plaster'),
  piece('window-plaster-1', 'window', 'plaster'), piece('window-plaster-2', 'window', 'plaster'),
  piece('door-plaster', 'door', 'plaster', 128, 256), piece('door-shop', 'door', 'plaster', 128, 256),
  piece('roof-red-1', 'roof', 'red'), piece('roof-red-2', 'roof', 'red'), piece('roof-thatch-1', 'roof', 'thatch'), piece('roof-thatch-2', 'roof', 'thatch'),
  piece('roof-shingle-1', 'roof', 'shingle'), piece('roof-shingle-2', 'roof', 'shingle'), piece('roof-slate-1', 'roof', 'slate'), piece('roof-slate-2', 'roof', 'slate'),
]
const LAMP = { color: '#ffc46b', radius: 4, flicker: true }
const PROPS: FrameSpec[] = [
  prop('tree-1', 256, 384, true), prop('tree-2', 256, 384, true), prop('tree-3', 256, 384, true), prop('stump', 128, 96, true),
  prop('mushroom-patch', 128, 64, false), prop('herb-patch', 128, 64, false),
  prop('scarecrow', 128, 256, true), prop('dock', 256, 128, false), prop('reeds', 128, 128, false),
  mount('mill-sails', 384, 384, { x: 192, y: 192 }), mount('chimney', 64, 192, { x: 32, y: 186 }),
  prop('smoker', 128, 192, true), prop('log-pile', 256, 128, true), prop('saw-bench', 192, 128, true),
  prop('bin', 128, 128, true), prop('crates', 192, 160, true), prop('barrel', 96, 128, true), prop('sack', 96, 96, true),
  prop('gate-arch', 384, 384, false), prop('fence-1', 128, 128, true), prop('fence-2', 128, 128, true), prop('fence-broken', 128, 128, false),
  prop('stall-awning', 256, 192, false),
  prop('porch', 256, 192, false), mount('flower-box', 128, 64, { x: 64, y: 30 }), prop('lot-stakes', 384, 128, false),
  prop('weeds-1', 128, 128, false), prop('weeds-2', 128, 128, false), prop('brambles', 192, 160, true),
  prop('flowers-1', 128, 64, false), prop('flowers-2', 128, 64, false), prop('bush-1', 160, 128, true), prop('bush-2', 160, 128, true),
  prop('rock-small', 96, 64, false), prop('lantern', 64, 192, true, LAMP),
]
/** The crops (KF6): three shared stages and twelve ripe families, each a 128-wide card on its plot's tile. */
const CROPS: FrameSpec[] = [
  prop('crop-sprout', 128, 64, false), prop('crop-growing', 128, 96, false), prop('crop-withered', 128, 96, false),
  prop('crop-root', 128, 96, false), prop('crop-leafy', 128, 96, false), prop('crop-herb', 128, 96, false), prop('crop-grain', 128, 160, false),
  prop('crop-rice', 128, 128, false), prop('crop-staked-red', 128, 192, false), prop('crop-staked-green', 128, 192, false),
  prop('crop-staked-purple', 128, 192, false), prop('crop-corn', 128, 192, false), prop('crop-sunflower', 128, 192, false),
  prop('crop-spear', 128, 128, false), prop('crop-gourd', 128, 96, false),
]

/** Wave 1, in kit-farm.md §6's order: 87 frames. */
export const WAVE_1: readonly FrameSpec[] = [...GROUND, ...BUILDINGS, ...PROPS, ...CROPS]
export const specOf = (name: string): FrameSpec => {
  const s = WAVE_1.find((f) => f.name === name)
  if (!s) throw new Error(`kit-farm has no frame ${name}`)
  return s
}
