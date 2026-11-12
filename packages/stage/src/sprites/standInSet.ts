// The stand-in sets (Q6): five code-drawn travelers shaped as `SpriteSet`s, to the format's cell, foot and face box, so the
// player, the face layer and single file run before (or without) the published sets: offline, or a release with none.
// Every action shows one drawn pose; two eyelid patches let the blinks run. No Uma art.
import type { SpriteAction, SpriteFrame, SpriteSet } from '@luismlorenzana/uma-data'
import { standInCanvas } from '../stage/standIn.js'

const COATS = ['#d39a2b', '#4f86e8', '#c95b8a', '#3fae6e', '#9b6ad6'] as const
const FACE = { x: 108, y: 86, w: 40, h: 20 }

function frame(ms: number | null, locked: boolean, view?: string): SpriteFrame {
  return { page: 0, x: 0, y: 0, w: 256, h: 256, dx: 0, dy: 0, ms, headLocked: locked, ...(locked ? { headOffset: { x: 0, y: 0 } } : {}),
    hold: 'back', air: false, hit: { x: 128, y: 160 }, bounds: { left: 88, right: 168, top: 28, bottom: 240, width: 81, height: 213 },
    ...(view ? { view } : {}) }
}
const looping = (ms: number, n: number, locked = false): SpriteAction => ({ loop: true, events: {}, frames: Array.from({ length: n }, () => frame(ms, locked)) })

export function standInSet(index: number): { set: SpriteSet; pages: HTMLCanvasElement[] } {
  const page = document.createElement('canvas')
  page.width = 512
  page.height = 256
  standInCanvas(COATS[index % COATS.length], page)
  const g = page.getContext('2d')!
  // blink-half at (256, 0): lids half down; blink-closed at (300, 0): lids shut.
  g.fillStyle = '#f3dcc0'
  g.fillRect(256, 0, FACE.w, FACE.h)
  g.fillRect(300, 0, FACE.w, FACE.h)
  g.fillStyle = '#1b1406'
  g.fillRect(256 + 4, 11, 7, 5); g.fillRect(256 + 29, 11, 7, 5)
  g.fillRect(300 + 3, 11, 9, 2); g.fillRect(300 + 28, 11, 9, 2)
  const actions: Record<string, SpriteAction> = {
    idle: looping(220, 4, true), walk: looping(110, 6, true), run: looping(75, 6, true),
    turnaround: { loop: false, events: {}, frames: ['front', 'back', 'left', 'right'].map((v) => frame(null, false, v)) },
  }
  for (const f of ['front', 'back', 'right']) { actions[`walk-${f}`] = looping(110, 6); actions[`run-${f}`] = looping(75, 6) }
  return {
    pages: [page],
    set: {
      outfitId: 900_200 + index, revision: 0, profile: 'stand-in', cell: 256, logicalCell: 64, foot: { x: 128, y: 240 },
      headBox: { x: 88, y: 30, w: 80, h: 90 }, faceBox: FACE, hit: { x: 128, y: 160 },
      pages: [{ path: 'stand-in.png', width: 512, height: 256 }],
      faces: {
        'blink-half': { page: 0, x: 256, y: 0, w: FACE.w, h: FACE.h, dx: 0, dy: 0, place: FACE },
        'blink-closed': { page: 0, x: 300, y: 0, w: FACE.w, h: FACE.h, dx: 0, dy: 0, place: FACE },
      },
      actions,
    },
  }
}
