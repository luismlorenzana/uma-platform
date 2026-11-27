import { parseIllustrations, type Illustration } from '@luismlorenzana/uma-data'
import { posix } from 'node:path'
import { ILLUSTRATIONS_DIR } from './illustration-release'
import { writeIllustrationThumbnail } from './illustration-thumbnail'
import { readLocalManifest, readVerifiedFile, writeLocalManifest, writeReleaseFile } from './release-dir'

/** Build previews from a mirrored release, retaining its full-size objects and all other art families. */
export async function backfillIllustrationThumbnails(releaseDir: string, universe: string) {
  const release = await readLocalManifest(releaseDir)
  if (!release?.art) throw new Error('Mirror a published release with an art index first')
  const files = new Map(release.files.map(file => [file.path, file]))
  const read = (path: string) => {
    const file = files.get(path)
    if (!file) throw new Error(`${path} is missing from the base release`)
    return readVerifiedFile(releaseDir, file)
  }
  const put = async (stem: string, bytes: Uint8Array) => {
    const file = await writeReleaseFile(releaseDir, ILLUSTRATIONS_DIR, stem, 'webp', bytes)
    files.set(file.path, file)
    return file
  }
  const index = JSON.parse((await read(release.art)).toString('utf8')) as { illustrations?: Record<string, string> }
  const manifests = { ...index.illustrations }
  const pending = new Map<string, Promise<NonNullable<Illustration['thumbnail']>>>()
  function thumbnailFor(scene: Illustration) {
    let thumbnail = pending.get(scene.path)
    if (!thumbnail) {
      const stem = posix.basename(scene.path).replace(/\.[a-f0-9]{16}\.webp$/, '')
      thumbnail = read(scene.path).then(bytes => writeIllustrationThumbnail(put, stem, bytes))
      pending.set(scene.path, thumbnail)
    }
    return thumbnail
  }
  for (const [key, path] of Object.entries(manifests)) {
    const current = parseIllustrations(JSON.parse((await read(path)).toString('utf8')), path)
    if (current.universe !== universe || current.scenes.every(scene => scene.thumbnail)) continue
    const scenes = await Promise.all(current.scenes.map(async scene =>
      scene.thumbnail ? scene : { ...scene, thumbnail: await thumbnailFor(scene) }))
    const json = JSON.stringify({ ...current, scenes })
    parseIllustrations(JSON.parse(json), path)
    const updated = await writeReleaseFile(releaseDir, ILLUSTRATIONS_DIR, key.replace(':', '-'), 'json', json)
    files.set(updated.path, updated)
    files.delete(path)
    manifests[key] = updated.path
  }
  if (pending.size === 0) return { release, thumbnails: 0 }
  const art = await writeReleaseFile(releaseDir, 'data', 'art', 'json', JSON.stringify({ ...index, illustrations: manifests }))
  files.set(art.path, art)
  files.delete(release.art)
  return { release: await writeLocalManifest(releaseDir, { ...release, art: art.path, files: [...files.values()] }), thumbnails: pending.size }
}
