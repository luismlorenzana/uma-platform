// kit-farm wave 1 (uma-farm F9, P147): the shipped atlas is the code's, every name is the contract's at its role, size,
// set, foot, blocking and light, uma-stage's parser takes it, floors meet in any order, props stand clear of their
// frame's edge, and every uma-art file published before is unchanged.
import { createHash } from 'node:crypto'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { FARM_WAVE_1, KIT_REQUIRED, kitMissing, parseKitAtlas } from '@luismlorenzana/uma-stage/formats'
import { describe, expect, it } from 'vitest'
import { pack, type Atlas } from './atlas.js'
import { drawWave, type DrawnFrame } from './farm/index.js'
import { WAVE_1 } from './farm/spec.js'
import legacy from './testing/legacy-2.26.0.json'
import { inflateSync } from 'node:zlib'

const ART = fileURLToPath(new URL('../../../packages/art/', import.meta.url))
/** Kits published after 2.26.0: kit-farm and the code-drawn kits since. */
const LATER = new Set(['kit-farm', 'kit-town-spellblade', 'kit-town-mage', 'kit-town-summoner', 'kit-town-healer', 'kit-meadow', 'kit-ruins', 'kit-marsh', 'kit-coast'])
const sha = (b: Uint8Array) => createHash('sha256').update(b).digest('hex')
const frames = drawWave()
const { atlas, rgba } = pack('kit-farm', frames)
const shipped = JSON.parse(readFileSync(join(ART, 'kit-farm/atlas.json'), 'utf8')) as Atlas

/** The generator's filter-0 RGBA PNG, decoded. */
function decode(png: Buffer): { w: number; h: number; px: Uint8Array } {
  const w = png.readUInt32BE(16), h = png.readUInt32BE(20), chunks: Buffer[] = []
  for (let at = 8; at < png.length;) { const n = png.readUInt32BE(at); if (png.toString('ascii', at + 4, at + 8) === 'IDAT') chunks.push(png.subarray(at + 8, at + 8 + n)); at += n + 12 }
  const raw = inflateSync(Buffer.concat(chunks)), px = new Uint8Array(w * h * 4)
  for (let y = 0; y < h; y++) px.set(raw.subarray(y * (w * 4 + 1) + 1, (y + 1) * (w * 4 + 1)), y * w * 4)
  return { w, h, px }
}
const frame = (name: string) => frames.find((f) => f.spec.name === name)!
const px = (f: DrawnFrame) => f.canvas.rgba8()
/** Mean difference between two runs of pixels (RGB). */
function diff(a: Uint8Array, ai: number[], b: Uint8Array, bi: number[]): number {
  let s = 0
  for (let k = 0; k < ai.length; k++) for (let c = 0; c < 3; c++) s += Math.abs(a[ai[k]! * 4 + c]! - b[bi[k]! * 4 + c]!)
  return s / (ai.length * 3)
}
const column = (w: number, h: number, x: number) => Array.from({ length: h }, (_, y) => y * w + x)
const row = (w: number, y: number) => Array.from({ length: w }, (_, x) => y * w + x)

