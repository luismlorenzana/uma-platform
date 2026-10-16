// The whole screen for an iOS Home Screen app (0.2.0). With a translucent status bar, iOS 26 sizes the viewport a status
// bar short: `innerHeight`, `dvh` and `position: fixed; inset: 0` all stop 62pt above the bottom on an iPhone 17, and
// fixed content isn't drawn below that line, so an empty band shows under the bottom bar. A document exactly one screen
// tall makes iOS give the page the whole screen. Measured in the iOS 26.4 Simulator.

/** Makes the page one screen tall in an iOS Home Screen app that draws under the status bar; elsewhere does nothing. */
export function fillScreen(): () => void {
  if (typeof window === 'undefined' || (navigator as { standalone?: boolean }).standalone !== true) return () => {}
  const root = document.documentElement
  const apply = () => {
    // Only when the page draws under the status bar; otherwise the viewport is already right.
    const probe = document.createElement('div')
    probe.style.cssText = 'position:fixed;visibility:hidden;padding-top:env(safe-area-inset-top)'
    document.body.append(probe)
    const underStatusBar = parseFloat(getComputedStyle(probe).paddingTop) > 0
    probe.remove()
    if (!underStatusBar) {
      root.style.removeProperty('min-height')
      return
    }
    // iOS keeps `screen` in portrait; the long side is the height in portrait.
    const portrait = window.matchMedia('(orientation: portrait)').matches
    const height = portrait ? Math.max(screen.width, screen.height) : Math.min(screen.width, screen.height)
    root.style.minHeight = `${height}px`
  }
  apply()
  window.addEventListener('orientationchange', apply)
  return () => window.removeEventListener('orientationchange', apply)
}
