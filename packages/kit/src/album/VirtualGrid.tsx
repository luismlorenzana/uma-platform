import type { ReactNode } from 'react'
import { gridRows } from './grid.js'

/** Browser-native virtualization: off-screen rows skip layout and paint without unmounting or losing scroll. */
export function VirtualGrid<T>({
  items,
  columns,
  rowHeight,
  gap = 8,
  renderItem,
  keyOf,
}: {
  items: readonly T[]
  columns: number
  rowHeight: number
  gap?: number
  renderItem: (item: T) => ReactNode
  keyOf: (item: T) => string
}) {
  return (
    <div className="flex flex-col" style={{ gap }}>
      {gridRows(items, columns).map((row) => (
        <div
          key={keyOf(row[0]!)}
          className="grid"
          style={{
            gap,
            gridTemplateColumns: `repeat(${Math.max(1, Math.floor(columns))}, minmax(0, 1fr))`,
            contentVisibility: 'auto',
            containIntrinsicSize: `${rowHeight}px`,
          }}
        >
          {row.map((item) => <div key={keyOf(item)} className="min-w-0">{renderItem(item)}</div>)}
        </div>
      ))}
    </div>
  )
}
