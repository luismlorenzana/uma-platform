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

// ---- Wiki imports, unfiltered (P120): Honkai Impact 3rd's battlesuits and Punishing: Gray Raven's frames ----

/** A wiki page as the importer reads it through the MediaWiki API: its title, its categories, its wikitext. */
export interface WikiPage { title: string; categories?: string[]; content?: string }
/** The wiki files each image may come from, best first; the importer resolves them to URLs. */
export type WikiImages = Partial<Record<Kind, { files: string[]; cut: 'face' | 'center-figure' | 'trim-figure' | 'splash' }>>
/** A stable id from a wiki title: "Lucia: Crimson Weave" is `lucia-crimson-weave`. */
export const slug = (title: string): string => title.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 90)
function resolved(spec: WikiImages, url: (file: string) => string | undefined): Candidate['images'] {
  const images: Candidate['images'] = {}
  for (const [kind, s] of Object.entries(spec) as [Kind, NonNullable<WikiImages[Kind]>][]) {
    const urls = s.files.map(url).filter((u): u is string => !!u)
    if (urls[0]) images[kind] = { url: urls[0], fallbacks: urls.slice(1), cut: s.cut }
  }
  return images
}
function unique(list: Candidate[]): Candidate[] {
  const seen = new Set<string>()
  return list.flatMap((c) => {
    if (!c.key || seen.has(c.key)) return []
    seen.add(c.key)
    return [c]
  })
}

/** A battlesuit's files on the Honkai Impact 3rd wiki: "A: B" is filed as "A - B". */
export function hi3Images(title: string): WikiImages {
  const base = title.replace(/: /g, ' - ')
  return {
    face: { files: [`${base} (Icon).png`, `${base} (Avatar).png`], cut: 'face' },
    art: { files: [`${base}.png`, `${base} (Thumbnail).png`], cut: 'center-figure' },
    splash: { files: [`${base}.png`], cut: 'splash' },
  }
}
/** Every battlesuit, one card each; its valkyrie, rank and type come from the page's categories. */
export function hi3Candidates(pages: WikiPage[], url: (file: string) => string | undefined): Candidate[] {
  return unique([...pages].sort((a, b) => a.title.localeCompare(b.title)).map((p): Candidate => {
    const cats = (p.categories ?? []).map((c) => c.replace(/^Category:/, ''))
    const rank = cats.map((c) => /^(\w+)-rank Battlesuits$/.exec(c)?.[1]).find(Boolean)
    const type = cats.map((c) => /^(\w+)-type Battlesuits$/.exec(c)?.[1]).find(Boolean)
    const valkyrie = cats.filter((c) => !/-(rank|type) Battlesuits$/.test(c)).map((c) => /^(.+) Battlesuits$/.exec(c)?.[1]?.replace(/^"(.*)"$/, '$1')).find(Boolean)
    return { key: slug(p.title), name: p.title, category: 'playable', details: [valkyrie, rank && `${rank}-rank`, type].filter((d): d is string => !!d).map((d) => d.slice(0, 40)), images: resolved(hi3Images(p.title), url) }
  }))
}

/** The `{{Character}}` infobox on a Punishing: Gray Raven wiki page (grayravens.com), as name/value pairs. */
export function pgrInfobox(content: string): Record<string, string> {
  const box = /\{\{Character\s*\n([\s\S]*?)\n\}\}/.exec(content)?.[1] ?? ''
  return Object.fromEntries(box.split('\n').flatMap((line) => {
    const m = /^\|\s*([\w ]+?)\s*=\s*(.*)$/.exec(line)
    return m ? [[m[1]!, m[2]!.trim()]] : []
  }))
}
/** A frame's files on grayravens.com: the frame name without spaces or apostrophes. */
export function pgrImages(frame: string): WikiImages {
  const base = frame.replace(/[ ']/g, '')
  return { face: { files: [`Dialogue-${base}-Icon.png`], cut: 'face' }, art: { files: [`Character-${base}-Portrait.png`], cut: 'trim-figure' } }
}
/** Every frame, one card each. A collaboration character has no frame name of her own ("2B"), and is tagged. */
export function pgrCandidates(pages: WikiPage[], url: (file: string) => string | undefined): Candidate[] {
  return unique([...pages].sort((a, b) => a.title.localeCompare(b.title)).flatMap((p): Candidate[] => {
    const box = pgrInfobox(p.content ?? '')
    if (!box.Name || !box.Frame) return []
    const elements = [...(box.Element ?? '').replace(/\[\[[^\]]*\]\]/g, '').matchAll(/([A-Za-z]+)\s*\((\d+)%\)/g)].sort((a, b) => Number(b[2]) - Number(a[2]))
    const collab = box.Frame === box.Name
    return [{ key: slug(p.title), name: p.title, category: 'playable',
      details: [box.Rank && `${box.Rank}-Rank`, box.Class, elements[0]?.[1], collab && 'Collab'].filter((d): d is string => typeof d === 'string' && d.length > 0).map((d) => d.slice(0, 40)),
      images: resolved(pgrImages(box.Frame), url) }]
  }))
}
