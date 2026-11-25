import { characterArtKey, CHARACTER_FACINGS, parseCharacterSprites, type CharacterArtIdentity, type CharacterFacing, type CharacterSpriteCell, type CharacterSpriteVariant } from '@luismlorenzana/uma-data'
import { readFile } from 'node:fs/promises'
import { resolve, sep } from 'node:path'
import sharp from 'sharp'
import { writeCharacterFamilyRelease, type CharacterFamilyEntry, type PutPicture } from './character-family-release'
import { sha256 } from './release-dir'

const OUTFITS = { spring: 'spring', 'pajama-07': 'pajamas', 'farm-work': 'farm-work' } as const
const EDGE = 512
const CELL = { width: 64, height: 88 }
const PAGES = [512, 768, 1024] as const

type Size = { width: number; height: number }
export function characterAtlasLayout(cell: Size, foot: CharacterSpriteCell, frames: number) {
  if (![cell.width, cell.height, foot.x, foot.y, frames].every(Number.isInteger)
    || cell.width < 1 || cell.height < 1 || cell.width > 128 || cell.height > 176
    || foot.x < 0 || foot.x >= cell.width || foot.y < 0 || foot.y >= cell.height || frames < 1) throw new Error('Invalid native sprite geometry')
  const pitch = { x: cell.width + 2, y: cell.height + 2 }
  const edge = PAGES.find(n => Math.floor(n / pitch.x) * Math.floor(n / pitch.y) >= frames)
  if (!edge) throw new Error('Native sprite atlas exceeds 1024 pixels')
  return { edge, pitch, columns: Math.floor(edge / pitch.x) }
}
const CHANNELS = 4
type SourceRect = CharacterSpriteCell & typeof CELL
type Approval = { status: string; by: string }
interface Sheet { image: string; width: number; height: number; sha256: string; approval?: Approval }
interface Study {
  character: { key: string; name: string; characterId: number; outfitId: number }
  results: {
    outfit: string
    standing: { sheet: string; directions: (SourceRect & { direction: CharacterFacing; sha256Rgba: string })[] }
    clips: Record<CharacterFacing, { sheet: string; loop: boolean; durationMs?: number; frames: { rect: SourceRect; durationMs: number; sha256Rgba: string }[] }>
    styleVersions: { frame: Size; anchor: CharacterSpriteCell }
  }[]
}
interface Active { activeVersion: string; ownerApproved: boolean; approval: Approval; approvalRecord: string }
interface Batch { approval: Approval; selections: { key: string; version: string; sheets: Sheet[] }[] }
interface FrameProof { at: CharacterSpriteCell; sourceSha256Rgba: string; sha256Rgba: string }
export interface AtlasProof { path: string; sha256: string; bytes: number; frames: FrameProof[] }
export interface CharacterSpriteProof { key: string; version: string; identity: string; atlases: AtlasProof[] }
const json = async <T>(path: string) => JSON.parse(await readFile(path, 'utf8')) as T
const approved = (approval: Approval | undefined) => approval?.status === 'approved' && approval.by === 'owner'
const under = (base: string, path: string) => {
  const at = resolve(base, path)
  if (!at.startsWith(base + sep)) throw new Error(`Path leaves the authoring folder: ${path}`)
  return at
}

