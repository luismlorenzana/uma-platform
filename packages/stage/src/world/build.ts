// The world builder's three.js half (Q5): turns a world's faces and props into a few merged meshes, one a kit page for
// the ground and walls and one for the props, so a room draws in a handful of calls. Light is painted into the kit; the
// meshes take the scene's sky light, key light and up to four live lights near the party.
import { BufferGeometry, Float32BufferAttribute, Group, Mesh, MeshLambertMaterial, type Texture } from 'three'
import type { KitAtlas, KitFrame } from '../formats/index.js'
import { CAMERA_PITCH, snapToGrid, spriteStretch } from '../stage/camera.js'
import type { Face, Vec3, WorldGeometry } from './geometry.js'

interface Buffers { pos: number[]; uv: number[]; nrm: number[] }
const empty = (): Buffers => ({ pos: [], uv: [], nrm: [] })

/** A frame's texel point (u, v in 0–1 of the frame, v up) as atlas UV (CanvasTexture flips Y: v = 1 is the image's top). */
function atlasUv(kit: KitAtlas, f: KitFrame, u: number, v: number): [number, number] {
  const page = kit.pages[f.page]!
  return [(f.x + u * f.w) / page.width, 1 - (f.y + (1 - v) * f.h) / page.height]
}

const lerp = (a: Vec3, b: Vec3, t: number): Vec3 => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, z: a.z + (b.z - a.z) * t })

function quad(out: Buffers, kit: KitAtlas, f: KitFrame, c: [Vec3, Vec3, Vec3, Vec3], uv: [number, number, number, number]): void {
  const [bl, br, tr, tl] = c
  const ax = br.x - bl.x, ay = br.y - bl.y, az = br.z - bl.z, bx = tl.x - bl.x, by = tl.y - bl.y, bz = tl.z - bl.z
  let nx = ay * bz - az * by, ny = az * bx - ax * bz, nz = ax * by - ay * bx
  const n = Math.hypot(nx, ny, nz) || 1
  nx /= n; ny /= n; nz /= n
  const [u0, v0, u1, v1] = uv
  const t = [atlasUv(kit, f, u0, v0), atlasUv(kit, f, u1, v0), atlasUv(kit, f, u1, v1), atlasUv(kit, f, u0, v1)]
  for (const i of [0, 1, 2, 0, 2, 3]) {
    const p = c[i]!, q = t[i]!
    out.pos.push(p.x, p.y, p.z)
    out.uv.push(q[0], q[1])
    out.nrm.push(nx, ny, nz)
  }
}

/** A face, split into its repeats so each shows the whole frame (an atlas can't wrap inside one frame). */
function face(out: Buffers, kit: KitAtlas, f: KitFrame, face: Face): void {
  const [ru, rv] = face.repeat ?? [1, 1]
  const [bl, br, tr, tl] = face.corners
  for (let i = 0; i < ru; i++) for (let j = 0; j < rv; j++) {
    const b0 = lerp(lerp(bl, br, i / ru), lerp(tl, tr, i / ru), j / rv), b1 = lerp(lerp(bl, br, (i + 1) / ru), lerp(tl, tr, (i + 1) / ru), j / rv)
    const t1 = lerp(lerp(bl, br, (i + 1) / ru), lerp(tl, tr, (i + 1) / ru), (j + 1) / rv), t0 = lerp(lerp(bl, br, i / ru), lerp(tl, tr, i / ru), (j + 1) / rv)
    quad(out, kit, f, [b0, b1, t1, t0], ru === 1 && rv === 1 ? face.uv : [0, 0, 1, 1])
  }
}

const UP_SIN = Math.sin(CAMERA_PITCH), UP_COS = Math.cos(CAMERA_PITCH)
/** A prop's foot snapped so it lands on the device pixel grid the camera moves on. */
function snapFoot(p: Vec3): Vec3 {
  // The camera's up axis is (0, cos, −sin): snap the foot's coordinates along it and along x, keeping its depth.
  const up = p.y * UP_COS - p.z * UP_SIN, fwd = -p.y * UP_SIN - p.z * UP_COS
  const su = snapToGrid(up, 0)
  return { x: snapToGrid(p.x, 0), y: su * UP_COS - fwd * UP_SIN, z: -su * UP_SIN - fwd * UP_COS }
}

function mesh(b: Buffers, map: Texture): Mesh | null {
  if (!b.pos.length) return null
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new Float32BufferAttribute(b.pos, 3))
  geometry.setAttribute('uv', new Float32BufferAttribute(b.uv, 2))
  geometry.setAttribute('normal', new Float32BufferAttribute(b.nrm, 3))
  return new Mesh(geometry, new MeshLambertMaterial({ map, alphaTest: 0.5 }))
}

/** The world as meshes: the ground and walls, then the props, standing upright and stretched like the sprites. */
export function buildWorld(geo: WorldGeometry, kit: KitAtlas, pages: readonly Texture[]): Group {
  const ground = kit.pages.map(empty), props = kit.pages.map(empty)
  for (const f of geo.faces) {
    const frame = kit.frames[f.frame]
    if (frame) face(ground[frame.page]!, kit, frame, f)
  }
  const stretch = spriteStretch()
  for (const p of geo.props) {
    const f = kit.frames[p.frame]
    if (!f) continue
    const foot = snapFoot(p.foot), fx = (f.foot?.x ?? f.w / 2) / kit.tile, fy = (f.h - (f.foot?.y ?? f.h)) / kit.tile
    const x0 = foot.x - fx, x1 = x0 + f.w / kit.tile, y0 = foot.y - fy * stretch, y1 = y0 + (f.h / kit.tile) * stretch
    quad(props[f.page]!, kit, f, [{ x: x0, y: y0, z: foot.z }, { x: x1, y: y0, z: foot.z }, { x: x1, y: y1, z: foot.z }, { x: x0, y: y1, z: foot.z }], [0, 0, 1, 1])
  }
  const group = new Group()
  for (const [i, map] of pages.entries()) for (const m of [mesh(ground[i]!, map), mesh(props[i]!, map)]) if (m) group.add(m)
  return group
}
