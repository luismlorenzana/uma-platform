/** Bound image transfers across galleries; the content clients still verify and persist the original bytes. */
export class AssetDownloads {
  private active = 0
  private readonly waiting: (() => void)[] = []
  constructor(private readonly limit = 4) {
    if (!Number.isInteger(limit) || limit < 1) throw new Error('An asset download limit must be positive')
  }
  run<T>(load: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const start = () => {
        this.active++
        void Promise.resolve().then(load).then(resolve, reject).finally(() => {
          this.active--
          this.waiting.shift()?.()
        })
      }
      if (this.active < this.limit) start()
      else this.waiting.push(start)
    })
  }
}
export const assetDownloads = new AssetDownloads()
