// ST2's farm openings in the formats (uma-farm F57's asks 5 and 6): the `farm` kit kind, sets, two-column doors, and the
// farm design.
import { describe, expect, it } from 'vitest'
import { SAMPLE_FARM } from '../world/farmSample.js'
import { standInKitAtlas } from '../world/standInKit.js'
import { farmGrid, farmReach, parseFarmDesign, type FarmDesign } from './farm.js'
import { familyVariants, FARM_WAVE_1, FARM_WAVE_2, KIT_REQUIRED, kitMissing, kitVariants, parseKitAtlas, type KitAtlas } from './kit.js'

const farmKit = (): KitAtlas => standInKitAtlas('farm')
const sample = (): FarmDesign => structuredClone(SAMPLE_FARM)

describe('the farm kit kind (F57 ask 5, KF1, KF12)', () => {
  it("requires wave 1's 87 names and the six roles; wave 2's 30 when asked", () => {
    expect(FARM_WAVE_1).toHaveLength(87)
    expect(FARM_WAVE_2).toHaveLength(30)
    expect(new Set([...FARM_WAVE_1, ...FARM_WAVE_2]).size).toBe(117)
    expect(KIT_REQUIRED.farm.filter((n) => n.endsWith('*'))).toEqual(['floor*', 'riser*', 'building-wall*', 'window*', 'door*', 'roof*'])
    const kit = farmKit()
    expect(kitMissing(kit)).toEqual([])
    expect(kitMissing(kit, FARM_WAVE_2)).toEqual([])
    const short = farmKit()
    delete short.frames['crop-gourd']
    delete short.frames.anvil
    expect(kitMissing(short)).toEqual(['crop-gourd'])
    expect(kitMissing(short, FARM_WAVE_2)).toEqual(['crop-gourd', 'anvil'])
  })

  it('parses the stand-in farm kit, sets and all', () => {
    const kit = farmKit()
    expect(parseKitAtlas(structuredClone(kit))).toEqual(kit)
    expect(kit.frames['building-wall-plank-1']!.set).toBe('plank')
    expect(kit.frames['roof-thatch-2']!.set).toBe('thatch')
    expect(kit.frames['door-shop']!.set).toBe('plaster')
  })

  it('puts a set only on building pieces, as a kebab id', () => {
    const onProp = farmKit(); onProp.frames.barrel!.set = 'plank'
    expect(() => parseKitAtlas(onProp)).toThrow('belong to a set')
    const bad = farmKit(); bad.frames['roof-red-1']!.set = 'Red Tiles'
    expect(() => parseKitAtlas(bad)).toThrow('kebab-case set')
  })

  it('takes doors 128 or 256 wide, and nothing else', () => {
    expect(farmKit().frames['door-wide-plank']).toMatchObject({ w: 256, h: 256 })
    const odd = farmKit(); odd.frames['door-plank']!.w = 192
    expect(() => parseKitAtlas(odd)).toThrow('a door is 128 or 256 × 256')
  })

  it('picks within a set, and ground by family', () => {
    const kit = farmKit()
    expect(kitVariants(kit, 'roof', 'slate').map((v) => v.name)).toEqual(['roof-slate-1', 'roof-slate-2'])
    expect(kitVariants(kit, 'door', 'plaster').map((v) => v.name)).toEqual(['door-plaster', 'door-shop'])
    expect(kitVariants(kit, 'roof')).toHaveLength(8)
    expect(familyVariants(kit, 'grass').map((v) => v.name)).toEqual(['grass-1', 'grass-2', 'grass-3', 'grass-4'])
    expect(familyVariants(kit, 'riser-grass').map((v) => v.name)).toEqual(['riser-grass-1', 'riser-grass-2'])
  })

  it("leaves uma-quest's kinds as they were", () => {
    expect(kitMissing(standInKitAtlas('biome'))).toEqual([])
    expect(kitMissing(standInKitAtlas('town'))).toEqual([])
    expect(Object.values(standInKitAtlas('town').frames).some((f) => f.set)).toBe(false)
  })
})

