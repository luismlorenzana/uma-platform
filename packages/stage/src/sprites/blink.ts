// Blinks (format.md §5, CR7; Q6): every 2.4–5 s at random, half-closed 60 ms, closed 100 ms, half 60 ms, one blink in
// seven doubled. The game runs them, on locked frames with no other patch, in the battle facing only. Pure, randomness in.

export type BlinkPatch = 'blink-half' | 'blink-closed' | null

const SEQUENCE: readonly [BlinkPatch, number][] = [['blink-half', 60], ['blink-closed', 100], ['blink-half', 60]]

export class Blinker {
  private wait: number
  private steps: [BlinkPatch, number][] = []

  constructor(private readonly random: () => number = Math.random) {
    this.wait = this.gap()
  }

  private gap(): number { return 2400 + this.random() * 2600 }

  /** Advances by `ms`; returns the patch to show now. */
  tick(ms: number): BlinkPatch {
    let left = ms
    while (left > 0) {
      if (this.steps.length === 0) {
        if (left < this.wait) { this.wait -= left; return null }
        left -= this.wait
        this.steps = [...SEQUENCE.map(([p, t]) => [p, t] as [BlinkPatch, number])]
        if (this.random() < 1 / 7) this.steps.push(['blink-half', 60], ['blink-closed', 100], ['blink-half', 60])
        this.wait = this.gap()
      }
      const step = this.steps[0]!
      if (left < step[1]) { step[1] -= left; return step[0] }
      left -= step[1]
      this.steps.shift()
    }
    return this.steps[0]?.[0] ?? null
  }
}
