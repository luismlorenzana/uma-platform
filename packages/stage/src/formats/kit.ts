// A kit atlas (Q5, D15; the kit spec, docs/design/kits.md): the 2D art a biome, a town or a farm is built from. ChatGPT draws it as
// a uma-art family (Q7, Q15); code builds the 3D from its frames (DN28). Pure: the types, the parser and the list of what a
// kit must hold.

/** A kit's texels a tile: the sprites' density (format.md §2), so a wall facing the camera shows one texel a device pixel. */
export const KIT_TILE = 128

/** What a kit builds: a dungeon's biome, a town, or a farm (uma-platform ST2, uma-farm KF1). */
export type KitKind = 'biome' | 'town' | 'farm'
export const KIT_KINDS: readonly KitKind[] = ['biome', 'town', 'farm']
/** The roles a `set` may sit on. */
export const SET_ROLES: readonly KitRole[] = ['building-wall', 'window', 'door', 'roof']
/** A door's widths: one column, or two (a farm's double doors, 256 × 256). */
export const DOOR_WIDTHS: readonly number[] = [128, 256]

export type KitRole =
  | 'floor' | 'wall' | 'wall-top' | 'riser' | 'stairs' | 'void' | 'prop'
  | 'battle-ground' | 'battle-back' | 'battle-mid'
  | 'building-wall' | 'door' | 'window' | 'roof' | 'sign'
export const KIT_ROLES: readonly KitRole[] = ['floor', 'wall', 'wall-top', 'riser', 'stairs', 'void', 'prop', 'battle-ground', 'battle-back',
  'battle-mid', 'building-wall', 'door', 'window', 'roof', 'sign']

export interface KitLight { color: string; radius: number; flicker?: boolean }
export interface KitFrame {
  page: number
  x: number
  y: number
  w: number
  h: number
  role: KitRole
  /** How often this variant is picked among its role's (floors, walls, risers, building walls). */
  weight?: number
  /** Props, battle mids and signs: the ground point in the frame's texels. */
  foot?: { x: number; y: number }
  /** Props: whether it stops walking (a tree, a rock); a flower doesn't. */
  blocks?: boolean
  /** Props: a live light it casts (a lantern, a torch). */
  light?: KitLight
  /** Building walls, windows, doors and roofs: the set it belongs to (a farm's `plank`, `plaster`; `red`, `thatch`), which a
   * design picks a building's material by (uma-platform ST2, uma-farm KF3). Variants within a set go by the position hash. */
  set?: string
}
export interface KitAtlas {
  formatVersion: 1
  id: string
  kind: KitKind
  tile: typeof KIT_TILE
  pages: { file: string; width: number; height: number }[]
  frames: Record<string, KitFrame>
}

/** Fixed frame sizes by role, in texels; roles not listed are free up to 1,024 × 1,024 (props, signs). */
export const KIT_SIZES: Partial<Record<KitRole, { w: number; h: number }>> = {
  floor: { w: 128, h: 128 }, 'wall-top': { w: 128, h: 128 }, riser: { w: 128, h: 128 }, stairs: { w: 128, h: 128 }, void: { w: 128, h: 128 },
  wall: { w: 128, h: 256 }, 'building-wall': { w: 128, h: 128 }, window: { w: 128, h: 128 }, door: { w: 128, h: 256 }, roof: { w: 128, h: 128 },
  'battle-ground': { w: 1024, h: 256 }, 'battle-back': { w: 2048, h: 512 },
}

const range = (name: string, n: number): string[] => Array.from({ length: n }, (_, i) => `${name}-${i + 1}`)
/** A farm kit's wave 1 (uma-farm KF12): 87 frames, everything M4 and the romance core open. */
export const FARM_WAVE_1: readonly string[] = [
  ...range('grass', 4), ...range('path', 2), ...range('tilled', 2), ...range('forest-floor', 2), ...range('water', 2), ...range('paving', 2),
  ...range('riser-grass', 2), 'riser-bank',
  ...range('building-wall-plank', 2), ...range('window-plank', 2), 'door-plank', 'door-wide-plank',
  ...range('building-wall-plaster', 2), ...range('window-plaster', 2), 'door-plaster', 'door-shop',
  ...range('roof-red', 2), ...range('roof-thatch', 2), ...range('roof-shingle', 2), ...range('roof-slate', 2),
  ...range('tree', 3), 'stump', 'mushroom-patch', 'herb-patch', 'scarecrow', 'dock', 'reeds',
  'mill-sails', 'chimney', 'smoker', 'log-pile', 'saw-bench',
  'bin', 'crates', 'barrel', 'sack', 'gate-arch', 'fence-1', 'fence-2', 'fence-broken', 'stall-awning',
  'porch', 'flower-box', 'lot-stakes',
  'weeds-1', 'weeds-2', 'brambles', 'flowers-1', 'flowers-2', 'bush-1', 'bush-2', 'rock-small', 'lantern',
  'crop-sprout', 'crop-growing', 'crop-withered', 'crop-root', 'crop-leafy', 'crop-herb', 'crop-grain', 'crop-rice',
  'crop-staked-red', 'crop-staked-green', 'crop-staked-purple', 'crop-corn', 'crop-sunflower', 'crop-spear', 'crop-gourd',
]
/** A farm kit's wave 2 (uma-farm KF12): 30 frames, checked once the farm draws a wave-2 place (`kitMissing`'s `extra`). */
export const FARM_WAVE_2: readonly string[] = [
  ...range('building-wall-stone', 2), ...range('window-stone', 2), 'door-stone', 'wall-rock', 'wall-top-rock', ...range('quarry', 2), 'riser-quarry',
  'paddock', 'mine-mouth', 'ore-cart', ...range('quarry-rock', 2), 'stone-stack', 'furnace', 'grindstone', 'anvil', 'forge-chimney', 'ring-bench',
  'trough', 'hay-bale', 'awning', 'cafe-table', 'herb-box', 'bunting', 'flagpole', 'signpost', 'notice-board',
]

