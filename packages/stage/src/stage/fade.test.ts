// ST3 (uma-farm F11's stage request): the occluder fade and fit-to-width.
import { BufferGeometry, Mesh, Texture } from 'three'
import { describe, expect, it } from 'vitest'
import { buildWorld, buildWorldParts } from '../world/build.js'
import { farmGeometry } from '../world/farm.js'
import { SAMPLE_FARM } from '../world/farmSample.js'
import { standInFarmAtlas } from '../world/standInFarmAtlas.js'
import { boxOf, coveringOccluders, FADE_DEFAULTS, farmOccluders, figureFilter, figureTarget, fitScale, markerTarget, propPart, stepFade, upOf } from './fade.js'
import { project, type View } from './pick.js'

const kit = standInFarmAtlas()
const world = farmGeometry(SAMPLE_FARM, kit)
const occluders = farmOccluders(world, kit)
const marker = (id: string) => { const m = SAMPLE_FARM.markers.find((x) => x.id === id)!; return markerTarget(m, world.grid.level(m.x, m.z)) }
const figure = (x: number, z: number) => figureTarget({ x, y: 1, z }, 112, 200, { x, y: 1 + 2.15, z })

describe('the occluder fade (ST3)', () => {
  it('is off unless asked, at 0.35 over 150 ms for slots, gates and lots', () => {
    expect(FADE_DEFAULTS).toEqual({ opacity: 0.35, markers: ['slot', 'gate', 'lot'], ms: 150 })
  })

  it("reads boxes on the camera's plane: up is y·cos − z·sin", () => {
    expect(upOf({ x: 0, y: 1, z: 0 })).toBeCloseTo(Math.cos((35 * Math.PI) / 180))
    expect(boxOf([{ x: 0, y: 0, z: 0 }, { x: 2, y: 1, z: 0 }])).toMatchObject({ x0: 0, x1: 2, u0: 0 })
  })

  it('fades each building (with its mounted pieces) and each blocking prop on its own', () => {
    expect(occluders.filter((o) => !o.id.startsWith('prop:')).map((o) => o.id)).toEqual(world.buildings.map((b) => b.id))
    expect(occluders.filter((o) => o.id.startsWith('prop:'))).toHaveLength(world.props.filter((p) => p.blocks && !p.owner).length)
    // The Mill's sails reach past its walls, so its box does too.
    const mill = occluders.find((o) => o.id === 'mill')!, front = boxOf(world.buildings[0]!.front)
    expect(mill.box.x1 - mill.box.x0).toBeGreaterThan(front.x1 - front.x0)
  })

  it('fades a building that covers a slot behind it, and nothing over a slot in plain view', () => {
    expect(coveringOccluders(occluders, [marker('smokehouse-1')])).toContain('warehouse')
    expect(coveringOccluders(occluders, [marker('farmhouse-1')])).toContain('shop')
    expect(coveringOccluders(occluders, [marker('dorm-1')]).size).toBe(0)
  })

  it('fades the roof in front of a figure, never one she stands in front of', () => {
    expect(coveringOccluders(occluders, [figure(2.5, 18.5)])).toContain('shop')
    expect(coveringOccluders(occluders, [figure(1.5, 22.5)]).has('shop')).toBe(false)
  })

  it('fades a blocking prop in front of a target too', () => {
    const lantern = world.props.findIndex((p) => p.frame === 'lantern')
    expect(coveringOccluders(occluders, [figure(world.props[lantern]!.foot.x, 23.6)])).toContain(propPart(lantern))
  })

  it('eases over the duration, both ways, and at once with reduced motion', () => {
    const o = { opacity: 0.35, ms: 150 }
    expect(stepFade(1, 0.35, 0.075, o)).toBeCloseTo(0.675)
    expect(stepFade(0.675, 0.35, 0.075, o)).toBeCloseTo(0.35)
    expect(stepFade(0.35, 1, 0.2, o)).toBe(1)
    expect(stepFade(1, 0.35, 0.001, { ...o, instant: true })).toBe(0.35)
  })

  it('builds the parts apart, drawing the same quads as the merged world', () => {
    const page = new Texture()
    const verts = (g: { traverse: (f: (o: unknown) => void) => void }) => {
      let n = 0
      g.traverse((o) => { const m = o as Mesh<BufferGeometry>; if (m.isMesh) n += m.geometry.getAttribute('position').count })
      return n
    }
    const merged = buildWorld(world, kit, [page])
    const { shared, parts } = buildWorldParts(world, kit, [page], (item) => (item.kind === 'face' ? item.face.owner ?? null
      : item.prop.owner ?? (item.prop.blocks ? propPart(item.index) : null)))
    expect(parts.size).toBe(occluders.length)
    expect(verts(shared) + [...parts.values()].reduce((s, g) => s + verts(g), 0)).toBe(verts(merged))
    const meshes = [...parts.get('barn')!.children] as Mesh[]
    expect(new Set(meshes.map((m) => m.material)).size).toBe(meshes.length)
  })
})

describe('fit-to-width (ST3)', () => {
  it('scales a 9-tile farm down to a 2× phone, never up', () => {
    expect(fitScale(750, 9)).toBeCloseTo(750 / 1152)
    expect(fitScale(828, 9)).toBeCloseTo(0.71875)
    expect(fitScale(1179, 9)).toBe(1)
    expect(fitScale(2400, 9)).toBe(1)
  })

  it('shows all 9 tiles across a 375 pt screen at 2×', () => {
    const scale = fitScale(750, 9)
    const view: View = { look: { x: 4.5, y: 1, z: 10 }, width: 375, height: 812, ratio: 2, scale }
    expect(project(view, { x: 0, y: 1, z: 10 }).x).toBeCloseTo(0)
    expect(project(view, { x: 9, y: 1, z: 10 }).x).toBeCloseTo(375)
    const unscaled = project({ ...view, scale: 1 }, { x: 0, y: 1, z: 10 }).x
    expect(unscaled).toBeLessThan(-50)
  })
})

describe("ST4: which figures count for the fade", () => {
  const her = { id: 'ready-1', tile: { x: 4, z: 2 }, moving: false }
  it('takes ids, or any test of her id, tile and walking', () => {
    expect(figureFilter(['ready-1'])(her)).toBe(true)
    expect(figureFilter(['ready-2'])(her)).toBe(false)
    expect(figureFilter([])(her)).toBe(false)
    expect(figureFilter((f) => f.tile.z < 4 && !f.moving)(her)).toBe(true)
    expect(figureFilter((f) => f.moving)(her)).toBe(false)
  })
  it("leaves a roof whole when the figure behind it doesn't count", () => {
    const occluders = farmOccluders(world, kit)
    const behind = figureTarget({ x: 4.5, y: 1, z: 2.5 }, 112, 200, { x: 4.5, y: 3.15, z: 2.5 })
    const figures = [{ ...her, target: behind }]
    const covering = (count: (f: typeof her) => boolean) => coveringOccluders(occluders, figures.filter(count).map((f) => f.target))
    expect(covering(figureFilter(['ready-1']))).toContain('sawmill')
    expect(covering(figureFilter(['someone-else'])).size).toBe(0)
  })
})
