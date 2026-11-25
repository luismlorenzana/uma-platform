import { describe, expect, it } from 'vitest'
import { atlasFigure } from './atlas-figure.js'

describe('lit native atlas figures', () => {
  it.each([[64, 88, 512], [96, 132, 768], [128, 176, 1024]])('keeps the planted foot and independent UVs at %d × %d', (width, height, edge) => {
    const image = {} as HTMLCanvasElement
    const cell = { width, height }
    const page = { width: edge, height: edge }
    const foot = { x: width / 2, y: Math.round(height * 84 / 88) }
    const one = atlasFigure(image, cell, page, foot, 1.85)
    const two = atlasFigure(image, cell, page, foot, 1.85)
    one.frame({ x: 1, y: 1 })
    two.frame({ x: width + 3, y: 1 })
    expect(one.actor.material.map).toBe(two.actor.material.map)
    expect(one.actor.customDepthMaterial).toMatchObject({ map: one.actor.material.map, alphaTest: one.actor.material.alphaTest, allowOverride: false })
    expect(one.actor.geometry.attributes.uv!.getX(0)).toBeCloseTo(1 / edge)
    expect(two.actor.geometry.attributes.uv!.getX(0)).toBeCloseTo((width + 3) / edge)
    one.actor.geometry.computeBoundingBox()
    expect(one.actor.geometry.boundingBox!.min.y).toBeCloseTo(-1.85 * (height - foot.y) / height)
    one.dispose()
    expect(two.actor.material.map!.image).toBe(image)
    two.dispose()
  })
})
