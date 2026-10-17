import { Sheet } from '../ui/BottomSheet.js'
import { Chip } from '../ui/Chip.js'
import { ArrowDownIcon, ArrowUpIcon } from '../ui/icons/index.js'
import type { AlbumQuery, FacetOption, SortDef, SortDirection } from '../roster/query.js'
import { albumWords, type AlbumWords } from './words.js'

export function SortSheet({
  open,
  onClose,
  sorts,
  query,
  parameter,
  onChange,
  words: wordOverrides,
}: {
  open: boolean
  onClose: () => void
  sorts: readonly SortDef[]
  query: AlbumQuery
  parameter: string | null
  onChange: (next: { sort: string; direction: SortDirection; parameter: string | null }) => void
  words?: Partial<AlbumWords>
}) {
  const words = albumWords(wordOverrides)
  const active = sorts.find((sort) => sort.key === query.sort)
  const options: readonly FacetOption[] = active?.parameter?.options ?? []
  return (
    <Sheet open={open} onClose={onClose} title={words.sort} closeLabel={words.close}>
      <p className="text-micro mb-3">{words.sortHint}</p>
      <div className="grid gap-1.5 pb-2">
        {sorts.map((sort) => {
          const selected = sort.key === query.sort
          const nextDirection: SortDirection = selected
            ? query.direction === 'asc' ? 'desc' : 'asc'
            : sort.defaultDirection
          return (
            <button
              key={sort.key}
              type="button"
              aria-pressed={selected}
              onClick={() => onChange({
                sort: sort.key,
                direction: nextDirection,
                parameter: sort.parameter ? parameter ?? sort.parameter.options[0]?.value ?? null : null,
              })}
              className={`flex min-h-12 items-center justify-between rounded-sm px-4 text-[15px] font-semibold ${
                selected
                  ? 'border border-accent bg-accent-wash text-accent-strong'
                  : 'border border-hairline bg-panel text-ink'
              }`}
            >
              <span>{sort.label}</span>
              {selected && (query.direction === 'asc'
                ? <ArrowUpIcon size={20} title={words.ascending} />
                : <ArrowDownIcon size={20} title={words.descending} />)}
            </button>
          )
        })}
      </div>
      {options.length > 0 && (
        <div className="mb-3">
          <p className="text-micro mb-1.5">{active?.parameter?.label}</p>
          <div className="flex flex-wrap gap-1.5">
            {options.map((option) => (
              <Chip
                key={option.value}
                selected={option.value === parameter}
                onClick={() => onChange({ sort: query.sort, direction: query.direction, parameter: option.value })}
              >
                {option.label}
              </Chip>
            ))}
          </div>
        </div>
      )}
    </Sheet>
  )
}
