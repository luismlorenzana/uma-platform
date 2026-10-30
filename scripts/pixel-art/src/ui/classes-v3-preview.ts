import { hex } from '../color.ts'
import { Img } from '../tiles/image.ts'
import { drawUi } from './atlas.ts'
import { FRAME_SPECS, TIER0, type Class } from './spec.ts'

export const CLASS_TREE = [TIER0, ['brawler', 'spellblade', 'tomeblade', 'paladin', 'cleric', 'armsummoner', 'summoner', 'mage']] as const
export const CLASS_LABELS: Record<Class, string> = {
  recruit: 'Warrior', duelist: 'Spellblade', acolyte: 'Healer', caller: 'Summoner', apprentice: 'Mage',
  brawler: 'Brawler', spellblade: 'Arms Spellblade', tomeblade: 'Tome Spellblade', paladin: 'Paladin', cleric: 'Cleric',
  armsummoner: 'Arms Summoner', summoner: 'Tome Summoner', mage: 'Sorcerer',
}
export function classesV3Preview(scale: number): Img {
  const pad = 8, cell = 24 * scale, step = cell + pad
  const out = new Img(8 * step + pad, 4 * step + pad).fill(hex('#0f141b'))
  for (const [side, color] of ['#ffffff', '#17202b'].entries()) for (const [tier, row] of CLASS_TREE.entries()) {
    row.forEach((key, i) => {
      const column = tier === 0 ? [0, 1.5, 3.5, 5.5, 7][i]! : i
      const x = pad + column * step, y = pad + (side * 2 + tier) * step
      const spec = FRAME_SPECS.find(f => f.id === `class/${key}`)
      if (!spec) throw new Error(`Missing class preview ${key}`)
      out.copy(new Img(cell, cell).fill(hex(color)), x, y).draw(drawUi(spec).scaled(scale), x, y)
    })
  }
  return out
}
