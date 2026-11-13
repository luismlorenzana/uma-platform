// The phone test's numbers (LK1, LR6): frame times recorded over a run, summarised per second and overall, so a ten-minute
// run on the owner's iPhone says whether 30 fps holds, whether it drops as the phone warms (the first minute against the
// last), and how the tiers compare. Pure: the stage feeds it frame times.

export interface BenchSecond { readonly at: number; readonly frames: number; readonly worstMs: number }
export interface BenchSummary {
  readonly seconds: number
  readonly frames: number
  /** Frames a second over the run. */
  readonly fps: number
  /** The slowest second's frames. */
  readonly fpsMin: number
  /** The fifth-percentile second: what a bad moment looks like. */
  readonly fpsLow: number
  readonly firstMinuteFps: number
  readonly lastMinuteFps: number
  readonly msP50: number
  readonly msP95: number
  readonly msP99: number
  readonly worstMs: number
  /** Share of seconds at 29 frames or more: "30 fps sustained". */
  readonly sustained30: number
  /** Share of frames over 50 ms: visible hitches. */
  readonly hitches: number
}

const pct = (sorted: readonly number[], p: number): number => (sorted.length ? sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))]! : 0)
const round = (v: number, d = 1): number => Math.round(v * 10 ** d) / 10 ** d

export class FrameRecorder {
  private readonly ms: number[] = []
  private readonly secs: { frames: number; worstMs: number }[] = []
  private clock = 0

  /** One frame took `ms` milliseconds. */
  push(ms: number): void {
    if (!(ms > 0) || ms > 5000) return
    this.ms.push(ms)
    this.clock += ms
    const s = Math.floor(this.clock / 1000)
    while (this.secs.length <= s) this.secs.push({ frames: 0, worstMs: 0 })
    const cur = this.secs[s]!
    cur.frames++
    cur.worstMs = Math.max(cur.worstMs, ms)
  }

  /** Seconds elapsed in recorded frame time. */
  get elapsed(): number { return this.clock / 1000 }

  seconds(): BenchSecond[] {
    // The last second is partial: leave it out of the per-second view.
    return this.secs.slice(0, Math.floor(this.clock / 1000)).map((s, at) => ({ at, frames: s.frames, worstMs: round(s.worstMs) }))
  }

  summary(): BenchSummary {
    const secs = this.seconds(), per = secs.map((s) => s.frames), sortedPer = [...per].sort((a, b) => a - b)
    const sorted = [...this.ms].sort((a, b) => a - b)
    const mean = (xs: readonly number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0)
    return {
      seconds: secs.length,
      frames: this.ms.length,
      fps: round(this.clock ? this.ms.length / (this.clock / 1000) : 0),
      fpsMin: sortedPer[0] ?? 0,
      fpsLow: pct(sortedPer, 5),
      firstMinuteFps: round(mean(per.slice(0, 60))),
      lastMinuteFps: round(mean(per.slice(-60))),
      msP50: round(pct(sorted, 50)),
      msP95: round(pct(sorted, 95)),
      msP99: round(pct(sorted, 99)),
      worstMs: round(sorted.at(-1) ?? 0),
      sustained30: round(per.length ? per.filter((f) => f >= 29).length / per.length : 0, 3),
      hitches: round(this.ms.length ? this.ms.filter((m) => m > 50).length / this.ms.length : 0, 4),
    }
  }
}

/** A rough GPU memory estimate in bytes: textures, geometry buffers, the drawing buffer and the post targets. Phones
 * report no GPU memory to a web page, so this is computed from what the stage holds. */
export interface GpuEstimate { readonly textures: number; readonly textureBytes: number; readonly geometryBytes: number; readonly targetBytes: number; readonly totalMB: number }
export function gpuEstimate(input: {
  textures: readonly { width: number; height: number; mipmaps: boolean }[]
  geometryBytes: number
  /** The drawing buffer in device pixels. */
  width: number
  height: number
  ao: boolean
  dof: boolean
  bloom: boolean
  shadowMap: number
}): GpuEstimate {
  const textureBytes = input.textures.reduce((sum, t) => sum + t.width * t.height * 4 * (t.mipmaps ? 4 / 3 : 1), 0)
  const px = input.width * input.height
  // Canvas colour and depth, the composer's two half-float targets, then each pass's own.
  let targets = px * 8 + px * 16
  if (input.ao) targets += px * 12
  if (input.dof) targets += px * 4
  if (input.bloom) targets += px * 8 * 0.67
  targets += input.shadowMap * input.shadowMap * 4
  const total = textureBytes + input.geometryBytes + targets
  return { textures: input.textures.length, textureBytes: Math.round(textureBytes), geometryBytes: input.geometryBytes, targetBytes: Math.round(targets), totalMB: round(total / 2 ** 20) }
}