describe('the farm design (F57 ask 6, KF2)', () => {
  it('parses the sample band as it is', () => expect(parseFarmDesign(sample())).toEqual(SAMPLE_FARM))

  it('reads ground, levels and what walks', () => {
    const g = farmGrid(SAMPLE_FARM)
    expect([g.w, g.d]).toEqual([9, 25])
    expect(g.ground(0, 8)).toBe('water')
    expect(g.level(0, 8)).toBe(0)
    expect(g.walkable(0, 8)).toBe(false)
    expect(g.walkable(3, 0)).toBe(false)
    expect(g.building(3, 0)).toBe('mill')
    expect(g.walkable(4, 3)).toBe(true)
  })

  it('reaches every slot from the gate', () => {
    const reach = farmReach(SAMPLE_FARM)
    for (const m of SAMPLE_FARM.markers.filter((x) => x.kind === 'slot')) expect(reach.has(`${m.x},${m.z}`)).toBe(true)
  })

  it('holds a farm to 9 tiles across and 48 deep', () => {
    const wide = sample(); wide.cells = wide.cells.map((r) => `${r}g`); delete wide.heights
    expect(() => parseFarmDesign(wide)).toThrow('3–9')
    const deep = sample(); deep.cells = Array.from({ length: 49 }, () => 'ggggggggg'); delete deep.heights; deep.buildings = []; deep.markers = []; delete deep.props
    expect(() => parseFarmDesign(deep)).toThrow('at most 48')
  })

  it('checks buildings: on level ground, apart, their doors and mounts inside them', () => {
    const wet = sample(); wet.buildings[0] = { ...wet.buildings[0]!, x: 0, z: 8 }
    expect(() => parseFarmDesign(wet)).toThrow('level ground')
    const overlap = sample(); overlap.buildings[1] = { ...overlap.buildings[1]!, z: 1 }
    expect(() => parseFarmDesign(overlap)).toThrow()
    const wideDoor = sample(); wideDoor.buildings[2]!.door = { column: 2, wide: true }
    expect(() => parseFarmDesign(wideDoor)).toThrow('door.column')
    const high = sample(); high.buildings[0]!.mounts[0]!.level = 3
    expect(() => parseFarmDesign(high)).toThrow('0–2 in quarters')
    const odd = sample(); odd.buildings[0]!.mounts[0]!.level = 1.1
    expect(() => parseFarmDesign(odd)).toThrow('in quarters')
    const doorless = sample(); doorless.buildings[0]!.door = null
    expect(parseFarmDesign(doorless).buildings[0]!.door).toBeNull()
    const twin = sample(); twin.buildings[1]!.id = 'mill'
    expect(() => parseFarmDesign(twin)).toThrow('distinct ids')
  })

  it('checks markers: on walkable ground, their own ids, slots reachable from a gate', () => {
    const wet = sample(); wet.markers.push({ kind: 'slot', id: 'swim', x: 0, z: 8 })
    expect(() => parseFarmDesign(wet)).toThrow('walkable ground')
    const twice = sample(); twice.markers.push({ kind: 'slot', id: 'mill-1', x: 4, z: 3 })
    expect(() => parseFarmDesign(twice)).toThrow("a slot marker's id is its own")
    const gateless = sample(); gateless.markers = gateless.markers.filter((m) => m.kind !== 'gate')
    expect(() => parseFarmDesign(gateless)).toThrow('need a gate')
    const walled = sample(); walled.cells[15] = 'wwwwpwwww'; walled.cells[14] = 'wwwwwwwww'; walled.heights![14] = '000000000'
    walled.markers = walled.markers.filter((m) => m.z !== 14)
    walled.buildings = walled.buildings.filter((b) => b.z !== 12)
    expect(() => parseFarmDesign(walled)).toThrow('not reachable from the gate')
  })

  it('lets a prop stand anywhere but under a building (a dock over water)', () => {
    expect(parseFarmDesign(sample()).props!.find((p) => p.name === 'dock')).toEqual({ name: 'dock', x: 1, z: 9 })
    const under = sample(); under.props!.push({ name: 'barrel', x: 3, z: 0 })
    expect(() => parseFarmDesign(under)).toThrow('where no building does')
  })
})
