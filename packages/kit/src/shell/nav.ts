// How the shell moves (uma-racer's `hub/nav.ts`; P48): every place is a link, so Back and the iPhone's edge swipe work
// everywhere. A side panel is `/:page?peek=:place` and a global sheet `?sheet=…` on the route it opens over, so Back
// closes either. An entry pushed from inside the app carries `back`, and leaving it pops history; a deep link replaces
// itself with where it would have come from.
import { useCallback } from 'react'
import { useLocation, useNavigate, type Location } from 'react-router'

/** Navigation state the kit reads; a game may add its own fields. */
export interface KitNavState {
  /** Pushed from inside the app: leaving pops back to where it came from. */
  readonly back?: boolean
}

export const peekPath = (page: string, placeId: string): string => `/${page}?peek=${encodeURIComponent(placeId)}`

/** The location with one search param set (or removed with null), path kept. */
export function withParam(location: Pick<Location, 'pathname' | 'search'>, key: string, value: string | null): string {
  const params = new URLSearchParams(location.search)
  if (value === null) params.delete(key)
  else params.set(key, value)
  const search = params.toString()
  return `${location.pathname}${search ? `?${search}` : ''}`
}

export const navState = <T extends KitNavState = KitNavState>(location: Pick<Location, 'state'>): T => (location.state as T | null) ?? ({} as T)

/** Leaves the current entry: back where it came from when the app pushed it, else to `fallback` in its place. */
export function useLeave(): (fallback: string) => void {
  const navigate = useNavigate()
  const location = useLocation()
  const pushed = navState(location).back === true
  return useCallback((fallback: string) => {
    if (pushed) navigate(-1)
    else navigate(fallback, { replace: true })
  }, [navigate, pushed])
}
