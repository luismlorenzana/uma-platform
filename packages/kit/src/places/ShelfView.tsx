// The Warehouse's shelves, one frame for both games (uma-platform SD2): shelf tabs, grade chips (every grade, one
// grade, or the highest held per family), and the items held, as a grid of icons with counts or as rows. Tapping one
// opens its stock sheet: the game's details, and Sell ×1, ×10 or All at its price. The game draws item art
// (`renderItem`) and runs the sale (`onSell`); the kit never knows an item's art or price rules.
import { useState, type ReactNode } from 'react'
import { Button } from '../ui/Button.js'
import { Chip } from '../ui/Chip.js'
import { Sheet } from '../ui/BottomSheet.js'
import { Tabs } from '../ui/Tabs.js'
import { gradeChips, sellOptions, shelfItems, type GradeFilter, type SellOption, type ShelfItem } from './shelf.js'

export interface ShelfWords {
  readonly shelves: string
  readonly grades: string
  readonly allGrades: string
  readonly highest: string
  /** A grade chip; `{g}` is the grade. */
  readonly grade: string
  readonly empty: string
  readonly held: string
  /** A sell button; `{n}` is how many. */
  readonly sellOne: string
  readonly sellTen: string
  readonly sellAll: string
  readonly sellEach: string
  readonly keep: string
  readonly sell: string
  readonly cantSell: string
}

export const SHELF_WORDS: ShelfWords = {
  shelves: 'Shelves',
  grades: 'Grade',
  allGrades: 'Every grade',
  highest: 'Highest',
  grade: 'G{g}',
  empty: 'Nothing on this shelf.',
  held: '{n} held',
  sellOne: '×1',
  sellTen: '×10',
  sellAll: 'All {n}',
  sellEach: 'Sells for {price} each.',
  keep: 'Keep',
  sell: 'Sell',
  cantSell: "Couldn't sell.",
}

export interface Price {
  /** The currency's mark (uma-art's `currency/…`). */
  readonly mark: ReactNode
  readonly amount: number
}

export interface ShelfViewProps<I extends ShelfItem> {
  readonly shelves: readonly { readonly key: string; readonly label: string }[]
  readonly items: readonly I[]
  /** Draws an item's icon at `size` points. */
  readonly renderItem: (item: I, size: number) => ReactNode
  /** Icons with counts (uma-rpg) or one row per stack (uma-racer). */
  readonly layout?: 'grid' | 'rows'
  /** A row's second line (uma-racer's reserved, coming and needed). */
  readonly rowDetail?: (item: I) => ReactNode
  /** The sheet's own lines: what it is, what it makes, Make more. */
  readonly details?: (item: I) => ReactNode
  /** Each one's sale price, or null where it can't be sold. */
  readonly price?: (item: I) => Price | null
  /** The sizes offered; default ×1, ×10 and All of what's held. */
  readonly sizes?: (item: I, price: Price) => readonly SellOption[]
  /** A question to ask before selling (uma-racer: stock the planner needs), or null to sell at once. */
  readonly ask?: (item: I, option: SellOption) => string | null
  /** Sells; resolves a line to show (or nothing), rejects with a reason. */
  readonly onSell?: (item: I, qty: number) => Promise<string | void>
  /** The grade chips (default on). */
  readonly grades?: boolean
  readonly initialShelf?: string
  readonly words?: Partial<ShelfWords>
  /** Lines above the shelves: totals, a note. */
  readonly header?: ReactNode
}

const fill = (template: string, values: Readonly<Record<string, string | number>>): string =>
  template.replace(/\{(\w+)\}/g, (match, key: string) => (key in values ? String(values[key]) : match))

