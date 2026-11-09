// Original authored kit masters → fixed-density frames → a padded atlas (Q7/Q15, kit spec §2–5).
import { createHash } from 'node:crypto'
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import sharp from 'sharp'

export const kitProject = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
export const sha = (v: Uint8Array | string): string => createHash('sha256').update(v).digest('hex')
export interface KitSpec {
  key: string; role: string; w: number; h: number; master: string; sha256: string
  mode: 'texture' | 'cutout'; seam?: 'x' | 'xy'; edgeGroup?: string; weight?: number
  fit?: 'cover' | 'fill'; edgeBand?: number
  foot?: { x: number; y: number }; sourceFoot?: { x: number; y: number }; blocks?: boolean
  light?: { color: string; radius: number; flicker?: boolean }
}
export interface KitConfig { schemaVersion: 1; id: string; kind: 'biome' | 'town'; assets: KitSpec[] }
export interface KitFrame {
  page: number; x: number; y: number; w: number; h: number; role: string
  foot?: { x: number; y: number }; weight?: number; blocks?: boolean
  light?: KitSpec['light']
}
export interface KitAtlas {
  formatVersion: 1; id: string; kind: 'biome' | 'town'; tile: 128
  pages: { file: string; width: number; height: number }[]; frames: Record<string, KitFrame>
}
export interface RenderedKitFrame { spec: KitSpec; rgba: Buffer; png: Buffer }
const blend = (a: number, b: number, t: number) => Math.round(a * (1 - t) + b * t)