export async function selectedSpriteStudies(root: string, keys: readonly string[]) {
  if (!keys.length || keys.some(key => !/^[a-z0-9-]+$/.test(key)) || new Set(keys).size !== keys.length) throw new Error('Supply distinct approved character slugs')
  return Promise.all([...keys].sort().map(async key => {
    const directory = under(root, `characters/${key}`)
    const active = await json<Active>(resolve(directory, 'active-study.json'))
    if (active.ownerApproved !== true || !approved(active.approval) || !/^v\d{3,}$/.test(active.activeVersion)) throw new Error(`${key}: active study has no owner approval`)
    const batch = await json<Batch>(under(root, resolve(directory, active.approvalRecord)))
    const selection = batch.selections.find(row => row.key === key && row.version === active.activeVersion)
    if (!approved(batch.approval) || !selection || selection.sheets.length !== 15) throw new Error(`${key}: no approval for all fifteen active sheets`)
    const source = resolve(directory, active.activeVersion)
    const study = await json<Study>(resolve(source, 'study.json'))
    const manifest = await json<{ fullBodyAssets: Sheet[] }>(resolve(source, 'manifest.json'))
    if (study.character.key !== key || study.results.length !== 3 || manifest.fullBodyAssets.length !== 15) throw new Error(`${key}: unexpected study identity or sheet count`)
    const files = new Map(manifest.fullBodyAssets.map(sheet => [sheet.image, sheet]))
    for (const sheet of selection.sheets) {
      const file = files.get(sheet.image)
      if (!file || !approved(file.approval) || file.sha256 !== sheet.sha256 || file.width !== sheet.width || file.height !== sheet.height) {
        throw new Error(`${key}: approval hash or size differs for ${sheet.image}`)
      }
    }
    if (files.size !== 15 || new Set(selection.sheets.map(sheet => sheet.image)).size !== 15) throw new Error(`${key}: duplicate sheet`)
    return { key, version: active.activeVersion, directory, source, study, files }
  }))
}

type SelectedStudy = Awaited<ReturnType<typeof selectedSpriteStudies>>[number]

// WebP may pick arbitrary RGB for fully transparent pixels. The alpha and every visible sample are exact.
function visibleRgba(bytes: Buffer): Buffer {
  for (let alpha = 3; alpha < bytes.length; alpha += CHANNELS) {
    if (bytes[alpha] === 0) bytes.fill(0, alpha - 3, alpha)
  }
  return bytes
}

export async function verifyAtlasFrames(bytes: Buffer, proof: readonly FrameProof[], cell: Size = CELL, page: Size = { width: EDGE, height: EDGE }): Promise<void> {
  const meta = await sharp(bytes).metadata()
  if (meta.format !== 'webp' || !meta.hasAlpha || meta.width !== page.width || meta.height !== page.height) throw new Error('Atlas differs from the declared transparent WebP geometry')
  for (const { at, sha256Rgba } of proof) {
    if (at.x < 0 || at.y < 0 || at.x + cell.width > page.width || at.y + cell.height > page.height) throw new Error('Frame outside atlas')
    const crop = await sharp(bytes).extract({ left: at.x, top: at.y, ...cell }).ensureAlpha().raw().toBuffer()
    if (sha256(visibleRgba(crop)) !== sha256Rgba) throw new Error(`Atlas crop differs at ${at.x},${at.y}`)
  }
}

