import { createContext, useContext, type ReactNode } from 'react'
import { LockedIcon } from '../ui/icons/index.js'

export type UmaArtKind = 'face' | 'bust' | 'chibi' | 'icon'

export interface AlbumArt {
  /** Called exactly once by each mounted art tile. A game owns fetching, caching and the returned object URL. */
  useUrl(kind: UmaArtKind, outfitId: string): string | null
  /** Usually the game's outfit-icon atlas frame. */
  Fallback?: (props: { outfitId: string; size: number }) => ReactNode
}

const EMPTY_ART: AlbumArt = { useUrl: () => null }
const AlbumArtContext = createContext<AlbumArt>(EMPTY_ART)

export function AlbumArtProvider({ art, children }: { art: AlbumArt; children: ReactNode }) {
  return <AlbumArtContext.Provider value={art}>{children}</AlbumArtContext.Provider>
}

export const useAlbumArt = (): AlbumArt => useContext(AlbumArtContext)

export interface FaceTileBadges {
  readonly topLeft?: ReactNode
  readonly topRight?: ReactNode
  readonly bottomLeft?: ReactNode
  readonly bottomRight?: ReactNode
}

function Fallback({ outfitId, size, art }: { outfitId: string; size: number; art: AlbumArt }) {
  const Component = art.Fallback
  if (Component) return <Component outfitId={outfitId} size={size} />
  return <span aria-hidden className="block size-full bg-sunken" />
}

function AlbumImage({
  kind,
  outfitId,
  label,
  size,
  className = '',
  locked = false,
}: {
  kind: UmaArtKind
  outfitId: string
  label: string
  size: number
  className?: string
  locked?: boolean
}) {
  const art = useAlbumArt()
  const url = art.useUrl(kind, outfitId)
  return (
    <span
      role="img"
      aria-label={label}
      className={`relative block overflow-hidden bg-sunken ${locked ? 'opacity-55 saturate-50' : ''} ${className}`}
    >
      {url === null ? (
        <Fallback outfitId={outfitId} size={size} art={art} />
      ) : (
        <img src={url} alt="" aria-hidden draggable={false} className="size-full select-none object-cover object-top" />
      )}
    </span>
  )
}

/** The small-Uma primitive: a face crop with four caller-owned corners. */
export function FaceTile({
  outfitId,
  size,
  badges,
  locked = false,
  selected = false,
  round = false,
  label,
  className = '',
}: {
  outfitId: string
  size: number
  badges?: FaceTileBadges
  locked?: boolean
  selected?: boolean
  round?: boolean
  label: string
  className?: string
}) {
  const radius = round ? 'rounded-full' : 'rounded-md'
  const corner = (node: ReactNode, position: string) =>
    node === undefined ? null : <span className={`pointer-events-none absolute z-10 ${position}`}>{node}</span>
  return (
    <span
      className={`relative mx-auto block aspect-square w-full overflow-hidden border border-hairline bg-sunken shadow-1 ${radius} ${
        selected ? 'outline-2 outline-offset-1 outline-accent' : ''
      } ${className}`}
      style={{ maxWidth: size }}
    >
      <AlbumImage kind="face" outfitId={outfitId} label={label} size={size} locked={locked} className={`size-full ${radius}`} />
      {locked && (
        <span className="absolute inset-0 flex items-center justify-center bg-scrim/15 text-ink-on-dark">
          <LockedIcon size={size >= 72 ? 24 : 16} />
        </span>
      )}
      {corner(badges?.topLeft, 'top-1 left-1')}
      {corner(badges?.topRight, 'top-1 right-1')}
      {corner(badges?.bottomLeft, 'bottom-1 left-1')}
      {corner(badges?.bottomRight, 'right-1 bottom-1')}
    </span>
  )
}

interface LargeArtProps {
  readonly outfitId: string
  readonly label: string
  readonly size?: number
  readonly locked?: boolean
  readonly className?: string
}

/** Large still art for cards, profiles and action scenes. */
export function UmaBust({ outfitId, label, size = 192, locked = false, className = '' }: LargeArtProps) {
  return <AlbumImage kind="bust" outfitId={outfitId} label={label} size={size} locked={locked} className={className} />
}

/** Plaza-only art. Games should use `UmaBust` anywhere an Uma is large outside the plaza. */
export function UmaChibi({ outfitId, label, size = 96, locked = false, className = '' }: LargeArtProps) {
  return <AlbumImage kind="chibi" outfitId={outfitId} label={label} size={size} locked={locked} className={className} />
}
