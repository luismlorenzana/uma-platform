export const artCategories = {
  'character-sprites': 'Character Sprites',
  'duo-splash': 'Duo Splash Art',
  'pajama-outfits': 'Pajama Outfits',
  'wedding-anniversary-outfits': 'Wedding Anniversary Outfits',
  'pajama-splash': 'Pajama Splash',
  'wedding-anniversary-splash': 'Wedding Anniversary Splash',
  weapons: 'Weapons',
  'combat-sprites': 'Combat Sprites',
} as const

export type ArtCategory = keyof typeof artCategories
