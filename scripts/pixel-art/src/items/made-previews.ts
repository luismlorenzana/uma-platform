// H73 review sheets: the three grade ladders, Branch Gem and familiar silhouettes for scale/readability.
import { hex } from '../color.ts'
import { drawGearIcon } from '../gear/render.ts'
import { GEAR } from '../gear/index.ts'
import { drawGem } from '../gems/paint.ts'
import { GEM_SPECS } from '../gems/spec.ts'
import { drawIcon } from '../icon.ts'
import { encodePng } from '../png.ts'
import { Img } from '../tiles/image.ts'
import { CRYSTALS_REFINED } from './refined/crystals.ts'
import { ORES_REFINED } from './refined/ores.ts'
import { ACCESSORY_SETTINGS, ARMOR_FITTINGS, BRANCH_GEM, WEAPON_GEMS } from './made.ts'

export const MADE_PREVIEW_SCALES = [1, 2, 4] as const
interface PreviewIcon { name: string; px: Uint8Array }
const item = (id: string) => [...ORES_REFINED, ...CRYSTALS_REFINED].find(icon => icon.id === id)!
const gear = (type: string, grade: number) => GEAR.find(row => row.type.type === type)!.icons[grade - 1]!
const gem = (id: string) => GEM_SPECS.find(spec => spec.id === id)!

export const madeComparisonIcons = (): PreviewIcon[] => [
  { name: 'G5 Greatsword', px: drawGearIcon(gear('greatsword', 5)) },
  { name: 'G5 Helm', px: drawGearIcon(gear('helm', 5)) },
  { name: 'G5 Charm', px: drawGearIcon(gear('charm', 5)) },
  { name: 'G5 Ring', px: drawGearIcon(gear('ring', 5)) },
  { name: 'Sun Gem G6', px: drawGem(gem('gem-sun-6')) },
  { name: 'Limit Gem G6', px: drawGem(gem('gem-limit-6')) },
  { name: 'Copper Ingot', px: drawIcon(item('copper-ingot')) },
  { name: 'Cut Citrine', px: drawIcon(item('cut-citrine')) },
]

const madeRows = (): PreviewIcon[][] => [
  WEAPON_GEMS.map(icon => ({ name: icon.name, px: drawIcon(icon) })),
  ARMOR_FITTINGS.map(icon => ({ name: icon.name, px: drawIcon(icon) })),
  ACCESSORY_SETTINGS.map(icon => ({ name: icon.name, px: drawIcon(icon) })),
  [{ name: BRANCH_GEM.name, px: drawIcon(BRANCH_GEM) }],
  madeComparisonIcons(),
]

/** Five logical rows, each repeated on a white then inventory-dark chip. */
export function madePreview(scale: (typeof MADE_PREVIEW_SCALES)[number]): Img {
  const size = 32 * scale, pad = 8, columns = 10, logical = madeRows()
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
const figures = (row: PreviewIcon[]) => row.map(({ name, px }) =>
  `<figure><div><img src="${uri(px)}" width="64" height="64" alt="${name} at 2×"><img src="${uri(px)}" width="32" height="32" alt="${name} at 1×"></div><figcaption>${name}</figcaption></figure>`).join('')

export function madePreviewHtml(): string {
  const [weapon, armor, accessory, branch, comparison] = madeRows()
  const section = (title: string, row: PreviewIcon[]) => `<section><h2>${title}</h2><div class="cards light">${figures(row)}</div><div class="cards dark">${figures(row)}</div></section>`
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>H73 · Made items</title><style>
body{margin:0;padding:16px;background:#e8edf1;color:#192530;font:14px/1.45 system-ui,sans-serif}h1{font-size:22px;margin:0}h2{font-size:17px;margin:24px 0 8px}.cards{display:grid;grid-template-columns:repeat(10,minmax(92px,1fr));gap:8px;padding:10px;overflow:auto}.light{background:#fff}.dark{background:#17202b;color:#eef2f5}figure{margin:0;min-width:82px}figure div{display:flex;align-items:end;gap:8px;min-height:64px}img{image-rendering:pixelated}figcaption{font-size:11px;margin-top:5px}.sheet{max-width:100%;overflow:auto}.sheet img{display:block}
</style></head><body><h1>H73 · Made items</h1><p>Original 32×32 slot components: ten grades of Weapon Gem, Armor Fittings and Accessory Setting, one Branch Gem, then eight existing silhouettes for comparison. Every row repeats on white and inventory dark.</p>
${section('Weapon Gems', weapon!)}${section('Armor Fittings', armor!)}${section('Accessory Settings', accessory!)}${section('Branch Gem', branch!)}${section('Comparison strip', comparison!)}
${MADE_PREVIEW_SCALES.map(scale => `<h2>${scale}× sheet</h2><div class="sheet"><img src="made-items-${scale}x.png" alt="Made items and comparisons at ${scale}×"></div>`).join('')}</body></html>`
}

