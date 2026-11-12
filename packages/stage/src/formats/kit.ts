// A kit atlas (Q5, D15; the kit spec, docs/design/kits.md): the 2D art a biome or a town is built from. ChatGPT draws it as
// a uma-art family (Q7, Q15); code builds the 3D from its frames (DN28). Pure: the types, the parser and the list of what a
// kit must hold.

/** A kit's texels a tile: the sprites' density (format.md §2), so a wall facing the camera shows one texel a device pixel. */
export const KIT_TILE = 128

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
}
export interface KitAtlas {
  formatVersion: 1
  id: string
  kind: 'biome' | 'town'
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

/** The names a kit must hold, by kind (the kit spec's lists). A role marked `*` needs at least one frame of that role. */
export const KIT_REQUIRED: Readonly<Record<KitAtlas['kind'], readonly string[]>> = {
  biome: ['floor*', 'wall*', 'wall-top', 'riser*', 'stairs', 'chest-closed', 'chest-open', 'spring', 'waystone', 'stairs-down', 'stairs-up',
    'battle-ground', 'battle-back', 'battle-mid*'],
  town: ['floor*', 'wall*', 'wall-top', 'riser*', 'stairs', 'building-wall*', 'door', 'window*', 'roof*', 'sign-inn', 'sign-shop'],
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

/** What a kit lacks against the spec's list for its kind: empty when it's complete. */
export function kitMissing(kit: Pick<KitAtlas, 'kind' | 'frames'>): string[] {
  const names = Object.keys(kit.frames), roles = new Set(Object.values(kit.frames).map((f) => f.role))
  return KIT_REQUIRED[kit.kind].filter((need) => (need.endsWith('*') ? !roles.has(need.slice(0, -1) as KitRole) : !names.includes(need)))
}

export function parseKitAtlas(value: unknown): KitAtlas {
  const o = obj(value, 'kit')
  if (o.formatVersion !== 1) throw new KitParseError('kit.formatVersion', 'expected 1')
  if (o.kind !== 'biome' && o.kind !== 'town') throw new KitParseError('kit.kind', "expected 'biome' or 'town'")
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
    if (size && (w !== size.w || h !== size.h)) throw new KitParseError(p, `a ${role} is ${size.w} × ${size.h}`)
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
    frames[name] = frame
  }
  const kit: KitAtlas = { formatVersion: 1, id: o.id, kind: o.kind, tile: KIT_TILE, pages, frames }
  const missing = kitMissing(kit)
  if (missing.length) throw new KitParseError('kit.frames', `missing ${missing.join(', ')}`)
  return kit
}

/** A role's frames and their weights, in name order, for deterministic picks. */
export function kitVariants(kit: Pick<KitAtlas, 'frames'>, role: KitRole): { name: string; weight: number }[] {
  return Object.entries(kit.frames).filter(([, f]) => f.role === role).sort(([a], [b]) => a.localeCompare(b))
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
