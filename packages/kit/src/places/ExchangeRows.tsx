// The Exchange's rows, one frame for both games (uma-platform SD2): each row an icon, a name, a detail and a price, and
// a confirm sheet with the quantity and the total. Buy is off with "Need N more" when the balance is short. The game
// supplies the rows (uma-rpg: raw items, tickets, Manuals; uma-racer: items, tickets) and runs the purchase.
import { useEffect, useState, type ReactNode } from 'react'
import { Button } from '../ui/Button.js'
import { Chip } from '../ui/Chip.js'
import { Sheet } from '../ui/BottomSheet.js'
import { affordable, exchangeTotal, shortBy, typedQuantity } from './exchange.js'
import type { Price } from './ShelfView.js'

export interface ExchangeRow {
  readonly key: string
  readonly icon: ReactNode
  readonly name: string
  readonly detail?: ReactNode
  readonly price: Price
  /** Off, with why (a lock line), or simply off. */
  readonly disabled?: boolean | string
}

export interface ExchangeWords {
  /** The sheet's title; `{name}` is the row. */
  readonly title: string
  readonly howMany: string
  readonly other: string
  /** The Buy button; `{n}` how many. */
  readonly buy: string
  /** Under Buy when short; `{n}` the shortfall. */
  readonly short: string
  readonly cantBuy: string
}

export const EXCHANGE_WORDS: ExchangeWords = {
  title: 'Buy {name}',
  howMany: 'How many',
  other: 'Other',
  buy: 'Buy {n}',
  short: 'Need {n} more',
  cantBuy: "Couldn't buy.",
}

export interface ExchangeRowsProps {
  readonly rows: readonly ExchangeRow[]
  /** What the buyer holds of the price's currency. */
  readonly balance: number
  /** Buys; resolves a line to show (or nothing), rejects with a reason. */
  readonly onBuy: (row: ExchangeRow, qty: number) => Promise<string | void>
  /** The quantity chips (default 1, 5, 10, 25). */
  readonly quantities?: readonly number[]
  /** The most per purchase (default 99). */
  readonly max?: number
  /** Two columns of compact rows, or one row per line (default). */
  readonly columns?: 1 | 2
  readonly words?: Partial<ExchangeWords>
}

const fill = (template: string, values: Readonly<Record<string, string | number>>): string =>
  template.replace(/\{(\w+)\}/g, (match, key: string) => (key in values ? String(values[key]) : match))

export function ExchangeRows({ rows, balance, onBuy, quantities = [1, 5, 10, 25], max = 99, columns = 1, words }: ExchangeRowsProps) {
  const say = { ...EXCHANGE_WORDS, ...words }
  const [open, setOpen] = useState<ExchangeRow | null>(null)
  return (
    <>
      <ul className={columns === 2 ? 'grid grid-cols-2 gap-1.5' : 'space-y-1.5'} data-kit="exchange-rows">
        {rows.map((row) => (
          <li key={row.key}>
            <button type="button" disabled={row.disabled !== undefined && row.disabled !== false} onClick={() => setOpen(row)} data-row={row.key}
              className="flex min-h-14 w-full items-center gap-2.5 rounded-sm border border-hairline bg-panel px-2 py-1.5 text-left shadow-1 disabled:opacity-55">
              <span className="shrink-0">{row.icon}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[14px] font-semibold">{row.name}</span>
                {typeof row.disabled === 'string' ? <span className="block truncate text-[12px] text-ink-soft">{row.disabled}</span>
                  : row.detail !== undefined && <span className="block truncate text-[12px] text-ink-soft">{row.detail}</span>}
              </span>
              <span className="flex shrink-0 items-center gap-1 text-[13px] font-semibold tabular-nums">{row.price.mark}{row.price.amount.toLocaleString('en-US')}</span>
            </button>
          </li>
        ))}
      </ul>
      <BuySheet row={open} balance={balance} quantities={quantities} max={max} words={say} onBuy={onBuy} onClose={() => setOpen(null)} />
    </>
  )
}

function BuySheet({ row, balance, quantities, max, words, onBuy, onClose }: {
  row: ExchangeRow | null
  balance: number
  quantities: readonly number[]
  max: number
  words: ExchangeWords
  onBuy: (row: ExchangeRow, qty: number) => Promise<string | void>
  onClose: () => void
}) {
  const [step, setStep] = useState<number | null>(quantities[0] ?? 1)
  const [typed, setTyped] = useState('')
  const [said, setSaid] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    setStep(quantities[0] ?? 1)
    setTyped('')
    setSaid(null)
  }, [row?.key])
  const qty = step ?? typedQuantity(typed, max)
  const total = row === null || qty === null ? 0 : exchangeTotal(row.price.amount, qty)
  const short = row === null ? 0 : shortBy(balance, total)
  const enough = row === null ? 0 : affordable(balance, row.price.amount, max)
  return (
    <Sheet open={row !== null} onClose={onClose} title={row === null ? undefined : fill(words.title, { name: row.name })}
      footer={row === null ? undefined : (
        <div>
          <Button className="w-full" disabled={qty === null || short > 0 || busy}
            onClick={() => {
              if (qty === null) return
              setBusy(true)
              setSaid(null)
              onBuy(row, qty).then((line) => (line ? setSaid(line) : onClose()), (err: unknown) => setSaid(err instanceof Error ? err.message : words.cantBuy))
                .finally(() => setBusy(false))
            }}>
            {fill(words.buy, { n: qty ?? 0 })}<span className="flex items-center gap-1">{row.price.mark}{total.toLocaleString('en-US')}</span>
          </Button>
          {short > 0 && <p className="mt-1 text-center text-[12px] text-danger">{fill(words.short, { n: short.toLocaleString('en-US') })}</p>}
        </div>
      )}>
      {row !== null && (
        <div className="space-y-3" data-kit="buy-sheet" data-affordable={enough}>
          <div className="flex items-center gap-3">
            {row.icon}
            {row.detail !== undefined && <p className="text-[13px] text-ink-soft">{row.detail}</p>}
          </div>
          <div className="flex flex-wrap gap-1.5" role="group" aria-label={words.howMany}>
            {quantities.filter((n) => n <= max).map((n) => (
              <Chip key={n} selected={step === n} className="min-h-11 min-w-11 justify-center" onClick={() => { setStep(n); setTyped('') }}>×{n}</Chip>
            ))}
            <input inputMode="numeric" value={typed} placeholder={words.other} aria-label={words.howMany}
              onChange={(event) => { setTyped(event.target.value); setStep(null) }}
              className="min-h-11 w-20 min-w-0 flex-1 rounded-full border border-hairline-strong bg-panel px-3 text-[14px]" />
          </div>
          {said !== null && <p role="status" className="text-[13px] text-ink">{said}</p>}
        </div>
      )}
    </Sheet>
  )
}
