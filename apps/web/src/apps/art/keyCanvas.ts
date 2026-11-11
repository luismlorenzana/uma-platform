// Copied from uma-quest at 6c572e6 (apps/web/src/album/keyCanvas.ts); its import now points at the copied keys.ts.
// An adult traveler's key drawn on a 2D canvas for the Album (Q52), exactly as the fight stage puts it together (Q45):
// her weapon behind or before her at the pose's grip and angle, her fingers over the handle, an expression's patch on a
// locked head. Pack texels, y down, so the review's own canvas math carries over unchanged.
import type { KeyPose, KeyRect, LoadedKeys } from './keys'

type Keys = LoadedKeys<HTMLImageElement>
interface Box { x0: number; y0: number; x1: number; y1: number }

/** Where a pose's body and weapon reach, relative to her foot, in texels. */
function extent(keys: Keys, pose: KeyPose, kind: string | null): Box {
  const b: Box = { x0: -pose.foot.x, y0: -pose.foot.y, x1: pose.cell.w - pose.foot.x, y1: pose.cell.h - pose.foot.y }
  const w = pose.weapon, art = kind ? keys.weapons?.set.weapons[kind] : undefined
  if (w.state !== 'hidden' && art) {
    const c = Math.cos(w.angle), s = Math.sin(w.angle)
    for (const [u, v] of [[0, 0], [art.cell.w, 0], [0, art.cell.h], [art.cell.w, art.cell.h]] as const) {
      const ox = u - art.grip.x, oy = v - art.grip.y
      const x = w.grip.x + ox * c - oy * s - pose.foot.x, y = w.grip.y + ox * s + oy * c - pose.foot.y
      b.x0 = Math.min(b.x0, x); b.x1 = Math.max(b.x1, x); b.y0 = Math.min(b.y0, y); b.y1 = Math.max(b.y1, y)
    }
  }
  return b
}

const blit = (g: CanvasRenderingContext2D, img: HTMLImageElement, r: KeyRect, x: number, y: number) => g.drawImage(img, r.x, r.y, r.w, r.h, x, y, r.w, r.h)

/** Draws one pose into `canvas`, sized to fit her and her weapon; returns her face box in the canvas, if locked. */
export function drawKeyPose(canvas: HTMLCanvasElement, keys: Keys, poseId: string, expression: string | null = null): { x: number; y: number; w: number; h: number } | null {
  const pose = keys.set.poses[poseId]
  if (!pose) return null
  const kind = keys.set.weapon
  const e = extent(keys, pose, kind), pad = 8
  canvas.width = Math.ceil(e.x1 - e.x0 + pad * 2)
  canvas.height = Math.ceil(e.y1 - e.y0 + pad * 2)
  const g = canvas.getContext('2d')
  if (!g) return null
  g.clearRect(0, 0, canvas.width, canvas.height)
  const ox = pad - e.x0 - pose.foot.x, oy = pad - e.y0 - pose.foot.y
  const page = keys.pages[pose.cell.page]!
  const w = pose.weapon, art = keys.weapons?.set.weapons[kind]
  const weapon = () => {
    if (w.state === 'hidden' || !art || !keys.weapons) return
    g.save()
    g.translate(ox + w.grip.x, oy + w.grip.y)
    g.rotate(w.angle)
    blit(g, keys.weapons.pages[art.cell.page]!, art.cell, -art.grip.x, -art.grip.y)
    g.restore()
  }
  if (pose.hold === 'behind') weapon()
  blit(g, page, pose.cell, ox, oy)
  if (pose.hold !== 'behind') {
    weapon()
    if (pose.hand && w.state === 'shown') blit(g, keys.pages[pose.hand.cell.page]!, pose.hand.cell, ox + pose.hand.at.x, oy + pose.hand.at.y)
  }
  const patch = expression && expression !== 'default' ? pose.faces?.cells[expression] : undefined
  if (patch && pose.faces) blit(g, keys.pages[patch.page]!, patch, ox + pose.faces.at.x, oy + pose.faces.at.y)
  const any = pose.faces ? Object.values(pose.faces.cells)[0] : undefined
  return pose.faces && any ? { x: ox + pose.faces.at.x, y: oy + pose.faces.at.y, w: any.w, h: any.h } : null
}

/** Her face in one expression on her `ready` key, cropped around the face with a little hair, into `canvas`. */
export function drawKeyFace(canvas: HTMLCanvasElement, keys: Keys, expression: string): void {
  const full = document.createElement('canvas')
  const face = drawKeyPose(full, keys, 'ready', expression)
  if (!face) return
  const m = Math.round(face.w * 0.45)
  const x = Math.max(0, face.x - m), y = Math.max(0, face.y - m)
  const w = Math.min(full.width - x, face.w + 2 * m), h = Math.min(full.height - y, face.h + 2 * m)
  canvas.width = w
  canvas.height = h
  canvas.getContext('2d')?.drawImage(full, x, y, w, h, 0, 0, w, h)
}
