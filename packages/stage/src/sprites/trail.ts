// Single file (DN24; Q6): the followers walk in the leader's steps, each a fixed distance behind her along her path, and
// stop when she stops. Pure: the leader's path as points with distances, read back at any distance behind.

export interface Point2 { x: number; z: number }

/** Followers' spacing along the path, in tiles. */
export const FOLLOW_GAP = 0.8

export class Trail {
  private points: (Point2 & { d: number })[] = []
  private total = 0

  constructor(start: Point2, followers = 4, gap = FOLLOW_GAP) {
    // Seed the path behind the start, so followers begin in a line toward the camera.
    for (let i = followers; i >= 0; i--) this.points.push({ x: start.x, z: start.z + i * gap, d: (followers - i) * gap })
    this.total = followers * gap
  }

  /** Records the leader's new position (ignored when she hasn't moved). */
  push(p: Point2): void {
    const last = this.points.at(-1)!
    const step = Math.hypot(p.x - last.x, p.z - last.z)
    if (step < 1e-4) return
    this.total += step
    this.points.push({ ...p, d: this.total })
    // Keep only what the last follower can still need.
    while (this.points.length > 2 && this.points[1]!.d < this.total - 40) this.points.shift()
  }

  /** The point `back` tiles behind the leader along her path. */
  at(back: number): Point2 {
    const target = this.total - back
    const pts = this.points
    if (target <= pts[0]!.d) return { x: pts[0]!.x, z: pts[0]!.z }
    for (let i = pts.length - 1; i > 0; i--) {
      const a = pts[i - 1]!, b = pts[i]!
      if (a.d <= target) {
        const t = (target - a.d) / (b.d - a.d || 1)
        return { x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t }
      }
    }
    return { x: pts.at(-1)!.x, z: pts.at(-1)!.z }
  }
}
