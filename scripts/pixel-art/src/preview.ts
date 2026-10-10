// Review tool: renders one exported icon list as a zoomed sheet, five per row, in list order.
// pnpm --filter @uma-platform/pixel-art exec tsx src/preview.ts items/fruits.ts FRUITS /tmp/fruits.png [scale]
import { writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { hex } from './color.ts'
import { drawIcon } from './icon.ts'
import type { ItemIcon } from './items/types.ts'
import { encodePng } from './png.ts'
import { contactSheet } from './sheet.ts'

const [modulePath, exportName, out, scaleArg] = process.argv.slice(2)
if (!modulePath || !exportName || !out) {
  console.error('usage: tsx src/preview.ts <module under src> <export> <out.png> [scale=8]')
  process.exit(1)
}
const here = dirname(fileURLToPath(import.meta.url))
const mod = (await import(pathToFileURL(join(here, modulePath)).href)) as Record<string, unknown>
const items = mod[exportName] as ItemIcon[] | undefined
if (!Array.isArray(items)) {
  console.error(`${modulePath} has no array export ${exportName}`)
  process.exit(1)
}
const icons = items.map(drawIcon)
const rows: Uint8Array[][] = []
for (let i = 0; i < icons.length; i += 5) rows.push(icons.slice(i, i + 5))
const sheet = contactSheet(rows, Number(scaleArg ?? 8), 16, hex('#0f141b'), hex('#18202a'))
writeFileSync(out, encodePng(sheet.w, sheet.h, sheet.px))
console.log(`${items.length} icons → ${out}: ${items.map((i) => i.id).join(', ')}`)
