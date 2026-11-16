import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { mkdtemp, mkdir, readFile, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { afterEach, test } from 'node:test'
import { prepareBeach, renderBeachPrompt, verifyPreparedBeach } from './beach.mjs'

const specBytes = await readFile(new URL('../../docs/authoring/farm-life-splash-art/beach-spec.json', import.meta.url))
const spec = JSON.parse(specBytes)
const sha = bytes => createHash('sha256').update(bytes).digest('hex')
const roots = []
afterEach(async () => { await Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true }))) })
const put = async (file, value) => { await mkdir(dirname(file), { recursive: true }); await writeFile(file, typeof value === 'object' && !Buffer.isBuffer(value) ? JSON.stringify(value) : value) }

async function fixture() {
  const repo = await mkdtemp(join(tmpdir(), 'farm-beach-')); roots.push(repo)
  const key = 'rider-one', name = 'Rider One', character = join(repo, 'content/authoring/character-universes/farm-life/characters', key)
  const study = join(repo, 'content/authoring/splash-art/farm-life', key)
  // Small invented byte fixtures; no real character data or image pixels.
  const body = Buffer.from('invented swimsuit reference'), happy = Buffer.from('invented happy reference')
  await put(join(repo, 'docs/authoring/farm-life-splash-art/beach-spec.json'), specBytes)
  await put(join(character, 'active-study.json'), { character: name, activeVersion: 'v002', ownerApproved: true })
  await put(join(character, 'v001/swimsuit.png'), body)
  await put(join(character, 'v002/happy.png'), happy)
  const manifest = { characterNames: { [key]: name }, approval: { status: 'approved', by: 'owner' },
    fullBodyAssets: [{ character: name, outfit: 'swimsuit', image: '../v001/swimsuit.png', sha256: sha(body), approval: { status: 'approved', by: 'owner', imageSha256: sha(body) } }],
    assets: [{ character: key, outfit: 'swimsuit', outputs: [{ expression: 'happy', image: 'happy.png', sha256: sha(happy), ownerApproved: true }] }] }
  const manifestFile = join(character, 'v002/manifest.json')
  await put(manifestFile, manifest)
  const studyFile = join(study, 'study.json')
  await put(studyFile, { character: name, characterKey: key, scenes: [{ id: 'beach', selected: { revision: 'v001', approval: { status: 'approved' } } }] })
  await put(join(study, 'beach/v001/image.png'), 'invented previous approved scene')
  return { repo, key, name, character, study, studyFile, manifest, manifestFile }
}

test('prepares a fresh attempt from her two approved references across versions, without changing the approved selection', async () => {
  const f = await fixture(), before = await readFile(f.studyFile), inputs = await prepareBeach({ repo: f.repo, key: f.key, revision: 'v003' })
  assert.equal(inputs.intent, 'fresh-generation-from-approved-character-base')
  assert.deepEqual(inputs.references.map(r => r.path), ['content/authoring/character-universes/farm-life/characters/rider-one/v001/swimsuit.png', 'content/authoring/character-universes/farm-life/characters/rider-one/v002/happy.png'])
  assert.equal(inputs.sceneSpec.sha256, sha(specBytes))
  assert.equal(inputs.approval, null)
  assert.equal(inputs.selectedInApprovedAlbum, false)
  assert.deepEqual(await readFile(f.studyFile), before)
  const prompt = await readFile(join(f.study, 'beach/v003/prompt.txt'), 'utf8')
  assert.equal(prompt, renderBeachPrompt(spec, f.name))
  assert.equal(inputs.promptSha256, sha(prompt))
  assert(prompt.includes('RIGHT SIDE OF THE IMAGE') && prompt.includes('completely concealed') && prompt.includes('barely visible'))
  assert(prompt.includes('lemonade') && prompt.includes('lighthouse') && prompt.includes('upright supported recline'))
})

test('never resets an existing attempt', async () => {
  const f = await fixture()
  await assert.rejects(prepareBeach({ repo: f.repo, key: f.key, revision: 'v001' }), { code: 'EEXIST' })
  assert.equal(await readFile(join(f.study, 'beach/v001/image.png'), 'utf8'), 'invented previous approved scene')
})

for (const [label, mutate] of [
  ['an unapproved bikini', m => { m.fullBodyAssets[0].approval.status = 'candidate' }],
  ['an unapproved expression', m => { m.assets[0].outputs[0].ownerApproved = false }],
  ['another character identity', m => { m.characterNames['rider-one'] = 'Rider Two' }],
  ['another character’s expression', m => { m.assets[0].character = 'rider-two' }],
  ['a changed source hash', m => { m.fullBodyAssets[0].sha256 = m.fullBodyAssets[0].approval.imageSha256 = 'a'.repeat(64) }],
]) test('refuses ' + label, async () => {
  const f = await fixture(); mutate(f.manifest); await put(f.manifestFile, f.manifest)
  await assert.rejects(prepareBeach({ repo: f.repo, key: f.key, revision: 'v003' }))
  await assert.rejects(readFile(join(f.study, 'beach/v003/prompt.txt')), { code: 'ENOENT' })
})

test('refuses a reference outside her folder, including a symlink to a previous scene', async () => {
  const f = await fixture()
  await symlink(join(f.study, 'beach/v001/image.png'), join(f.character, 'v002/linked.png'))
  f.manifest.assets[0].outputs[0].image = 'linked.png'
  await put(f.manifestFile, f.manifest)
  await assert.rejects(prepareBeach({ repo: f.repo, key: f.key, revision: 'v003' }), /Path leaves/)
})

test('prepared generations must retain the locked prompt, spec, intent and exactly the two actual input records', async () => {
  const f = await fixture(), inputs = await prepareBeach({ repo: f.repo, key: f.key, revision: 'v003' })
  const folder = join(f.study, 'beach/v003'), prompt = await readFile(join(folder, 'prompt.txt'), 'utf8')
  const record = { sceneSpec: inputs.sceneSpec, intent: inputs.intent, promptSha256: inputs.promptSha256, references: inputs.references }
  await verifyPreparedBeach({ repo: f.repo, folder, prompt, record })
  await assert.rejects(verifyPreparedBeach({ repo: f.repo, folder, prompt: prompt.replace('RIGHT SIDE', 'LEFT SIDE'), record }), /prompt differs/)
  await assert.rejects(verifyPreparedBeach({ repo: f.repo, folder, prompt, record: { ...record, intent: 'edit-existing-scene' } }), /fresh generation/)
  await assert.rejects(verifyPreparedBeach({ repo: f.repo, folder, prompt, record: { ...record, sceneSpec: undefined } }), /sceneSpec/)
  await assert.rejects(verifyPreparedBeach({ repo: f.repo, folder, prompt, record: { ...record, references: [...record.references, { path: 'old-beach.png' }] } }), /Actual generation inputs/)
})

test('legacy approved scene provenance is still checkable without retroactively claiming the new spec', async () => {
  const f = await fixture()
  await verifyPreparedBeach({ repo: f.repo, folder: join(f.study, 'beach/v001'), record: {}, prompt: 'old exact prompt' })
})
