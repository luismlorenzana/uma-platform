// uma-cyberpunk's cabin items (its CY14, D25; uma-platform CY14, P164): the ids, names, slots, styles and colours the
// art is keyed by. Copied from uma-cyberpunk's packages/domain/src/cabins/items.ts at 891e50e (the request's commit);
// only what the art needs, so a renamed piece keeps its id here as there. The game's comfort numbers stay in the game.

export type LineSlot = 'bed' | 'desk' | 'wall' | 'floor' | 'light'
export type Style = 'neon' | 'classic' | 'cozy' | 'sporty' | 'tech' | 'wild'
export type GiftKind = 'snacks' | 'music' | 'gear' | 'plants' | 'books' | 'keepsakes'

export const LINE_SLOTS: readonly LineSlot[] = ['bed', 'desk', 'wall', 'floor', 'light']
export const DECOR_STYLES: readonly Style[] = ['neon', 'classic', 'cozy', 'sporty', 'tech', 'wild']
export const DECOR_NAME: Record<Style, string> = { neon: 'Neon', classic: 'Classic', cozy: 'Cozy', sporty: 'Sporty', tech: 'Tech', wild: 'Wild' }
export const SLOT_NAME: Record<LineSlot | 'keepsake', string> = { bed: 'Bed', desk: 'Desk', wall: 'Wall', floor: 'Floor', light: 'Light', keepsake: 'Keepsake' }
/** Each style's two colours, base then accent: the body takes the base and the details and lights the accent. */
export const DECOR_COLORS: Record<Style, readonly [string, string]> = {
  neon: ['#2a1640', '#ff3dc8'], classic: ['#4a3626', '#e0b070'], cozy: ['#5a3a46', '#ffb3c1'],
  sporty: ['#173a5a', '#4fd1ff'], tech: ['#1b2a33', '#7cf2c8'], wild: ['#26402a', '#a6e36a'],
}
export const GIFT_NAME: Record<GiftKind, string> = { snacks: 'Snacks', music: 'Music', gear: 'Gear', plants: 'Plants', books: 'Books', keepsakes: 'Keepsakes' }

export interface Furniture { id: string; kind: 'furniture'; name: string; slot: LineSlot; style: Style }
export interface Keepsake { id: string; kind: 'keepsake'; name: string; slot: 'keepsake' }
export interface Gift { id: string; kind: 'gift'; name: string; gift: GiftKind }
export type Item = Furniture | Keepsake | Gift

const line = (style: Style, names: readonly [string, string, string, string, string]): Furniture[] =>
  LINE_SLOTS.map((slot, i) => ({ id: `${style}-${slot}`, kind: 'furniture', name: names[i]!, slot, style }))

export const FURNITURE: readonly Furniture[] = [
  ...line('neon', ['Glow Pod Bed', 'Holo Desk', 'Neon Sign', 'Light-Grid Mat', 'Strip Lights']),
  ...line('classic', ['Oak Bunk', 'Writing Desk', 'Framed Print', 'Woven Rug', 'Brass Lamp']),
  ...line('cozy', ['Quilted Bed', 'Tea Table', 'Plush Shelf', 'Fluffy Rug', 'Paper Lantern']),
  ...line('sporty', ['Training Cot', 'Gear Bench', 'Race Poster', 'Stretch Mat', 'Track Light']),
  ...line('tech', ['Capsule Bunk', 'Console Desk', 'Wall Screen', 'Grid Floor Panel', 'Smart Lamp']),
  ...line('wild', ['Rope Hammock', 'Driftwood Desk', 'Vine Wall', 'Moss Rug', 'Firefly Jar']),
]
export const KEEPSAKES: readonly Keepsake[] = [
  { id: 'keepsake-trophy', kind: 'keepsake', name: 'First Trophy', slot: 'keepsake' },
  { id: 'keepsake-photo', kind: 'keepsake', name: 'Crew Photo', slot: 'keepsake' },
  { id: 'keepsake-charm', kind: 'keepsake', name: 'Captain’s Charm', slot: 'keepsake' },
  { id: 'keepsake-starmap', kind: 'keepsake', name: 'Hand-Drawn Star Map', slot: 'keepsake' },
  { id: 'keepsake-ribbon', kind: 'keepsake', name: 'Old Race Ribbon', slot: 'keepsake' },
  { id: 'keepsake-radio', kind: 'keepsake', name: 'Pocket Radio', slot: 'keepsake' },
]
export const GIFTS: readonly Gift[] = [
  { id: 'gift-buns', kind: 'gift', name: 'Steamed Buns', gift: 'snacks' }, { id: 'gift-candy', kind: 'gift', name: 'Fizz Candy', gift: 'snacks' },
  { id: 'gift-tape', kind: 'gift', name: 'Mix Tape', gift: 'music' }, { id: 'gift-earbuds', kind: 'gift', name: 'Spare Earbuds', gift: 'music' },
  { id: 'gift-gloves', kind: 'gift', name: 'Grip Gloves', gift: 'gear' }, { id: 'gift-kit', kind: 'gift', name: 'Tune-Up Kit', gift: 'gear' },
  { id: 'gift-succulent', kind: 'gift', name: 'Tiny Succulent', gift: 'plants' }, { id: 'gift-seeds', kind: 'gift', name: 'Seed Packet', gift: 'plants' },
  { id: 'gift-novel', kind: 'gift', name: 'Paperback Novel', gift: 'books' }, { id: 'gift-atlas', kind: 'gift', name: 'Pocket Atlas', gift: 'books' },
  { id: 'gift-pin', kind: 'gift', name: 'Enamel Pin', gift: 'keepsakes' }, { id: 'gift-postcard', kind: 'gift', name: 'Postcard', gift: 'keepsakes' },
]
export const ITEMS: readonly Item[] = [...FURNITURE, ...KEEPSAKES, ...GIFTS]
