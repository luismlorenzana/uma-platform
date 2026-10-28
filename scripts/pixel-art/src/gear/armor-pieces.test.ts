import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { inflateSync } from 'node:zlib'
import { describe, expect, it } from 'vitest'
import { GEAR } from './index.ts'
import { drawGearIcon } from './render.ts'
import baseline from './legacy-2.0.0.json'
const sha = (px: Uint8Array | string) => createHash('sha256').update(px).digest('hex')
/** Filter-0 PNGs produced by our encoder: exact pixels independent of Node/zlib's compressed bitstream. */
function atlasPixels(): Buffer {
  const png = readFileSync(new URL('../../../../packages/art/gear/atlas.png', import.meta.url)), chunks: Buffer[] = []
  for (let at = 8; at < png.length;) {
    const n = png.readUInt32BE(at)
    if (png.toString('ascii', at + 4, at + 8) === 'IDAT') chunks.push(png.subarray(at + 8, at + 8 + n))
    at += n + 12
  }
  const raw = inflateSync(Buffer.concat(chunks)), stride = 320 * 4, height = png.readUInt32BE(20), px = Buffer.alloc(stride * height)
  expect(png.readUInt32BE(16)).toBe(320); expect(height).toBe(1792)
  for (let y = 0; y < height; y++) {
    expect(raw[y * (stride + 1)]).toBe(0)
    px.set(raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1)), y * stride)
  }
  return px
}
describe('H27 append-only armor contract', () => {
  it('freezes every published 2.0.0 frame and all first-26-row pixel bytes', () => {
    const px = atlasPixels(), index = JSON.parse(readFileSync(new URL('../../../../packages/art/gear/atlas.json', import.meta.url), 'utf8')) as { frames: Record<string, unknown> }
    expect(sha(JSON.stringify(Object.entries(index.frames).slice(0, 260)))).toBe(baseline.frames)
    for (let r = 0; r < 26; r++) expect(sha(px.subarray(r * 40960, (r + 1) * 40960)), GEAR[r]!.type.type).toBe(baseline.rows[r])
  })
  it('matches every freshly painted icon to the checked-in RGBA bytes', () => {
    const px = atlasPixels()
    GEAR.forEach((row, r) => row.icons.forEach((icon, g) => {
      const painted = drawGearIcon(icon)
      for (let y = 0; y < 32; y++) {
        const from = ((r * 32 + y) * 320 + g * 32) * 4
        expect(px.subarray(from, from + 128).equals(Buffer.from(painted.subarray(y * 128, (y + 1) * 128))), icon.id + ':' + y).toBe(true)
      }
    }))
  })
  it('keeps all eight pieces distinct at every grade, with material/finish changes at 4, 7 and 8', () => {
    const rows = GEAR.slice(26, 34)
    for (let g = 0; g < 10; g++) expect(new Set(rows.map((r) => sha(drawGearIcon(r.icons[g]!)))).size).toBe(8)
    for (const row of rows) for (const g of [3, 6, 7]) expect(sha(drawGearIcon(row.icons[g]!))).not.toBe(sha(drawGearIcon(row.icons[g - 1]!)))
  })
})
