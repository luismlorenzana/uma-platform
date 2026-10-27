// Arch pips (0.15.0): a place may hang its slot pips over its building's top in a half arch, 28 pt, each with a short
// tag on her lower left; its Ready badge moves to the building's foot. Rows under the name stay the default.
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import { ARCH_PIP, archSpots, type PipModel } from './Pips.js'
import { PlaceTargets, type TargetModel } from './PlaceTargets.js'

const PIPS: PipModel[] = [
  { state: 'busy', progress: 0.5, face: <i data-face="a" />, badge: '12' },
  { state: 'ready', face: <i data-face="b" />, badge: '46', queued: 2 },
  { state: 'busy', progress: 0.1, face: <i data-face="c" /> },
  { state: 'free' },
]
const place = (more: Partial<TargetModel>): TargetModel => ({ id: 'mine', name: 'Mine', at: { x: 0.2, y: 0.1 }, to: '/wilds/mine', label: 'Mine', pips: PIPS, ...more })
const html = (target: TargetModel) => renderToStaticMarkup(<MemoryRouter><PlaceTargets places={[target]} /></MemoryRouter>)

describe('arch pips (0.15.0)', () => {
  it('rings a building’s top, left to right and mirrored, the middle two above the roof', () => {
    const spots = archSpots(4, 72, 66)
    expect(spots.map((s) => s.x)).toEqual([...spots.map((s) => s.x)].sort((a, b) => a - b))
    expect(spots[0]!.x + spots[3]!.x).toBe(72)
    expect(spots[0]!.y).toBe(spots[3]!.y)
    expect(spots[1]!.y).toBeLessThan(spots[0]!.y)
    expect(spots[1]!.y - ARCH_PIP / 2).toBeLessThan(0)
    // Neighbours don't overlap.
    for (let i = 1; i < 4; i += 1) expect(Math.hypot(spots[i]!.x - spots[i - 1]!.x, spots[i]!.y - spots[i - 1]!.y)).toBeGreaterThanOrEqual(ARCH_PIP)
  })

  it('draws the arch inside the building with tags, and moves the Ready badge to its foot', () => {
    const arch = html(place({ pipsAt: 'arch', ready: 'Ready' }))
    expect(arch).toContain('data-pips="arch"')
    expect(arch.match(/data-pip="(busy|ready|free)"/g)).toHaveLength(4)
    expect(arch.match(/data-pip-badge/g)).toHaveLength(2)
    expect(arch).toContain('>46<')
    expect(arch).toContain('>+2<')
    expect(/<span[^>]*data-ready-badge[^>]*>/.exec(arch)?.[0]).toContain('bottom-0.5')
    expect(arch).toContain('size-7')
  })

  it('keeps rows under the name by default', () => {
    const below = html(place({ ready: 'Ready' }))
    expect(below).toContain('data-pips="true"')
    expect(below).not.toContain('data-pips="arch"')
    expect(/<span[^>]*data-ready-badge[^>]*>/.exec(below)?.[0]).toContain('-top-1')
  })
})
