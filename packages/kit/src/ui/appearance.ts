// Light, dark or the phone's choice (sibling plan A1, P48). System by default; Account offers all three. The choice is
// this device's, stored under the game's prefix, and applied as `<html data-theme>` so theme.css's tokens switch. The
// browser's theme colour follows the page colour, so the status bar area matches.
import { useSyncExternalStore } from 'react'
import { kitKey, readPref, subscribePrefs, writePref } from './prefs'

export type Appearance = 'system' | 'light' | 'dark'
export const APPEARANCES: readonly Appearance[] = ['system', 'light', 'dark']

const QUERY = '(prefers-color-scheme: dark)'
const media = (): MediaQueryList | null => (typeof window !== 'undefined' && typeof window.matchMedia === 'function' ? window.matchMedia(QUERY) : null)

export function readAppearance(): Appearance {
  const value = readPref(kitKey('appearance'))
  return value === 'light' || value === 'dark' ? value : 'system'
}

/** The mode in effect now: the choice, or the phone's. */
export function resolvedAppearance(choice: Appearance = readAppearance()): 'light' | 'dark' {
  if (choice !== 'system') return choice
  return media()?.matches ? 'dark' : 'light'
}

function apply(): void {
  if (typeof document === 'undefined') return
  const choice = readAppearance()
  const root = document.documentElement
  if (choice === 'system') root.removeAttribute('data-theme')
  else root.setAttribute('data-theme', choice)
  const page = getComputedStyle(root).getPropertyValue('--color-page').trim()
  if (page) document.querySelector('meta[name="theme-color"]')?.setAttribute('content', page)
}

export function setAppearance(choice: Appearance): void {
  writePref(kitKey('appearance'), choice === 'system' ? null : choice)
  apply()
}

/** Applies the stored choice now and keeps it applied as the phone's setting changes. Call once at boot. */
export function initAppearance(): () => void {
  apply()
  const query = media()
  query?.addEventListener('change', apply)
  const unsubscribe = subscribePrefs(apply)
  return () => {
    query?.removeEventListener('change', apply)
    unsubscribe()
  }
}

export function useAppearance(): Appearance {
  return useSyncExternalStore(subscribePrefs, readAppearance, () => 'system')
}
