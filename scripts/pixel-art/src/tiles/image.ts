// A small RGBA image for tiles, atlases and previews: set, alpha-blend, blit and nearest-neighbour scaling.
import type { RGBA } from '../color.ts'

export class Img {
  readonly w: number
  readonly h: number
  readonly px: Uint8Array

  constructor(w: number, h: number, px?: Uint8Array) {
    this.w = w
    this.h = h
    this.px = px ?? new Uint8Array(w * h * 4)
  }

  inside(x: number, y: number): boolean {
    return x >= 0 && y >= 0 && x < this.w && y < this.h
  }

  get(x: number, y: number): RGBA {
    if (!this.inside(x, y)) return [0, 0, 0, 0]
    const i = (y * this.w + x) * 4
    return [this.px[i] ?? 0, this.px[i + 1] ?? 0, this.px[i + 2] ?? 0, this.px[i + 3] ?? 0]
  }

  set(x: number, y: number, c: RGBA): void {
    if (this.inside(x, y)) this.px.set(c, (y * this.w + x) * 4)
  }

  /** Source-over compositing of `c` onto the pixel. */
  blend(x: number, y: number, c: RGBA): void {
    if (!this.inside(x, y)) return
    const i = (y * this.w + x) * 4
    const sa = c[3] / 255
    const da = (this.px[i + 3] ?? 0) / 255
    const oa = sa + da * (1 - sa)
    if (oa === 0) return
    for (let k = 0; k < 3; k++) this.px[i + k] = Math.round(((c[k] ?? 0) * sa + (this.px[i + k] ?? 0) * da * (1 - sa)) / oa)
    this.px[i + 3] = Math.round(oa * 255)
  }

  fill(c: RGBA): this {
    for (let i = 0; i < this.w * this.h; i++) this.px.set(c, i * 4)
    return this
  }

  /** Copies `src` verbatim (alpha included) with its top left at (ox, oy). */
  copy(src: Img, ox: number, oy: number): this {
    for (let y = 0; y < src.h; y++) for (let x = 0; x < src.w; x++) this.set(ox + x, oy + y, src.get(x, y))
    return this
  }

  /** Composites `src` over this image with its top left at (ox, oy). */
  draw(src: Img, ox: number, oy: number): this {
    for (let y = 0; y < src.h; y++)
      for (let x = 0; x < src.w; x++) {
        const c = src.get(x, y)
        if (c[3] > 0) this.blend(ox + x, oy + y, c)
      }
    return this
  }

  crop(x0: number, y0: number, w: number, h: number): Img {
    const out = new Img(w, h)
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) out.set(x, y, this.get(x0 + x, y0 + y))
    return out
  }

  scaled(k: number): Img {
    const out = new Img(this.w * k, this.h * k)
    for (let y = 0; y < out.h; y++) for (let x = 0; x < out.w; x++) out.set(x, y, this.get(Math.floor(x / k), Math.floor(y / k)))
    return out
  }
}
