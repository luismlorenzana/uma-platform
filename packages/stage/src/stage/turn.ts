// The turned stage (NG6, HD3; Q4): the scene always draws landscape. When the viewport is taller than wide (iOS keeps a
// Home Screen app upright with the rotation lock on), the stage is turned 90° clockwise, so the phone turned to its left
// (notch on the left) shows it upright (D10). When iOS has rotated the page itself, the stage isn't turned. Pure: the
// layout, the CSS transform, the touch map and the turned safe areas, all tested.

export interface Insets { top: number; right: number; bottom: number; left: number }
export interface Point { x: number; y: number }

export interface StageLayout {
  turned: boolean
  /** The stage's own size in CSS px: always landscape (width ≥ height). */
  width: number
  height: number
  /** The safe areas on the stage's own edges. */
  insets: Insets
  /** The viewport the stage sits in. */
  viewportWidth: number
  viewportHeight: number
}

export const NO_INSETS: Insets = { top: 0, right: 0, bottom: 0, left: 0 }

/** The stage for a viewport and its safe areas (`env(safe-area-inset-*)`, read on the viewport's edges). */
export function stageLayout(viewportWidth: number, viewportHeight: number, viewportInsets: Insets = NO_INSETS): StageLayout {
  const turned = viewportHeight > viewportWidth
  if (!turned) return { turned, width: viewportWidth, height: viewportHeight, insets: { ...viewportInsets }, viewportWidth, viewportHeight }
  // Turned clockwise: the stage's top lies along the viewport's right edge, its right along the bottom, its bottom along
  // the left and its left along the top (where the notch is).
  const v = viewportInsets
  return { turned, width: viewportHeight, height: viewportWidth, insets: { top: v.right, right: v.bottom, bottom: v.left, left: v.top }, viewportWidth, viewportHeight }
}

/** The stage element's CSS transform, with `transform-origin: 0 0` and the element at the viewport's top left. */
export const stageTransform = (l: StageLayout): string => (l.turned ? `translate(${l.viewportWidth}px, 0px) rotate(90deg)` : 'none')

/** A viewport point (a touch's clientX, clientY) on the stage. */
export function toStage(l: StageLayout, clientX: number, clientY: number): Point {
  return l.turned ? { x: clientY, y: l.viewportWidth - clientX } : { x: clientX, y: clientY }
}

/** A stage point in the viewport (the inverse of `toStage`). */
export function fromStage(l: StageLayout, x: number, y: number): Point {
  return l.turned ? { x: l.viewportWidth - y, y: x } : { x, y }
}
