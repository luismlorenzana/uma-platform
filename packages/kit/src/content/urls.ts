// Held object URLs survive scrolling and canvas playback; disposing a session cancels unfinished image loads.
export function contentUrls(create: (blob: Blob) => string, revoke: (url: string) => void, limit: number) {
  const entries = new Map<string, string>(), holds = new Map<string, number>(), pending = new Map<string, Promise<string>>()
  let disposed = false
  const trim = (newest?: string) => {
    for (const [key, url] of entries) if (entries.size > limit && key !== newest && !holds.has(key)) { entries.delete(key); revoke(url) }
  }
  return {
    hold(key: string) {
      holds.set(key, (holds.get(key) ?? 0) + 1)
      let released = false
      return () => { if (released) return; released = true; const n = (holds.get(key) ?? 1) - 1; if (n > 0) holds.set(key, n); else holds.delete(key); trim() }
    },
    load(key: string, read: () => Promise<Blob>): Promise<string> {
      if (disposed) return Promise.reject(new Error('Content load cancelled'))
      const hit = entries.get(key)
      if (hit !== undefined) { entries.delete(key); entries.set(key, hit); return Promise.resolve(hit) }
      let request = pending.get(key)
      if (request === undefined) {
        request = read().then((blob) => {
          if (disposed) throw new Error('Content load cancelled')
          const url = create(blob); entries.set(key, url); trim(key); return url
        }).finally(() => pending.delete(key))
        pending.set(key, request)
      }
      return request
    },
    dispose() { if (disposed) return; disposed = true; for (const url of entries.values()) revoke(url); entries.clear() },
  }
}
