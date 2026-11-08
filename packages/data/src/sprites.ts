import {
  arrayOf, boolean, fail, fields, finite, id, nonNegativeInteger, object, optional,
  positiveInteger, recordOf, text, type Parser,
} from './parse.js'

export interface SpritePoint { x: number; y: number }
export interface SpriteBox extends SpritePoint { w: number; h: number }
export interface SpriteBounds { left: number; right: number; top: number; bottom: number; width: number; height: number }
export interface SpritePage { path: string; width: number; height: number }
export interface SpriteRect { page: number; x: number; y: number; w: number; h: number; dx: number; dy: number }
/** `place` is the untrimmed patch's position in the working cell. */
export interface SpriteFace extends SpriteRect { place: SpriteBox }
export interface SpriteFrame extends SpriteRect {
  ms?: number | null
  headLocked: boolean
  headOffset?: SpritePoint
  grip?: SpritePoint & { angle: number }
  off?: SpritePoint
  cast?: SpritePoint
  hold: string
  air: boolean
  hit: SpritePoint
  bounds: SpriteBounds
  handOcclusion?: SpriteBox
  view?: string
}
export interface SpriteAction {
  loop: boolean
  events: { impact?: number; release?: number; hold?: [number, number]; repeat?: [number, number] }
  frames: SpriteFrame[]
}
/** Profiles, action names and face names are open for additive catalogs. */
export interface SpriteSet {
  outfitId: number
  revision: number
  profile: string
  cell: number
  logicalCell: number
  foot: SpritePoint
  headBox: SpriteBox
  faceBox: SpriteBox
  hit: SpritePoint
  pages: SpritePage[]
  faces: Record<string, SpriteFace>
  actions: Record<string, SpriteAction>
}

const point: Parser<SpritePoint> = (value, path) => {
  const f = fields(value, path)
  return { x: f('x', finite), y: f('y', finite) }
}
const box: Parser<SpriteBox> = (value, path) => {
  const f = fields(value, path)
  return { ...point(value, path), w: f('w', positiveInteger), h: f('h', positiveInteger) }
}
const rect: Parser<SpriteRect> = (value, path) => {
  const f = fields(value, path)
  return { page: f('page', nonNegativeInteger), x: f('x', nonNegativeInteger), y: f('y', nonNegativeInteger),
    w: f('w', positiveInteger), h: f('h', positiveInteger), dx: f('dx', nonNegativeInteger), dy: f('dy', nonNegativeInteger) }
}
const bounds: Parser<SpriteBounds> = (value, path) => {
  const f = fields(value, path)
  return { left: f('left', nonNegativeInteger), right: f('right', nonNegativeInteger), top: f('top', nonNegativeInteger),
    bottom: f('bottom', nonNegativeInteger), width: f('width', positiveInteger), height: f('height', positiveInteger) }
}
const page: Parser<SpritePage> = (value, path) => {
  const f = fields(value, path)
  const pathValue = f('path', text)
  if (!/^[a-z0-9][a-z0-9._/-]*$/i.test(pathValue) || pathValue.includes('..')) fail(`${path}.path`, 'a release file path')
  return { path: pathValue, width: f('width', positiveInteger), height: f('height', positiveInteger) }
}
const frame: Parser<SpriteFrame> = (value, path) => {
  const f = fields(value, path)
  const result: SpriteFrame = { ...rect(value, path), headLocked: f('headLocked', boolean), hold: f('hold', text),
    air: f('air', boolean), hit: f('hit', point), bounds: f('bounds', bounds) }
  const ms = f('ms', optional((v, p) => v === null ? null : positiveInteger(v, p)))
  if (ms !== undefined) result.ms = ms
  for (const key of ['headOffset', 'off', 'cast'] as const) {
    const v = f(key, optional(point)); if (v !== undefined) result[key] = v
  }
  const grip = f('grip', optional((v, p) => ({ ...point(v, p), angle: fields(v, p)('angle', finite) })))
  if (grip !== undefined) result.grip = grip
  const hand = f('handOcclusion', optional(box)); if (hand !== undefined) result.handOcclusion = hand
  const view = f('view', optional(text)); if (view !== undefined) result.view = view
  return result
}
const range: Parser<[number, number]> = (value, path) => {
  const v = arrayOf(nonNegativeInteger)(value, path)
  if (v.length !== 2 || v[0]! > v[1]!) fail(path, 'an ordered pair of frame indices')
  return [v[0]!, v[1]!]
}
const action: Parser<SpriteAction> = (value, path) => {
  const f = fields(value, path), events = object(f('events', object), `${path}.events`)
  const result: SpriteAction = { loop: f('loop', boolean), events: {}, frames: f('frames', arrayOf(frame)) }
  if (!result.frames.length) fail(`${path}.frames`, 'at least one frame')
  for (const key of ['impact', 'release'] as const) if (events[key] !== undefined) result.events[key] = nonNegativeInteger(events[key], `${path}.events.${key}`)
  for (const key of ['hold', 'repeat'] as const) if (events[key] !== undefined) result.events[key] = range(events[key], `${path}.events.${key}`)
  for (const [key, event] of Object.entries(result.events)) {
    if ((Array.isArray(event) ? event : [event]).some(i => i >= result.frames.length)) fail(`${path}.events.${key}`, 'indices of existing frames')
  }
  return result
}

