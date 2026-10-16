// The app's frame (sibling plan Phase 0 and A2; P48): the top bar, the page between, the bottom bar in the thumb zone.
// A fixed full-screen box, not `h-dvh`: in a Home Screen app with a translucent status bar, iOS can report the dynamic
// viewport a status bar short, which left an empty band under the bottom bar on an iPhone 15. A full-screen flow (a
// fight, a race, a ceremony) passes `fullScreen` and the bars go.
import type { ReactNode } from 'react'

export function AppFrame({ top, bottom, children, overlays, fullScreen = false }: {
  top?: ReactNode
  bottom?: ReactNode
  children: ReactNode
  /** Sheets and panels that sit over everything. */
  overlays?: ReactNode
  fullScreen?: boolean
}) {
  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden" data-kit="frame" data-full-screen={fullScreen || undefined}>
      {!fullScreen && top}
      <div className="relative min-h-0 flex-1 overflow-hidden">{children}</div>
      {!fullScreen && bottom}
      {overlays}
    </div>
  )
}
