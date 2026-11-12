// ST2's taps (uma-farm F57's ask 8, FR9): a tap answers with what's drawn under it, nearest first, on either layout.
import { describe, expect, it } from 'vitest'
import { farmGeometry } from '../world/farm.js'
import { SAMPLE_FARM } from '../world/farmSample.js'
import { standInFarmAtlas } from '../world/standInFarm.js'
import { cardQuad, farmTargets, pickAt, project, rayAt, tileQuad, type PickTarget, type View } from './pick.js'
import { stageLayout, toStage } from './turn.js'

const kit = standInFarmAtlas()
const world = farmGeometry(SAMPLE_FARM, kit)
const targets = farmTargets(SAMPLE_FARM.markers, world, kit)
/** A portrait phone at 3×, looking at the sample's middle. */
const view: View = { look: { x: 4.5, y: 1, z: 9 }, width: 393, height: 852, ratio: 3 }
const at = (p: { x: number; y: number; z: number }) => project(view, p)
const DORM_SLOT = { kind: 'slot', id: 'dorm-1', x: 8, z: 14 }
const first = (x: number, y: number, extra: PickTarget[] = []) => pickAt(view, x, y, [...extra, ...targets])[0]?.ref

describe('projection', () => {
  it("puts the look point at the stage's middle, a tile 73 device px deep and 128 wide", () => {
    expect(at(view.look).x).toBeCloseTo(196.5)
    expect(at(view.look).y).toBeCloseTo(426)
    expect(at({ x: 5.5, y: 1, z: 9 }).x - 196.5).toBeCloseTo(128 / 3)
    expect(at({ x: 4.5, y: 1, z: 10 }).y - 426).toBeCloseTo((128 * Math.sin((35 * Math.PI) / 180)) / 3)
  })

  it("casts a stage point's ray back through where it projected", () => {
    const p = { x: 2.25, y: 1, z: 7.5 }, s = at(p), ray = rayAt(view, s.x, s.y)
    const t = (ray.origin.y - p.y) / -ray.dir.y
    expect(ray.origin.x + ray.dir.x * t).toBeCloseTo(p.x)
    expect(ray.origin.z + ray.dir.z * t).toBeCloseTo(p.z)
  })
})

describe('tap picking (F57 ask 8)', () => {
  it("answers a slot's tile with its marker", () => {
    const s = at({ x: 8.5, y: 1, z: 14.3 })
    expect(first(s.x, s.y)).toEqual({ kind: 'marker', marker: DORM_SLOT })
  })

  it('answers what stands in front: a building hides the ground behind it from the 35° camera', () => {
    // The Warehouse's roof (one storey, its ridge 3 levels up) hides about four tiles of ground behind it; a two-storey
    // building, about seven.
    const s = at({ x: 4.5, y: 1, z: 10.8 })
    expect(first(s.x, s.y)).toEqual({ kind: 'building', id: 'warehouse' })
    expect(pickAt(view, s.x, s.y, targets).map((h) => h.ref.kind)).toContain('marker')
  })

  it('answers a building by its front or its roof, and by a piece mounted on it', () => {
    const front = at({ x: 7.5, y: 2, z: 6 })
    expect(first(front.x, front.y)).toEqual({ kind: 'building', id: 'barn' })
    const roof = at({ x: 7.5, y: 5.5, z: 5.5 })
    expect(first(roof.x, roof.y)).toEqual({ kind: 'building', id: 'barn' })
    const box = at({ x: 8.5, y: 1.8, z: 14.03 })
    expect(first(box.x, box.y)).toEqual({ kind: 'building', id: 'dorm' })
  })

  it('answers a prop standing in front of what is behind it', () => {
    const awning = at({ x: 2.5, y: 1.8, z: 22.5 })
    expect(first(awning.x, awning.y)).toEqual({ kind: 'prop', name: 'stall-awning', tile: { x: 2, z: 22 } })
    const above = at({ x: 2.5, y: 2.9, z: 22 })
    expect(first(above.x, above.y)).toEqual({ kind: 'building', id: 'shop' })
  })

  it('answers a figure over the slot she stands on, and lists what lies under her', () => {
    const uma: PickTarget = { ref: { kind: 'figure', id: 'uma-1' }, quad: cardQuad({ x: 8.5, y: 1, z: 14.5 }, 112, 200), bias: 0.05 }
    const s = at({ x: 8.5, y: 1.6, z: 14.5 })
    expect(pickAt(view, s.x, s.y, [uma, ...targets]).map((h) => h.ref)).toEqual([{ kind: 'figure', id: 'uma-1' }, { kind: 'building', id: 'dorm' }])
    const feet = at({ x: 8.5, y: 1, z: 14.8 })
    expect(first(feet.x, feet.y, [uma])).toEqual({ kind: 'marker', marker: DORM_SLOT })
  })

  it('answers nothing off the farm', () => expect(pickAt(view, 2, 2, [{ ref: { kind: 'figure', id: 'x' }, quad: tileQuad(4, 9, 1) }])).toEqual([]))

  it('picks the same on the turned layout, through toStage', () => {
    const turned = stageLayout(393, 852, undefined, 'landscape')
    const landscapeView: View = { ...view, width: turned.width, height: turned.height }
    const p = { x: 8.5, y: 1, z: 14.3 }, s = project(landscapeView, p)
    // A touch on the upright phone, where the turned stage shows that point.
    const client = { x: turned.viewportWidth - s.y, y: s.x }
    const stage = toStage(turned, client.x, client.y)
    expect(pickAt(landscapeView, stage.x, stage.y, targets)[0]?.ref).toEqual({ kind: 'marker', marker: DORM_SLOT })
  })
})