/** Blend opposing authored edge bands symmetrically; no mirroring or new painted texture. */
export function periodic(input: Buffer, w: number, h: number, axes: 'x' | 'xy', band = 12): Buffer {
  let out = Buffer.from(input)
  for (const axis of axes === 'xy' ? ['x', 'y'] : ['x']) {
    const src = Buffer.from(out), length = axis === 'x' ? w : h, across = axis === 'x' ? h : w
    for (let d = 0; d < Math.min(band, Math.floor(length / 2)); d++) for (let n = 0; n < across; n++) {
      const a = axis === 'x' ? (n * w + d) * 4 : (d * w + n) * 4
      const b = axis === 'x' ? (n * w + w - 1 - d) * 4 : ((h - 1 - d) * w + n) * 4
      const t = (1 - d / band) ** 2
      for (let c = 0; c < 3; c++) {
        const mid = (src[a + c]! + src[b + c]!) / 2
        out[a + c] = blend(src[a + c]!, mid, t); out[b + c] = blend(src[b + c]!, mid, t)
      }
    }
  }
  return out
}
/** All variants meet on the same authored edge band, so any ordered pair can be adjacent. */
export function commonEdges(input: Buffer, reference: Buffer, w: number, h: number, axes: 'x' | 'xy', band = 12): Buffer {
  const out = Buffer.from(input)
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const d = axes === 'xy' ? Math.min(x, w - 1 - x, y, h - 1 - y) : Math.min(x, w - 1 - x)
    if (d >= band) continue
    const i = (y * w + x) * 4, t = (1 - d / band) ** 2
    for (let c = 0; c < 3; c++) out[i + c] = blend(input[i + c]!, reference[i + c]!, t)
  }
  return out
}
function alphaBounds(data: Buffer, w: number, h: number, threshold = 8) {
  let left = w, top = h, right = -1, bottom = -1
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (data[(y * w + x) * 4 + 3]! >= threshold) {
    left = Math.min(left, x); right = Math.max(right, x); top = Math.min(top, y); bottom = Math.max(bottom, y)
  }
  if (right < left) throw Error('Empty authored silhouette')
  return { left, top, width: right - left + 1, height: bottom - top + 1 }
}
export async function renderKitFrame(root: string, id: string, spec: KitSpec): Promise<RenderedKitFrame> {
  if (!/^[\w-]+\.png$/.test(spec.master)) throw Error('Invalid master name')
  const bytes = await readFile(resolve(root, 'assets/authored', id, 'masters', spec.master))
  if (sha(bytes) !== spec.sha256) throw Error('Master changed: ' + spec.key)
  const { data, info } = await sharp(bytes).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  let rgba: Buffer
  if (spec.mode === 'texture') {
    rgba = await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } })
      .resize(spec.w, spec.h, { fit: spec.fit ?? 'cover', position: spec.role === 'riser' ? 'north' : 'centre', kernel: 'lanczos3' }).raw().toBuffer()
    for (let i = 3; i < rgba.length; i += 4) if (rgba[i] !== 255) throw Error('Texture is not opaque: ' + spec.key)
    if (spec.seam) rgba = periodic(rgba, spec.w, spec.h, spec.seam, spec.edgeBand)
  } else {
    if (!spec.foot) throw Error('No prop foot: ' + spec.key)
    const b = alphaBounds(data, info.width, info.height)
    const source = spec.sourceFoot ?? { x: b.left + b.width / 2, y: b.top + b.height - 1 }
    const left = source.x - b.left, right = b.left + b.width - source.x, up = source.y - b.top
    const factor = Math.min(left > 0 ? (spec.foot.x - 12) / left : Infinity,
      right > 0 ? (spec.w - spec.foot.x - 12) / right : Infinity, up > 0 ? (spec.foot.y - 12) / up : Infinity)
    const w = Math.max(1, Math.round(b.width * factor)), h = Math.max(1, Math.round(b.height * factor))
    const pixels = await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } })
      .extract(b).resize(w, h, { kernel: 'lanczos3' }).raw().toBuffer()
    rgba = Buffer.alloc(spec.w * spec.h * 4)
    const contact = alphaBounds(pixels, w, h, 128)
    const dx = Math.round(spec.foot.x - (source.x - b.left) * w / b.width), dy = spec.foot.y - (contact.top + contact.height - 1)
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const a = (y * w + x) * 4, nx = x + dx, ny = y + dy
      if (pixels[a + 3]! < 8) continue
      if (nx < 1 || nx >= spec.w - 1 || ny < 1 || ny >= spec.h - 1) throw Error('Clipped prop: ' + spec.key)
      pixels.copy(rgba, (ny * spec.w + nx) * 4, a, a + 4)
    }
  }
  const png = await sharp(rgba, { raw: { width: spec.w, height: spec.h, channels: 4 } }).png().toBuffer()
  return { spec, rgba, png }
}
export async function renderKit(root: string, id: string): Promise<{ config: KitConfig; frames: RenderedKitFrame[] }> {
  if (!/^kit-[a-z0-9-]+$/.test(id)) throw Error('Invalid kit id')
  const config = JSON.parse(await readFile(resolve(root, 'assets/authored', id, 'config.json'), 'utf8')) as KitConfig
  if (config.schemaVersion !== 1 || config.id !== id || !['biome', 'town'].includes(config.kind)) throw Error('Invalid kit config')
  const frames: RenderedKitFrame[] = [], groups = new Map<string, Buffer>()
  for (const spec of config.assets) {
    if (frames.some(f => f.spec.key === spec.key)) throw Error('Duplicate frame ' + spec.key)
    const f = await renderKitFrame(root, id, spec)
    if (spec.edgeGroup && spec.seam) {
      const reference = groups.get(spec.edgeGroup)
      if (reference) {
        f.rgba = commonEdges(f.rgba, reference, spec.w, spec.h, spec.seam, spec.edgeBand)
        f.png = await sharp(f.rgba, { raw: { width: spec.w, height: spec.h, channels: 4 } }).png().toBuffer()
      } else groups.set(spec.edgeGroup, f.rgba)
    }
    frames.push(f)
  }
  return { config, frames }
}
export async function buildKit(root = kitProject, id = 'kit-forest', destination = resolve(root, 'packages/art', id)) {
  const { config, frames } = await renderKit(root, id), size = 2048
  const atlas: KitAtlas = { formatVersion: 1, id, kind: config.kind, tile: 128, pages: [{ file: 'atlas.png', width: size, height: size }], frames: {} }
  const composites: sharp.OverlayOptions[] = []
  let x = 0, y = 0, row = 0
  for (const f of [...frames].sort((a, b) => b.spec.h - a.spec.h || b.spec.w - a.spec.w || a.spec.key.localeCompare(b.spec.key))) {
    const s = f.spec
    if (s.w > size || s.h > size) throw Error('Oversize frame ' + s.key)
    if (x + s.w > size) { x = 0; y += row + 2; row = 0 }
    if (y + s.h > size) throw Error('Kit exceeds its 2048 page')
    atlas.frames[s.key] = { page: 0, x, y, w: s.w, h: s.h, role: s.role,
      ...(s.weight ? { weight: s.weight } : {}), ...(s.foot ? { foot: s.foot } : {}),
      ...(s.blocks !== undefined ? { blocks: s.blocks } : {}), ...(s.light ? { light: s.light } : {}) }
    composites.push({ input: f.png, left: x, top: y }); x += s.w + 2; row = Math.max(row, s.h)
  }
  await mkdir(destination, { recursive: true })
  const png = await sharp({ create: { width: size, height: size, channels: 4, background: '#00000000' } }).composite(composites).png().toBuffer()
  await writeFile(resolve(destination, 'atlas.png'), png)
  await writeFile(resolve(destination, 'atlas.json'), JSON.stringify(atlas, null, 2) + '\n')
  return { atlas, frames, hashes: { png: sha(png), json: sha(JSON.stringify(atlas, null, 2) + '\n') } }
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  buildKit(kitProject, process.argv[2] ?? 'kit-forest').then(r => console.log(JSON.stringify({ id: r.atlas.id, frames: r.frames.length, hashes: r.hashes })))
    .catch((error: unknown) => { console.error(error); process.exitCode = 1 })
}
