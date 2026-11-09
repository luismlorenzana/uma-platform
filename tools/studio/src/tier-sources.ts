// The two public character lists the boss boards import from (P115), and the image cuts. Pure but for sharp, so the
// tests run it on invented data.
import sharp from 'sharp'
import type { Category } from './tier-model.js'

export type Kind = 'face' | 'art' | 'splash'
/** How each image is cut: a face square, a vertical stage figure, a wide splash. Never upscaled. */
export type Source = { url: string; fallbacks?: string[]; cut: 'face' | 'center-figure' | 'trim-figure' | 'splash' } | { file: string; cut: 'face' | 'trim-figure' | 'splash' }
export interface Candidate { key: string; name: string; category: Category; details: string[]; images: Partial<Record<Kind, Source>> }
const title = (s: string) => s.toLowerCase().replace(/(^|[\s_-])\w/g, (m) => m.toUpperCase()).replace(/_/g, ' ')

// ---- Genshin Impact: Project Amber's character list ----

const GI_ELEMENT: Record<string, string> = { Ice: 'Cryo', Wind: 'Anemo', Electric: 'Electro', Water: 'Hydro', Fire: 'Pyro', Rock: 'Geo', Grass: 'Dendro' }
const GI_WEAPON: Record<string, string> = { WEAPON_SWORD_ONE_HAND: 'Sword', WEAPON_CLAYMORE: 'Claymore', WEAPON_POLE: 'Polearm', WEAPON_BOW: 'Bow', WEAPON_CATALYST: 'Catalyst' }
const GI_FEMALE = new Set(['GIRL', 'LADY', 'LOLI'])
export interface AmberAvatar { id: number; rank: number; name: string; element: string; weaponType: string; region: string; bodyType: string; icon: string; release: number }
export function genshinCandidates(items: AmberAvatar[], now = Date.now()): Candidate[] {
  const seen = new Set<string>()
  return items.filter((a) => GI_FEMALE.has(a.bodyType) && a.release * 1000 <= now).sort((a, b) => a.id - b.id).flatMap((a): Candidate[] => {
    if (seen.has(a.name)) return []
    seen.add(a.name)
    const ui = (name: string) => `https://gi.yatta.moe/assets/UI/${name}.png`, splash = ui(a.icon.replace('UI_AvatarIcon_', 'UI_Gacha_AvatarImg_'))
    return [{ key: String(a.id), name: a.name, category: 'playable', details: [`${a.rank}★`, a.element && (GI_ELEMENT[a.element] ?? a.element), a.weaponType && (GI_WEAPON[a.weaponType] ?? title(a.weaponType)), a.region && a.region !== 'MAINACTOR' && title(a.region)].filter((d): d is string => typeof d === 'string' && d.length > 0),
      images: { face: { url: ui(a.icon), cut: 'face' }, art: { url: splash, cut: 'center-figure' }, splash: { url: splash, cut: 'splash' } } }]
  })
}

// ---- Wuthering Waves: Encore's resonator list ----

export interface EncoreRole { Id: number; Name: string; QualityId: number; Element?: { Name: string }; WeaponType?: { Name: string } }
export interface EncoreDetail { Id: number; RoleType: number; IsTrial: boolean; RoleBody?: string; favorRole?: { Sex?: { Content?: string } }; RoleHeadIconLarge?: string; RolePortrait?: string; FormationRoleCard?: string; Skins?: { PreviewRoleCard?: string }[] }
const resource = (url: string | undefined) => url?.replace('/api/resource/', '/resource/')
export function wuwaCandidates(details: { role: EncoreRole; detail: EncoreDetail }[]): Candidate[] {
  const seen = new Set<string>()
  return details.filter(({ detail: d }) => d.RoleType === 1 && !d.IsTrial && (d.favorRole?.Sex?.Content === 'Female' || d.RoleBody?.startsWith('Female')))
    .sort((a, b) => a.role.Id - b.role.Id).flatMap(({ role, detail }): Candidate[] => {
      // The Rover is one character in several attributes: the female Rover once.
      const name = role.Name.startsWith('Rover') ? 'Rover' : role.Name
      if (seen.has(name)) return []
      seen.add(name)
      const images: Candidate['images'] = {}, face = resource(detail.RoleHeadIconLarge), card = resource(detail.FormationRoleCard)
      // The full-body portrait, or for the newest resonators (no portrait yet) a skin preview.
      const arts = [detail.RolePortrait, ...(detail.Skins ?? []).map((s) => s.PreviewRoleCard)].map(resource).filter((u): u is string => !!u)
      if (face) images.face = { url: face, cut: 'face' }
      if (arts[0]) images.art = { url: arts[0], fallbacks: arts.slice(1), cut: 'trim-figure' }
      if (card) images.splash = { url: card, cut: 'splash' }
      return [{ key: String(role.Id), name, category: 'playable', details: [`${role.QualityId}★`, ...(role.Element ? [role.Element.Name] : []), ...(role.WeaponType ? [role.WeaponType.Name] : [])], images }]
    })
}

// ---- Encoding ----

