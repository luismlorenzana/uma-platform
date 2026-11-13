// `pnpm enemies:pack` (Q16 part A) on synthetic boards and the code-drawn test enemy: no unit of the real boards here.
import { FIXTURE_ENEMY_ID } from '@uma-platform/data-pipeline/enemy-fixture'
import { encodePng, decodeRgba } from '@uma-platform/data-pipeline/enemy-images'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { approvedEnemyKeys, boardGroup, emptyLedger, packEnemyKey, rosterFromPlan, writeFixtureMaster, type MasterEnemyKey, type TierPlan } from './enemies.js'

const tempDirs: string[] = []
afterEach(async () => { await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true }))) })
async function temp(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'uma-enemies-'))
  tempDirs.push(dir)
  return dir
}

const unit = (id: string, tier?: string, order?: number) => ({ id, name: `Unit ${id}`, franchise: id.split('-')[0]!, ...(tier ? { tier, order } : {}) })
/** Two boss boards, Key enemies and Regular enemies, cascading as the real plan does, and a board that isn't enemies'. */
const plan = (): TierPlan => ({
  boards: [
    { id: 'umas', order: [unit('uma-1', 'T1', 1)] },
    { id: 'testa-bosses', order: [unit('testa-b2', 'S', 2), unit('testa-b1', 'SS', 1), unit('testa-b3', 'B', 3)] },
    { id: 'testb-bosses', order: [unit('testb-b1', 'A', 1), unit('testb-b2', 'F', 2)], unranked: [] },
    { id: 'key-enemies', order: [unit('testa-k1', 'SS', 1), unit('testa-b3', 'S', 2), unit('testb-b2', 'B', 3)], unranked: [unit('testb-k2')] },
    { id: 'regular-enemies', order: [unit('testc-r1', 'A', 1), unit('testb-b2', 'S', 2)], unranked: [unit('testb-k2'), unit('testc-r2')] },
  ],
})

describe('the roster from the tier plan', () => {
  it('reads only the enemy boards', () => {
    expect(['azurlane-bosses', 'key-enemies', 'regular-enemies', 'umas', 'npcs'].map(boardGroup)).toEqual(['boss', 'key', 'regular', null, null])
  })

  it('assigns ids from 700001 in board order and casts each unit by the cascade', () => {
    const { enemies, ledger, assigned } = rosterFromPlan(plan(), emptyLedger())
    expect(assigned).toEqual(['testa-b1', 'testa-b2', 'testa-b3', 'testb-b1', 'testb-b2', 'testa-k1', 'testb-k2', 'testc-r1', 'testc-r2'])
    expect(ledger.ids['testa-b1']).toBe(700001)
    expect(ledger.next).toBe(700010)
    const tier = (key: string) => enemies.find((enemy) => enemy.id === ledger.ids[key])!.tier
    // Cast on a boss board; a boss board's B cast on Key enemies; an F cast on Regular enemies; never cast: regular.
    expect(['testa-b1', 'testb-b1', 'testa-b3', 'testa-k1', 'testb-b2', 'testb-k2', 'testc-r2'].map(tier))
      .toEqual(['boss', 'boss', 'key', 'key', 'regular', 'regular', 'regular'])
    expect(enemies.find((enemy) => enemy.id === 700001)).toEqual({ id: 700001, franchise: 'testa', tier: 'boss', name: 'Unit testa-b1' })
    expect(enemies.map((enemy) => enemy.id)).toEqual([...enemies.map((enemy) => enemy.id)].sort((a, b) => a - b))
  })

  it('keeps every id when units move or leave, and never reuses one', () => {
    const first = rosterFromPlan(plan(), emptyLedger())
    const moved = plan()
    // A boss falls to Key enemies' cast, one unit leaves every board, a new one arrives.
    moved.boards[1]!.order = moved.boards[1]!.order.filter((u) => u.id !== 'testa-b2')
    moved.boards[3]!.order.push(unit('testa-b2', 'A', 4))
    moved.boards[4]!.unranked = [unit('testb-k2'), unit('testd-r9')]
    const second = rosterFromPlan(moved, first.ledger)
    expect(second.assigned).toEqual(['testd-r9'])
    expect(second.ledger.ids['testd-r9']).toBe(700010)
    expect(second.ledger.ids['testc-r2']).toBe(first.ledger.ids['testc-r2'])
    const b2 = second.enemies.find((enemy) => enemy.id === first.ledger.ids['testa-b2'])!
    expect(b2.tier).toBe('key')
    expect(second.enemies.some((enemy) => enemy.id === first.ledger.ids['testc-r2'])).toBe(false)
  })
})

describe('approved enemy keys', () => {
  it('packs the test boss through her set approval: every pose lossless, her layers re-composited', async () => {
    const root = await temp()
    await writeFixtureMaster(root)
    const { ready, skipped } = await approvedEnemyKeys(root)
    expect(skipped).toEqual([])
    const packed = await packEnemyKey(ready[0]!)
    expect(packed.enemyId).toBe(FIXTURE_ENEMY_ID)
    expect(Object.keys(packed.poses)).toEqual(['battle', 'attack', 'skill', 'break'])
    expect(packed.poses.battle!.layers!.map((layer) => layer.name)).toEqual(['rear', 'body', 'front'])
    expect((await decodeRgba(Buffer.from(packed.poses.skill!.image.bytes))).width).toBe(768)
  })

  it('skips a key whose files changed since the approval, or that has none', async () => {
    const root = await temp()
    await writeFixtureMaster(root)
    const dir = resolve(root, String(FIXTURE_ENEMY_ID), 'r1')
    const key = JSON.parse(await readFile(resolve(dir, 'key.json'), 'utf8')) as MasterEnemyKey
    key.display.figure = 170
    await writeFile(resolve(dir, 'key.json'), JSON.stringify(key))
    expect((await approvedEnemyKeys(root)).skipped).toEqual([{ enemyId: FIXTURE_ENEMY_ID, reason: 'r1: 1 file(s) changed since the set approval (e.g. key.json)' }])
    await writeFile(resolve(root, 'reviews.json'), JSON.stringify({ schemaVersion: 1, enemies: {} }))
    expect((await approvedEnemyKeys(root)).skipped[0]!.reason).toBe('r1: no set approval')
    expect(await approvedEnemyKeys(resolve(root, 'nothing-here'))).toEqual({ ready: [], skipped: [] })
  })

  it("refuses layers that don't give the pose, a pose off the canvas and a figure in the border", async () => {
    const root = await temp()
    await writeFixtureMaster(root)
    const [candidate] = (await approvedEnemyKeys(root)).ready
    const dir = candidate!.dir
    const swap = async (file: string, edit: (data: Uint8Array, width: number) => void) => {
      const image = await decodeRgba(await readFile(resolve(dir, file)))
      edit(image.data, image.width)
      await writeFile(resolve(dir, file), await encodePng(image))
    }
    const original = await readFile(resolve(dir, 'battle-front.png'))
    await swap('battle-front.png', (data) => data.fill(0))
    await expect(packEnemyKey(candidate!)).rejects.toThrow("the battle pose's layers don't re-composite to it")
    await writeFile(resolve(dir, 'battle-front.png'), original)
    await swap('break.png', (data, width) => { data[(4 * width + 400) * 4 + 3] = 255 })
    await expect(packEnemyKey(candidate!)).rejects.toThrow('break reaches into its 8 px border')
    candidate!.key.canvas = { width: 640, height: 768 }
    await expect(packEnemyKey(candidate!)).rejects.toThrow('not the 640x768 canvas')
  })
})
