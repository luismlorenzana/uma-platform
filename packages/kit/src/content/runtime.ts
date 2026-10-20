// A complete, game-prepared release becomes last-good atomically. The kit owns fallback/cancellation; games own shapes.
import type { ReleaseManifest } from '@luismlorenzana/uma-data'
import { createContentClient, type ContentClient, type ContentClientOptions } from './client.js'

export interface ContentSnapshotStore { get(): string | null; set(value: string): void }
export function contentSnapshotStore(key: string): ContentSnapshotStore {
  return {
    get: () => { try { return localStorage.getItem(key) } catch { return null } },
    set: (value) => { try { localStorage.setItem(key, value) } catch { /* This session still works. */ } },
  }
}
export class ContentFallbackError extends Error {
  override readonly name = 'ContentFallbackError'
  constructor(readonly networkError: unknown, readonly fallbackError: unknown) {
    super(`Content unavailable: ${String(networkError)}; cached version failed: ${String(fallbackError)}`)
  }
}
export interface ContentVersion<T> { value: T; client: ContentClient; origin: 'network' | 'offline-cache' }
export function createContentRuntime<M, T>(options: ContentClientOptions & {
  store: ContentSnapshotStore
  /** Keep an existing game's snapshot field without rewriting device data. Default: metadata. */
  metadataKey?: string
  readMetadata(client: ContentClient): Promise<M>
  parseMetadata(value: unknown): M
  prepare(client: ContentClient, manifest: ReleaseManifest, metadata: M): Promise<T>
}) {
  let generation = 0
  let active: ContentVersion<T> | null = null
  const loading = new Set<ContentClient>()
  const metadataKey = options.metadataKey ?? 'metadata'
  return {
    async load(): Promise<ContentVersion<T>> {
      const current = ++generation
      const attempt = async (origin: ContentVersion<T>['origin'], snapshot?: { manifest: ReleaseManifest; metadata: M }) => {
        const client = createContentClient({ ...options, ...(snapshot ? { manifest: snapshot.manifest } : {}) })
        loading.add(client)
        try {
          const [manifest, metadata] = snapshot ? [snapshot.manifest, snapshot.metadata] : await Promise.all([client.manifest(), options.readMetadata(client)])
          const value = await options.prepare(client, manifest, metadata)
          if (generation !== current) throw new Error('Content load cancelled')
          const version = { value, client, origin }
          active?.client.dispose(); active = version
          if (origin === 'network') options.store.set(JSON.stringify({ manifest, [metadataKey]: metadata }))
          return version
        } catch (error) { client.dispose(); throw error }
        finally { loading.delete(client) }
      }
      try { return await attempt('network') }
      catch (networkError) {
        const status = (networkError as { status?: unknown } | null)?.status
        if (generation !== current || status === 401 || status === 403) throw networkError
        const stored = options.store.get()
        if (stored === null) throw networkError
        try {
          const { parseReleaseManifest, verifyReleaseVersion } = await import('@luismlorenzana/uma-data')
          const raw = JSON.parse(stored) as Record<string, unknown>
          const manifest = parseReleaseManifest(raw['manifest'], 'cached manifest')
          await verifyReleaseVersion(manifest)
          return await attempt('offline-cache', { manifest, metadata: options.parseMetadata(raw[metadataKey]) })
        } catch (fallbackError) { throw new ContentFallbackError(networkError, fallbackError) }
      }
    },
    clear() { generation += 1; active?.client.dispose(); active = null; for (const client of loading) client.dispose() },
  }
}
