import { deflateSync } from 'node:zlib'
import { describe, expect, it } from 'vitest'
import { composePortraitRGBA, decodePortraitPNG } from './portrait-pixels.mjs'

// Small invented pixels exercise every PNG row filter, including low-alpha RGB that Canvas can round.
function png(channels = 4) {
  const width = 3, height = 5, pixels = Uint8Array.from({ length: width * height * channels }, (_, i) => (i * 37 + 13) % 256)
  const stride = width * channels, scan = []
  const paeth = (a, b, c) => { const p = a + b - c, x = Math.abs(p - a), y = Math.abs(p - b), z = Math.abs(p - c); return x <= y && x <= z ? a : y <= z ? b : c }
  for (let y = 0; y < height; y++) {
    scan.push(y)
    for (let x = 0; x < stride; x++) {
      const i = y * stride + x, l = x >= channels ? pixels[i - channels] : 0, u = y ? pixels[i - stride] : 0, c = y && x >= channels ? pixels[i - stride - channels] : 0
      const prediction = [0, l, u, Math.floor((l + u) / 2), paeth(l, u, c)][y]
      scan.push((pixels[i] - prediction) & 255)
    }
  }
  const chunk = (type, data) => { const out = Buffer.alloc(data.length + 12); out.writeUInt32BE(data.length); out.write(type, 4); out.set(data, 8); return out }
  const header = Buffer.alloc(13); header.writeUInt32BE(width); header.writeUInt32BE(height, 4); header[8] = 8; header[9] = channels === 4 ? 6 : 2
  return { width, height, pixels, bytes: Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', header), chunk('IDAT', deflateSync(Buffer.from(scan))), chunk('IEND', Buffer.alloc(0))]) }
}

describe('portrait source pixels', () => {
  it('decodes all five filters without premultiplying RGBA', async () => {
    const fixture = png(), decoded = await decodePortraitPNG(fixture.bytes)
    expect(decoded.width).toBe(fixture.width); expect(decoded.height).toBe(fixture.height)
    expect([...decoded.data]).toEqual([...fixture.pixels])
  })

  it('decodes RGB bases with opaque alpha and rejects truncated or unsupported PNGs', async () => {
    const fixture = png(3), decoded = await decodePortraitPNG(fixture.bytes)
    expect([...decoded.data]).toEqual(Array.from({ length: 15 }, (_, i) => [...fixture.pixels.slice(i * 3, i * 3 + 3), 255]).flat())
    await expect(decodePortraitPNG(fixture.bytes.subarray(0, -4))).rejects.toThrow(/Incomplete/)
    const bad = Buffer.from(fixture.bytes); bad[24] = 16
    await expect(decodePortraitPNG(bad)).rejects.toThrow(/RGB\/RGBA8/)
  })

  it('uses exact byte blending at the recorded position, preserving base alpha and outside pixels', () => {
    const base = { width: 3, height: 2, data: Uint8ClampedArray.from(Array.from({ length: 6 }, () => [20, 80, 200, 213]).flat()) }
    const face = { width: 2, height: 1, data: Uint8ClampedArray.from([200, 100, 40, 255, 121, 7, 84, 127]) }
    const out = composePortraitRGBA(base, face, { x: 1, y: 1 })
    expect([...out.slice(0, 16)]).toEqual([...base.data.slice(0, 16)])
    expect([...out.slice(16, 20)]).toEqual([200, 100, 40, 213])
    expect([...out.slice(20)]).toEqual([Math.round(20 * 128 / 255 + 121 * 127 / 255), Math.round(80 * 128 / 255 + 7 * 127 / 255), Math.round(200 * 128 / 255 + 84 * 127 / 255), 213])
    expect(composePortraitRGBA(base, null, null)).toEqual(base.data)
    expect(() => composePortraitRGBA(base, face, { x: 2, y: 1 })).toThrow(/placement/)
    expect(base.data[16]).toBe(20)
  })
})
