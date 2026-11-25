import { describe, expect, it } from 'vitest'
import { characterAtlasLayout } from './character-sprite-pack'

describe('native atlas layout', () => {
  it.each([[64, 88, 512], [96, 132, 768], [128, 176, 1024]])('fits %d × %d with padding', (width, height, edge) => {
    const layout = characterAtlasLayout({ width, height }, { x: width / 2, y: height - 4 }, 32)
    expect(layout.edge).toBe(edge)
    expect(layout.pitch).toEqual({ x: width + 2, y: height + 2 })
    expect(layout.columns * Math.floor(edge / layout.pitch.y)).toBeGreaterThanOrEqual(32)
  })
  it('rejects non-native coordinates, outside anchors and pages that will not fit', () => {
    expect(() => characterAtlasLayout({ width: 128, height: 176 }, { x: 128, y: 88 }, 32)).toThrow()
    expect(() => characterAtlasLayout({ width: 128, height: 176 }, { x: 64, y: 168 }, 50)).toThrow()
    expect(() => characterAtlasLayout({ width: 95.5, height: 132 }, { x: 48, y: 126 }, 32)).toThrow()
  })
})
