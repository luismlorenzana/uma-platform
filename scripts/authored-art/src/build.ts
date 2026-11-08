import { createHash } from 'node:crypto'
import { readFile, mkdir, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import sharp from 'sharp'

export interface Point { x: number; y: number }
export interface Spec { key: string; family: 'held' | 'emote'; master: string; sha256: string; sourceAnchor: Point; anchor: Point; scale: number; nock?: Point; label: string }
export interface Config { schemaVersion: 1; assets: Spec[] }
export interface Frame { x: number; y: number; w: number; h: number; label: string; grip?: Point; angle0?: 'image-left'; scale?: number; nock?: Point; anchor?: Point }
export interface Atlas { schemaVersion: 1; cell: number; width: number; height: number; frames: Record<string, Frame> }
export const project = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
const digest = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex')
export function opaqueBounds(data: Buffer, width: number, height: number) {
  let left = width, right = -1, top = height, bottom = -1
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) if (data[(y * width + x) * 4 + 3]! >= 128) {
    left = Math.min(left, x); right = Math.max(right, x); top = Math.min(top, y); bottom = Math.max(bottom, y)
  }
  if (right < left) throw new Error('No opaque asset')
  return { left, right, top, bottom, width: right - left + 1, height: bottom - top + 1 }
}
export async function render(master: Uint8Array, spec: Spec) {
  if (digest(master) !== spec.sha256) throw new Error(`Master changed: ${spec.master}`)
  const { data, info } = await sharp(master).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const cell = spec.family === 'held' ? 128 : 64, margin = 4, b = opaqueBounds(data, info.width, info.height), p = spec.sourceAnchor, target = spec.anchor
  const limits = [p.x > b.left ? (target.x - margin) / (p.x - b.left) : Infinity,
    b.right > p.x ? (cell - 1 - margin - target.x) / (b.right - p.x) : Infinity,
    p.y > b.top ? (target.y - margin) / (p.y - b.top) : Infinity,
    b.bottom > p.y ? (cell - 1 - margin - target.y) / (b.bottom - p.y) : Infinity]
  const factor = Math.min(...limits)
  if (!Number.isFinite(factor) || factor <= 0) throw new Error('Invalid source anchor')
  const width = Math.max(1, Math.round(info.width * factor)), height = Math.max(1, Math.round(info.height * factor))
  const pixels = await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } }).resize(width, height, { kernel: 'lanczos3' }).raw().toBuffer()
  const sx = width / info.width, sy = height / info.height, dx = Math.round(target.x - p.x * sx), dy = Math.round(target.y - p.y * sy), output = Buffer.alloc(cell * cell * 4)
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const from = (y * width + x) * 4, nx = x + dx, ny = y + dy
    if (pixels[from + 3]! < 8) continue
    if (nx < 1 || nx >= cell - 1 || ny < 1 || ny >= cell - 1) {
      if (pixels[from + 3]! >= 128) throw new Error(`Opaque clipping: ${spec.key}`)
      continue
    }
    pixels.copy(output, (ny * cell + nx) * 4, from, from + 4)
  }
  const point = (q: Point) => ({ x: Number((q.x * sx + dx).toFixed(3)), y: Number((q.y * sy + dy).toFixed(3)) })
  const actualAnchor = point(p), nock = spec.nock ? point(spec.nock) : undefined
  const png = await sharp(output, { raw: { width: cell, height: cell, channels: 4 } }).png().toBuffer()
  return { png, pixels: output, anchor: actualAnchor, nock, sourceScale: { sx, sy, dx, dy }, bounds: opaqueBounds(output, cell, cell) }
}
export async function build(root = project, destination = resolve(root, 'packages/art')) {
  const config = JSON.parse(await readFile(resolve(root, 'assets/authored/ua8-config.json'), 'utf8')) as Config
  if (config.schemaVersion !== 1 || config.assets.length !== 24) throw new Error('Expected 24 UA8 assets')
  const records: unknown[] = []
  for (const family of ['held', 'emote'] as const) {
    const specs = config.assets.filter(s => s.family === family), cell = family === 'held' ? 128 : 64, columns = family === 'held' ? 4 : 8
    if (specs.length !== (family === 'held' ? 16 : 8)) throw new Error('Wrong family count')
    const atlas: Atlas = { schemaVersion: 1, cell, width: columns * cell, height: Math.ceil(specs.length / columns) * cell, frames: {} }
    const composites: sharp.OverlayOptions[] = []
    for (const [i, spec] of specs.entries()) {
      if (!/^(held|emote)\/[\w-]+\.png$/.test(spec.master)) throw new Error('Invalid master path')
      const r = await render(await readFile(resolve(root, 'assets/authored', spec.master)), spec), x = i % columns * cell, y = Math.floor(i / columns) * cell
      atlas.frames[family + '/' + spec.key] = { x, y, w: cell, h: cell, label: spec.label, ...(family === 'held'
        ? { grip: r.anchor, angle0: 'image-left' as const, scale: spec.scale, ...(r.nock ? { nock: r.nock } : {}) }
        : { anchor: r.anchor }) }
      composites.push({ input: r.png, left: x, top: y })
      records.push({ key: spec.key, family, sourceScale: r.sourceScale, anchor: r.anchor, nock: r.nock, bounds: r.bounds, pngSha256: digest(r.png) })
    }
    const bytes = await sharp({ create: { width: atlas.width, height: atlas.height, channels: 4, background: '#00000000' } }).composite(composites).png().toBuffer()
    await mkdir(resolve(destination, family), { recursive: true })
    await writeFile(resolve(destination, family, 'atlas.png'), bytes)
    await writeFile(resolve(destination, family, 'atlas.json'), JSON.stringify(atlas, null, 2) + '\n')
  }
  return records
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  build().then(records => console.log(JSON.stringify({ assets: records.length, families: ['held', 'emote'] }))).catch((error: unknown) => { console.error(error); process.exitCode = 1 })
}
