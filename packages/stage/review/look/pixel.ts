// The pixel scale (the look bible's rule 2, LR4): every texture redrawn at one texel density, colours stepped, sampled
// nearest, so the CC0 kits' painterly maps and our smooth sprites land on the same chunky grid as the references.
import { CanvasTexture, NearestFilter, NoColorSpace, type Texture } from 'three'

type Source = CanvasImageSource & { width: number; height: number }
const cache = new WeakMap<object, Map<string, CanvasTexture>>()

/** A texture redrawn at `size` texels on its long side (never larger than it is), colours stepped to `levels` a channel. */
export function pixelate(tex: Texture, size: number, levels: number, colour = true): Texture {
  const img = tex.image as Source | undefined
  if (!img?.width) return tex
  // Keyed by the image, not the texture: every module's copy of a kit texture shares one redrawn canvas.
  const key = `${size}:${levels}:${colour}:${tex.flipY}:${tex.wrapS}:${tex.wrapT}`
  let byImage = cache.get(img)
  if (!byImage) { byImage = new Map(); cache.set(img, byImage) }
  const hit = byImage.get(key)
  if (hit) return hit
  const k = Math.min(1, size / Math.max(img.width, img.height))
  const w = Math.max(1, Math.round(img.width * k)), h = Math.max(1, Math.round(img.height * k))
  const c = document.createElement('canvas')
  c.width = w; c.height = h
  const g = c.getContext('2d', { willReadFrequently: true })!
  g.imageSmoothingEnabled = true
  g.imageSmoothingQuality = 'high'
  g.drawImage(img, 0, 0, w, h)
  if (colour && levels < 256) {
    const d = g.getImageData(0, 0, w, h), step = 255 / (levels - 1)
    // Stepped in light, not channel by channel, so hues hold while the value bands read as painted pixels.
    for (let i = 0; i < d.data.length; i += 4) for (let ch = 0; ch < 3; ch++) d.data[i + ch] = Math.round(d.data[i + ch]! / step) * step
    g.putImageData(d, 0, 0)
  }
  const out = new CanvasTexture(c)
  out.flipY = tex.flipY
  out.wrapS = tex.wrapS; out.wrapT = tex.wrapT
  out.colorSpace = colour ? tex.colorSpace : NoColorSpace
  out.magFilter = NearestFilter
  out.minFilter = NearestFilter
  out.generateMipmaps = false
  out.repeat.copy(tex.repeat); out.offset.copy(tex.offset)
  byImage.set(key, out)
  return out
}

/** A sprite frame at `height` texels tall (keeping its aspect), its colours stepped: the pixel pass on our smooth sets. */
export function pixelSprite(src: HTMLCanvasElement, height: number, levels: number): HTMLCanvasElement {
  const k = Math.min(1, height / src.height), w = Math.max(1, Math.round(src.width * k)), h = Math.max(1, Math.round(src.height * k))
  const c = document.createElement('canvas')
  c.width = w; c.height = h
  const g = c.getContext('2d', { willReadFrequently: true })!
  g.imageSmoothingEnabled = true
  g.imageSmoothingQuality = 'high'
  g.drawImage(src, 0, 0, w, h)
  const d = g.getImageData(0, 0, w, h), step = 255 / (levels - 1)
  for (let i = 0; i < d.data.length; i += 4) {
    // Hard edges: a texel is in or out, as pixel art.
    d.data[i + 3] = d.data[i + 3]! >= 110 ? 255 : 0
    for (let ch = 0; ch < 3; ch++) d.data[i + ch] = Math.round(d.data[i + ch]! / step) * step
  }
  g.putImageData(d, 0, 0)
  return c
}

/** A normal map from a sprite's silhouette: the farther a texel is from the edge, the higher (to `rim` texels), so a
 * flat cut-out takes light like a low relief (the outline method for pixel-art normal maps). */
export function silhouetteNormals(src: HTMLCanvasElement, rim = 3): HTMLCanvasElement {
  const w = src.width, h = src.height
  const a = src.getContext('2d', { willReadFrequently: true })!.getImageData(0, 0, w, h).data
  const dist = new Float32Array(w * h).fill(Infinity)
  const queue: number[] = []
  for (let i = 0; i < w * h; i++) if (a[i * 4 + 3]! < 128) { dist[i] = 0; queue.push(i) }
  for (let qi = 0; qi < queue.length; qi++) {
    const i = queue[qi]!, x = i % w, y = (i / w) | 0
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      const nx = x + dx, ny = y + dy
      if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue
      const j = ny * w + nx
      if (dist[j]! > dist[i]! + 1) { dist[j] = dist[i]! + 1; queue.push(j) }
    }
  }
  const height = (x: number, y: number) => Math.min(rim, dist[Math.min(h - 1, Math.max(0, y)) * w + Math.min(w - 1, Math.max(0, x))]!) / rim
  const c = document.createElement('canvas')
  c.width = w; c.height = h
  const g = c.getContext('2d')!, out = g.createImageData(w, h)
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const dx = height(x + 1, y) - height(x - 1, y), dy = height(x, y + 1) - height(x, y - 1)
    let nx = -dx, ny = dy, nz = 0.6
    const l = Math.hypot(nx, ny, nz); nx /= l; ny /= l; nz /= l
    const o = (y * w + x) * 4
    out.data[o] = (nx * 0.5 + 0.5) * 255; out.data[o + 1] = (ny * 0.5 + 0.5) * 255; out.data[o + 2] = (nz * 0.5 + 0.5) * 255; out.data[o + 3] = 255
  }
  g.putImageData(out, 0, 0)
  return c
}
