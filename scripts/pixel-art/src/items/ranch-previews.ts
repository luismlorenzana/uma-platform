// F83 review sheets: the four ranch goods, then the farm's familiar neighbours for scale and readability (a tonic's
// bottle beside the milk's, the potato beside the eggs).
import { hex } from '../color.ts'
import { drawIcon } from '../icon.ts'
import { encodePng } from '../png.ts'
import { Img } from '../tiles/image.ts'
import { FAMILIES } from './index.ts'
import { RANCH_GOODS } from './ranch.ts'
import { TONICS } from './tonics.ts'

export const RANCH_PREVIEW_SCALES = [1, 2, 4] as const
interface PreviewIcon { name: string; px: Uint8Array }
const raw = (family: string, id: string) => FAMILIES.find((f) => f.id === family)!.raw.find((icon) => icon.id === id)!

export const ranchComparisonIcons = (): PreviewIcon[] => [
  { name: 'Potato', px: drawIcon(raw('vegetables', 'potato')) },
  { name: 'Wheat', px: drawIcon(raw('grains', 'wheat')) },
  { name: 'Apple', px: drawIcon(raw('fruits', 'apple')) },
  { name: TONICS[4]!.name, px: drawIcon(TONICS[4]!) },
]

const ranchRows = (): PreviewIcon[][] => [RANCH_GOODS.map((icon) => ({ name: icon.name, px: drawIcon(icon) })), ranchComparisonIcons()]

/** Two logical rows, each on a white then an inventory-dark chip. */
export function ranchPreview(scale: (typeof RANCH_PREVIEW_SCALES)[number]): Img {
  const size = 32 * scale, pad = 8, columns = 4, logical = ranchRows()
  const image = new Img(columns * (size + pad) + pad, logical.length * 2 * (size + pad) + pad).fill(hex('#87939f'))
  logical.forEach((row, rowIndex) => {
    for (const [theme, color] of ['#ffffff', '#17202b'].entries()) {
      const y = pad + (rowIndex * 2 + theme) * (size + pad)
      image.copy(new Img(image.w - pad * 2, size).fill(hex(color)), pad, y)
      row.forEach(({ px }, column) => image.draw(new Img(32, 32, px).scaled(scale), pad + column * (size + pad), y))
    }
  })
  return image
}

const uri = (px: Uint8Array) => `data:image/png;base64,${encodePng(32, 32, px).toString('base64')}`
const figures = (row: PreviewIcon[], grades: boolean) => row.map(({ name, px }, i) =>
  `<figure><div><img src="${uri(px)}" width="128" height="128" alt="${name} at 4×"><img src="${uri(px)}" width="64" height="64" alt="${name} at 2×"><img src="${uri(px)}" width="32" height="32" alt="${name} at 1×"></div><figcaption>${name}${grades ? `<span>G${i + 1} · <code>${RANCH_GOODS[i]!.id}</code> · x ${i * 32}, y 1216</span>` : ''}</figcaption></figure>`).join('')

export function ranchPreviewHtml(): string {
  const [goods, comparison] = ranchRows()
  const section = (title: string, row: PreviewIcon[], grades: boolean) => `<section><h2>${title}</h2><div class="cards light">${figures(row, grades)}</div><div class="cards dark">${figures(row, grades)}</div></section>`
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Ranch goods</title><style>
body{margin:0;padding:16px;background:#e8edf1;color:#192530;font:14px/1.45 system-ui,sans-serif}h1{font-size:22px;margin:0}h2{font-size:17px;margin:24px 0 8px}p{max-width:72ch}
.cards{display:grid;grid-template-columns:repeat(4,minmax(200px,1fr));gap:8px;padding:10px;overflow:auto}.light{background:#fff}.dark{background:#17202b;color:#eef2f5}
figure{margin:0}figure div{display:flex;align-items:end;gap:10px;min-height:128px}img{image-rendering:pixelated}figcaption{font-size:13px;font-weight:600;margin-top:6px}figcaption span{display:block;font-weight:400;font-size:12px;opacity:.75}
.sheet{max-width:100%;overflow:auto}.sheet img{display:block}
</style></head><body><h1>Ranch goods (uma-farm F83)</h1><p>The Coop's and the Barn's eggs and milk, original 32×32 item icons in the farm's grade order, appended as one raw row
at the foot of uma-art's items atlas (y 1216, x = (grade − 1) × 32): an upright hen's egg, a slim milk bottle, a duck egg in its nest and a goat-milk jug.
Then four familiar neighbours for comparison. Each row shows on white and on inventory dark, at 4×, 2× and 1×.</p>
${section('Ranch goods, G1 → G4', goods!, true)}${section('Comparison strip', comparison!, false)}
${RANCH_PREVIEW_SCALES.map((scale) => `<h2>${scale}× sheet</h2><div class="sheet"><img src="ranch-goods-${scale}x.png" alt="Ranch goods and comparisons at ${scale}×"></div>`).join('')}</body></html>`
}
