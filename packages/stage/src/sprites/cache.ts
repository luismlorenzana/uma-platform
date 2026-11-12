// Sprite sets in memory (N5, CR28; Q6): a set is loaded while its Uma is on screen and freed a minute after she leaves,
// so at most a party's sets (about 14 MB of GPU memory each) stay resident. Pure, clock passed in.

export const KEEP_MS = 60_000

export class SetCache<T> {
  private readonly entries = new Map<number, { value: Promise<T>; users: number; idleSince: number | null }>()

  constructor(private readonly load: (id: number) => Promise<T>, private readonly free: (value: T) => void) {}

  /** The set for an outfit, loading it once; she's now on screen. */
  hold(id: number): Promise<T> {
    const entry = this.entries.get(id)
    if (entry) { entry.users++; entry.idleSince = null; return entry.value }
    const value = this.load(id)
    value.catch(() => this.entries.delete(id))
    this.entries.set(id, { value, users: 1, idleSince: null })
    return value
  }

  /** She left the screen. */
  release(id: number, now: number): void {
    const entry = this.entries.get(id)
    if (!entry || entry.users === 0) return
    entry.users--
    if (entry.users === 0) entry.idleSince = now
  }

  /** Frees every set unused for a minute; returns how many. */
  sweep(now: number): number {
    let freed = 0
    for (const [id, entry] of this.entries) {
      if (entry.users === 0 && entry.idleSince !== null && now - entry.idleSince >= KEEP_MS) {
        this.entries.delete(id)
        void entry.value.then(this.free, () => undefined)
        freed++
      }
    }
    return freed
  }

  get size(): number { return this.entries.size }
}
