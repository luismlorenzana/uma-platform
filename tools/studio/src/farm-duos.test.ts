import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { FarmDuoStore } from './farm-duos.js'

const ids = ['9001', '9002', '9003', 's900104', 's900203']
const future = '9008'
const household = { scenes: [{ open: [{ narrate: 'The lights come on.' }] }], notes: 'Keep this field.' }

describe('the Farm Duos editor store', () => {
  let dir: string
  let store: FarmDuoStore
  const write = (path: string, value: unknown) => writeFile(join(dir, path), JSON.stringify(value))
  const read = async () => JSON.parse(await readFile(join(dir, 'household.json'), 'utf8')) as unknown

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'studio-farm-duos-'))
    store = new FarmDuoStore(dir, { release: 'synthetic', umas: [] }, dir, async () => ids)
    await write('cast.json', { umas: [...ids, future].map((characterId, i) => ({ characterId, name: `Farm Uma ${i + 1}` })) })
    await write('household.json', household)
  })
  afterEach(async () => {
    await rm(dir, { recursive: true, force: true })
  })

  it('reads authored bond previews and writes a reciprocal pair as one canonical entry', async () => {
    await mkdir(join(dir, 'pairs'))
    await write('pairs/9001-s900104.json', { a: '9001', b: 's900104', levels: [{ hearts: 1, place: 'fields', steps: [{ narrate: 'They meet at the gate.' }] }] })
    await writeFile(join(dir, 'pairs/9001-9002.json'), '{')
    const opened = await store.read()
    expect(opened.scenes).toEqual({ '9001:s900104': [{ hearts: 1, place: 'fields', opening: 'They meet at the gate.' }] })
    expect(opened.roster).toHaveLength(5)
    const draft = await store.save({ stamp: opened.stamp, duos: [['s900104', '9001']] })
    expect(await read()).toEqual(household)
    expect(draft.differs).toBe(true)
    await store.save({ stamp: draft.stamp, action: 'apply' })
    expect(await read()).toEqual({ ...household, duos: [['9001', 's900104']] })
    expect((await store.read()).duos).toEqual([['9001', 's900104']])
  })

  it('enforces uniqueness, cast membership and the maximum on both sides', async () => {
    const { stamp } = await store.read()
    await expect(store.save({ stamp, duos: [['9001', '9002'], ['9002', '9001']] })).rejects.toThrow('assigned once')
    await expect(store.save({ stamp, duos: [['9001', future]] })).rejects.toThrow('Farm story cast')
    await expect(store.save({ stamp, duos: [['9001', '9001']] })).rejects.toThrow('two different')
    await expect(store.save({ stamp, duos: ids.slice(1).map(id => [id, '9001']) })).rejects.toThrow('up to three')
    expect(await read()).toEqual(household)
  })

  it('keeps attached scripts and rejects stale saves', async () => {
    const saved = { ...household, duos: [['9001', '9002']], duoLines: { '9001:9002': { '9001': { sitting: 'Welcome.' } } } }
    await write('household.json', saved)
    const empty = await store.save({ stamp: (await store.read()).stamp, duos: [] })
    await expect(store.save({ stamp: empty.stamp, action: 'apply' })).rejects.toThrow('visit script')
    const { stamp } = empty
    const changes = { stamp, duos: [...saved.duos, ['9001', '9003']] }
    const [first, second] = await Promise.allSettled([store.save(changes), store.save(changes)])
    expect(first.status).toBe('fulfilled')
    expect(second).toMatchObject({ status: 'rejected', reason: { message: 'Farm story files changed. Reload before saving.' } })
    expect(await read()).toEqual(saved)
    const draft = await store.read()
    expect(draft.nights['9001:9002']).toEqual({ '9001': ['sitting'] })
    await write('household.json', { ...saved, notes: 'Other editor’s change' })
    const conflicted = await store.read()
    expect(conflicted.duos).toEqual(changes.duos)
    await expect(store.save({ stamp: conflicted.stamp, action: 'apply' })).rejects.toThrow('Canonical story')
    const reviewed = await store.save({ stamp: conflicted.stamp, action: 'rebase', duos: conflicted.duos })
    await store.save({ stamp: reviewed.stamp, action: 'apply' })
    expect(await read()).toEqual({ ...saved, notes: 'Other editor’s change', duos: changes.duos })
  })
})
