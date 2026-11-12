// The occluder fade and fit-to-width (uma-platform ST3; uma-farm F11's stage request, D68). At the 35° pitch a roof hides
// about four tiles of ground behind it, so a building or blocking prop that covers a target (a figure, a marker of a kind
// the game names, a bubble's anchor) fades while it covers it. Coverage is read on the camera's own plane (x across, u
// up), where the camera's pan only shifts everything alike, so it needs no camera. And a farm wider than a 2× phone
// scales down to fit its width. Pure.
import type { FarmMarker, FarmMarkerKind, KitAtlas } from '../formats/index.js'
import type { FarmWorld, Quad } from '../world/farm.js'
import type { Vec3 } from '../world/geometry.js'
import { CAMERA_PITCH, TEXELS_PER_UNIT } from './camera.js'
import { cardQuad, tileQuad } from './pick.js'

/** A rectangle on the camera's plane: x across, u up, in world units. */
export interface ScreenBox { x0: number; x1: number; u0: number; u1: number }
/** Something that can fade: a part's id, where it shows, and the depth of its front (what's behind it has a smaller z). */
export interface Occluder { id: string; box: ScreenBox; z: number }
/** Something that mustn't be hidden: where it shows and how deep it stands. */
export interface FadeTarget { box: ScreenBox; z: number }

export interface FadeOptions {
  /** How far a covering part fades: 0.35. */
  opacity?: number
  /** The marker kinds that are targets: slot, gate and lot. */
  markers?: readonly FarmMarkerKind[]
  /** The ease in and out, in ms: 150 (instant with reduced motion). */
  ms?: number
}
export const FADE_DEFAULTS: Required<FadeOptions> = { opacity: 0.35, markers: ['slot', 'gate', 'lot'], ms: 150 }

const SIN = Math.sin(CAMERA_PITCH), COS = Math.cos(CAMERA_PITCH)
/** A point's height on the camera's plane. */
export const upOf = (p: Vec3): number => p.y * COS - p.z * SIN

/** The box round some world points on the camera's plane. */
export function boxOf(points: readonly Vec3[]): ScreenBox {
  const xs = points.map((p) => p.x), us = points.map(upOf)
  return { x0: Math.min(...xs), x1: Math.max(...xs), u0: Math.min(...us), u1: Math.max(...us) }
}
export const unionBox = (a: ScreenBox, b: ScreenBox): ScreenBox =>
  ({ x0: Math.min(a.x0, b.x0), x1: Math.max(a.x1, b.x1), u0: Math.min(a.u0, b.u0), u1: Math.max(a.u1, b.u1) })
const overlap = (a: ScreenBox, b: ScreenBox): boolean => a.x0 < b.x1 && b.x0 < a.x1 && a.u0 < b.u1 && b.u0 < a.u1

/** The occluders that cover a target: they overlap it on the screen and stand in front of it. */
export function coveringOccluders(occluders: readonly Occluder[], targets: readonly FadeTarget[]): Set<string> {
  const out = new Set<string>()
  for (const o of occluders) if (targets.some((t) => t.z < o.z - 1e-6 && overlap(o.box, t.box))) out.add(o.id)
  return out
}

/** A part's opacity a frame on, moving toward `target` over `ms` from fully shown to fully faded, or at once. */
export function stepFade(alpha: number, target: number, dt: number, options: { opacity: number; ms: number; instant?: boolean }): number {
  if (options.instant || options.ms <= 0) return target
  const step = ((dt * 1000) / options.ms) * (1 - options.opacity)
  return alpha < target ? Math.min(target, alpha + step) : Math.max(target, alpha - step)
}

/** A blocking prop's part id (its index among the world's props). */
export const propPart = (index: number) => `prop:${index}`

/** The parts a farm can fade: each building with its mounted pieces, and each blocking prop. */
export function farmOccluders(world: FarmWorld, kit: KitAtlas): Occluder[] {
  const out = new Map<string, Occluder>()
  const card = (p: FarmWorld['props'][number]): Quad | null => {
    const f = kit.frames[p.frame]
    return f ? cardQuad(p.foot, f.w, f.h, f.foot?.x ?? f.w / 2, f.h - (f.foot?.y ?? f.h)) : null
  }
  for (const b of world.buildings) out.set(b.id, { id: b.id, box: boxOf([...b.front, ...b.roof, ...(b.back ?? [])]), z: b.front[0].z })
  world.props.forEach((p, i) => {
    const quad = card(p)
    if (!quad) return
    if (p.owner) { const o = out.get(p.owner); if (o) o.box = unionBox(o.box, boxOf(quad)); return }
    if (p.blocks) out.set(propPart(i), { id: propPart(i), box: boxOf(quad), z: p.foot.z })
  })
  return [...out.values()]
}

/** A marker's tile as a target: its middle half, so a prop that hides only a sliver of its edge doesn't fade. */
export const markerTarget = (m: FarmMarker, level: number): FadeTarget => {
  const [a, b, c, d] = tileQuad(m.x, m.z, level), mid = (p: Vec3, q: Vec3): Vec3 => ({ x: (3 * p.x + q.x) / 4, y: p.y, z: (3 * p.z + q.z) / 4 })
  return { box: boxOf([mid(a, c), mid(c, a), mid(b, d), mid(d, b)]), z: m.z + 0.5 }
}

/** A figure as a target: her card (`w × h` texels at her foot) and the anchor of her bubble above it. */
export function figureTarget(foot: Vec3, w: number, h: number, head: Vec3): FadeTarget {
  return { box: unionBox(boxOf(cardQuad(foot, w, h)), boxOf([head])), z: foot.z }
}

/** Fit-to-width: the camera's scale so `designWidth` tiles fill a canvas `deviceWidth` pixels wide; never above 1. */
export const fitScale = (deviceWidth: number, designWidth: number): number =>
  designWidth > 0 ? Math.min(1, deviceWidth / (designWidth * TEXELS_PER_UNIT)) : 1
