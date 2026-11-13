// The four region towns' looks (uma-quest Q32, from its spec's region paths): Spellblade's meadow town, Mage's ruined
// academy, Summoner's marsh town on stilts, Healer's coast town. Colours only; the drawings are town/draw.ts. Pure.
import { hex } from '../color.js'
import type { TownStyle } from './draw.js'

export const TOWN_STYLES: Record<TownStyle['id'], TownStyle & { lamp: { color: string; flicker: boolean } }> = {
  /** The knight's road, a meadow town: pale limestone and white plaster, slate-blue roofs, blue and silver cloth, hedges,
   * iron lanterns; bright open daylight. */
  spellblade: {
    id: 'spellblade', seed: 300,
    street: { kind: 'flags', stone: { stones: [hex('#d8d2c2'), hex('#c9c2b0'), hex('#e4ded0')], mortar: hex('#9a9488'), moss: hex('#8a9a5a'), mossAmount: 0.4 } },
    terrace: { kind: 'courses', stone: { stones: [hex('#cfc8b6'), hex('#bdb6a4'), hex('#ddd6c4')], mortar: hex('#8f897c'), moss: hex('#7f9a4a'), mossAmount: 0.5 }, cap: hex('#e0dacb') },
    walls: { kind: 'plaster', plaster: hex('#f4f0e6'), shade: hex('#d8d2c2'), trim: hex('#c9c2b0'), stone: { stones: [hex('#cfc8b6')], mortar: hex('#8f897c') }, band: hex('#bdb6a4') },
    window: { frame: hex('#4f6a8a'), sill: hex('#c9c2b0'), shutter: hex('#5a7aa0') },
    door: { leaf: hex('#7a5a3a'), surround: hex('#cfc8b6'), arched: true, handle: hex('#c0c4cc') },
    roofs: { kind: 'flat', one: { a: hex('#5f7088'), b: hex('#73859c'), moss: hex('#7f8a5a') }, two: { a: hex('#56677e'), b: hex('#6a7d96'), moss: hex('#7f8a5a') } },
    cloth: { main: hex('#3f6aa8'), second: hex('#e8eef6'), trim: hex('#c0c8d4') },
    wood: hex('#8a6040'), metal: hex('#4a4f5a'), glass: [hex('#fff2c0'), hex('#f2b04a')],
    tree: 'trimmed', well: 'roofed', fence: 'hedge', flowers: [hex('#5a7ad8'), hex('#f4f1e6'), hex('#a8c0f0')], emblem: 'shield',
    lamp: { color: '#ffc46b', flicker: true },
  },
  /** The scholar's road, ruins: warm sandstone with worn carving, teal and violet glazed tiles, arched windows, scroll
   * banners, cool blue-white lamps; an old academy's courtyard. */
  mage: {
    id: 'mage', seed: 400,
    street: { kind: 'courses', stone: { stones: [hex('#d8b88a'), hex('#c9a46e'), hex('#e2c69a')], mortar: hex('#9a7a52'), moss: hex('#7a8a4a'), mossAmount: 0.35 } },
    terrace: { kind: 'courses', stone: { stones: [hex('#cfae7e'), hex('#bf9a68'), hex('#dbbb8c')], mortar: hex('#8f7048'), moss: hex('#7a8a4a'), mossAmount: 0.5 }, cap: hex('#e0c290') },
    walls: { kind: 'ashlar', plaster: hex('#e6caa0'), shade: hex('#ccaa78'), trim: hex('#b8956a'), stone: { stones: [hex('#dcbc8e'), hex('#ccaa78'), hex('#e6caa0')], mortar: hex('#a8865a'), moss: hex('#8a9a5a'), mossAmount: 0.25 }, band: hex('#c09868') },
    window: { frame: hex('#2f6a6a'), sill: hex('#c9a46e'), arched: true },
    door: { leaf: hex('#2f5f68'), surround: hex('#cfae7e'), arched: true, handle: hex('#d8b84a') },
    roofs: { kind: 'tiles', one: { a: hex('#2f8a8a'), b: hex('#3fa0a0'), moss: hex('#7a8a4a'), accent: hex('#6a4a9a') }, two: { a: hex('#2f8a8a'), b: hex('#3fa0a0'), moss: hex('#7a8a4a'), accent: hex('#6a4a9a') } },
    cloth: { main: hex('#5a3a8a'), second: hex('#2f8a8a'), trim: hex('#e8c860') },
    wood: hex('#7a5a3a'), metal: hex('#3a3a48'), glass: [hex('#eef8ff'), hex('#8ab8ff')],
    tree: 'cypress', well: 'fountain', fence: 'balustrade', flowers: [hex('#8a5ad8'), hex('#b88af0'), hex('#f2e2f8')], emblem: 'star',
    lamp: { color: '#cfe6ff', flicker: false },
  },
  /** The wilds, a marsh town: dark timber on stilts, reed thatch, moss green and amber cloth, rope and carved wood,
   * boardwalk streets, amber lamps; misty light. */
  summoner: {
    id: 'summoner', seed: 500,
    street: { kind: 'planks', plank: hex('#6a5038'), stone: { stones: [hex('#6a5038'), hex('#7a5e44')], mortar: hex('#3a2c1e') } },
    terrace: { kind: 'logs', stone: { stones: [hex('#5f4a34')], mortar: hex('#3a2c1e') }, cap: hex('#5f4a34'), timber: hex('#4f3e2c') },
    walls: { kind: 'timber', plaster: hex('#5a4430'), shade: hex('#4a3828'), trim: hex('#3a2c1e'), stone: { stones: [hex('#5a4430')], mortar: hex('#3a2c1e') }, band: hex('#b89a6a') },
    window: { frame: hex('#3a2c1e'), sill: hex('#5a4430'), shutter: hex('#5f7a44') },
    door: { leaf: hex('#4a3a28'), surround: hex('#3a2c1e'), arched: false, handle: hex('#c8a050') },
    roofs: { kind: 'thatch', one: { a: hex('#7a7448'), b: hex('#a89a62'), moss: hex('#5f7a3a') }, two: { a: hex('#6f6a40'), b: hex('#9a8e58'), moss: hex('#5f7a3a') } },
    cloth: { main: hex('#5f7a3a'), second: hex('#d89a3a'), trim: hex('#e8b84a') },
    wood: hex('#5a4430'), metal: hex('#3a3a36'), glass: [hex('#ffe0a0'), hex('#d8842a')],
    tree: 'willow', well: 'rain-barrel', fence: 'rope', flowers: [hex('#e8b84a'), hex('#f2e2b8'), hex('#8ac25a')], emblem: 'leaf',
    lamp: { color: '#ffb347', flicker: true },
  },
  /** The pilgrim's road, a coast town: whitewashed walls, terracotta and sea-blue roofs, shell and wave motifs, pale gold
   * cloth, sandy flagstones, small shrine lamps; sea light. */
  healer: {
    id: 'healer', seed: 600,
    street: { kind: 'flags', stone: { stones: [hex('#e6d6b6'), hex('#d8c6a2'), hex('#efe2c6')], mortar: hex('#c8b48a') }, sand: hex('#e8d6a8') },
    terrace: { kind: 'whitewash', stone: { stones: [hex('#f2efe6'), hex('#e6e2d8'), hex('#faf7ef')], mortar: hex('#cfc8b8') }, cap: hex('#e8e2d2'), band: hex('#4f8ab8') },
    walls: { kind: 'plaster', plaster: hex('#faf8f2'), shade: hex('#e2ddd0'), trim: hex('#4f8ab8'), stone: { stones: [hex('#e8e2d2')], mortar: hex('#cfc8b8') }, band: hex('#5a9ac8') },
    window: { frame: hex('#3f7ab0'), sill: hex('#e8e2d2'), shutter: hex('#4f8ab8') },
    door: { leaf: hex('#3f7ab0'), surround: hex('#e8e2d2'), arched: true, handle: hex('#e8c860') },
    roofs: { kind: 'tiles', one: { a: hex('#c8643a'), b: hex('#d87a4a'), moss: hex('#8a9a5a'), accent: hex('#3f7ab0') }, two: { a: hex('#c8643a'), b: hex('#d87a4a'), moss: hex('#8a9a5a'), accent: hex('#3f7ab0') } },
    cloth: { main: hex('#e8c86a'), second: hex('#f8f4ea'), trim: hex('#3f7ab0') },
    wood: hex('#a8845a'), metal: hex('#5a5a60'), glass: [hex('#fff6d8'), hex('#f2c46a')],
    tree: 'palm', well: 'domed', fence: 'low-wall', flowers: [hex('#e8579a'), hex('#f28ab8'), hex('#f8f4ea')], emblem: 'shell',
    lamp: { color: '#ffd58a', flicker: true },
  },
}
