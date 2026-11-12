// An Uma's picture in Uma Story (AP64): from the master data release, by the outfit the Ranker names for her, fetched
// when it scrolls near the screen and kept on the device. No picture is ever copied into a book.
import type { ArtIndex } from '@luismlorenzana/uma-data'
import { useEffect, useRef, useState } from 'react'
import { CONTENT } from '../../../content/client'

let index: Promise<ArtIndex | null> | null = null
/** Master data's picture index, loaded once a visit. */
export function loadArt(): Promise<ArtIndex | null> {
  index ??= (async () => { const client = await CONTENT.release(); return client.art(await CONTENT.manifest()) })()
  index.catch(() => { index = null })
  return index
}

export type FaceKind = 'face' | 'bust' | 'full'
const FAMILIES: Record<FaceKind, readonly string[]> = {
  face: ['outfit-faces', 'outfit-busts', 'outfit-portraits'],
  bust: ['outfit-busts', 'outfit-portraits', 'outfit-faces'],
  full: ['outfit-renders', 'outfit-portraits', 'outfit-busts'],
}
/** The release path of an outfit's picture: the kind asked for, else the nearest she has. */
export function picturePath(art: ArtIndex | null, outfitId: number, kind: FaceKind): string | null {
  const images = art?.images as Partial<Record<string, Record<string, { path: string }>>> | undefined
  for (const family of FAMILIES[kind]) { const image = images?.[family]?.[String(outfitId)]; if (image) return image.path }
  return null
}

export function Face({ art, outfitId, kind = 'face', alt, className = '' }: { art: ArtIndex | null; outfitId: number; kind?: FaceKind; alt: string; className?: string }) {
  const path = picturePath(art, outfitId, kind)
  const [src, setSrc] = useState<string | null>(null)
  const ref = useRef<HTMLSpanElement>(null)
  useEffect(() => {
    setSrc(null)
    if (!path) return
    let live = true
    const release = CONTENT.hold(path)
    const start = () => { CONTENT.artUrl(path).then((url) => { if (live) setSrc(url) }, () => undefined) }
    const el = ref.current
    const watcher = el && typeof IntersectionObserver !== 'undefined'
      ? new IntersectionObserver((seen) => { if (seen.some((s) => s.isIntersecting)) { watcher?.disconnect(); start() } }, { rootMargin: '400px' })
      : null
    if (watcher && el) watcher.observe(el); else start()
    return () => { live = false; watcher?.disconnect(); release() }
  }, [path])
  return (
    <span ref={ref} className={`flex shrink-0 items-center justify-center overflow-hidden bg-sunken text-[11px] font-semibold text-ink-faint ${className}`}>
      {src ? <img src={src} alt={alt} draggable={false} className="size-full object-contain" /> : <span aria-hidden="true">{alt.slice(0, 2)}</span>}
    </span>
  )
}
