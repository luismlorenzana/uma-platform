// uma-rpg D234's colored Arms: ten rows append after the Mirror Amulet. Every published 2.14.0 row keeps its bytes; each
// colored row keeps its plain row's silhouette at every grade and changes only its color.
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { inflateSync } from 'node:zlib'
import { describe, expect, it } from 'vitest'
import { GEAR } from './index.ts'
import { drawGearIcon } from './render.ts'
import { ARM_IDS } from './symbols.ts'
import baseline from './legacy-2.14.0.json'

const sha = (bytes: Uint8Array | string) => createHash('sha256').update(bytes).digest('hex')
const row = (type: string) => GEAR.find((r) => r.type.type === type)!
const mask = (px: Uint8Array) => sha(Uint8Array.from({ length: 1024 }, (_, i) => (px[i * 4 + 3] ?? 0) > 0 ? 1 : 0))

describe('D234 colored Arms', () => {
  it('retains all 460 published 2.14.0 frames and their exact RGBA bytes', () => {
    const index = JSON.parse(readFileSync(new URL('../../../../packages/art/gear/atlas.json', import.meta.url), 'utf8')) as { frames: Record<string, unknown> }
    expect(sha(JSON.stringify(Object.entries(index.frames).slice(0, 460)))).toBe(baseline.frames)
    const png = readFileSync(new URL('../../../../packages/art/gear/atlas.png', import.meta.url)), chunks: Buffer[] = []
    for (let at = 8; at < png.length;) {
      const n = png.readUInt32BE(at)
      if (png.toString('ascii', at + 4, at + 8) === 'IDAT') chunks.push(png.subarray(at + 8, at + 8 + n))
      at += n + 12
    }
    const raw = inflateSync(Buffer.concat(chunks)), px = Buffer.alloc(320 * baseline.height * 4)
    for (let y = 0; y < baseline.height; y++) {
      expect(raw[y * 1281]).toBe(0)
      px.set(raw.subarray(y * 1281 + 1, (y + 1) * 1281), y * 1280)
    }
    for (let r = 0; r < 46; r++) expect(sha(px.subarray(r * 40960, (r + 1) * 40960)), GEAR[r]!.type.type).toBe(baseline.rows[r])
  })

  it('appends the five Arms, then their Orbs, in their own colors', () => {
    expect(GEAR.slice(46).map((r) => r.type.type)).toEqual([...ARM_IDS.map((a) => `${a}-hue`), ...ARM_IDS.map((a) => `orb-${a}-hue`)])
  })

  for (const arm of ARM_IDS) it(`${arm}: the plain silhouette at every grade, recolored, and distinct from the other Arms`, () => {
    for (let g = 0; g < 10; g++) {
      for (const [plain, hued] of [[arm, `${arm}-hue`], [`orb-${arm}`, `orb-${arm}-hue`]] as const) {
        const a = drawGearIcon(row(plain).icons[g]!), b = drawGearIcon(row(hued).icons[g]!)
        if (arm !== 'bow' || g >= 2 || plain.startsWith('orb-')) expect(mask(b), `${hued} g${g + 1}`).toBe(mask(a))
        expect(sha(b), `${hued} g${g + 1}`).not.toBe(sha(a))
      }
    }
  })

  it('tells the five colored Arms apart at every grade', () => {
    for (let g = 0; g < 10; g++) {
      const hues = ARM_IDS.map((a) => sha(drawGearIcon(row(`${a}-hue`).icons[g]!)))
      expect(new Set(hues).size).toBe(5)
    }
  })
})
