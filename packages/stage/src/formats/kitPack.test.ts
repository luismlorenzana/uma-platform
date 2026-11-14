import { describe, expect, it } from 'vitest'
import { parseKitPack, pieceRole, wallSockets, type KitPack } from './kitPack.js'

const pack = (): KitPack => ({
  formatVersion: 2, id: 'kit-pack-village', grid: 2, storey: 3.12, pixel: { texels: 64, levels: 24 },
  glb: { path: 'kit.0123456789abcdef.glb', bytes: 1000, sha256: '0123456789abcdef'.repeat(4) },
  pieces: {
    Wall_Plaster_Window_Wide_Flat: { role: 'wall', kind: '3d', footprint: { w: 1, d: 1 }, height: 3.12, bounds: [-1, 0, -0.2, 1, 3.12, 0.1], sockets: [{ piece: 'Window_Wide_Flat1' }], source: { kit: 'quaternius-village', file: 'Wall_Plaster_Window_Wide_Flat.gltf', licence: 'CC0-1.0' } },
    Window_Wide_Flat1: { role: 'window', kind: '3d', footprint: { w: 1, d: 1 }, height: 1.4, bounds: [-0.7, 1, -0.1, 0.7, 2.4, 0.1], source: { kit: 'quaternius-village', file: 'Window_Wide_Flat1.gltf', licence: 'CC0-1.0' } },
  },
})

describe('kit format v2', () => {
  it('reads a pack: its glb, grid, storey, pixel scale and pieces with their sockets', () => {
    const p = parseKitPack(JSON.parse(JSON.stringify(pack())))
    expect(p.pieces.Wall_Plaster_Window_Wide_Flat!.sockets).toEqual([{ piece: 'Window_Wide_Flat1' }])
    expect(p.storey).toBe(3.12)
  })
  it('refuses a socket to a piece the pack lacks, a glb whose name hides its hash, and bounds out of order', () => {
    const missing = pack(); missing.pieces.Wall_Plaster_Window_Wide_Flat!.sockets = [{ piece: 'Window_Thin_Round1' }]
    expect(() => parseKitPack(missing)).toThrow(/no piece Window_Thin_Round1/)
    const hidden = pack(); hidden.glb.path = 'kit.fedcba9876543210.glb'
    expect(() => parseKitPack(hidden)).toThrow(/carry its hash/)
    const flipped = pack(); flipped.pieces.Window_Wide_Flat1!.bounds = [1, 0, 0, -1, 1, 1]
    expect(() => parseKitPack(flipped)).toThrow(/min before max/)
  })
  it('refuses a wrong version, id or grid', () => {
    expect(() => parseKitPack({ ...pack(), formatVersion: 1 })).toThrow(/formatVersion/)
    expect(() => parseKitPack({ ...pack(), id: 'village' })).toThrow(/kit-pack-/)
    expect(() => parseKitPack({ ...pack(), grid: 4 })).toThrow(/grid/)
  })
})

describe('the importer’s defaults by the kits’ naming', () => {
  it('names each piece’s role', () => {
    expect(['Wall_UnevenBrick_Straight', 'Window_Wide_Round1', 'WindowShutters_Wide_Flat_Open', 'Door_1_Round', 'Roof_RoundTiles_8x8', 'Roof_Front_Brick8', 'Prop_Chimney', 'Prop_Crate', 'CommonTree_2', 'Pine_4', 'Flower_3_Group'].map(pieceRole))
      .toEqual(['wall', 'window', 'shutter', 'door', 'roof', 'gable', 'chimney', 'prop', 'tree', 'tree', 'flower'])
  })
  it('sets a window into a window wall and hangs a door 0.53 m along a door wall, when the pack has them', () => {
    const has = (n: string) => ['Window_Wide_Round1', 'Door_1_Round'].includes(n)
    expect(wallSockets('Wall_Plaster_Window_Wide_Round', has)).toEqual([{ piece: 'Window_Wide_Round1' }])
    expect(wallSockets('Wall_UnevenBrick_Door_Round', has)).toEqual([{ piece: 'Door_1_Round', offset: [-0.53, 0, 0] }])
    expect(wallSockets('Wall_Plaster_Window_Wide_Flat', has)).toEqual([])
  })
})