export const parseSpriteSet: Parser<SpriteSet> = (value, path) => {
  const f = fields(value, path)
  const set: SpriteSet = { outfitId: f('outfitId', id), revision: f('revision', positiveInteger), profile: f('profile', text),
    cell: f('cell', positiveInteger), logicalCell: f('logicalCell', positiveInteger), foot: f('foot', point),
    headBox: f('headBox', box), faceBox: f('faceBox', box), hit: f('hit', point), pages: f('pages', arrayOf(page)),
    faces: f('faces', recordOf((v, p) => ({ ...rect(v, p), place: fields(v, p)('place', box) }))),
    actions: f('actions', recordOf(action)) }
  const anchor = (p: SpritePoint, at: string) => {
    if (p.x < 0 || p.y < 0 || p.x >= set.cell || p.y >= set.cell) fail(at, 'an anchor inside the cell')
  }
  const insideBox = (b: SpriteBox, at: string) => {
    anchor(b, at); if (b.x + b.w > set.cell || b.y + b.h > set.cell) fail(at, 'a box inside the cell')
  }
  const rectangle = (r: SpriteRect, at: string) => {
    const pg = set.pages[r.page]
    if (!pg) fail(`${at}.page`, 'an existing page')
    if (r.x + r.w > pg.width || r.y + r.h > pg.height) fail(at, 'a rectangle inside its page')
    if (r.dx + r.w > set.cell || r.dy + r.h > set.cell) fail(at, 'a trim inside the working cell')
  }
  anchor(set.foot, `${path}.foot`); anchor(set.hit, `${path}.hit`)
  insideBox(set.headBox, `${path}.headBox`); insideBox(set.faceBox, `${path}.faceBox`)
  const h = set.headBox, b = set.faceBox
  if (b.x < h.x || b.y < h.y || b.x + b.w > h.x + h.w || b.y + b.h > h.y + h.h) fail(`${path}.faceBox`, 'a box inside the head')
  for (const [name, face] of Object.entries(set.faces)) {
    rectangle(face, `${path}.faces.${name}`); insideBox(face.place, `${path}.faces.${name}.place`)
  }
  for (const [name, a] of Object.entries(set.actions)) for (const [i, fr] of a.frames.entries()) {
    const at = `${path}.actions.${name}.frames[${i}]`
    rectangle(fr, at)
    for (const key of ['grip', 'off', 'cast', 'hit'] as const) if (fr[key]) anchor(fr[key], `${at}.${key}`)
    if (fr.handOcclusion) insideBox(fr.handOcclusion, `${at}.handOcclusion`)
    const bb = fr.bounds
    if (bb.right >= set.cell || bb.bottom >= set.cell || bb.width !== bb.right - bb.left + 1 || bb.height !== bb.bottom - bb.top + 1) fail(`${at}.bounds`, 'consistent bounds inside the cell')
    if (fr.headLocked) {
      if (!fr.headOffset) fail(`${at}.headOffset`, 'an offset for a locked frame')
      for (const face of Object.values(set.faces)) insideBox({ ...face.place, x: face.place.x + fr.headOffset.x, y: face.place.y + fr.headOffset.y }, `${at}.headOffset`)
    }
  }
  return set
}
