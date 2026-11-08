import { expect, it } from 'vitest'
import { heldPlacement, projectPoint } from './held-placement.js'

it('keeps the grip fixed through every angle and places tomes in the other hand', () => {
  const prop = { grip: { x: 108, y: 64 }, scale: 1 }
  for (let angle = 0; angle < 360; angle += 15) {
    const frame = { grip: { x: 87, y: 171, angle }, off: { x: 151, y: 174 }, hold: 'front' }
    expect(projectPoint(prop.grip, prop.grip, heldPlacement(prop, frame, 'greatsword')!)).toEqual({ x: 87, y: 171 })
    expect(projectPoint(prop.grip, prop.grip, heldPlacement({ ...prop, scale: .55 }, frame, 'tome-fire')!)).toEqual(frame.off)
  }
})
it('maps an arbitrary drawn-bow nock exactly to the pulling hand, without reflecting', () => {
  const prop = { grip: { x: 45.1, y: 64.2 }, nock: { x: 112.7, y: 63.4 }, scale: 1 }
  for (const off of [{ x: 140, y: 155 }, { x: 99, y: 125 }, { x: 160, y: 181 }]) {
    const frame = { grip: { x: 80, y: 150, angle: 0 }, off, hold: 'front' }
    const p = heldPlacement(prop, frame, 'bow-drawn')!, mapped = projectPoint(prop.nock, prop.grip, p)
    expect(mapped.x).toBeCloseTo(off.x, 10); expect(mapped.y).toBeCloseTo(off.y, 10)
    expect(p.a * p.d - p.b * p.c).toBeGreaterThan(0)
  }
  expect(heldPlacement(prop, { hold: 'none' }, 'bow')).toBeNull()
})
