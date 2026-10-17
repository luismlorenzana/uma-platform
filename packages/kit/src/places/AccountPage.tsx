// The Account, one frame for both games (uma-platform SD2): rename, a wallet grid, Appearance, a notifications slot,
// the game's own sections, info rows, the update's Restart and sign out. The game fills each section; a section it
// leaves empty isn't drawn.
import { useEffect, useState, type ReactNode } from 'react'
import { APPEARANCES, setAppearance, useAppearance, type Appearance } from '../ui/appearance.js'
import { Button } from '../ui/Button.js'
import { Panel } from '../ui/Panel.js'
import { Tabs } from '../ui/Tabs.js'
import { useAppUpdate } from './UpdateNotice.js'
import { appUpdateLifecycle } from './update-lifecycle.js'

export interface WalletCell {
  readonly key?: string
  readonly icon: ReactNode
  readonly value: ReactNode
  readonly label: string
}

export interface InfoRow {
  readonly label: string
  readonly value: ReactNode
}

export interface AccountWords {
  readonly name: string
  readonly save: string
  readonly saved: string
  /** Under the name field when it isn't valid; `{max}` is the most characters. */
  readonly nameRule: string
  readonly wallet: string
  readonly appearance: string
  readonly appearanceNote: string
  readonly appearances: Readonly<Record<Appearance, string>>
  readonly about: string
  readonly update: string
  readonly signOut: string
}

export const ACCOUNT_WORDS: AccountWords = {
  name: 'Trainer name',
  save: 'Save',
  saved: 'Saved.',
  nameRule: '1–{max} characters.',
  wallet: 'Wallet',
  appearance: 'Appearance',
  appearanceNote: 'System follows the phone’s light or dark setting. Saved on this phone.',
  appearances: { system: 'System', light: 'Light', dark: 'Dark' },
  about: 'About',
  update: 'Update ready · Restart',
  signOut: 'Sign out',
}

export interface RenameProps {
  readonly value: string
  readonly maxLength: number
  /** The name as it would be saved, or null when it isn't allowed. Default: trimmed, 1 to `maxLength` characters. */
  readonly normalize?: (name: string) => string | null
  readonly onSave: (name: string) => Promise<void>
}

/** Trimmed, with inner runs of spaces as one, 1 to `max` characters; null otherwise. */
export function normalizeName(name: string, max: number): string | null {
  const trimmed = name.trim().replace(/\s+/g, ' ')
  return trimmed.length >= 1 && trimmed.length <= max ? trimmed : null
}

function RenameSection({ rename, words }: { rename: RenameProps; words: AccountWords }) {
  const [name, setName] = useState(rename.value)
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)
  useEffect(() => setName(rename.value), [rename.value])
  const normalized = (rename.normalize ?? ((n: string) => normalizeName(n, rename.maxLength)))(name)
  const changed = normalized !== null && normalized !== rename.value
  return (
    <Panel className="p-3">
      <form
        className="space-y-2"
        onSubmit={(event) => {
          event.preventDefault()
          if (normalized === null || !changed) return
          setSaving(true)
          void rename.onSave(normalized).then(() => {
            setName(normalized)
            setSaved(true)
          }).finally(() => setSaving(false))
        }}
      >
        <label htmlFor="kit-account-name" className="text-micro">{words.name}</label>
        <div className="flex gap-2">
          <input
            id="kit-account-name"
            value={name}
            maxLength={rename.maxLength + 8}
            onChange={(event) => {
              setName(event.target.value)
              setSaved(false)
            }}
            className="min-h-11 min-w-0 flex-1 rounded-sm bg-sunken px-3 text-ink outline-none ring-accent focus:ring-2"
            aria-invalid={normalized === null}
          />
          <Button type="submit" size="sm" disabled={normalized === null || !changed || saving}>{words.save}</Button>
        </div>
        <p className="min-h-4 text-[12px] text-ink-soft">{normalized === null ? words.nameRule.replace('{max}', String(rename.maxLength)) : saved ? words.saved : ''}</p>
      </form>
    </Panel>
  )
}

/** Light, dark or the phone's choice, on this phone (moved from uma-rpg's Account; P48's `setAppearance`). */
export function AppearanceCard({ words = ACCOUNT_WORDS }: { words?: Pick<AccountWords, 'appearance' | 'appearanceNote' | 'appearances'> }) {
  const appearance = useAppearance()
  return (
    <Panel className="space-y-1.5 p-3" aria-label={words.appearance}>
      <h2 className="text-micro">{words.appearance}</h2>
      <Tabs label={words.appearance} options={APPEARANCES.map((value) => ({ value, label: words.appearances[value] }))} value={appearance} onChange={setAppearance} />
      <p className="text-[12px] text-ink-soft">{words.appearanceNote}</p>
    </Panel>
  )
}

export interface AccountPageProps {
  readonly rename?: RenameProps
  readonly wallet?: readonly WalletCell[]
  /** The Appearance card (default shown). */
  readonly appearance?: boolean
  /** uma-rpg's push card; nothing in uma-racer yet. */
  readonly notifications?: ReactNode
  /** The game's own panels, after notifications: uma-racer's check-in times, sync and phone settings. */
  readonly sections?: ReactNode
  readonly info?: readonly InfoRow[]
  /** Sign out; no button when absent (auth off). */
  readonly onSignOut?: () => Promise<void> | void
  readonly words?: Partial<AccountWords>
}

export function AccountPage({ rename, wallet = [], appearance = true, notifications, sections, info = [], onSignOut, words }: AccountPageProps) {
  const say = { ...ACCOUNT_WORDS, ...words }
  const update = useAppUpdate()
  const [signingOut, setSigningOut] = useState(false)
  return (
    <div className="space-y-3 px-4 pt-3 pb-24" data-kit="account">
      {rename !== undefined && <RenameSection rename={rename} words={say} />}
      {wallet.length > 0 && (
        <Panel className="p-3" aria-label={say.wallet}>
          <h2 className="text-micro mb-2">{say.wallet}</h2>
          <div className="grid grid-cols-3 gap-2">
            {wallet.map((cell) => (
              <div key={cell.key ?? cell.label} className="flex flex-col items-center gap-1 rounded-sm bg-sunken/60 p-2.5 text-center">
                {cell.icon}
                <span className="font-display text-lg font-bold tabular-nums">{cell.value}</span>
                <span className="text-[11px] text-ink-soft">{cell.label}</span>
              </div>
            ))}
          </div>
        </Panel>
      )}
      {appearance && <AppearanceCard words={say} />}
      {notifications}
      {sections}
      {info.length > 0 && (
        <Panel className="p-3" aria-label={say.about}>
          {info.map((row) => (
            <div key={row.label} className="flex min-h-11 items-center justify-between gap-3 border-b border-hairline text-[14px] last:border-0">
              <span className="text-ink-soft">{row.label}</span>
              <span className="min-w-0 text-right font-semibold">{row.value}</span>
            </div>
          ))}
        </Panel>
      )}
      {update.status !== 'current' && (
        <Button className="w-full" onClick={() => appUpdateLifecycle.requestRestart()}>{say.update}</Button>
      )}
      {onSignOut !== undefined && (
        <Button variant="destructive" className="w-full" disabled={signingOut}
          onClick={() => {
            setSigningOut(true)
            void Promise.resolve(onSignOut()).finally(() => setSigningOut(false))
          }}>
          {say.signOut}
        </Button>
      )}
    </div>
  )
}
