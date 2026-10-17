import type { ReactNode } from 'react'
import { formatLevel } from '../roster/level.js'
import type { AlbumView } from '../roster/query.js'
import { FaceTile, UmaBust, type FaceTileBadges } from './art.js'
import { VirtualGrid } from './VirtualGrid.js'
import { albumWords, type AlbumWords } from './words.js'

export interface AlbumGridRow {
  readonly id: string
  readonly name: string
  readonly level: number | null
  readonly tier?: number
  readonly locked?: boolean
}

export interface AlbumGridProps<T extends AlbumGridRow> {
  readonly rows: readonly T[]
  readonly view: AlbumView
  /** Icon columns. Five gives about 68 pt per face on a phone; tablets may pass more. */
  readonly columns?: number
  readonly renderBadges?: (row: T) => FaceTileBadges | undefined
  readonly renderChips?: (row: T) => ReactNode
  readonly onOpen?: (row: T) => void
  readonly selected?: (row: T) => boolean
  readonly locked?: (row: T) => boolean
  readonly words?: Partial<AlbumWords>
  readonly className?: string
}

function CornerBadges({ badges }: { badges: FaceTileBadges | undefined }) {
  if (badges === undefined) return null
  const corner = (node: ReactNode, position: string) =>
    node === undefined ? null : <span className={`pointer-events-none absolute z-10 ${position}`}>{node}</span>
  return (
    <>
      {corner(badges.topLeft, 'top-1.5 left-1.5')}
      {corner(badges.topRight, 'top-1.5 right-1.5')}
      {corner(badges.bottomLeft, 'bottom-1.5 left-1.5')}
      {corner(badges.bottomRight, 'right-1.5 bottom-1.5')}
    </>
  )
}

export function AlbumGrid<T extends AlbumGridRow>({
  rows,
  view,
  columns = 5,
  renderBadges,
  renderChips,
  onOpen,
  selected,
  locked,
  words: wordOverrides,
  className = '',
}: AlbumGridProps<T>) {
  const words = albumWords(wordOverrides)
  const viewColumns = view === 'list' ? 1 : view === 'cards' ? 3 : Math.max(1, Math.floor(columns))
  const rowHeight = view === 'list' ? 64 : view === 'cards' ? 190 : 104

  return (
    <div className={className}>
      <VirtualGrid
        items={rows}
        columns={viewColumns}
        rowHeight={rowHeight}
        keyOf={(row) => row.id}
        renderItem={(row) => {
          const isLocked = locked?.(row) ?? row.locked ?? row.level === null
          const isSelected = selected?.(row) ?? false
          const level = isLocked ? words.locked : formatLevel(row.level, row.tier)
          const label = `${row.name}, ${level}`
          const badges = renderBadges?.(row)
          const chips = renderChips?.(row)
          const content = view === 'icons' ? (
            <span className="block min-w-0 text-center">
              <FaceTile outfitId={row.id} size={68} badges={badges} locked={isLocked} selected={isSelected} label={label} />
              <span className="font-display mt-1 block truncate text-[11px] font-semibold">{row.name}</span>
              <span className="block truncate text-[10px] text-ink-soft">{level}</span>
            </span>
          ) : view === 'cards' ? (
            <span className={`block overflow-hidden rounded-md border bg-panel shadow-1 ${isSelected ? 'border-accent' : 'border-hairline'}`}>
              <span className="relative block aspect-[3/4] overflow-hidden bg-sunken">
                <UmaBust outfitId={row.id} label={label} locked={isLocked} className="size-full" />
                <CornerBadges badges={badges} />
                <span className="art-scrim absolute inset-x-0 bottom-0 h-1/2" aria-hidden />
                <span className="absolute inset-x-0 bottom-0 p-2 text-left text-ink-on-dark">
                  <span className="font-display block truncate text-[12px] font-semibold">{row.name}</span>
                  <span className="block text-[11px] text-ink-on-dark-soft">{level}</span>
                </span>
              </span>
              {chips !== undefined && <span className="flex min-h-8 flex-wrap gap-1 p-1.5">{chips}</span>}
            </span>
          ) : (
            <span className={`flex min-h-14 items-center gap-3 rounded-sm border bg-panel p-2 text-left ${isSelected ? 'border-accent bg-accent-wash' : 'border-hairline'}`}>
              <span className="w-12 shrink-0"><FaceTile outfitId={row.id} size={48} badges={badges} locked={isLocked} selected={isSelected} label={label} /></span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[14px] font-semibold">{row.name}</span>
                {chips !== undefined && <span className="mt-0.5 flex flex-wrap gap-1">{chips}</span>}
              </span>
              <span className="font-display shrink-0 text-[12px] font-semibold">{level}</span>
            </span>
          )
          return onOpen === undefined ? content : (
            <button type="button" aria-label={label} onClick={() => onOpen(row)} className="block w-full min-w-0">
              {content}
            </button>
          )
        }}
      />
    </div>
  )
}
