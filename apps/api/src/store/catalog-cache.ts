/** Briefly reuse catalog results and share one refresh across simultaneous callers. Failed loads are never cached. */
export class CatalogCache<T> {
  private value: { data: T; expires: number } | undefined
  private pending: Promise<T> | undefined
  constructor(private readonly ttlMs = 15_000, private readonly now: () => number = Date.now) {}

  get(load: () => Promise<T>, refresh = false): Promise<T> {
    if (this.pending) return this.pending
    if (!refresh && this.value && this.value.expires > this.now()) return Promise.resolve(this.value.data)
    const pending = Promise.resolve().then(load).then(data => {
      this.value = { data, expires: this.now() + this.ttlMs }
      return data
    }).finally(() => { if (this.pending === pending) this.pending = undefined })
    this.pending = pending
    return pending
  }
}
