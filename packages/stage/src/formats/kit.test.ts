import { describe, expect, it } from 'vitest'
import { kitMissing, kitVariants, parseKitAtlas, pickVariant, type KitAtlas, type KitFrame } from './kit.js'

const tile = (x: number, role: KitFrame['role'], extra: Partial<KitFrame> = {}): KitFrame => ({ page: 0, x, y: 0, w: 128, h: 128, role, ...extra })
function biome(): KitAtlas {
  const prop = (x: number): KitFrame => ({ page: 0, x, y: 256, w: 128, h: 128, role: 'prop', foot: { x: 64, y: 120 }, blocks: true })
  return {
    formatVersion: 1, id: 'kit-forest', kind: 'biome', tile: 128, pages: [{ file: 'atlas.png', width: 2048, height: 2048 }],
    frames: {
      'floor-1': tile(0, 'floor', { weight: 3 }), 'floor-2': tile(128, 'floor'), 'wall-top': tile(256, 'wall-top'), 'riser-1': tile(384, 'riser'),
      stairs: tile(512, 'stairs'), 'wall-1': { page: 0, x: 640, y: 0, w: 128, h: 256, role: 'wall' },
      'chest-closed': prop(0), 'chest-open': prop(128), spring: prop(256), waystone: prop(384), 'stairs-down': prop(512), 'stairs-up': prop(640),
      lantern: { ...prop(768), light: { color: '#ffcc88', radius: 4, flicker: true } },
      'battle-ground': { page: 0, x: 0, y: 512, w: 1024, h: 256, role: 'battle-ground' },
      'battle-back': { page: 0, x: 0, y: 768, w: 2048, h: 512, role: 'battle-back' },
      'battle-mid-1': { page: 0, x: 0, y: 1280, w: 256, h: 256, role: 'battle-mid', foot: { x: 128, y: 250 } },
    },
  }
}

describe('kit atlases (Q5)', () => {
  it('parses a complete biome kit', () => expect(parseKitAtlas(structuredClone(biome()))).toEqual(biome()))
  it('lists what a kit lacks', () => {
    const k = biome()
    delete k.frames.spring
    delete k.frames['riser-1']
    expect(kitMissing(k)).toEqual(['riser*', 'spring'])
    expect(() => parseKitAtlas(k)).toThrow('missing riser*, spring')
  })
  it('checks sizes, pages, feet and lights', () => {
    const big = biome(); big.frames['floor-2'] = { ...tile(128, 'floor'), w: 64 }
    expect(() => parseKitAtlas(big)).toThrow('a floor is 128 × 128')
    const out = biome(); out.frames['floor-2'] = tile(2000, 'floor')
    expect(() => parseKitAtlas(out)).toThrow('leaves its page')
    const footless = biome(); delete footless.frames.waystone!.foot
    expect(() => parseKitAtlas(footless)).toThrow('needs its foot')
    const dim = biome(); dim.frames.lantern!.light = { color: 'yellow', radius: 4 }
    expect(() => parseKitAtlas(dim)).toThrow('#rrggbb')
  })
  it('picks a variant by position, the same every time, by weight', () => {
    const v = kitVariants(biome(), 'floor')
    expect(v).toEqual([{ name: 'floor-1', weight: 3 }, { name: 'floor-2', weight: 1 }])
    expect(pickVariant(v, 4, 7)).toBe(pickVariant(v, 4, 7))
    let ones = 0
    for (let x = 0; x < 40; x++) for (let z = 0; z < 40; z++) if (pickVariant(v, x, z) === 'floor-1') ones++
    expect(ones / 1600).toBeGreaterThan(0.65)
    expect(ones / 1600).toBeLessThan(0.85)
    expect(pickVariant([], 0, 0)).toBeNull()
  })
})
