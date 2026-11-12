// Frame pacing and the frame-rate numbers (DN27, R17; Q4). Battery saver draws at most 30 frames a second; the recorder
// keeps every drawn frame's interval for the mean, the 1 % low, the slowest frame and a 10 s series. Pure, clock passed in.

export const SAVER_FPS = 30

/** Says whether to draw this animation frame: always without a cap, else once per 1/fps (a little early is fine). */
export class FramePacer {
  private last = -Infinity
  constructor(private fps: number | null) {}
  setFps(fps: number | null): void { this.fps = fps }
  shouldDraw(now: number): boolean {
    if (this.fps === null) { this.last = now; return true }
    const gap = 1000 / this.fps
    if (now - this.last < gap - 4) return false
    // Keep the cadence steady: step from the last slot, unless we fell far behind.
    this.last = now - this.last > gap * 2 ? now : this.last + gap
    return true
  }
}

export interface FpsStats { mean: number; low1: number; min: number; frames: number; series: number[] }

const round1 = (n: number): number => Math.round(n * 10) / 10

/** Records drawn frames. `pause` (the app hidden) breaks the chain, so the gap isn't counted as a slow frame. */
export class FpsRecorder {
  private intervals: number[] = []
  private last: number | null = null
  private active = 0
  private bucket = { frames: 0, ms: 0 }
  private series: number[] = []

  frame(now: number): void {
    if (this.last !== null) {
      const dt = now - this.last
      this.intervals.push(dt)
      this.active += dt
      this.bucket.frames += 1
      this.bucket.ms += dt
      if (this.bucket.ms >= 10_000) {
        this.series.push(round1((this.bucket.frames * 1000) / this.bucket.ms))
        this.bucket = { frames: 0, ms: 0 }
      }
    }
    this.last = now
  }

  pause(): void { this.last = null }

  /** Time drawn, in ms, with pauses left out. */
  get activeMs(): number { return this.active }

  stats(): FpsStats {
    const n = this.intervals.length
    if (n === 0) return { mean: 0, low1: 0, min: 0, frames: 0, series: [...this.series] }
    const sorted = [...this.intervals].sort((a, b) => b - a)
    // The 99th percentile frame time: the fastest of the slowest 1 %.
    const p99 = sorted[Math.max(0, Math.ceil(n * 0.01) - 1)]!
    return { mean: round1((n * 1000) / this.active), low1: round1(1000 / p99), min: round1(1000 / sorted[0]!), frames: n, series: [...this.series] }
  }
}
