// Release art in the page (uma-rpg's `art.tsx`, on the shared client; SE2): the client through context, a blob URL per
// file, an art index lookup, and one atlas frame drawn with a CSS background.
import type { ArtIndex, AtlasFamily, ImageFamily } from '@luismlorenzana/uma-data'
import { createContext, useContext, useEffect, useState, type CSSProperties, type ReactNode } from 'react'
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

function useBlobUrl(path: string | null | undefined, load: (client: ContentClient, path: string) => Promise<string>): string | null {
  const client = useContent()
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => {
    let live = true
    setUrl(null)
    if (path) void load(client, path).then((u) => live && setUrl(u), () => undefined)
    return () => {
      live = false
    }
  }, [client, path])
  return url
}

/** A blob URL for a release file path (`atlases/…`, `art/…`), or null while it loads or when it can't. */
export const useArtUrl = (path: string | null | undefined): string | null => useBlobUrl(path, (client, p) => client.artUrl(p))

/** A blob URL for a private pack file (`enemies/…`), or null while it loads or when it can't. */
export const usePackUrl = (path: string | null | undefined): string | null => useBlobUrl(path, (client, p) => client.packUrl(p))

/** The release path of a record's image, or null when the release has none (the game draws its fallback). */
export function imagePath(art: ArtIndex | null | undefined, family: ImageFamily, key: string): string | null {
  return art?.images[family]?.[key]?.path ?? null
}

/** One frame of an icon atlas at `size` points, with a CSS background; a plain tile until the page loads, or without one. */
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
