import { ServiceUnavailableException } from '@nestjs/common'
import type { BlobStore } from '../../store/blob-store'
import { CatalogCache } from '../../store/catalog-cache'
import { parseReport, type StorageReport } from './report'

export class StorageService {
  private readonly cache = new CatalogCache<StorageReport | null>(60_000)
  constructor(private readonly store: Pick<BlobStore, 'read' | 'list'>) {}
  report(refresh = false): Promise<StorageReport | null> {
    return this.cache.get(async () => {
      const files = await this.store.list('snapshots')
      const latest = files.filter(path => /^snapshots\/[0-9TZ.:_-]+\.[a-f0-9-]+\.json$/.test(path)).sort().at(-1)
      if (!latest) return null
      const blob = await this.store.read(latest)
      if (!blob) throw new ServiceUnavailableException('The storage report is being updated')
      try { return parseReport(JSON.parse(new TextDecoder().decode(blob.bytes)) as unknown) }
      catch { throw new ServiceUnavailableException('The storage report could not be verified') }
    }, refresh)
  }
}
