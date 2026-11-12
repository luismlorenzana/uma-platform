// Test-only: a small invented sprite set in the format's shape (format.md §6–§7), with the actions the player and the
// field poses use. Rectangles are meaningless; no art.
import type { SpriteAction, SpriteFrame, SpriteSet } from '@luismlorenzana/uma-data'

const frame = (ms: number | null, extra: Partial<SpriteFrame> = {}): SpriteFrame => ({
  page: 0, x: 0, y: 0, w: 100, h: 200, dx: 78, dy: 40, ms, headLocked: false, hold: 'none', air: false, hit: { x: 128, y: 160 },
  bounds: { left: 78, right: 177, top: 40, bottom: 240, width: 100, height: 201 }, ...extra,
})
const action = (times: (number | null)[], loop: boolean, events: SpriteAction['events'] = {}, extra: Partial<SpriteFrame> = {}): SpriteAction =>
  ({ loop, events, frames: times.map((t) => frame(t, extra)) })

export function testSet(): SpriteSet {
  return {
    outfitId: 900102, revision: 1, profile: 'traveler', cell: 256, logicalCell: 64, foot: { x: 128, y: 240 },
    headBox: { x: 80, y: 30, w: 96, h: 100 }, faceBox: { x: 110, y: 100, w: 40, h: 30 }, hit: { x: 128, y: 160 },
    pages: [{ path: 'atlases/test.webp', width: 512, height: 512 }],
    faces: { 'blink-half': { page: 0, x: 300, y: 0, w: 40, h: 30, dx: 0, dy: 0, place: { x: 110, y: 100, w: 40, h: 30 } } },
    actions: {
      idle: action([220, 180, 220, 180], true, {}, { headLocked: true, headOffset: { x: 0, y: 0 } }),
      walk: action([110, 110, 110, 110, 110, 110], true, {}, { headLocked: true, headOffset: { x: 0, y: 0 } }),
      'walk-front': action([110, 110, 110, 110, 110, 110], true),
      'walk-back': action([110, 110, 110, 110, 110, 110], true),
      'walk-right': action([110, 110, 110, 110, 110, 110], true),
      run: action([75, 75, 75, 75, 75, 75], true),
      swing: action([160, 90, 60, 140, 120, 160], false, { impact: 3, repeat: [2, 3] }),
      cast: action([140, 140, 160, 160, 90, 180], false, { hold: [2, 3], release: 4 }),
      down: action([120, 140, 600], false, { hold: [2, 2] }),
      turnaround: { loop: false, events: {}, frames: (['front', 'back', 'left', 'right'] as const).map((view) => frame(null, { view })) },
    },
  }
}
