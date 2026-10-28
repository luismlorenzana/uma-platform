// Gear leaves a transparent 9×9 corner for the consumer's accent mark. Reject ink there; only soft effects may crop.
import { drawIcon, ICON_SIZE } from '../icon.ts'
import type { ItemIcon } from '../items/types.ts'
import type { GearRow } from './index.ts'

export const ACCENT_START = ICON_SIZE - 9

export function drawGearIcon(icon: ItemIcon): Uint8Array {
  const px = drawIcon(icon)
  for (let y = ACCENT_START; y < ICON_SIZE; y++)
    for (let x = ACCENT_START; x < ICON_SIZE; x++) {
      const i = (y * ICON_SIZE + x) * 4
      if (px[i + 3] === 255) throw new Error(`${icon.id}: object or outline enters accent corner at ${x},${y}`)
      // Shadows and legendary halos fade into this area; reserve it completely, including their alpha.
      px.fill(0, i, i + 4)
    }
  return px
}

export function checkGearContract(rows: readonly GearRow[]): void {
  if (rows.length !== 56) throw new Error(`Expected 56 gear rows, got ${rows.length}`)
  const ids = new Set<string>()
  for (const row of rows) {
    if (row.icons.length !== 10 || row.type.materialByGrade.length !== 10) throw new Error(`${row.type.type}: expected ten grades and materials`)
    for (const [i, icon] of row.icons.entries()) {
      if (icon.id !== `${row.type.type}-g${i + 1}` || icon.grade !== i + 1 || icon.type !== row.type.type || !icon.material || icon.material !== row.type.materialByGrade[i])
        throw new Error(`${icon.id}: gear frame does not match its row, grade or material`)
      if (ids.has(icon.id)) throw new Error(`Duplicate gear id ${icon.id}`)
      ids.add(icon.id)
    }
  }
}