export function ShelfView<I extends ShelfItem>(props: ShelfViewProps<I>) {
  const { shelves, items, renderItem, layout = 'grid', rowDetail, details, price, sizes, ask, onSell, grades = true, initialShelf, header } = props
  const say = { ...SHELF_WORDS, ...props.words }
  const [shelf, setShelf] = useState(initialShelf ?? shelves[0]?.key ?? '')
  const [grade, setGrade] = useState<GradeFilter>('all')
  const [open, setOpen] = useState<string | null>(null)
  const chips = grades ? gradeChips(items, shelf) : []
  const shown = shelfItems(items, shelf, chips.length > 0 ? grade : 'all')
  const openItem = open === null ? undefined : items.find((item) => item.id === open)

  return (
    <div className="space-y-3 px-4 pt-3 pb-24" data-kit="shelves">
      {header}
      {shelves.length > 1 && (
        <Tabs label={say.shelves} value={shelf} onChange={(key) => { setShelf(key); setGrade('all') }} options={shelves.map((s) => ({ value: s.key, label: s.label }))} />
      )}
      {chips.length > 0 && (
        <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 [scrollbar-width:none]" role="group" aria-label={say.grades}>
          <Chip selected={grade === 'all'} className="min-h-11" onClick={() => setGrade('all')}>{say.allGrades}</Chip>
          <Chip selected={grade === 'highest'} className="min-h-11" onClick={() => setGrade(grade === 'highest' ? 'all' : 'highest')}>{say.highest}</Chip>
          {chips.map((g) => (
            <Chip key={g} selected={grade === g} className="min-h-11 min-w-11 justify-center" onClick={() => setGrade(grade === g ? 'all' : g)}>
              {fill(say.grade, { g })}
            </Chip>
          ))}
        </div>
      )}
      {shown.length === 0 && <p className="rounded-md border border-hairline bg-panel p-4 text-center text-[14px] text-ink-soft">{say.empty}</p>}
      {layout === 'grid' ? (
        <ul className="grid grid-cols-[repeat(auto-fill,minmax(3.5rem,1fr))] gap-1.5" data-kit="shelf-grid">
          {shown.map((item) => (
            <li key={item.id}>
              <button type="button" onClick={() => setOpen(item.id)} aria-label={`${item.name}: ${item.count}`} data-item={item.id}
                className="relative flex aspect-square w-full items-center justify-center rounded-sm border border-hairline bg-panel shadow-1">
                {renderItem(item, 40)}
                <span className="font-display absolute right-1 bottom-0.5 text-[12px] font-bold tabular-nums">{item.count}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <ul className="space-y-1.5" data-kit="shelf-rows">
          {shown.map((item) => (
            <li key={item.id}>
              <button type="button" onClick={() => setOpen(item.id)} data-item={item.id}
                className="flex min-h-14 w-full items-center gap-3 rounded-sm border border-hairline bg-panel px-2 py-1.5 text-left shadow-1">
                {renderItem(item, 32)}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14px] font-semibold">{item.name}</span>
                  {rowDetail?.(item)}
                </span>
                <span className="font-display shrink-0 text-lg font-semibold tabular-nums" aria-label={fill(say.held, { n: item.count })}>{item.count}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      <StockSheet item={openItem} onClose={() => setOpen(null)} renderItem={renderItem} details={details} price={price} sizes={sizes} ask={ask} onSell={onSell} words={say} />
    </div>
  )
}

function StockSheet<I extends ShelfItem>({ item, onClose, renderItem, details, price, sizes, ask, onSell, words }: {
  item: I | undefined
  onClose: () => void
  renderItem: (item: I, size: number) => ReactNode
  details: ((item: I) => ReactNode) | undefined
  price: ((item: I) => Price | null) | undefined
  sizes: ((item: I, price: Price) => readonly SellOption[]) | undefined
  ask: ((item: I, option: SellOption) => string | null) | undefined
  onSell: ((item: I, qty: number) => Promise<string | void>) | undefined
  words: ShelfWords
}) {
  const [said, setSaid] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [asking, setAsking] = useState<{ option: SellOption; question: string } | null>(null)
  const each = item === undefined ? null : price?.(item) ?? null
  const options = item === undefined || each === null || onSell === undefined ? [] : (sizes?.(item, each) ?? sellOptions(item.count, each.amount))
  const close = () => {
    setSaid(null)
    setAsking(null)
    onClose()
  }
  const sell = (option: SellOption) => {
    if (item === undefined || onSell === undefined) return
    setAsking(null)
    setBusy(true)
    setSaid(null)
    onSell(item, option.qty).then(
      (line) => {
        if (option.qty >= item.count) close()
        else setSaid(line ?? null)
      },
      (err: unknown) => setSaid(err instanceof Error ? err.message : words.cantSell),
    ).finally(() => setBusy(false))
  }
  const choose = (option: SellOption) => {
    const question = item === undefined ? null : ask?.(item, option) ?? null
    if (question === null) sell(option)
    else setAsking({ option, question })
  }
  const label = (option: SellOption) => (option.qty === item?.count && option.qty > 1 ? fill(words.sellAll, { n: option.qty }) : option.size === 10 ? words.sellTen : option.size === 1 ? words.sellOne : fill(words.sellAll, { n: option.qty }))
  return (
    <>
      <Sheet open={item !== undefined} onClose={close} title={item?.name}>
        {item !== undefined && (
          <div className="space-y-3" data-kit="stock-sheet">
            <div className="flex items-center gap-3">
              {renderItem(item, 64)}
              <div className="min-w-0 text-[14px]">
                <p className="text-ink-soft">{fill(words.held, { n: item.count })}</p>
              </div>
            </div>
            {details?.(item)}
            {options.length > 0 && each !== null && (
              <>
                <div className="grid grid-cols-3 gap-2" role="group" aria-label={words.sell}>
                  {options.map((option) => (
                    <Button key={option.size} variant="secondary" size="sm" disabled={busy || option.qty < 1} onClick={() => choose(option)}>
                      <span className="flex flex-col items-center leading-tight">
                        <span>{label(option)}</span>
                        <span className="flex items-center gap-1 text-[12px] font-normal">{each.mark}{option.total.toLocaleString('en-US')}</span>
                      </span>
                    </Button>
                  ))}
                </div>
                <p className="flex items-center justify-center gap-1 text-center text-[12px] text-ink-soft">{fill(words.sellEach, { price: each.amount.toLocaleString('en-US') })}</p>
              </>
            )}
            {said !== null && <p role="status" className="text-[13px] text-ink">{said}</p>}
          </div>
        )}
      </Sheet>
      <Sheet open={asking !== null} onClose={() => setAsking(null)} label={words.sell}>
        {asking !== null && (
          <div className="space-y-3">
            <p className="text-[15px]">{asking.question}</p>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="secondary" onClick={() => setAsking(null)}>{words.keep}</Button>
              <Button onClick={() => sell(asking.option)}>{words.sell}</Button>
            </div>
          </div>
        )}
      </Sheet>
    </>
  )
}