async function atlas(study: SelectedStudy, outfit: Study['results'][number], stem: string, put: PutPicture) {
  const { frame, anchor } = outfit.styleVersions
  const total = outfit.standing.directions.length + Object.values(outfit.clips).reduce((sum, clip) => sum + clip.frames.length, 0)
  const { edge, columns, pitch } = characterAtlasLayout(frame, anchor, total)
  const proofs: FrameProof[] = []
  const pixels = Buffer.alloc(edge * edge * CHANNELS)
  const seen = new Set<string>()
  async function sheet(path: string) {
    const expected = study.files.get(path)
    if (!expected || seen.has(path)) throw new Error(`${stem}: missing or repeated approved sheet ${path}`)
    seen.add(path)
    // An approved revision can reuse a verified sheet from an older revision of the same character.
    const bytes = await readFile(under(study.directory, resolve(study.source, path)))
    const meta = await sharp(bytes).metadata()
    if (sha256(bytes) !== expected.sha256 || meta.format !== 'png' || !meta.hasAlpha || meta.width !== expected.width || meta.height !== expected.height) {
      throw new Error(`${stem}: sheet failed hash or image validation ${path}`)
    }
    return bytes
  }
  async function take(bytes: Buffer, rect: SourceRect, hash: string): Promise<CharacterSpriteCell> {
    const meta = await sharp(bytes).metadata()
    if (![rect.x, rect.y].every(Number.isInteger) || rect.x < 0 || rect.y < 0 || rect.width !== frame.width || rect.height !== frame.height
      || rect.x + rect.width > (meta.width ?? 0) || rect.y + rect.height > (meta.height ?? 0)) throw new Error(`${stem}: invalid frame rectangle`)
    const input = await sharp(bytes).extract({ left: rect.x, top: rect.y, ...frame }).ensureAlpha().raw().toBuffer()
    if (sha256(input) !== hash) throw new Error(`${stem}: an approved frame differs from the source`)
    visibleRgba(input)
    const i = proofs.length
    const at = { x: 1 + i % columns * pitch.x, y: 1 + Math.floor(i / columns) * pitch.y }
    proofs.push({ at, sourceSha256Rgba: hash, sha256Rgba: sha256(input) })
    const stride = frame.width * CHANNELS
    for (let row = 0; row < frame.height; row++) {
      input.copy(pixels, ((at.y + row) * edge + at.x) * CHANNELS, row * stride, (row + 1) * stride)
    }
    return at
  }
  const standing = {} as CharacterSpriteVariant['standing']
  const walking = {} as CharacterSpriteVariant['walking']
  const still = await sheet(outfit.standing.sheet)
  for (const facing of CHARACTER_FACINGS) {
    const view = outfit.standing.directions.find(frame => frame.direction === facing)
    if (outfit.standing.directions.length !== 4 || !view) throw new Error(`${stem}: missing standing ${facing}`)
    standing[facing] = await take(still, view, view.sha256Rgba)
    const walk = outfit.clips[facing]
    const duration = walk.frames.reduce((sum, frame) => sum + frame.durationMs, 0)
    const expectedFrames = facing === 'left' || facing === 'right' ? 8 : 6
    if (walk.loop !== true || walk.frames.length !== expectedFrames || duration !== 660 || (walk.durationMs ?? duration) !== duration) {
      throw new Error(`${stem}: invalid walk timing for ${facing}`)
    }
    const bytes = await sheet(walk.sheet)
    walking[facing] = []
    for (const frame of walk.frames) walking[facing].push({ ...await take(bytes, frame.rect, frame.sha256Rgba), durationMs: frame.durationMs })
  }
  const bytes = await sharp(pixels, { raw: { width: edge, height: edge, channels: CHANNELS } })
    .webp({ lossless: true }).toBuffer()
  try { await verifyAtlasFrames(bytes, proofs, frame, { width: edge, height: edge }) }
  catch (error) { throw new Error(`${stem}: ${error instanceof Error ? error.message : String(error)}`, { cause: error }) }
  const entry = await put(stem, bytes)
  const variant: CharacterSpriteVariant = { cell: frame, foot: anchor, page: { path: entry.path, width: edge, height: edge }, standing, walking }
  return { variant, proof: { path: entry.path, sha256: entry.sha256, bytes: entry.bytes, frames: proofs }, sheets: seen }
}

export async function packCharacterSprites(releaseDir: string, studies: readonly SelectedStudy[], identityOf: (name: string) => CharacterArtIdentity | null) {
  const proofs: CharacterSpriteProof[] = []
  const entries: CharacterFamilyEntry[] = studies.map(study => {
    const identity = identityOf(study.study.character.name)
    if (!identity || identity.characterId !== study.study.character.characterId ||
        (identity.outfitId !== undefined && identity.outfitId !== study.study.character.outfitId)) throw new Error(`${study.key}: unexpected master identity`)
    const id = characterArtKey(identity.characterId, identity.outfitId)
    return { ...identity, async build(put) {
      const used = new Set<string>()
      const variants: Record<string, CharacterSpriteVariant> = {}
      const atlases: AtlasProof[] = []
      for (const [source, name] of Object.entries(OUTFITS)) {
        const result = study.study.results.find(outfit => outfit.outfit === source)
        if (!result) throw new Error(`${study.key}: missing ${source}`)
        const packed = await atlas(study, result, `${id.replace(':', '-')}-${name}`, put)
        variants[name] = packed.variant
        atlases.push(packed.proof)
        for (const sheet of packed.sheets) used.add(sheet)
      }
      if (used.size !== 15) throw new Error(`${study.key}: some approved sheets are unused`)
      proofs.push({ key: study.key, version: study.version, identity: id, atlases })
      return { ...identity, variants }
    } }
  })
  const manifest = await writeCharacterFamilyRelease(releaseDir, { dir: 'art/character-sprites', key: 'characterSprites', parse: parseCharacterSprites }, entries)
  return { manifest, proofs }
}