describe('kit-farm wave 1 (F9, P147)', () => {
  it("holds wave 1's 87 names, in kit-farm.md §6's order, and nothing else", () => {
    expect(WAVE_1.map((f) => f.name)).toEqual([...FARM_WAVE_1])
    expect(Object.keys(shipped.frames)).toEqual([...FARM_WAVE_1])
  })

  it("is the code's: the shipped atlas.json and every pixel of atlas.png come from the drawing code", () => {
    expect(shipped).toEqual(atlas)
    const png = decode(readFileSync(join(ART, 'kit-farm/atlas.png')))
    expect([png.w, png.h]).toEqual([2048, 2048])
    expect(sha(png.px)).toBe(sha(rgba))
  })

  it("passes uma-stage's parser as a complete farm kit", () => {
    const parsed = parseKitAtlas(structuredClone(shipped))
    expect(parsed).toEqual(shipped)
    expect(kitMissing(parsed)).toEqual([])
    expect(KIT_REQUIRED.farm.length).toBe(93)
  })

  it('gives every frame its role, size, set, foot, blocking and light (KF3, KF8)', () => {
    const f = shipped.frames
    expect(f['door-wide-plank']).toMatchObject({ role: 'door', w: 256, h: 256, set: 'plank' })
    expect(f['door-shop']).toMatchObject({ role: 'door', w: 128, h: 256, set: 'plaster' })
    expect(f['roof-thatch-2']).toMatchObject({ role: 'roof', set: 'thatch' })
    expect(f['mill-sails']).toMatchObject({ role: 'sign', w: 384, h: 384, foot: { x: 192, y: 192 } })
    expect(f.chimney).toMatchObject({ role: 'sign', w: 64, h: 192 })
    expect(f['tree-1']).toMatchObject({ role: 'prop', w: 256, h: 384, blocks: true, foot: { x: 128, y: 378 } })
    expect(f.lantern).toMatchObject({ blocks: true, light: { color: '#ffc46b', radius: 4, flicker: true } })
    expect(f['gate-arch']).toMatchObject({ blocks: false })
    for (const [name, fr] of Object.entries(f)) {
      if (['building-wall', 'window', 'door', 'roof'].includes(fr.role)) expect(fr.set, name).toBeTruthy()
      else expect(fr.set, name).toBeUndefined()
      if (fr.role === 'prop' || fr.role === 'sign') expect(fr.foot, name).toBeDefined()
      if (fr.role === 'prop') expect(typeof fr.blocks, name).toBe('boolean')
    }
  })

  it('leaves 2 texels between frames, all on the page', () => {
    const rects = Object.values(shipped.frames)
    for (const a of rects) {
      expect(a.x + a.w).toBeLessThanOrEqual(2048); expect(a.y + a.h).toBeLessThanOrEqual(2048)
      for (const b of rects) if (a !== b) {
        const apart = a.x + a.w + 2 <= b.x || b.x + b.w + 2 <= a.x || a.y + a.h + 2 <= b.y || b.y + b.h + 2 <= a.y
        expect(apart).toBe(true)
      }
    }
  })

  it('draws floors that meet in any order, and walls, risers and roofs that meet their neighbours', { timeout: 60_000 }, () => {
    const families: [string[], 'x' | 'xy'][] = [
      [['grass-1', 'grass-2', 'grass-3', 'grass-4'], 'xy'], [['path-1', 'path-2'], 'xy'], [['tilled-1', 'tilled-2'], 'xy'],
      [['forest-floor-1', 'forest-floor-2'], 'xy'], [['water-1', 'water-2'], 'xy'], [['paving-1', 'paving-2'], 'xy'],
      [['riser-grass-1', 'riser-grass-2'], 'x'], [['riser-bank'], 'x'],
      [['building-wall-plank-1', 'building-wall-plank-2', 'window-plank-1', 'window-plank-2'], 'x'],
      [['building-wall-plaster-1', 'building-wall-plaster-2', 'window-plaster-1', 'window-plaster-2'], 'x'],
      ...['red', 'thatch', 'shingle', 'slate'].map((k): [string[], 'xy'] => [[`roof-${k}-1`, `roof-${k}-2`], 'xy']),
    ]
    for (const [names, axes] of families) for (const a of names) for (const b of names) {
      // A seam may differ as much as the tile's own joints do (boards, courses and setts repeat every 16 or 32 texels).
      const A = px(frame(a)), B = px(frame(b)), joints = [31, 63, 95]
      const across = Math.max(...joints.map((k) => diff(A, column(128, 128, k), A, column(128, 128, k + 1))))
      const down = Math.max(...joints.map((k) => diff(A, row(128, k), A, row(128, k + 1))))
      expect(diff(A, column(128, 128, 127), B, column(128, 128, 0)), `${a} | ${b}`).toBeLessThanOrEqual(across * 1.5 + 8)
      if (axes === 'xy') expect(diff(A, row(128, 127), B, row(128, 0)), `${a} over ${b}`).toBeLessThanOrEqual(down * 1.5 + 8)
    }
  })

  it('keeps every floor, wall and roof opaque, and every prop clear of its frame edge, standing on its foot', () => {
    const problems: string[] = []
    for (const f of frames) {
      const p = px(f), { w, h } = f.spec
      if (f.spec.role !== 'prop' && f.spec.role !== 'sign') {
        let clear = 0
        for (let i = 3; i < p.length; i += 4) if (p[i] !== 255) clear++
        if (clear) problems.push(`${f.spec.name}: ${clear} texels not opaque`)
        continue
      }
      // A fence's rails run edge to edge, so the next fence along joins it; everything else stands clear.
      const sides = f.spec.name.startsWith('fence') ? [] : [...column(w, h, 0), ...column(w, h, w - 1)]
      const touching = [...row(w, 0), ...row(w, h - 1), ...sides].filter((i) => p[i * 4 + 3] !== 0).length
      if (touching) problems.push(`${f.spec.name}: ${touching} texels on its edge`)
      if (f.spec.role === 'prop') {
        let lowest = 0
        for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (p[(y * w + x) * 4 + 3]! > 128) lowest = y
        if (lowest < f.spec.foot!.y - 8) problems.push(`${f.spec.name}: stands above its foot (${lowest})`)
      }
    }
    expect(problems).toEqual([])
  }, 60_000)

  it('draws the same pixels every run', () => {
    expect(sha(pack('kit-farm', drawWave()).rgba)).toBe(sha(rgba))
  }, 60_000)

  it('leaves every uma-art file published before byte-identical', () => {
    const now: Record<string, string> = {}
    const walk = (d: string) => {
      for (const f of readdirSync(d).sort()) {
        const p = join(d, f)
        if (statSync(p).isDirectory()) { if (!LATER.has(f) && f !== 'node_modules') walk(p) }
        else if (/\.(png|json)$/.test(f) && f !== 'package.json') now[relative(ART, p)] = sha(readFileSync(p))
      }
    }
    walk(ART)
    expect(now).toEqual(legacy)
  })
})
