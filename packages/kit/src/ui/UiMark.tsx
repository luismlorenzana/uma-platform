// A small mark from uma-art's `ui` atlas (uma-racer's A02 marks; P46, P48): currencies and tier crests, drawn from code
// like the Hub under them. A CSS sprite at a whole-number scale with crisp pixels; a 16 px mark at 16 pt lands on whole
// device pixels at both 2× and 3×. A mark the pinned atlas lacks draws `fallback`.
import type { ReactNode } from 'react'
import { useKitArt } from './art'

export function UiMark({ mark, scale = 1, className = '', fallback = null }: {
  /** A frame id such as `currency/uma-ticket` or `tier/2`. */
  mark: string
  scale?: 1 | 2
  className?: string
  fallback?: ReactNode
}) {
  const atlas = useKitArt().ui
  const at = atlas?.index.frames[mark]
  if (atlas === undefined || at === undefined) return <>{fallback}</>
  return (
    <span
      aria-hidden
      data-mark={mark}
      className={`inline-block shrink-0 ${className}`}
      style={{
        width: at.w * scale,
        height: at.h * scale,
        backgroundImage: `url(${atlas.url})`,
        backgroundSize: `${atlas.index.width * scale}px ${atlas.index.height * scale}px`,
        backgroundPosition: `-${at.x * scale}px -${at.y * scale}px`,
        backgroundRepeat: 'no-repeat',
        imageRendering: 'pixelated',
      }}
    />
  )
}

/** A tier as its uma-art crest (bronze, silver, gold), read as "Tier N". 24 pt by default, 12 pt with `small`. */
export function TierCrest({ tier, small = false, className = '' }: { tier: number; small?: boolean; className?: string }) {
  const mark = `tier/${Math.min(3, Math.max(1, tier))}`
  return (
    <span role="img" aria-label={`Tier ${tier}`} data-tier={tier} className={`inline-flex drop-shadow-sm ${className}`}>
      <UiMark mark={mark} scale={small ? 1 : 2} />
    </span>
  )
}
