export interface Point { x: number; y: number }
export interface HeldProp { grip: Point; scale: number; nock?: Point }
export interface GripFrame { grip?: Point & { angle: number }; off?: Point; hold: string }
export interface Placement extends Point { a: number; b: number; c: number; d: number }

/** Matrix maps vectors relative to the prop grip into the working sprite cell. */
export function heldPlacement(prop: HeldProp, frame: GripFrame, kind: string): Placement | null {
  if (!frame.grip || frame.hold === 'none') return null
  const book = kind.startsWith('tome-'), anchor = book ? frame.off ?? frame.grip : frame.grip
  if (kind === 'bow-drawn' && prop.nock && frame.off) {
    const nx = prop.nock.x - prop.grip.x, ny = prop.nock.y - prop.grip.y, length = Math.hypot(nx, ny)
    const dx = frame.off.x - frame.grip.x, dy = frame.off.y - frame.grip.y, targetLength = Math.hypot(dx, dy)
    if (length > 0 && targetLength > 0) {
      const ux = nx / length, uy = ny / length, vx = -uy, vy = ux
      const tx = dx / length, ty = dy / length, px = -dy / targetLength * prop.scale, py = dx / targetLength * prop.scale
      return { ...anchor, a: tx * ux + px * vx, b: ty * ux + py * vx, c: tx * uy + px * vy, d: ty * uy + py * vy }
    }
  }
  const angle = (book ? 0 : frame.grip.angle) * Math.PI / 180, cos = Math.cos(angle) * prop.scale, sin = Math.sin(angle) * prop.scale
  return { ...anchor, a: cos, b: sin, c: -sin, d: cos }
}
export function projectPoint(p: Point, grip: Point, transform: Placement): Point {
  const x = p.x - grip.x, y = p.y - grip.y
  return { x: transform.x + transform.a * x + transform.c * y, y: transform.y + transform.b * x + transform.d * y }
}
