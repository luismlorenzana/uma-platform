import type { NativeAtlas, Pixels, ExportConfig } from './types.js'
import { bounds, handDistance, haze, smallClusters } from './pixels.js'

export const BATTLE_COUNTS = { idle: 4, run: 6, hop: 2, swing: 6, thrust: 5, shoot: 5, cast: 6, guard: 3, hurt: 2, down: 3, victory: 6, limit: 4, walk: 6, turnaround: 4 }
export const EMOTE_COUNTS = { nod: 3, surprise: 2, laugh: 3, sad: 2, angry: 2, wave: 4 }
/** The field set walks and runs in all four facings; left is drawn to match the left turnaround still (P105). */
export const FIELD_COUNTS = Object.fromEntries(['front', 'back', 'right', 'left'].flatMap(v => [['walk-' + v, 6], ['run-' + v, 6]])) as Record<string, number>
/** Townsfolk walk in the four field facings; `walk-left` replaced the battle `walk` (P105). */
export const profileCounts = (profile: string, coverage?: string): Record<string, number> => profile === 'townsfolk'
  ? { idle: 1, turnaround: 4, 'walk-front': 6, 'walk-back': 6, 'walk-right': 6, 'walk-left': 6, ...EMOTE_COUNTS }
  : coverage === 'battle' ? BATTLE_COUNTS : { ...BATTLE_COUNTS, ...FIELD_COUNTS, weary: 4, ...EMOTE_COUNTS }
/** A whole set's body frames and face patches (format.md §7.7): a traveler 130 and 7, townsfolk 45 and 2. */
export const profileTotals = (profile: string, coverage?: string): { frames: number; faces: number } => ({
  frames: Object.values(profileCounts(profile, coverage)).reduce((n, v) => n + v, 0),
  faces: profile === 'townsfolk' ? 2 : coverage === 'battle' ? 6 : 7,
})
/** The catalog's actions a set doesn't have yet, e.g. a set drawn before P105 lacks `walk-left` and `run-left`. */
export const missingActions = (profile: string, actions: Record<string, unknown>, coverage?: string): string[] =>
  Object.keys(profileCounts(profile, coverage)).filter(name => !(name in actions))
export interface CheckContext {
  atlas: NativeAtlas; pixels: Record<string, Pixels>; hashes: Record<string, string>
  keyPins: Record<string, string>; priorPins: Record<string, string>; priorActions?: NativeAtlas['actions']
  config: ExportConfig; coverage?: string; repeat: boolean
}
type Check = (c: CheckContext) => string[]
const entries = (c: CheckContext) => Object.entries(c.atlas.actions).flatMap(([action, a]) => a.frames.map((f, i) => ({ action, i, f, p: c.pixels[f.file]! })))
const pointIn = (p: { x: number; y: number }, size: number) => Number.isFinite(p.x) && Number.isFinite(p.y) && p.x >= 0 && p.y >= 0 && p.x < size && p.y < size
const boxIn = (b: { x: number; y: number; w: number; h: number }, size: number) => pointIn(b, size) && b.w > 0 && b.h > 0 && b.x + b.w <= size && b.y + b.h <= size

