// The stand-in Uma (Q4): drawn in code to the sprite format's cell and foot point (format.md §2: 256 × 256, feet on row
// 240), so the camera and the pixel snap are checked before any real set loads (Q6). Simple shapes, no Uma art.
import { SPRITE_CELL, SPRITE_FOOT } from './camera.js'

/** The stand-in at its cell; `coat` tells the five apart (Q6). */
export function standInCanvas(coat = '#d39a2b', canvas = document.createElement('canvas')): HTMLCanvasElement {
  if (canvas.width < SPRITE_CELL) canvas.width = SPRITE_CELL
  if (canvas.height < SPRITE_CELL) canvas.height = SPRITE_CELL
  const g = canvas.getContext('2d')!
  const cx = SPRITE_FOOT.x, foot = SPRITE_FOOT.y + 1 // fill through row 240
  // Legs and shoes.
  g.fillStyle = '#2b2f3a'
  g.fillRect(cx - 22, foot - 48, 16, 48)
  g.fillRect(cx + 6, foot - 48, 16, 48)
  // Body: a coat, lit from the top front-left (format.md §10) by a darker lower half.
  g.fillStyle = coat
  g.beginPath()
  g.roundRect(cx - 40, 118, 80, foot - 48 - 118 + 8, 18)
  g.fill()
  g.fillStyle = 'rgba(0, 0, 0, 0.18)'
  g.fillRect(cx - 40, 170, 80, foot - 48 - 170 + 8)
  // Head and two ears.
  g.fillStyle = '#7a4a2a'
  g.beginPath(); g.moveTo(cx - 34, 70); g.lineTo(cx - 22, 28); g.lineTo(cx - 10, 62); g.fill()
  g.beginPath(); g.moveTo(cx + 34, 70); g.lineTo(cx + 22, 28); g.lineTo(cx + 10, 62); g.fill()
  g.fillStyle = '#f3dcc0'
  g.beginPath(); g.arc(cx, 88, 38, 0, Math.PI * 2); g.fill()
  g.fillStyle = '#7a4a2a'
  g.beginPath(); g.arc(cx, 76, 39, Math.PI, Math.PI * 2); g.fill()
  // Eyes, looking toward the camera.
  g.fillStyle = '#1b1406'
  g.fillRect(cx - 16, 92, 7, 10)
  g.fillRect(cx + 9, 92, 7, 10)
  return canvas
}
