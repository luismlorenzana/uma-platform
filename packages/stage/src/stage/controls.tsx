// The stage screens' shared controls (Q4, Q11, Q21): battery saver's default, pointer capture, and a switch row for the
// kit's sheets (uma-kit has buttons but no switch row; the menus themselves are its `Sheet`s on the `KitStage`, Q21).
import { readPref } from '@luismlorenzana/uma-kit/ui'

/** Battery saver: on by default on a touch phone (DN27), remembered on this device, never in the save. */
export function initialSaver(): boolean {
  const stored = readPref('saver')
  if (stored === 'on' || stored === 'off') return stored === 'on'
  return window.matchMedia?.('(pointer: coarse)').matches ?? false
}

/** Keeps a pointer's moves coming to this element; a capture that fails (an unknown pointer) never drops the touch. */
export function capture(el: Element, id: number): void {
  try { el.setPointerCapture(id) } catch { /* the touch still works without it */ }
}

export const standalone = (): boolean => window.matchMedia?.('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true

export function ToggleRow({ label, on, onChange, value }: { label: string; on: boolean; onChange: (on: boolean) => void; value?: string }) {
  return (
    <button type="button" role="switch" aria-checked={on} onClick={() => onChange(!on)}
      className="flex min-h-11 w-full items-center justify-between rounded-sm border border-hairline-strong bg-panel px-3 text-sm font-semibold text-ink shadow-1">
      <span>{label}</span>
      <span className={`font-semibold ${on ? 'text-accent' : 'text-ink-soft'}`}>{value ?? (on ? 'On' : 'Off')}</span>
    </button>
  )
}

/** A row that steps through choices on each tap, showing the current one (the test room's Scene and Fight). */
export function CycleRow({ label, value, onNext }: { label: string; value: string; onNext: () => void }) {
  return (
    <button type="button" onClick={onNext}
      className="flex min-h-11 w-full items-center justify-between rounded-sm border border-hairline-strong bg-panel px-3 text-sm font-semibold text-ink shadow-1">
      <span>{label}</span>
      <span className="font-semibold text-accent">{value}</span>
    </button>
  )
}
