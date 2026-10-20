// A04 review: labelled originals plus light/dark comparison sheets at native, enlarged and compact chip sizes.
import { hex } from '../color.ts'
import { drawIcon } from '../icon.ts'
import { CAKES } from '../dishes/cakes.ts'
import { TARTS } from '../dishes/tarts.ts'
import { encodePng } from '../png.ts'
import { Img } from '../tiles/image.ts'
import { speedTicketItem } from './tickets.ts'
import { TONICS } from './tonics.ts'

export const TONIC_PREVIEW_SIZES = [16, 24, 32, 64, 128] as const
const comparisons = [CAKES[0]!, TARTS[0]!]
const icons = () => [...TONICS.map((item) => ({ name: item.name, px: drawIcon(item) })),
  ...comparisons.map((item) => ({ name: item.name, px: drawIcon(item) })), { name: 'Speed Ticket', px: speedTicketItem() }]

/** Five columns: G1–5, G6–10, then two dishes and the ticket; light above dark. */
export function tonicPreview(size: (typeof TONIC_PREVIEW_SIZES)[number]): Img {
  const columns = 5, pad = 8, rows = 3
  const image = new Img(columns * (size + pad) + pad, 2 * rows * (size + pad) + pad).fill(hex('#87939f'))
  for (const [theme, color] of ['#ffffff', '#17202b'].entries()) {
    for (let row = 0; row < rows; row++) image.copy(new Img(image.w - 2 * pad, size).fill(hex(color)), pad, pad + (theme * rows + row) * (size + pad))
    icons().forEach(({ px }, index) => image.draw(new Img(32, 32, px).scaled(size / 32),
      pad + (index % columns) * (size + pad), pad + (theme * rows + Math.floor(index / columns)) * (size + pad)))
  }
  return image
}

export function tonicPreviewHtml(): string {
  const cards = icons().map(({ name, px }) => {
    const uri = `data:image/png;base64,${encodePng(32, 32, px).toString('base64')}`
    return `<figure><div class="sizes">${[16, 24, 32].map(size => `<img src="${uri}" width="${size}" height="${size}" alt="${name}, ${size}px">`).join('')}</div><figcaption>${name}</figcaption></figure>`
  }).join('')
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>A04 · Tonic icons</title><style>
body{margin:0;padding:16px;background:#e8edf1;color:#192530;font:14px/1.5 system-ui,sans-serif}h1{font-size:22px}h2{font-size:17px}h3{font-size:15px}img{image-rendering:pixelated;display:block;max-width:none}.scroll{overflow:auto}.cards{display:flex;flex-wrap:wrap;gap:8px;padding:12px}.light{background:#fff;color:#192530}.dark{background:#17202b;color:#eef2f5}figure{margin:0;width:152px;padding:8px}.sizes{display:flex;align-items:center;gap:12px;min-height:40px}figcaption{font-size:12px}.sheet{max-width:100%;overflow:auto}
</style></head><body><h1>A04 · Ten tonic icons</h1><p>Original code-drawn 32×32 herbal/sports flasks. Grades 1–5, then 6–10. Comparison row: ${comparisons.map(item => item.name).join(', ')} and Speed Ticket. Each sheet repeats white above dark.</p>
<h2>Real CSS chip sizes: 16, 24, 32 px</h2><div class="cards light">${cards}</div><div class="cards dark">${cards}</div>
${TONIC_PREVIEW_SIZES.map(size => `<h2>${size / 32}× · ${size}px</h2><div class="sheet"><img src="racer-tonics-${size}px.png" width="${5 * (size + 8) + 8}" alt="All ten tonics and three comparisons at ${size}px, white above dark"></div>`).join('')}
</body></html>`
}
