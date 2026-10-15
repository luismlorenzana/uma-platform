import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { inflateSync } from 'node:zlib'
import { describe, expect, it } from 'vitest'
import { Sprite } from '../sprite.ts'
import { GEAR } from './index.ts'
import { drawGearIcon } from './render.ts'
import baseline from './legacy-2.4.0.json'

const sha = (bytes: Uint8Array | string) => createHash('sha256').update(bytes).digest('hex')
describe('H28 append-only feet and accessory art', () => {
  it('retains all 340 published 2.4.0 frames and their exact RGBA bytes', () => {
    const index = JSON.parse(readFileSync(new URL('../../../../packages/art/gear/atlas.json', import.meta.url), 'utf8')) as { frames: Record<string, unknown> }
    expect(sha(JSON.stringify(Object.entries(index.frames).slice(0, 340)))).toBe(baseline.frames)
    const png = readFileSync(new URL('../../../../packages/art/gear/atlas.png', import.meta.url)), chunks: Buffer[] = []
    for (let at = 8; at < png.length;) {
      const n = png.readUInt32BE(at)
      if (png.toString('ascii', at + 4, at + 8) === 'IDAT') chunks.push(png.subarray(at + 8, at + 8 + n))
      at += n + 12
    }
    const raw = inflateSync(Buffer.concat(chunks)), px = Buffer.alloc(320 * 1088 * 4)
    for (let y = 0; y < 1088; y++) {
      expect(raw[y * 1281]).toBe(0)
      px.set(raw.subarray(y * 1281 + 1, (y + 1) * 1281), y * 1280)
    }
    for (let r = 0; r < 34; r++) expect(sha(px.subarray(r * 40960, (r + 1) * 40960)), GEAR[r]!.type.type).toBe(baseline.rows[r])
  })

  it('gives all twelve additions unique art and silhouettes at every grade', () => {
    for (let grade = 0; grade < 10; grade++) {
      const icons = GEAR.slice(34).map(row => drawGearIcon(row.icons[grade]!))
      expect(new Set(icons.map(sha)).size).toBe(12)
      // Each family has its own object/outline silhouette, even before color and finishes.
      for (const family of [icons.slice(2, 7), icons.slice(7)]) {
        const masks = family.map(px => sha(Uint8Array.from({ length: 1024 }, (_, i) => px[i * 4 + 3] === 255 ? 1 : 0)))
        expect(new Set(masks).size).toBe(5)
      }
    }
  })

  it('changes construction/finish at grades 4, 7 and 8, beyond the grade palette', () => {
    const construction = (row: typeof GEAR[number], g: number) => {
      const sprite = new Sprite(); row.icons[g - 1]!.paint(sprite)
      // Ignore every RGB ramp: compare material placement, shading and soft-effect positions only.
      return JSON.stringify({ mat: [...sprite.mat], tone: [...sprite.tone], overlays: sprite.overlays.map(o => [o.x, o.y, o.color[3]]) })
    }
    for (const row of GEAR.slice(34)) {
      for (const grade of [4, 7, 8]) {
        const current = drawGearIcon(row.icons[grade - 1]!), prior = drawGearIcon(row.icons[grade - 2]!)
        expect(sha(current), row.type.type + ':g' + grade).not.toBe(sha(prior))
        expect(construction(row, grade), row.type.type + ':g' + grade).not.toBe(construction(row, grade - 1))
      }
    }
    // Feet really are a matched pair of slot shapes, not the old full-length leg guards.
    for (const [a, b] of [['boots', 'greaves'], ['slippers', 'leggings']]) {
      const icon = GEAR.find(row => row.type.type === a)!.icons[0]!
      const old = GEAR.find(row => row.type.type === b)!.icons[0]!
      expect(sha(drawGearIcon(icon))).not.toBe(sha(drawGearIcon(old)))
    }
  })
})
