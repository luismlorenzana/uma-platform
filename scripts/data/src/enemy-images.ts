// The enemy-key image checks (docs/sprites/enemy-keys.md §6), shared by `pnpm enemies:pack` (on the PNG masters) and
// `pnpm release:check` (on the released WebPs), and kept for Q39's pipeline: each pose fills its tier's canvas with a
// clear border, and a boss's layers composited back to front give her battle pose.

import sharp from 'sharp'

/** Straight (not premultiplied) 8-bit RGBA, row by row. */
export interface Rgba { data: Uint8Array; width: number; height: number }

export async function decodeRgba(input: Buffer | Uint8Array | string): Promise<Rgba> {
  const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  return { data: new Uint8Array(data.buffer, data.byteOffset, data.byteLength), width: info.width, height: info.height }
}

/** The box of every pixel with any alpha, or null for an empty image. */
export function alphaBox(image: Rgba): { left: number; top: number; right: number; bottom: number } | null {
  let left = image.width, top = image.height, right = -1, bottom = -1
  for (let y = 0; y < image.height; y += 1) {
    for (let x = 0; x < image.width; x += 1) {
      if (image.data[(y * image.width + x) * 4 + 3] === 0) continue
      if (x < left) left = x
      if (x > right) right = x
      if (y < top) top = y
      if (y > bottom) bottom = y
    }
  }
  return right < 0 ? null : { left, top, right, bottom }
}

/** Whether every pixel within `border` of an edge is fully transparent. */
export function clearBorder(image: Rgba, border: number): boolean {
  const box = alphaBox(image)
  return !box || (box.left >= border && box.top >= border && box.right < image.width - border && box.bottom < image.height - border)
}

/** Layers composited source-over, back to front, in straight alpha, rounded to 8 bits. */
export function compositeOver(layers: readonly Rgba[]): Rgba {
  const first = layers[0]
  if (!first) throw new Error('No layers to composite')
  const { width, height } = first
  const out = new Uint8Array(width * height * 4)
  const acc = new Float64Array(width * height * 4)
  for (const layer of layers) {
    if (layer.width !== width || layer.height !== height) throw new Error('Layers of different sizes')
    for (let i = 0; i < acc.length; i += 4) {
      const sa = layer.data[i + 3]! / 255
      if (sa === 0) continue
      const da = acc[i + 3]!, oa = sa + da * (1 - sa)
      for (let c = 0; c < 3; c += 1) acc[i + c] = (layer.data[i + c]! * sa + acc[i + c]! * da * (1 - sa)) / oa
      acc[i + 3] = oa
    }
  }
  for (let i = 0; i < acc.length; i += 4) {
    out[i + 3] = Math.round(acc[i + 3]! * 255)
    if (out[i + 3] !== 0) for (let c = 0; c < 3; c += 1) out[i + c] = Math.round(acc[i + c]!)
  }
  return { data: out, width, height }
}

/** How far two images differ: alpha in levels, colour weighted by alpha (so a clear pixel's colour never counts). */
export function imageDistance(a: Rgba, b: Rgba): { alpha: number; color: number; at: { x: number; y: number } | null } {
  if (a.width !== b.width || a.height !== b.height) return { alpha: 255, color: 255, at: null }
  let alpha = 0, color = 0, at: { x: number; y: number } | null = null
  for (let i = 0; i < a.data.length; i += 4) {
    const aa = a.data[i + 3]!, ba = b.data[i + 3]!
    let worst = false
    if (Math.abs(aa - ba) > alpha) { alpha = Math.abs(aa - ba); worst = true }
    for (let c = 0; c < 3; c += 1) {
      const d = Math.abs(a.data[i + c]! * aa - b.data[i + c]! * ba) / 255
      if (d > color) { color = d; worst = true }
    }
    if (worst) at = { x: (i / 4) % a.width, y: Math.floor(i / 4 / a.width) }
  }
  return { alpha, color, at }
}

/** The format's "re-composite exactly": to 8-bit rounding, alpha within 1 level and alpha-weighted colour within 1.5. */
export const COMPOSITE_TOLERANCE = { alpha: 1, color: 1.5 } as const

/** Whether the layers, back to front, give the pose; with the worst pixel when they don't. */
export function recomposites(layers: readonly Rgba[], pose: Rgba): { ok: boolean; alpha: number; color: number; at: { x: number; y: number } | null } {
  const d = imageDistance(compositeOver(layers), pose)
  return { ok: d.alpha <= COMPOSITE_TOLERANCE.alpha && d.color <= COMPOSITE_TOLERANCE.color, ...d }
}

const raw = (image: Rgba) => sharp(Buffer.from(image.data.buffer, image.data.byteOffset, image.data.byteLength), { raw: { width: image.width, height: image.height, channels: 4 } })

/** The release's encoding: lossless WebP (what a clear pixel's colour becomes doesn't matter, and isn't kept). */
export const encodeLossless = (image: Rgba): Promise<Buffer> => raw(image).webp({ lossless: true, effort: 6 }).toBuffer()
/** The masters' encoding. */
export const encodePng = (image: Rgba): Promise<Buffer> => raw(image).png({ compressionLevel: 9 }).toBuffer()
