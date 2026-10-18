import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { GLINTS } from '../icon.ts'
import { encodePng } from '../png.ts'
import { Sprite } from '../sprite.ts'
import { hash, savedAtlas } from '../testing/atlas.ts'
import { gemAtlas } from './atlas.ts'
import { drawGem, paintGem, sunRayCount } from './paint.ts'
import { EFFECTS, GEM_SPECS, PAIRS, PLANETS } from './spec.ts'

describe('H29 Star Gems', () => {
  it('packs all 100 exact identities in RPG GEM_IDENTITIES order, 32px on 320×320', () => {
    const expected = [
      ...['hp', 'mp', 'atk', 'matk', 'def', 'mdef', 'speed', 'limit'].flatMap(e => Array.from({ length: 10 }, (_, i) => `gem-${e}-${i + 1}`)),
      ...['hp-def', 'def-mdef', 'mdef-mp', 'mp-matk', 'matk-atk', 'atk-speed', 'speed-limit', 'limit-hp'].flatMap(pair => [3, 7].map(g => `gem-${pair}-${g}`)),
      ...[4, 6, 8, 10].map(g => `gem-sun-${g}`),
    ]
    const { atlas, frames } = gemAtlas()
    expect(GEM_SPECS.map(s => s.id)).toEqual(expected)
    expect(Object.keys(frames)).toEqual(expected)
    expect(new Set(expected).size).toBe(100)
    expect([atlas.w, atlas.h]).toEqual([320, 320])
    GEM_SPECS.forEach((spec, i) => {
      const { id, ...meta } = spec
      expect(frames[id]).toEqual({ x: i % 10 * 32, y: Math.floor(i / 10) * 32, w: 32, h: 32, ...meta })
    })
    expect(GEM_SPECS.slice(90, 96).map(g => g.kind)).toEqual(Array(6).fill('bridge'))
    expect(GEM_SPECS.slice(96).map(g => g.grade)).toEqual([4, 6, 8, 10])
  })

  it('matches the saved index and every PNG pixel; paints/encodes repeatably', () => {
    const { atlas, frames } = gemAtlas(), saved = savedAtlas('gems')
    expect(JSON.parse(readFileSync(new URL('../../../../packages/art/gems/atlas.json', import.meta.url), 'utf8'))).toEqual({ schemaVersion: 1, width: 320, height: 320, frames })
    expect(hash(saved.img.px)).toBe(hash(atlas.px))
    for (const spec of GEM_SPECS) {
      const a = drawGem(spec), b = drawGem(spec), f = frames[spec.id]!
      expect(hash(a), spec.id).toBe(hash(b))
      expect(hash(atlas.crop(f.x, f.y, 32, 32).px), spec.id).toBe(hash(a))
      expect(encodePng(32, 32, a).equals(encodePng(32, 32, b))).toBe(true)
    }
  }, 20_000) // Exhaustive painting/encoding of 100 identities exceeds 5s on shared CI.

  it('gives every planet its own silhouette at every grade, and every grade its own art', () => {
    expect(Object.values(PLANETS).map(p => p.color)).toEqual(['#e8706a', '#6aa8ff', '#ff9a4d', '#c48bff', '#9fb4cc', '#5fd3c0', '#ffd84d', '#f0b8ff'])
    for (let grade = 1; grade <= 10; grade++) {
      const masks = GEM_SPECS.filter(g => g.kind === 'moon' && g.grade === grade).map(g => {
        const sprite = new Sprite(); paintGem(sprite, g)
        return hash(Uint8Array.from(sprite.mat, m => m >= 0 ? 1 : 0))
      })
      expect(new Set(masks).size, `G${grade}: silhouettes must differ without colours`).toBe(8)
    }
    for (const effect of EFFECTS) {
      const row = GEM_SPECS.filter(g => g.kind === 'moon' && g.effects[0] === effect)
      expect(new Set(row.map(g => hash(drawGem(g)))).size).toBe(10)
      const structure = (g: typeof row[number]) => {
        const s = new Sprite(); paintGem(s, g)
        return JSON.stringify({ ink: [...s.mat], tones: [...s.tone] })
      }
      for (const g of [4, 7, 8, 10]) expect(structure(row[g - 1]!)).not.toBe(structure(row[g - 2]!))
      // Rough and cut grades use only the planet ramp; all mounted grades really contain another material.
      for (const g of row) {
        const s = new Sprite(); paintGem(s, g)
        expect(s.ramps.length, g.id).toBe(g.grade < 7 ? 1 : 2)
      }
    }
  })

  it('draws twinned pair colours, larger metal-set G7 bridges, and progressively more Sun rays', () => {
    for (const pair of PAIRS) {
      const specs = GEM_SPECS.filter(g => g.kind === 'bridge' && g.effects[0] === pair[0])
      const sprites = specs.map(g => { const s = new Sprite(); paintGem(s, g); return s })
      expect(specs.map(g => g.grade)).toEqual([3, 7])
      expect(sprites[0]!.ramps).toHaveLength(2)
      expect(sprites[1]!.ramps.length).toBeGreaterThan(2)
      expect([...sprites[1]!.mat].filter(m => m >= 0).length).toBeGreaterThan([...sprites[0]!.mat].filter(m => m >= 0).length)
    }
    expect([4, 6, 8, 10].map(sunRayCount)).toEqual([4, 6, 8, 10])
    expect(new Set(GEM_SPECS.filter(g => g.kind === 'sun').map(g => hash(drawGem(g)))).size).toBe(4)
  })

  it('keeps the entire 9×9 corner and frame edges transparent, and legendary glints unobstructed', () => {
    for (const spec of GEM_SPECS) {
      const px = drawGem(spec)
      for (let y = 23; y < 32; y++) for (let x = 23; x < 32; x++) expect([...px.subarray((y * 32 + x) * 4, (y * 32 + x + 1) * 4)], spec.id).toEqual([0, 0, 0, 0])
      for (let i = 0; i < 32; i++) for (const [x, y] of [[i, 0], [0, i], [31, i], [i, 31]] as const) expect(px[(y * 32 + x) * 4 + 3], spec.id).toBe(0)
      for (const [x, y] of GLINTS) {
        if (spec.grade < 9) continue
        expect([...px.subarray((y * 32 + x) * 4, (y * 32 + x + 1) * 4)], spec.id).toEqual([255, 255, 255, 255])
      }
    }
  })
})