/** Each check is pure; file IO and repeat export are supplied by the runner. */
export const checks: Record<number, Check> = {
  1(c) {
    const errors: string[] = [], counts = profileCounts(c.atlas.profile, c.coverage)
    for (const [name, count] of Object.entries(counts)) if (c.atlas.actions[name]?.frames.length !== count) errors.push(`${name}: expected ${count} frames`)
    if (Object.keys(c.atlas.faces).length !== profileTotals(c.atlas.profile, c.coverage).faces) errors.push('patch count')
    for (const [name, a] of Object.entries(c.atlas.actions)) for (const event of Object.values(a.events)) {
      const indices = Array.isArray(event) ? event : [event]
      if (indices.some(i => !Number.isInteger(i) || i < 0 || i >= a.frames.length) || (Array.isArray(event) && (event.length !== 2 || event[0]! > event[1]!))) errors.push(`${name}: event outside frames`)
    }
    return errors
  },
  2(c) {
    return [
      ...entries(c).filter(e => !e.p || e.p.width !== 256 || e.p.height !== 256).map(e => e.f.file),
      ...Object.values(c.atlas.faces).filter(f => c.pixels[f.file]?.width !== f.w || c.pixels[f.file]?.height !== f.h).map(f => f.file),
    ]
  },
  3(c) {
    return entries(c).filter(({ p }) => {
      for (let y = 0; y < p.height; y++) for (let x = 0; x < p.width; x++) if ((x === 0 || y === 0 || x === p.width - 1 || y === p.height - 1) && p.data[(y * p.width + x) * 4 + 3]! >= 128) return true
      return false
    }).map(e => e.f.file)
  },
  4(c) { return entries(c).filter(({ f, p }) => f.air ? bounds(p).bottom >= 240 : bounds(p).bottom !== 240).map(e => e.f.file) },
  5(c) { return Object.entries(c.keyPins).filter(([f, h]) => c.hashes[f] !== h).map(([f]) => f) },
  6(c) {
    const key = c.pixels[c.atlas.approvedKey]!, b = c.atlas.faceBox
    return entries(c).filter(({ f, p }) => {
      if (!f.headLocked) return false
      if (!f.headOffset) return true
      for (let y = b.y; y < b.y + b.h; y++) for (let x = b.x; x < b.x + b.w; x++) {
        const src = (y * key.width + x) * 4, dst = ((y + f.headOffset.y) * p.width + x + f.headOffset.x) * 4
        if (!key.data.subarray(src, src + 4).equals(p.data.subarray(dst, dst + 4))) return true
      }
      return false
    }).map(e => e.f.file)
  },
  7(c) {
    const a = c.atlas, h = a.headBox, f = a.faceBox, errors: string[] = []
    if (!boxIn(h, a.cell) || !boxIn(f, a.cell) || f.x < h.x || f.y < h.y || f.x + f.w > h.x + h.w || f.y + f.h > h.y + h.h) errors.push('head/face box')
    for (const { f: frame } of entries(c)) if (frame.headLocked) for (const patch of Object.values(a.faces)) {
      const o = frame.headOffset ?? { x: 0, y: 0 }
      if (!boxIn({ ...patch, x: patch.x + o.x, y: patch.y + o.y }, a.cell)) errors.push(frame.file)
    }
    return errors
  },
  8(c) {
    const errors: string[] = []
    for (const { f, p } of entries(c)) {
      for (const field of ['grip', 'off', 'cast', 'hit'] as const) if (f[field] && !pointIn(f[field], c.atlas.cell)) errors.push(`${f.file}: ${field} outside cell`)
      for (const field of ['grip', 'off'] as const) if (f[field] && handDistance(p, f[field], c.config.handPalette) > 3) errors.push(`${f.file}: ${field} misses skin/glove`)
      if (f.handOcclusion && !boxIn(f.handOcclusion, c.atlas.cell)) errors.push(`${f.file}: hand crop`)
    }
    return errors
  },
  9(c) { return entries(c).filter(({ p }) => haze(p).length > 0).map(e => e.f.file) },
  10(c) { return entries(c).filter(({ p }) => smallClusters(p).length > 0).map(e => e.f.file) },
  11(c) {
    const top = bounds(c.pixels[c.atlas.approvedKey]!).top
    return entries(c).filter(({ action, f, p }) => !f.air && ['idle', 'walk', 'run', 'guard', 'cast', 'thrust', 'shoot'].includes(action) && bounds(p).top < top - 4).map(e => e.f.file)
  },
  12(c) {
    const errors = Object.entries(c.priorPins).filter(([file, h]) => c.hashes[file] !== h).map(([file]) => file)
    for (const [action, a] of Object.entries(c.priorActions ?? {})) if (JSON.stringify(c.atlas.actions[action]) !== JSON.stringify(a)) errors.push(`${action}: approved metadata changed`)
    return errors
  },
  13(c) {
    const errors: string[] = []
    for (const [name, a] of Object.entries(c.atlas.actions)) if (/^(walk|run)-(front|back|right|left)$/.test(name)) {
      const view = name.split('-')[1], reference = c.atlas.actions.turnaround?.frames.find(f => f.view === view)
      if (!reference || Math.abs(bounds(c.pixels[a.frames[0]!.file]!).height - bounds(c.pixels[reference.file]!).height) > 4) errors.push(`${name}: standing height`)
      const scales = c.config.facingScales?.[name], first = scales?.[0]
      if (!first || scales?.length !== a.frames.length || scales.some(s => Math.abs(s.sx - first.sx) > .005 || Math.abs(s.sy - first.sy) > .005)) errors.push(`${name}: cycle scale`)
    }
    return errors
  },
  14(c) { return c.repeat ? [] : ['repeat export differs'] },
}
export function runChecks(c: CheckContext) {
  const failures = Object.entries(checks).flatMap(([n, check]) => check(c).map(reason => ({ check: Number(n), reason })))
  return { checks: Object.fromEntries(Object.keys(checks).map(n => [n, !failures.some(f => f.check === Number(n))])), failures }
}
