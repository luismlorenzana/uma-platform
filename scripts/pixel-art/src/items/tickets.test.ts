import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { encodePng } from '../png.ts'
import { hash, savedAtlas } from '../testing/atlas.ts'
import baseline from '../ui/legacy-2.6.0.json'
import { speedTicketItem } from './tickets.ts'

describe('A02 appended utility item', () => {
  it('keeps every published item position, metadata field and RGBA byte', () => {
    const { img, index } = savedAtlas('items'), old = baseline.items
    expect([index.width, index.height, index.cell]).toEqual([320, 1056, 32])
    expect(Object.keys(index.frames)).toHaveLength(321)
    const retained = Object.fromEntries(Object.keys(old.frames).map(id => [id, index.frames[id]]))
    expect(hash(JSON.stringify(retained))).toBe(old.metadata)
    for (const [id, bounds] of Object.entries(old.frames)) {
      const f = index.frames[id]!
      expect([f.x, f.y, index.cell, index.cell], id).toEqual(bounds)
    }
    expect(hash(img.crop(0, 0, old.width, old.height).px)).toBe(old.rgba)
  })

  it('appends one ungraded 32px Speed Ticket and matches the item painter and standalone file', () => {
    const { img, index } = savedAtlas('items'), frame = index.frames['speed-ticket']!
    expect(frame).toEqual({ x: 0, y: 1024, name: 'Speed Ticket', kind: 'ticket' })
    const a = speedTicketItem(), b = speedTicketItem()
    expect(hash(a)).toBe(hash(b))
    expect(hash(img.crop(frame.x, frame.y, 32, 32).px)).toBe(hash(a))
    expect(readFileSync(new URL('../../../../assets/items/tickets/speed-ticket.png', import.meta.url)).equals(encodePng(32, 32, a))).toBe(true)
    for (let i = 0; i < 32; i++) for (const [x, y] of [[i, 0], [0, i], [31, i], [i, 31]] as const) expect(a[(y * 32 + x) * 4 + 3]).toBe(0)
  })
})
