// Reduced motion (uma-racer's `app/motion.tsx`, P48): on when the system asks for it or the game's Account switch is set.
// The root applies it through Motion's `MotionConfig` and a `data-reduced-motion` attribute for CSS: no pip bounce, no
// number transition, instant sheets. Everything runs under `LazyMotion strict`, so only `m.*` components draw.
import { LazyMotion, MotionConfig } from 'motion/react'
import { useEffect, useSyncExternalStore, type ReactNode } from 'react'
import { kitKey, readPref, subscribePrefs, writePref } from './prefs.js'

const QUERY = '(prefers-reduced-motion: reduce)'
const media = (): MediaQueryList | null => (typeof window !== 'undefined' && typeof window.matchMedia === 'function' ? window.matchMedia(QUERY) : null)
const loadFeatures = () => import('./motionFeatures.js').then((mod) => mod.default)

function deviceSwitch(): boolean {
  const value = readPref(kitKey('reducedMotion'))
  return value === 'true' || value === '1'
}

/** Account's switch: stored on this device, never synced. */
export function setReducedMotion(on: boolean): void {
  writePref(kitKey('reducedMotion'), on ? 'true' : null)
}
export const deviceReducedMotion = deviceSwitch

function subscribe(listener: () => void): () => void {
  const query = media()
  query?.addEventListener('change', listener)
  const unsubscribe = subscribePrefs(listener)
  return () => {
    query?.removeEventListener('change', listener)
    unsubscribe()
  }
}

const reducedNow = (): boolean => (media()?.matches ?? false) || deviceSwitch()

export function useReducedMotionSetting(): boolean {
  return useSyncExternalStore(subscribe, reducedNow, () => false)
}

/** The motion root: lazy features, strict `m.*`, and the reduced-motion setting for Motion and CSS. */
export function MotionRoot({ children }: { children: ReactNode }) {
  const reduced = useReducedMotionSetting()
  useEffect(() => {
    const root = document.documentElement
    if (reduced) root.setAttribute('data-reduced-motion', '')
    else root.removeAttribute('data-reduced-motion')
  }, [reduced])
  return (
    <LazyMotion features={loadFeatures} strict>
      <MotionConfig reducedMotion={reduced ? 'always' : 'never'}>{children}</MotionConfig>
    </LazyMotion>
  )
}