/** The names a kit must hold, by kind (the kit spec's lists). A role marked `*` needs at least one frame of that role. */
export const KIT_REQUIRED: Readonly<Record<KitKind, readonly string[]>> = {
  biome: ['floor*', 'wall*', 'wall-top', 'riser*', 'stairs', 'chest-closed', 'chest-open', 'spring', 'waystone', 'stairs-down', 'stairs-up',
    'battle-ground', 'battle-back', 'battle-mid*'],
  town: ['floor*', 'wall*', 'wall-top', 'riser*', 'stairs', 'building-wall*', 'door', 'window*', 'roof*', 'sign-inn', 'sign-shop'],
  farm: ['floor*', 'riser*', 'building-wall*', 'window*', 'door*', 'roof*', ...FARM_WAVE_1],
}

export class KitParseError extends Error {
  constructor(readonly path: string, message: string) {
    super(`${path}: ${message}`)
    this.name = 'KitParseError'
  }
}

type Obj = Record<string, unknown>
const obj = (v: unknown, path: string): Obj => {
  if (typeof v !== 'object' || v === null || Array.isArray(v)) throw new KitParseError(path, 'expected an object')
  return v as Obj
}
const int = (v: unknown, path: string, min: number, max: number): number => {
  if (typeof v !== 'number' || !Number.isInteger(v) || v < min || v > max) throw new KitParseError(path, `expected an integer ${min}–${max}`)
  return v
}

/** What a kit lacks against the spec's list for its kind, plus any `extra` names (a farm's wave 2): empty when complete. */
export function kitMissing(kit: Pick<KitAtlas, 'kind' | 'frames'>, extra: readonly string[] = []): string[] {
  const names = Object.keys(kit.frames), roles = new Set(Object.values(kit.frames).map((f) => f.role))
  return [...KIT_REQUIRED[kit.kind], ...extra].filter((need) => (need.endsWith('*') ? !roles.has(need.slice(0, -1) as KitRole) : !names.includes(need)))
}

