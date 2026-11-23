import { characterArtKey, CHARACTER_FACINGS, parseCharacterSprites, type CharacterArtIdentity, type CharacterFacing, type CharacterSpriteCell, type CharacterSpriteVariant } from '@luismlorenzana/uma-data'
import { readFile } from 'node:fs/promises'
import { resolve, sep } from 'node:path'
import sharp from 'sharp'
import { writeCharacterFamilyRelease, type CharacterFamilyEntry, type PutPicture } from './character-family-release'
import { sha256 } from './release-dir'

const OUTFITS = { spring: 'spring', 'pajama-07': 'pajamas', 'farm-work': 'farm-work' } as const
const EDGE = 512
const CELL = { width: 64, height: 88 }
const FOOT = { x: 32, y: 84 }
const PITCH = { x: CELL.width + 2, y: CELL.height + 2 }
const COLUMNS = Math.floor(EDGE / PITCH.x)
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
    styleVersions: { frame: typeof CELL; anchor: typeof FOOT }
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
    return { key, version: active.activeVersion, source, study, files }
  }))
}

type SelectedStudy = Awaited<ReturnType<typeof selectedSpriteStudies>>[number]

export async function verifyAtlasFrames(bytes: Buffer, proof: readonly FrameProof[]): Promise<void> {
  const meta = await sharp(bytes).metadata()
  if (meta.format !== 'webp' || !meta.hasAlpha || meta.width !== EDGE || meta.height !== EDGE) throw new Error('Expected a transparent 512 × 512 WebP atlas')
  for (const { at, sha256Rgba } of proof) {
    const crop = await sharp(bytes).extract({ left: at.x, top: at.y, ...CELL }).ensureAlpha().raw().toBuffer()
    if (sha256(crop) !== sha256Rgba) throw new Error(`Atlas crop differs at ${at.x},${at.y}`)
  }
}

async function atlas(study: SelectedStudy, outfit: Study['results'][number], stem: string, put: PutPicture) {
  const { frame, anchor } = outfit.styleVersions
  if (frame.width !== CELL.width || frame.height !== CELL.height || anchor.x !== FOOT.x || anchor.y !== FOOT.y) throw new Error(`${stem}: unexpected geometry`)
  const proofs: FrameProof[] = []
  const pixels = Buffer.alloc(EDGE * EDGE * CHANNELS)
  const seen = new Set<string>()
  async function sheet(path: string) {
    const expected = study.files.get(path)
    if (!expected || seen.has(path)) throw new Error(`${stem}: missing or repeated approved sheet ${path}`)
    seen.add(path)
    const bytes = await readFile(under(study.source, path))
    const meta = await sharp(bytes).metadata()
    if (sha256(bytes) !== expected.sha256 || meta.format !== 'png' || !meta.hasAlpha || meta.width !== expected.width || meta.height !== expected.height) {
      throw new Error(`${stem}: sheet failed hash or image validation ${path}`)
    }
    return bytes
  }
  async function take(bytes: Buffer, rect: SourceRect, hash: string): Promise<CharacterSpriteCell> {
    if (rect.width !== CELL.width || rect.height !== CELL.height) throw new Error(`${stem}: invalid frame rectangle`)
    const input = await sharp(bytes).extract({ left: rect.x, top: rect.y, ...CELL }).ensureAlpha().raw().toBuffer()
    if (sha256(input) !== hash) throw new Error(`${stem}: an approved frame differs from the source`)
    // RGB under completely transparent pixels is discarded by WebP. Canonicalize only those bytes.
    for (let alpha = 3; alpha < input.length; alpha += CHANNELS) {
      if (input[alpha] === 0) input.fill(0, alpha - 3, alpha)
    }
    const i = proofs.length
    const at = { x: 1 + i % COLUMNS * PITCH.x, y: 1 + Math.floor(i / COLUMNS) * PITCH.y }
    proofs.push({ at, sourceSha256Rgba: hash, sha256Rgba: sha256(input) })
    const stride = CELL.width * CHANNELS
    for (let row = 0; row < CELL.height; row++) {
      input.copy(pixels, ((at.y + row) * EDGE + at.x) * CHANNELS, row * stride, (row + 1) * stride)
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
  const bytes = await sharp(pixels, { raw: { width: EDGE, height: EDGE, channels: CHANNELS } })
    .webp({ lossless: true }).toBuffer()
  await verifyAtlasFrames(bytes, proofs)
  const entry = await put(stem, bytes)
  const variant: CharacterSpriteVariant = { cell: CELL, foot: FOOT, page: { path: entry.path, width: EDGE, height: EDGE }, standing, walking }
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
