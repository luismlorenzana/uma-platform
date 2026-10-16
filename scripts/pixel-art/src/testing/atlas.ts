// Test-only reader for this generator's filter-0, RGBA PNGs, independent of compressed zlib bytes.
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { inflateSync } from 'node:zlib'
import { Img } from '../tiles/image.ts'

export const hash = (value: Uint8Array | string): string => createHash('sha256').update(value).digest('hex')
export interface ArtFrame { x: number; y: number; w?: number; h?: number; [key: string]: unknown }
export function savedAtlas(family: string): { img: Img; index: { width: number; height: number; cell?: number; frames: Record<string, ArtFrame> } } {
  const root = new URL(`../../../../packages/art/${family}/`, import.meta.url)
  const index = JSON.parse(readFileSync(new URL('atlas.json', root), 'utf8')) as ReturnType<typeof savedAtlas>['index']
  const png = readFileSync(new URL('atlas.png', root)), chunks: Buffer[] = []
  if (png.readUInt32BE(16) !== index.width || png.readUInt32BE(20) !== index.height) throw new Error(`${family}: PNG/index size mismatch`)
  for (let at = 8; at < png.length;) {
    const n = png.readUInt32BE(at)
    if (png.toString('ascii', at + 4, at + 8) === 'IDAT') chunks.push(png.subarray(at + 8, at + 8 + n))
    at += n + 12
  }
  const raw = inflateSync(Buffer.concat(chunks)), stride = index.width * 4, px = new Uint8Array(stride * index.height)
  for (let y = 0; y < index.height; y++) {
    if (raw[y * (stride + 1)] !== 0) throw new Error(`${family}: expected generator's filter-0 PNG`)
    px.set(raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1)), y * stride)
  }
  return { img: new Img(index.width, index.height, px), index }
}