export function parseKitAtlas(value: unknown): KitAtlas {
  const o = obj(value, 'kit')
  if (o.formatVersion !== 1) throw new KitParseError('kit.formatVersion', 'expected 1')
  if (!KIT_KINDS.includes(o.kind as KitKind)) throw new KitParseError('kit.kind', `expected one of ${KIT_KINDS.join(', ')}`)
  if (o.tile !== KIT_TILE) throw new KitParseError('kit.tile', `expected ${KIT_TILE}`)
  if (typeof o.id !== 'string' || !/^kit-[a-z0-9-]+$/.test(o.id)) throw new KitParseError('kit.id', 'expected kit-<name>')
  if (!Array.isArray(o.pages) || o.pages.length < 1 || o.pages.length > 8) throw new KitParseError('kit.pages', 'expected 1–8 pages')
  const pages = o.pages.map((p, i) => {
    const q = obj(p, `kit.pages[${i}]`)
    if (typeof q.file !== 'string' || !/^[\w.-]+\.(png|webp)$/.test(q.file)) throw new KitParseError(`kit.pages[${i}].file`, 'expected a png or webp file name')
    return { file: q.file, width: int(q.width, `kit.pages[${i}].width`, 1, 4096), height: int(q.height, `kit.pages[${i}].height`, 1, 4096) }
  })
  const frames: Record<string, KitFrame> = {}
  for (const [name, f] of Object.entries(obj(o.frames, 'kit.frames'))) {
    const p = `kit.frames.${name}`
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(name)) throw new KitParseError(p, 'expected a kebab-case name')
    const q = obj(f, p)
    const role = q.role as KitRole
    if (!KIT_ROLES.includes(role)) throw new KitParseError(`${p}.role`, `expected one of ${KIT_ROLES.join(', ')}`)
    const page = int(q.page, `${p}.page`, 0, pages.length - 1)
    const x = int(q.x, `${p}.x`, 0, 4095), y = int(q.y, `${p}.y`, 0, 4095), w = int(q.w, `${p}.w`, 1, 2048), h = int(q.h, `${p}.h`, 1, 2048)
    if (x + w > pages[page]!.width || y + h > pages[page]!.height) throw new KitParseError(p, 'leaves its page')
    const size = KIT_SIZES[role]
    if (role === 'door' && size) { if (!DOOR_WIDTHS.includes(w) || h !== size.h) throw new KitParseError(p, `a door is ${DOOR_WIDTHS.join(' or ')} × ${size.h}`) }
    else if (size && (w !== size.w || h !== size.h)) throw new KitParseError(p, `a ${role} is ${size.w} × ${size.h}`)
    if (!size && (w > 1024 || h > 1024)) throw new KitParseError(p, 'at most 1024 × 1024')
    const frame: KitFrame = { page, x, y, w, h, role }
    if (q.weight !== undefined) frame.weight = int(q.weight, `${p}.weight`, 1, 100)
    if (q.foot !== undefined) {
      const ft = obj(q.foot, `${p}.foot`)
      frame.foot = { x: int(ft.x, `${p}.foot.x`, 0, w), y: int(ft.y, `${p}.foot.y`, 0, h) }
    } else if (role === 'prop' || role === 'battle-mid' || role === 'sign') throw new KitParseError(`${p}.foot`, `a ${role} needs its foot`)
    if (q.blocks !== undefined) {
      if (typeof q.blocks !== 'boolean') throw new KitParseError(`${p}.blocks`, 'expected true or false')
      frame.blocks = q.blocks
    }
    if (q.light !== undefined) {
      const l = obj(q.light, `${p}.light`)
      if (typeof l.color !== 'string' || !/^#[0-9a-f]{6}$/i.test(l.color)) throw new KitParseError(`${p}.light.color`, 'expected #rrggbb')
      frame.light = { color: l.color, radius: int(l.radius, `${p}.light.radius`, 1, 12), ...(l.flicker === true ? { flicker: true } : {}) }
    }
    if (q.set !== undefined) {
      if (!SET_ROLES.includes(role)) throw new KitParseError(`${p}.set`, `only ${SET_ROLES.join(', ')} frames belong to a set`)
      if (typeof q.set !== 'string' || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(q.set)) throw new KitParseError(`${p}.set`, 'expected a kebab-case set')
      frame.set = q.set
    }
    frames[name] = frame
  }
  const kit: KitAtlas = { formatVersion: 1, id: o.id, kind: o.kind as KitKind, tile: KIT_TILE, pages, frames }
  const missing = kitMissing(kit)
  if (missing.length) throw new KitParseError('kit.frames', `missing ${missing.join(', ')}`)
  return kit
}

/** A role's frames and their weights, in name order, for deterministic picks; with `set`, only that set's (ST2). */
export function kitVariants(kit: Pick<KitAtlas, 'frames'>, role: KitRole, set?: string): { name: string; weight: number }[] {
  return Object.entries(kit.frames).filter(([, f]) => f.role === role && (set === undefined || f.set === set)).sort(([a], [b]) => a.localeCompare(b))
    .map(([name, f]) => ({ name, weight: f.weight ?? 1 }))
}

/** A family's frames by name (`grass-1`, `grass-2` … for `grass`), for a farm's ground; in name order, with weights. */
export function familyVariants(kit: Pick<KitAtlas, 'frames'>, family: string): { name: string; weight: number }[] {
  const re = new RegExp(`^${family}-\\d+$`)
  return Object.entries(kit.frames).filter(([name]) => re.test(name)).sort(([a], [b]) => a.localeCompare(b, 'en', { numeric: true }))
    .map(([name, f]) => ({ name, weight: f.weight ?? 1 }))
}

/** A tile's variant of a role, picked by a hash of its position, so the same room always looks the same. */
export function pickVariant(variants: readonly { name: string; weight: number }[], x: number, z: number, salt = 0): string | null {
  if (!variants.length) return null
  const total = variants.reduce((s, v) => s + v.weight, 0)
  let h = (Math.imul(x + 1, 73_856_093) ^ Math.imul(z + 1, 19_349_663) ^ Math.imul(salt + 1, 83_492_791)) >>> 0
  h = Math.imul(h ^ (h >>> 13), 1_274_126_177) >>> 0
  let r = h % total
  for (const v of variants) { if (r < v.weight) return v.name; r -= v.weight }
  return variants.at(-1)!.name
}
