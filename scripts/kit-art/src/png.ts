// Minimal PNG encoder (8-bit RGBA, no filtering) so the art tools need no dependencies.
import { deflateSync, inflateSync } from 'node:zlib'

const CRC_TABLE = (() => {
  const table = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    table[n] = c >>> 0
  }
  return table
})()

function crc32(bytes: Uint8Array): number {
  let c = 0xffffffff
  for (const b of bytes) c = (CRC_TABLE[(c ^ b) & 0xff] ?? 0) ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function chunk(type: string, data: Uint8Array): Buffer {
  const out = Buffer.alloc(12 + data.length)
  out.writeUInt32BE(data.length, 0)
  out.write(type, 4, 'ascii')
  out.set(data, 8)
  out.writeUInt32BE(crc32(out.subarray(4, 8 + data.length)), 8 + data.length)
  return out
}

/** Encodes row-major 8-bit RGBA pixels as a PNG file. */
export function encodePng(width: number, height: number, rgba: Uint8Array): Buffer {
  const header = Buffer.alloc(13)
  header.writeUInt32BE(width, 0)
  header.writeUInt32BE(height, 4)
  header.set([8, 6, 0, 0, 0], 8) // bit depth 8, color type RGBA
  const stride = width * 4
  const raw = Buffer.alloc((stride + 1) * height)
  for (let y = 0; y < height; y++) raw.set(rgba.subarray(y * stride, (y + 1) * stride), y * (stride + 1) + 1)
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  return Buffer.concat([signature, chunk('IHDR', header), chunk('IDAT', deflateSync(raw, { level: 9 })), chunk('IEND', new Uint8Array(0))])
}

/** Encodes RGBA as a smaller PNG: each row takes whichever of the five PNG filters gives the least total change (the
 * usual heuristic), so painted, gradient-heavy pages compress far better. Deterministic: the same pixels, the same bytes. */
export function encodePngFiltered(width: number, height: number, rgba: Uint8Array): Buffer {
  const header = Buffer.alloc(13)
  header.writeUInt32BE(width, 0)
  header.writeUInt32BE(height, 4)
  header.set([8, 6, 0, 0, 0], 8)
  const stride = width * 4, raw = Buffer.alloc((stride + 1) * height), line = new Uint8Array(stride)
  const paeth = (a: number, b: number, c: number) => { const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c); return pa <= pb && pa <= pc ? a : pb <= pc ? b : c }
  for (let y = 0; y < height; y++) {
    const cur = rgba.subarray(y * stride, (y + 1) * stride), prev = y ? rgba.subarray((y - 1) * stride, y * stride) : null
    let best = 0, bestSum = Infinity
    const out = new Uint8Array(stride)
    for (let f = 0; f < 5; f++) {
      let sum = 0
      for (let i = 0; i < stride; i++) {
        const a = i >= 4 ? cur[i - 4]! : 0, b = prev ? prev[i]! : 0, c = prev && i >= 4 ? prev[i - 4]! : 0
        const v = (cur[i]! - (f === 0 ? 0 : f === 1 ? a : f === 2 ? b : f === 3 ? (a + b) >> 1 : paeth(a, b, c))) & 255
        line[i] = v
        sum += v < 128 ? v : 256 - v
      }
      if (sum < bestSum) { bestSum = sum; best = f; out.set(line) }
    }
    raw[y * (stride + 1)] = best
    raw.set(out, y * (stride + 1) + 1)
  }
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  return Buffer.concat([signature, chunk('IHDR', header), chunk('IDAT', deflateSync(raw, { level: 9 })), chunk('IEND', new Uint8Array(0))])
}

/** Decodes this tool's PNGs (8-bit RGBA, any row filter) back to pixels, for the tests. */
export function decodePng(png: Buffer): { w: number; h: number; px: Uint8Array } {
  const w = png.readUInt32BE(16), h = png.readUInt32BE(20), chunks: Buffer[] = []
  for (let at = 8; at < png.length;) { const n = png.readUInt32BE(at); if (png.toString('ascii', at + 4, at + 8) === 'IDAT') chunks.push(png.subarray(at + 8, at + 8 + n)); at += n + 12 }
  const raw = inflateSync(Buffer.concat(chunks)), stride = w * 4, px = new Uint8Array(stride * h)
  const paeth = (a: number, b: number, c: number) => { const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c); return pa <= pb && pa <= pc ? a : pb <= pc ? b : c }
  for (let y = 0; y < h; y++) {
    const f = raw[y * (stride + 1)]!, src = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1))
    for (let i = 0; i < stride; i++) {
      const a = i >= 4 ? px[y * stride + i - 4]! : 0, b = y ? px[(y - 1) * stride + i]! : 0, c = y && i >= 4 ? px[(y - 1) * stride + i - 4]! : 0
      px[y * stride + i] = (src[i]! + (f === 0 ? 0 : f === 1 ? a : f === 2 ? b : f === 3 ? (a + b) >> 1 : paeth(a, b, c))) & 255
    }
  }
  return { w, h, px }
}
