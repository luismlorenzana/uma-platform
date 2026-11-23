import { createReleaseClient, ReleaseSourceError, type ReleaseSource } from '@luismlorenzana/uma-data'
import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { artIdentityLookup, artIdentityOverrides, scopedArtIdentityOverrides } from './art-identities'
import { packCharacterSprites, selectedSpriteStudies, verifyAtlasFrames, type CharacterSpriteProof } from './character-sprite-pack'
import { DEFAULT_BUCKET, DEFAULT_PROJECT, GcloudStorageClient } from './gcloud-storage'
import { writeLocalManifest } from './release-dir'

function required(name: string): string {
  const val = process.argv.find(arg => arg.startsWith(name + '='))?.slice(name.length + 1)
  if (!val) throw new Error(`Supply ${name}=VALUE`)
  return val
}

async function main() {
  const storage = new GcloudStorageClient(process.env.UMA_RELEASE_BUCKET ?? DEFAULT_BUCKET, process.env.UMA_GCP_PROJECT ?? DEFAULT_PROJECT)
  const source: ReleaseSource = { async read(path) {
    const bytes = await storage.read(path)
    if (!bytes) throw new ReleaseSourceError(path, 404, 'Object is missing')
    return new Uint8Array(bytes)
  } }
  const client = createReleaseClient({ source })
  if (process.argv.includes('--check-candidate')) {
    const receipt = JSON.parse(await readFile(resolve(required('--receipt')), 'utf8')) as { base: string; proofs: CharacterSpriteProof[] }
    const target = required('--version')
    const [base, candidate] = await Promise.all([client.manifest(receipt.base), client.manifest(target)])
    const [before, after] = await Promise.all([client.art(base), client.art(candidate)])
    if (!before || !after) throw new Error('The base and candidate must have an art index')
    const { characterSprites: previous = {}, ...oldArt } = before
    const { characterSprites: sprites = {}, ...newArt } = after
    if (JSON.stringify(oldArt) !== JSON.stringify(newArt) || JSON.stringify(base.sets) !== JSON.stringify(candidate.sets)) throw new Error('The candidate changed unrelated art or data')
    const expected = new Map(receipt.proofs.map(proof => [proof.identity, proof]))
    for (const key of Object.keys(sprites)) {
      if (!expected.has(key) && sprites[key] !== previous[key]) throw new Error(`Unexpected walking sprite identity ${key}`)
    }
    for (const [key, path] of Object.entries(previous)) {
      if (!expected.has(key) && sprites[key] !== path) throw new Error(`Missing walking sprite identity ${key}`)
    }
    const next = new Map(candidate.files.map(file => [file.path, file]))
    for (const file of base.files) {
      if (file.path !== base.art && next.get(file.path)?.sha256 !== file.sha256) throw new Error(`Candidate replaced ${file.path}`)
    }
    let atlasCount = 0
    let frameCount = 0
    let bytes = 0
    for (const proof of receipt.proofs) {
      const path = sprites[proof.identity]
      if (!path) throw new Error(`Missing descriptor for ${proof.key}`)
      const [characters, outfits] = await Promise.all([client.set(base, 'characters'), client.set(base, 'outfits')])
      const identity = proof.identity.startsWith('outfit:') ? outfits.find(row => row.id === Number(proof.identity.slice(7))) : null
      const characterId = identity?.characterId ?? Number(proof.identity)
      if (!characters.some(row => row.id === characterId)) throw new Error(`Missing master identity for ${proof.key}`)
      const set = await client.characterSprites(candidate, after, characterId, identity?.id)
      const variants = set && Object.values(set.variants)
      if (!set || !variants || Object.keys(set.variants).sort().join(',') !== 'farm-work,pajamas,spring') throw new Error(`Wrong wardrobe for ${proof.key}`)
      for (const atlas of proof.atlases) {
        if (!variants.some(variant => variant.page.path === atlas.path)) throw new Error(`Descriptor does not use approved atlas for ${proof.key}`)
        const file = next.get(atlas.path)
        if (!file || file.sha256 !== atlas.sha256 || file.bytes !== atlas.bytes) throw new Error(`Manifest does not match approved atlas for ${proof.key}`)
        const packed = Buffer.from(await client.file(candidate, atlas.path))
        await verifyAtlasFrames(packed, atlas.frames)
        atlasCount += 1
        frameCount += atlas.frames.length
        bytes += packed.length
      }
    }
    console.log(`Verified private candidate ${candidate.version} against ${base.version}: ${expected.size} characters, ${atlasCount} atlases, ${frameCount} exact decoded frame hashes, ${bytes} bytes.`)
    return
  }

  const directory = resolve(required('--release-dir'))
  const studies = await selectedSpriteStudies(resolve(required('--source')), required('--only').split(','))
  const base = await client.manifest()
  const [characters, outfits, overrides] = await Promise.all([client.set(base, 'characters'), client.set(base, 'outfits'), artIdentityOverrides('farm-life')])
  const identityOf = artIdentityLookup(characters, outfits, scopedArtIdentityOverrides(overrides, studies.map(study => study.study.character.name)))
  // The family composer reads this staging manifest. Only its generated sprite family is uploaded.
  const setFiles = new Set(Object.values(base.sets))
  await writeLocalManifest(directory, { sources: base.sources, sets: base.sets, art: null, files: base.files.filter(file => setFiles.has(file.path)) })
  const { manifest, proofs } = await packCharacterSprites(directory, studies, identityOf)
  await writeFile(resolve(directory, 'sprite-proof.json'), JSON.stringify({ base: base.version, proofs }))
  const atlases = proofs.flatMap(proof => proof.atlases)
  console.log(`Local pack ${manifest.version} on ${base.version}: ${proofs.length} characters, ${atlases.length} atlases, ${atlases.flatMap(atlas => atlas.frames).length} exact frames, ${atlases.reduce((sum, atlas) => sum + atlas.bytes, 0)} bytes.`)
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})
