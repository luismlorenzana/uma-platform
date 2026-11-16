// The locked Farm Life beach prompt. Preparation reads approved character art and
// writes a new private attempt; it never generates art or changes a selection.
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { mkdir, readFile, realpath, writeFile } from 'node:fs/promises'
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path'

const specPath = 'docs/authoring/farm-life-splash-art/beach-spec.json'
const sha = bytes => createHash('sha256').update(bytes).digest('hex')
const json = async file => JSON.parse(await readFile(file, 'utf8'))
const encode = value => JSON.stringify(value, null, 2) + '\n'
const slashes = value => value.split(sep).join('/')

async function contained(parent, file) {
  const base = await realpath(parent), target = await realpath(file), rel = relative(base, target)
  assert(rel && !isAbsolute(rel) && rel !== '..' && !rel.startsWith('..' + sep), 'Path leaves character/study folder: ' + file)
  return target
}

export const renderBeachPrompt = (spec, character) => spec.prompt.replaceAll('{{character}}', () => character)

export async function prepareBeach({ repo, key, revision }) {
  repo = await realpath(repo)
  assert(/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(key), 'Expected a lowercase character key')
  assert(/^v\d{3,}$/.test(revision ?? ''), 'Expected a new revision such as v003')
  const content = join(repo, 'content'), studies = join(content, 'authoring/splash-art/farm-life')
  const dir = await contained(studies, join(studies, key))
  const study = await json(join(dir, 'study.json'))
  assert(study.characterKey === key && study.scenes.some(s => s.id === 'beach'), 'Missing character beach study')
  const characterDir = await contained(content, join(content, 'authoring/character-universes/farm-life/characters', key))
  const active = await json(join(characterDir, 'active-study.json'))
  assert(active.ownerApproved === true && active.character === study.character, 'Use this character’s approved active collection')
  assert(/^v\d{3,}$/.test(active.activeVersion ?? ''), 'Missing active version')
  const manifestFile = await contained(characterDir, resolve(characterDir, active.manifest ?? active.activeVersion + '/manifest.json'))
  const manifest = await json(manifestFile), base = dirname(manifestFile)
  assert(manifest.characterNames?.[key] === study.character && manifest.approval?.status === 'approved' && manifest.approval.by === 'owner', 'Character identity or collection approval differs')
  const body = manifest.fullBodyAssets?.find(a => a.outfit === 'swimsuit' && a.character === study.character)
  const happy = manifest.assets?.find(a => a.outfit === 'swimsuit' && a.character === key)?.outputs?.find(a => a.expression === 'happy')
  assert(body?.character === study.character && body.approval?.status === 'approved' && body.approval.by === 'owner' && body.approval.imageSha256 === body.sha256, 'Missing exact-image approved swimsuit base')
  assert(happy?.ownerApproved === true, 'Missing owner-approved Happy swimsuit portrait')
  const references = []
  for (const [asset, role] of [[body, 'Primary approved full-body swimsuit: own identity, adult proportions, exact outfit and markings'], [happy, 'Same-character approved Happy swimsuit portrait: face and expression']]) {
    assert(typeof asset.image === 'string', 'Missing reference image')
    const file = await contained(characterDir, resolve(base, asset.image)), hash = sha(await readFile(file))
    assert.equal(hash, asset.sha256, 'Approved reference hash changed: ' + asset.image)
    references.push({ role, path: slashes(relative(repo, file)), sha256: hash })
  }
  const bytes = await readFile(join(repo, specPath)), spec = JSON.parse(bytes)
  const prompt = renderBeachPrompt(spec, study.character)
  const inputs = { id: 'beach', revision, character: study.character, characterKey: key, outfit: spec.outfit, expression: spec.expression, moment: spec.moment, intent: spec.intent,
    sceneSpec: { path: specPath, version: spec.version, sha256: sha(bytes) },
    prompt: slashes(relative(repo, join(dir, 'beach', revision, 'prompt.txt'))), promptSha256: sha(prompt), references,
    approval: null, selectedInApprovedAlbum: false }
  const sceneDir = join(dir, 'beach')
  await mkdir(sceneDir, { recursive: true })
  await contained(dir, sceneDir)
  const folder = join(sceneDir, revision)
  await mkdir(folder) // Never overwrite a candidate, approval, or prior attempt.
  await writeFile(join(folder, 'prompt.txt'), prompt, { flag: 'wx' })
  await writeFile(join(folder, 'inputs.json'), encode(inputs), { flag: 'wx' })
  return inputs
}

// Legacy approved scenes keep their provenance. Prepared attempts must retain the
// exact locked prompt and both actual input records when a generated image is selected.
export async function verifyPreparedBeach({ repo, folder, record, prompt }) {
  let inputs
  try { inputs = await json(join(folder, 'inputs.json')) }
  catch (error) { if (error.code === 'ENOENT') return; throw error }
  if (!inputs.sceneSpec) return
  const bytes = await readFile(join(repo, specPath)), spec = JSON.parse(bytes)
  const expected = { path: specPath, version: spec.version, sha256: sha(bytes) }
  assert.deepEqual(inputs.sceneSpec, expected, 'Prepared beach spec changed')
  assert.deepEqual(record.sceneSpec, expected, 'Copy the prepared sceneSpec into the generation record')
  assert.equal(record.intent, spec.intent, 'Beach must be a fresh generation from character references')
  assert.equal(prompt, renderBeachPrompt(spec, inputs.character), 'Prepared beach prompt differs from the locked spec')
  assert.equal(sha(prompt), inputs.promptSha256, 'Prepared beach prompt hash changed')
  assert.equal(record.promptSha256, inputs.promptSha256, 'Generation prompt hash differs')
  assert.equal(inputs.references.length, 2, 'Use only the approved swimsuit and Happy portrait')
  assert.deepEqual(record.references, inputs.references, 'Actual generation inputs differ from the prepared character references')
}
