// The camera and the pixel grid (HD4, CR3, D10; Q4). An orthographic camera pitched 35° down; one world unit is one tile
// of 128 texels; one sprite texel lands on one device pixel. Sprites stand upright and are stretched by 1/cos(pitch), so
// the tilted camera draws each texel row on exactly one device row. Pure math, no three.js.

export const TEXELS_PER_UNIT = 128
export const CAMERA_PITCH_DEG = 35
export const CAMERA_PITCH = (CAMERA_PITCH_DEG * Math.PI) / 180
/** How far back along its view the camera sits; orthographic, so only the clipping planes care. */
export const CAMERA_DISTANCE = 30
/** The sprite cell (format.md §2): 256 texels, the foot at (128, 240). */
export const SPRITE_CELL = 256
export const SPRITE_FOOT = { x: 128, y: 240 } as const

export interface Frustum { left: number; right: number; top: number; bottom: number }

/** The orthographic frustum, in world units, for a drawing buffer of `deviceWidth × deviceHeight` device pixels. */
export function frustum(deviceWidth: number, deviceHeight: number): Frustum {
  const w = deviceWidth / TEXELS_PER_UNIT / 2, h = deviceHeight / TEXELS_PER_UNIT / 2
  return { left: -w, right: w, top: h, bottom: -h }
}

/** The drawing buffer's size in whole device pixels for a CSS box at a device pixel ratio (never above 3). */
export function deviceSize(cssWidth: number, cssHeight: number, dpr: number): { width: number; height: number; ratio: number } {
  const ratio = Math.min(3, Math.max(1, dpr))
  return { width: Math.round(cssWidth * ratio), height: Math.round(cssHeight * ratio), ratio }
}

/** A camera-space coordinate snapped to the device pixel grid, whose lines sit at `edge + n / 128` (`edge` is the
 * frustum's left or bottom). Placing a sprite's foot there puts every texel edge on a pixel edge. */
export const snapToGrid = (value: number, edge: number, perUnit = TEXELS_PER_UNIT): number => Math.round((value - edge) * perUnit) / perUnit + edge

/** An upright sprite's height stretch, so the camera's tilt draws it at one texel a device pixel. */
export const spriteStretch = (pitch = CAMERA_PITCH): number => 1 / Math.cos(pitch)

/** A sprite quad's size in world units and where its foot sits above the quad's bottom edge. */
export const SPRITE_QUAD = { width: SPRITE_CELL / TEXELS_PER_UNIT, height: SPRITE_CELL / TEXELS_PER_UNIT, footFromBottom: (SPRITE_CELL - SPRITE_FOOT.y) / TEXELS_PER_UNIT }

/** The camera's offset from the point it looks at: up and back along its 35° view. */
export function cameraOffset(pitch = CAMERA_PITCH, distance = CAMERA_DISTANCE): { y: number; z: number } {
  return { y: Math.sin(pitch) * distance, z: Math.cos(pitch) * distance }
}

/** An exponential ease toward `target`: framerate-independent, no lag at rest. */
export function follow(current: number, target: number, dt: number, rate = 10): number {
  const next = current + (target - current) * (1 - Math.exp(-rate * dt))
  return Math.abs(target - next) < 1e-4 ? target : next
}
