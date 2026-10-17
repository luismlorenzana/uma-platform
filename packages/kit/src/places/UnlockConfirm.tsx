// Unlocking an Uma, the same confirm in both games (uma-platform SD2): the Uma Tickets chip going N → N−1, "Unlocking
// is final.", and Confirm. uma-racer's multi-unlock and reveal ceremony stay its own.
import { useState, type ReactNode } from 'react'
import { Button } from '../ui/Button.js'
import { Sheet } from '../ui/BottomSheet.js'

export interface UnlockWords {
  /** The sheet's title; `{name}` is the Uma. */
  readonly title: string
  readonly tickets: string
  readonly final: string
  readonly confirm: string
  readonly cancel: string
  readonly failed: string
}

export const UNLOCK_WORDS: UnlockWords = {
  title: 'Unlock {name}?',
  tickets: 'Uma Tickets',
  final: 'Unlocking is final.',
  confirm: 'Unlock for 1 Ticket',
  cancel: 'Not now',
  failed: "Couldn't unlock.",
}

export interface UnlockConfirmProps {
  readonly open: boolean
  readonly onClose: () => void
  readonly name: string
  /** Uma Tickets held now. */
  readonly tickets: number
  /** The ticket's mark (uma-art's `currency/uma-ticket`). */
  readonly ticketMark?: ReactNode
  /** Unlocks; rejects with a reason to show. */
  readonly onConfirm: () => Promise<void>
  readonly words?: Partial<UnlockWords>
}

export function UnlockConfirm({ open, onClose, name, tickets, ticketMark, onConfirm, words }: UnlockConfirmProps) {
  const say = { ...UNLOCK_WORDS, ...words }
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const close = () => {
    setError(null)
    onClose()
  }
  return (
    <Sheet open={open} onClose={close} title={say.title.replace('{name}', name)}
      footer={
        <div className="flex gap-2">
          <Button variant="secondary" className="flex-1" onClick={close}>{say.cancel}</Button>
          <Button className="flex-[2]" disabled={tickets < 1 || busy}
            onClick={() => {
              setBusy(true)
              setError(null)
              onConfirm().then(close, (err: unknown) => setError(err instanceof Error ? err.message : say.failed)).finally(() => setBusy(false))
            }}>
            {say.confirm}
          </Button>
        </div>
      }>
      <div className="space-y-2" data-kit="unlock-confirm">
        <p className="flex items-center gap-1.5 text-[15px]" aria-label={`${say.tickets}: ${tickets} to ${Math.max(0, tickets - 1)}`}>
          {ticketMark}
          <span className="font-display font-bold tabular-nums">{tickets} → {Math.max(0, tickets - 1)}</span>
          <span className="text-ink-soft">{say.tickets}</span>
        </p>
        <p className="text-[14px] text-ink-soft">{say.final}</p>
        {error !== null && <p role="alert" className="text-[13px] text-danger">{error}</p>}
      </div>
    </Sheet>
  )
}