/** The same cuts as uma-rpg's enemy release: a 128 face, a 480 × 720 figure, a 1280 × 720 splash, as WebP. */
export async function encode(bytes: Buffer, cut: Source['cut']): Promise<Buffer> {
  const image = sharp(bytes, { failOn: 'error' }).rotate()
  if (cut === 'face') return image.resize(128, 128, { fit: 'cover', position: 'top', withoutEnlargement: true }).webp({ quality: 85 }).toBuffer()
  if (cut === 'splash') return image.resize(1280, 720, { fit: 'inside', withoutEnlargement: true }).webp({ quality: 80 }).toBuffer()
  if (cut === 'center-figure') {
    // A wish splash is wide with the character near its middle: a 2:3 cut from its centre.
    const { width = 0, height = 0 } = await image.metadata(), w = Math.min(width, Math.round(height * 2 / 3))
    return sharp(bytes).extract({ left: Math.round((width - w) / 2), top: 0, width: w, height }).resize(480, 720, { fit: 'inside', withoutEnlargement: true }).webp({ quality: 82 }).toBuffer()
  }
  const trimmed = await image.trim().toBuffer()
  return sharp(trimmed).resize(480, 720, { fit: 'inside', withoutEnlargement: true }).webp({ quality: 82 }).toBuffer()
}

// ---- Honkai: Star Rail: Project Yatta's list, StarRailRes's images, gender from the character's own stories ----

export interface YattaStarRail { id: number; name: string; rank: number; types: { pathType: string; combatType: string }; release: number }
export interface StarRailResCharacter { id: string; tag: string; icon: string; portrait: string }
const HSR_PATH: Record<string, string> = { Knight: 'Preservation', Rogue: 'The Hunt', Mage: 'Erudition', Warlock: 'Nihility', Warrior: 'Destruction', Shaman: 'Harmony', Priest: 'Abundance', Memory: 'Remembrance' }
const HSR_TYPE: Record<string, string> = { Thunder: 'Lightning' }
/**
 * No Star Rail list carries a gender, so it's read from the character's own third-person story text: "she/her" against
 * "he/him", plus "girl/woman/lady" against "boy/man". Clear only with three or more and twice the other side.
 */
export function pronounGender(text: string): 'female' | 'male' | null {
  const count = (re: RegExp) => (text.match(re) ?? []).length
  const she = count(/\b(she|her|hers|herself|girl|woman|lady|sister|daughter|princess|queen)\b/gi)
  const he = count(/\b(he|him|his|himself|boy|man|gentleman|brother|son|prince|king)\b/gi)
  if (she >= 3 && she > he * 2) return 'female'
  if (he >= 3 && he > she * 2) return 'male'
  return null
}
/** Checked by hand (2026-11-09) where a character's stories don't settle it: by id, never by name. */
export const HSR_GENDER: Readonly<Record<number, 'female' | 'male'>> = { 1105: 'female', 1207: 'female', 1210: 'female', 1221: 'female', 1224: 'female', 1313: 'male', 1405: 'male', 1415: 'female' }
const plain = (name: string) => name.replace(/<[^>]*>/g, '').trim()
export function hsrCandidates(list: YattaStarRail[], res: Record<string, StarRailResCharacter>, gender: ReadonlyMap<number, 'female' | 'male' | null>, now = Date.now()): Candidate[] {
  const seen = new Set<string>(), base = 'https://raw.githubusercontent.com/Mar-7th/StarRailRes/master/'
  return list.filter((a) => a.release * 1000 <= now).sort((a, b) => a.id - b.id).flatMap((a): Candidate[] => {
    const r = res[String(a.id)], trailblazer = a.id >= 8000
    // The Trailblazer is one character on several Paths: the female Trailblazer once.
    const female = trailblazer ? !!r?.tag.includes('playergirl') : (HSR_GENDER[a.id] ?? gender.get(a.id)) === 'female'
    const name = trailblazer ? 'Trailblazer' : plain(a.name)
    if (!female || !r || seen.has(name)) return []
    seen.add(name)
    return [{ key: String(a.id), name, category: 'playable', details: [`${a.rank}★`, HSR_PATH[a.types.pathType] ?? a.types.pathType, HSR_TYPE[a.types.combatType] ?? a.types.combatType],
      images: { face: { url: base + r.icon, cut: 'face' }, art: { url: base + r.portrait, cut: 'trim-figure' }, splash: { url: base + r.portrait, cut: 'splash' } } }]
  })
}

// ---- Zenless Zone Zero: Enka's agent list, whose internal names say Female or Male ----

export interface EnkaAgent { Name: string; Rarity: number; ProfessionType: string; ElementTypes: string[]; Image: string; CircleIcon: string }
const ZZZ_ELEMENT: Record<string, string> = { Elec: 'Electric', Physics: 'Physical', Ether: 'Ether', Fire: 'Fire', Ice: 'Ice', FireFrost: 'Frost', AuricEther: 'Auric Ink', Wind: 'Wind', Lumen: 'Lumen' }
export function zzzCandidates(agents: Record<string, EnkaAgent>, names: Record<string, string>): Candidate[] {
  const seen = new Set<string>()
  return Object.entries(agents).sort((a, b) => Number(a[0]) - Number(b[0])).flatMap(([id, a]): Candidate[] => {
    const name = names[a.Name]
    if (!a.Name.startsWith('Avatar_Female_') || !name || seen.has(name)) return []
    seen.add(name)
    return [{ key: id, name, category: 'playable', details: [a.Rarity >= 4 ? 'S-rank' : 'A-rank', a.ProfessionType, ...a.ElementTypes.map((e) => ZZZ_ELEMENT[e] ?? e)].slice(0, 4),
      images: { face: { url: `https://enka.network${a.CircleIcon}`, cut: 'face' }, art: { url: `https://enka.network${a.Image}`, cut: 'trim-figure' } } }]
  })
}
