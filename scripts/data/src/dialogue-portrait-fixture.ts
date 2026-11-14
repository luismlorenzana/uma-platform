// Test portraits drawn in code (uma-farm F75's dry run and the pipeline's tests): abstract shapes, not character art. An
// opaque base per outfit (a backdrop, shoulders in the outfit's colour, a pale oval head with two ear triangles, its
// neutral eyes and mouth) and 224 px faces with alpha that redraw the eyes and mouth per expression. Its character id,
// 9999, is no character's.

import type { Rgba } from './enemy-images'

export const FIXTURE_PORTRAIT_ID = 9999
export const FIXTURE_BASE = { width: 525, height: 700 } as const
export const FIXTURE_FACE_SIZE = 224
/** Where the face square sits on every fixture base. */
export const FIXTURE_FACE_AT = { left: 150, top: 150 } as const

type Color = [number, number, number, number]
type Sdf = (x: number, y: number) => number
const blank = (width: number, height: number): Rgba => ({ data: new Uint8Array(width * height * 4), width, height })
function fill(image: Rgba, sdf: Sdf, [r, g, b, a]: Color): void {
  for (let y = 0; y < image.height; y += 1) for (let x = 0; x < image.width; x += 1) {
    const cover = Math.min(1, Math.max(0, 0.5 - sdf(x + 0.5, y + 0.5)))
    if (cover === 0) continue
    const i = (y * image.width + x) * 4, sa = (cover * a) / 255, da = image.data[i + 3]! / 255, oa = sa + da * (1 - sa)
    image.data[i] = Math.round((r * sa + image.data[i]! * da * (1 - sa)) / oa)
    image.data[i + 1] = Math.round((g * sa + image.data[i + 1]! * da * (1 - sa)) / oa)
    image.data[i + 2] = Math.round((b * sa + image.data[i + 2]! * da * (1 - sa)) / oa)
    image.data[i + 3] = Math.round(oa * 255)
  }
}
const ellipse = (cx: number, cy: number, rx: number, ry: number): Sdf => (x, y) => (Math.hypot((x - cx) / rx, (y - cy) / ry) - 1) * Math.min(rx, ry)
const rect = (x0: number, y0: number, x1: number, y1: number): Sdf => (x, y) => Math.max(x0 - x, x - x1, y0 - y, y - y1)
const SKIN: Color = [246, 222, 204, 255], HAIR: Color = [92, 64, 48, 255], INK: Color = [40, 30, 36, 255]
const OUTFIT: Record<string, Color> = { spring: [150, 200, 120, 255], kimono: [196, 70, 96, 255], winter: [90, 120, 160, 255] }

function features(img: Rgba, expression: string, dx: number, dy: number): void {
  const eyeRy = expression === 'happy' ? 5 : 14
  fill(img, ellipse(225 + dx, 250 + dy, 11, eyeRy), INK)
  fill(img, ellipse(300 + dx, 250 + dy, 11, eyeRy), INK)
  if (expression === 'sad') fill(img, ellipse(262 + dx, 330 + dy, 26, 6), INK)
  else fill(img, ellipse(262 + dx, 315 + dy, expression === 'happy' ? 36 : 18, expression === 'happy' ? 14 : 4), expression === 'happy' ? [170, 60, 70, 255] : INK)
}

/** An opaque base in an outfit, its face neutral. */
export function fixtureBase(outfit: string): Rgba {
  const img = blank(FIXTURE_BASE.width, FIXTURE_BASE.height)
  fill(img, rect(0, 0, FIXTURE_BASE.width, FIXTURE_BASE.height), [228, 236, 222, 255])
  fill(img, rect(70, 520, 455, 700), OUTFIT[outfit] ?? [120, 120, 140, 255])
  fill(img, rect(232, 440, 292, 540), SKIN)
  fill(img, ellipse(262, 250, 135, 165), HAIR)
  fill(img, ellipse(262, 285, 110, 140), SKIN)
  features(img, 'neutral', 0, 0)
  return img
}

/** A face square for an expression: skin over the features' area, the features redrawn, transparent outside. */
export function fixtureFace(expression: string): Rgba {
  const img = blank(FIXTURE_FACE_SIZE, FIXTURE_FACE_SIZE)
  fill(img, ellipse(262 - FIXTURE_FACE_AT.left, 290 - FIXTURE_FACE_AT.top, 95, 80), SKIN)
  features(img, expression, -FIXTURE_FACE_AT.left, -FIXTURE_FACE_AT.top)
  return img
}
