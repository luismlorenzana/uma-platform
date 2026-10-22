// The app's frame (sibling plan Phase 0 and A2; P48): the top bar, the page between, the bottom bar in the thumb zone.
// A fixed full-screen box, not `h-dvh`: in a Home Screen app with a translucent status bar, iOS can report the dynamic
// viewport a status bar short, which left an empty band under the bottom bar on an iPhone 15. A full-screen flow (a
// fight, a race, a ceremony) passes `fullScreen` and the bars go.
//
// A `tint` (0.12.0, uma-rpg's tiers) shifts the accent and washes the Hub map: theme.css reads it from `<html data-tint>`,
// not from the frame, because sheets portal to `document.body` and must tint too. `day`, the default, sets nothing.
import { useLayoutEffect, type ReactNode } from 'react'

/** A look over the theme: `day` is the theme as it is, `dusk` an amber accent, `night` a violet one. */
export const TINTS = ['day', 'dusk', 'night'] as const
export type Tint = (typeof TINTS)[number]

export function AppFrame({ top, bottom, children, overlays, fullScreen = false, tint = 'day' }: {
  top?: ReactNode
  bottom?: ReactNode
  children: ReactNode
  /** Sheets and panels that sit over everything. */
  overlays?: ReactNode
  fullScreen?: boolean
  /** Applied as `<html data-tint>` while the frame is mounted; `day` removes it. */
  tint?: Tint
}) {
  useLayoutEffect(() => {
    if (tint === 'day') return
    const root = document.documentElement
    root.setAttribute('data-tint', tint)
    return () => root.removeAttribute('data-tint')
  }, [tint])

  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden" data-kit="frame" data-full-screen={fullScreen || undefined}>
      {!fullScreen && top}
      <div className="relative min-h-0 flex-1 overflow-hidden">{children}</div>
      {!fullScreen && bottom}
      {overlays}
    </div>
  )
}
