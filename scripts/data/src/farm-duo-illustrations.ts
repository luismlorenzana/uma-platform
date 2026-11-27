import { characterArtKey, parseIllustrations, type CharacterArtIdentity, type Illustration, type Illustrations, type ReleaseFile } from '@luismlorenzana/uma-data'
import { ILLUSTRATIONS_DIR } from './illustration-release'
import { writeIllustrationThumbnail } from './illustration-thumbnail'
import { packIllustrations, type UniverseArtEntry, type UniverseArtIndex } from './illustrations'
import { readLocalManifest, readVerifiedFile, writeLocalManifest, writeReleaseFile } from './release-dir'

const BED_POSES = ['recline', 'kiss', 'kneel', 'crawl-kiss'] as const
type DuoPose = 'couch' | typeof BED_POSES[number]
type Participant = CharacterArtIdentity & { id: string }

interface DuoArt {
  look: UniverseArtEntry
  people: [Participant, Participant]
  pose: DuoPose
  approvedOn: string
}

const participant = (member: NonNullable<UniverseArtEntry['duo']>['members'][number]): Participant | null => {
  const { id, role, characterId, outfitId } = member
  if (role !== 'character' || typeof id !== 'string' || characterId === undefined || !Number.isSafeInteger(characterId) || characterId <= 0) return null
  if (id === String(characterId)) return { id, characterId }
  if (outfitId !== undefined && Number.isSafeInteger(outfitId) && outfitId > 0 && id === `s${outfitId}`) return { id, characterId, outfitId }
  return null
}

export function planFarmDuoArt(index: UniverseArtIndex): DuoArt[] {
  if (index.universe !== 'farm-life') return []
  const planned: DuoArt[] = [], claimed = new Set<string>()
  for (const look of index.looks) {
    if (look.category !== 'duo-splash') continue
    const pose = look.id.endsWith('-pjm01-couch') ? 'couch' : BED_POSES.find(value => look.id.endsWith(`-pjm01-bed-${value}`))
    if (!pose) continue
    const suffix = pose === 'couch' ? 'couch' : `bed-${pose}`
    const pair = look.duo
    const people = Array.isArray(pair?.members) ? pair.members.map(participant) : []
    const [a, b] = people
    if (look.kind !== 'splash' || !pair || !a || !b || people.length !== 2 || a.id === b.id
      || pair.id !== `farm-${a.id}-${b.id}` || look.id !== `duo-${pair.id}-pjm01-${suffix}`
      || !look.approvedOn || !/^\d{4}-\d{2}-\d{2}$/.test(look.approvedOn)) {
      throw new Error(`${look.id}: expected an approved Farm duo scene with two cast identities`)
    }
    const key = [a.id, b.id].sort().join(':') + ':' + pose
    if (claimed.has(key)) throw new Error(`${look.id}: duplicate pose for this Farm duo`)
    claimed.add(key)
    planned.push({ look, people: [a, b], pose, approvedOn: look.approvedOn })
  }
  return planned
}

/** Adds shared WebPs and links each one from both existing character manifests. */
export async function writeFarmDuoArt(releaseDir: string, mirror: string, planned: readonly DuoArt[]) {
  const release = await readLocalManifest(releaseDir)
  if (!release?.art) throw new Error('A base art release is required to pack Farm duo scenes')
  if (!planned.length) return release
  const files = new Map(release.files.map(file => [file.path, file]))
  const fileAt = (path: string): ReleaseFile => {
    const file = files.get(path)
    if (!file) throw new Error(`${path} is missing from the base release`)
    return file
  }
  const index = JSON.parse((await readVerifiedFile(releaseDir, fileAt(release.art))).toString('utf8')) as { illustrations?: Record<string, string> }
  const manifests = { ...index.illustrations }
  const pending = new Map<string, Illustrations>()
  const keep = (file: ReleaseFile) => { files.set(file.path, file); return file }
  for (const { look, people, pose, approvedOn } of planned) {
    const [first, second] = people
    const moment = `duo-night-${pose}`
    const packed = await packIllustrations(mirror, 'farm-life', {
      characterId: first.characterId,
      name: look.character,
      scenes: [{ id: moment, universeId: look.id, title: look.title, outfit: 'duo', moment, approvedOn, path: look.path,
        sha256: look.sha256, width: look.width, height: look.height }],
    })
    const image = packed.scenes[0]!
    const file = keep(await writeReleaseFile(releaseDir, ILLUSTRATIONS_DIR, look.id, 'webp', image.bytes))
    const thumbnail = await writeIllustrationThumbnail(async (stem, bytes) =>
      keep(await writeReleaseFile(releaseDir, ILLUSTRATIONS_DIR, stem, 'webp', bytes)), look.id, image.bytes)
    for (const [who, partner] of [[first, second], [second, first]] as const) {
      const key = characterArtKey(who.characterId, who.outfitId)
      let current = pending.get(key)
      if (!current) {
        const path = manifests[key]
        current = path
          ? parseIllustrations(JSON.parse((await readVerifiedFile(releaseDir, fileAt(path))).toString('utf8')), path)
          : { characterId: who.characterId, ...(who.outfitId === undefined ? {} : { outfitId: who.outfitId }), universe: 'farm-life', scenes: [] }
        pending.set(key, current)
      }
      const scene: Illustration = { id: `duo-${partner.id}-${pose}`, title: image.title, outfit: image.outfit, moment: image.moment,
        approvedOn, ...file, width: image.width, height: image.height, thumbnail }
      current.scenes = [...current.scenes.filter(other => other.id !== scene.id), scene]
    }
  }
  for (const [key, current] of pending) {
    const json = JSON.stringify(current)
    parseIllustrations(JSON.parse(json), key)
    const previous = manifests[key]
    if (previous) files.delete(previous)
    manifests[key] = keep(await writeReleaseFile(releaseDir, ILLUSTRATIONS_DIR, key.replace(':', '-'), 'json', json)).path
  }
  files.delete(release.art)
  const art = keep(await writeReleaseFile(releaseDir, 'data', 'art', 'json', JSON.stringify({ ...index, illustrations: manifests })))
  return writeLocalManifest(releaseDir, { ...release, art: art.path, files: [...files.values()] })
}
