// Release art in the page (uma-rpg's `art.tsx`, on the shared client; SE2): the client through context, a blob URL per
// file, an art index lookup, and one atlas frame drawn with a CSS background.
import type { ArtIndex, AtlasFamily, ImageFamily } from '@luismlorenzana/uma-data'
import { createContext, useContext, useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react'
import type { ContentClient } from './client.js'

const ContentContext = createContext<ContentClient | null>(null)

export function ContentProvider({ client, children }: { client: ContentClient; children: ReactNode }) {
  return <ContentContext.Provider value={client}>{children}</ContentContext.Provider>
}

export function useContent(): ContentClient {
  const client = useContext(ContentContext)
  if (client === null) throw new Error('useContent must be used within ContentProvider')
  return client
}

function useBlobUrl(path: string | readonly string[] | null | undefined, load: (client: ArtSource, path: string) => Promise<string>, source?: ArtSource | null): string | null {
  const context = useContext(ContentContext)
  const client = source === undefined ? context : source
  const key = JSON.stringify(path ?? null)
  const [loaded, setLoaded] = useState<{ client: ArtSource; key: string; url: string } | null>(null)
  useEffect(() => {
    let live = true
    const releases: (() => void)[] = []
    if (client && path) void (async () => {
      for (const candidate of typeof path === 'string' ? [path] : path) {
        if (!live) return
        releases.push(client.hold(candidate))
        try { const url = await load(client, candidate); if (live) setLoaded({ client, key, url }); return }
        catch { /* Try a supplied fallback; otherwise keep the icon/initial. */ }
      }
    })()
    return () => {
      live = false
      for (const release of releases) release()
    }
    // key is the stable value of a game's candidate list, not its array identity.
  }, [client, key])
  return loaded?.client === client && loaded.key === key ? loaded.url : null
}

export type ArtSource = Pick<ContentClient, 'artUrl' | 'hold'>
/** A blob URL for a release file path (`atlases/…`, `art/…`), or null while it loads or when it can't. */
export const useArtUrl = (path: string | readonly string[] | null | undefined, source?: ArtSource | null): string | null => useBlobUrl(path, (client, p) => client.artUrl(p), source)

/** A blob URL for a private pack file (`enemies/…`), or null while it loads or when it can't. */
export const usePackUrl = (path: string | null | undefined): string | null => {
  const client = useContent()
  const source = useMemo(() => ({ artUrl: (p: string) => client.packUrl(p), hold: (p: string) => client.hold(`pack:${p}`) }), [client])
  return useArtUrl(path, source)
}

/** The release path of a record's image, or null when the release has none (the game draws its fallback). */
export function imagePath(art: ArtIndex | null | undefined, family: ImageFamily, key: string): string | null {
  return art?.images[family]?.[key]?.path ?? null
}

/** One frame of an icon atlas at `size` points, with a CSS background; a plain tile until the page loads, or without one. */
export interface AtlasAsset {
  url: string
  frame: { width: number; height: number; x: number; y: number }
  pageWidth: number
  pageHeight: number
}
export function atlasImageStyle(asset: AtlasAsset): CSSProperties {
  return { position: 'absolute', maxWidth: 'none', width: `${asset.pageWidth / asset.frame.width * 100}%`, height: `${asset.pageHeight / asset.frame.height * 100}%`, left: `${-asset.frame.x / asset.frame.width * 100}%`, top: `${-asset.frame.y / asset.frame.height * 100}%` }
}
/** Already-loaded atlas frame, for a game's non-square/responsive surfaces. No loading or game state here. */
export function AtlasFrame({ asset, alt, decorative = false, fallback = null, className = '', style }: {
  asset: AtlasAsset | null; alt?: string; decorative?: boolean; fallback?: ReactNode; className?: string; style?: CSSProperties
}) {
  if (!asset) return <div className={`aspect-square overflow-hidden ${className}`}>{fallback}</div>
  return <div role={decorative ? undefined : 'img'} aria-label={decorative ? undefined : alt} aria-hidden={decorative || undefined}
    data-kit="atlas-sprite" className={`relative isolate aspect-square overflow-hidden ${className}`} style={style}>
    <img src={asset.url} alt="" aria-hidden draggable={false} className="pointer-events-none select-none" style={atlasImageStyle(asset)} />
  </div>
}

export function AtlasSprite({ art, family, frameKey, size, className = '', label }: {
  art: ArtIndex | null | undefined
  family: AtlasFamily
  frameKey: string
  size: number
  className?: string
  label?: string
}) {
  const atlas = art?.atlases[family]
  const frame = atlas?.frames[frameKey]
  const page = frame ? atlas?.pages[frame.page] : undefined
  const url = useArtUrl(page?.path)
  const style: CSSProperties = { width: size, height: size }
  if (frame && page && url) {
    const scale = size / frame.width
    style.backgroundImage = `url(${url})`
    style.backgroundSize = `${page.width * scale}px ${page.height * scale}px`
    style.backgroundPosition = `-${frame.x * scale}px -${frame.y * scale}px`
  }
  return (
    <div role={label ? 'img' : undefined} aria-label={label} aria-hidden={label ? undefined : true} data-kit="atlas-sprite"
      className={`shrink-0 rounded-sm bg-sunken bg-no-repeat ${className}`} style={style} />
  )
}
