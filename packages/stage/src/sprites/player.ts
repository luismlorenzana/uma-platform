// The atlas player (Q6, format.md §6–§7): plays a set's action at its frames' times (1×, or faster for a fight's 2× and
// 4×), loops or ends, holds, repeats for extra hits, and emits the format's events. Pure: Q9 drives fights through it.
import type { SpriteAction, SpriteFrame, SpriteSet } from '@luismlorenzana/uma-data'

export type SpriteEvent = { kind: 'impact' | 'release' | 'end'; frame: number } | { kind: 'hold'; frame: number }

export interface PlayOptions {
  /** 1, 2 or 4 (×); default 1. */
  speed?: number
  /** Extra hits in one act: the `repeat` range plays again this many times (format.md §6). */
  repeats?: number
  /** Play the frames last to first, once, with no events: a revive is `down` backwards (format.md §7.1). */
  reverse?: boolean
}

/** A still frame (a turnaround) shows until another action plays. */
const STILL_MS = Number.POSITIVE_INFINITY

export class AtlasPlayer {
  private action: SpriteAction | null = null
  private name = ''
  private index = 0
  private elapsed = 0
  private speed = 1
  private repeatsLeft = 0
  private holding = false
  private ended = false
  private reverse = false
  private events: SpriteEvent[] = []

  constructor(private readonly set: Pick<SpriteSet, 'actions'>) {}

  get actionName(): string { return this.name }
  get frameIndex(): number { return this.index }
  get done(): boolean { return this.ended }
  get held(): boolean { return this.holding }

  /** Starts an action from its first frame; the same looping action already playing carries on. */
  play(name: string, options: PlayOptions = {}): boolean {
    const action = this.set.actions[name]
    if (!action || action.frames.length === 0) return false
    if (name === this.name && action.loop && !this.ended && !options.reverse) { this.speed = options.speed ?? 1; return true }
    this.action = action
    this.name = name
    this.index = 0
    this.elapsed = 0
    this.speed = options.speed ?? 1
    this.repeatsLeft = options.repeats ?? 0
    this.holding = false
    this.ended = false
    this.reverse = options.reverse ?? false
    if (this.reverse) { this.index = action.frames.length - 1; return true }
    this.enter(0)
    return true
  }

  /** Shows one frame of an action and stays there (a turnaround still, a pose). */
  show(name: string, index: number): boolean {
    const action = this.set.actions[name]
    if (!action?.frames[index]) return false
    this.action = action
    this.name = name
    this.index = index
    this.elapsed = 0
    this.holding = false
    this.ended = true
    return true
  }

  /** Leaves a `hold` and plays on. */
  release(): void {
    if (!this.holding || !this.action) return
    this.holding = false
    const hold = this.action.events.hold!
    this.step(hold[1] + 1)
  }

  get frame(): SpriteFrame | null { return this.action?.frames[this.index] ?? null }

  /** How far into the current frame (0–1); 0 on a still or a held frame. */
  get progress(): number {
    const ms = this.frame?.ms
    return ms && Number.isFinite(ms) && !this.holding && !this.ended ? Math.min(1, this.elapsed / ms) : this.ended ? 1 : 0
  }

  /** Advances by `ms` of real time; returns the events it passed, in order. */
  tick(ms: number): SpriteEvent[] {
    this.events = []
    if (!this.action || this.ended) return this.events
    this.elapsed += ms * this.speed
    for (let guard = 0; guard < 256; guard++) {
      const frame = this.action.frames[this.index]!
      const length = frame.ms ?? STILL_MS
      if (this.elapsed < length) break
      this.elapsed -= length
      if (!this.advance()) break
    }
    return this.events
  }

  private advance(): boolean {
    const a = this.action!, { hold, repeat } = a.events
    if (this.reverse) {
      if (this.index > 0) { this.index--; return true }
      this.ended = true
      this.events.push({ kind: 'end', frame: 0 })
      return false
    }
    if (hold && this.index === hold[1]) {
      // Loop the hold's frames until released (a spell charging, a guard held, lying down).
      this.holding = true
      if (hold[0] === hold[1]) { this.elapsed = 0; return false }
      this.step(hold[0])
      return true
    }
    if (repeat && this.index === repeat[1] && this.repeatsLeft > 0) {
      this.repeatsLeft--
      this.step(repeat[0])
      return true
    }
    if (this.index + 1 < a.frames.length) { this.step(this.index + 1); return true }
    if (a.loop) { this.step(0); return true }
    this.ended = true
    this.events.push({ kind: 'end', frame: this.index })
    return false
  }

  private step(index: number): void {
    this.index = index
    this.enter(index)
  }

  private enter(index: number): void {
    const { impact, release, hold } = this.action!.events
    if (impact === index) this.events.push({ kind: 'impact', frame: index })
    if (release === index) this.events.push({ kind: 'release', frame: index })
    if (hold && hold[1] === index && !this.holding) this.events.push({ kind: 'hold', frame: index })
  }
}
