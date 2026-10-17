// The places' rules in Node: the update lifecycle (both games' tests, ported), the boot order, the Warehouse's grade
// chips, shelf and sell sizes, the Exchange's totals, and Account's name rule.
import { describe, expect, it, vi } from 'vitest'
import { affordable, exchangeTotal, shortBy, typedQuantity } from './exchange.js'
import { INITIAL_GATES, nextGate, type GateState } from './gates.js'
import { gradeChips, sellOptions, shelfItems, shelfTotal, type ShelfItem } from './shelf.js'
import { criticalAction, UpdateLifecycle } from './update-lifecycle.js'

describe('the app update lifecycle', () => {
  it('offers a restart when a worker is waiting', () => {
    const lifecycle = new UpdateLifecycle()
    lifecycle.workerWaiting(vi.fn())
    expect(lifecycle.getSnapshot()).toMatchObject({ status: 'ready', source: 'waiting-worker', restartRequested: false })
  })

  it('blocks activation during an action and restarts only after that action commits', async () => {
    const lifecycle = new UpdateLifecycle()
    const activate = vi.fn()
    const reload = vi.fn()
    lifecycle.workerWaiting(activate)
    const commit = lifecycle.beginCriticalAction()

    lifecycle.requestRestart()
    expect(activate).not.toHaveBeenCalled()
    expect(lifecycle.getSnapshot()).toMatchObject({ status: 'ready', activeActions: 1, restartRequested: true })

    commit()
    expect(activate).toHaveBeenCalledOnce()
    expect(lifecycle.getSnapshot().status).toBe('activating')
    lifecycle.workerControlled(reload)
    await Promise.resolve()
    expect(reload).toHaveBeenCalledOnce()
    expect(lifecycle.getSnapshot().status).toBe('restarting')
  })

  it('offers a controlled update instead of silently reloading', () => {
    const lifecycle = new UpdateLifecycle()
    const reload = vi.fn()
    lifecycle.workerControlled(reload)
    expect(reload).not.toHaveBeenCalled()
    expect(lifecycle.getSnapshot()).toMatchObject({ status: 'ready', source: 'new-controller' })
    lifecycle.requestRestart()
    expect(reload).toHaveBeenCalledOnce()
  })

  it('holds a restart for a critical action, even one that fails, and offers it again when activation fails', async () => {
    const lifecycle = new UpdateLifecycle()
    const activate = vi.fn().mockRejectedValueOnce(new Error('no worker'))
    lifecycle.workerWaiting(activate)
    let release!: () => void
    const action = criticalAction(() => new Promise<void>((_, reject) => { release = () => reject(new Error('refused')) }), lifecycle)
    lifecycle.requestRestart()
    expect(activate).not.toHaveBeenCalled()
    release()
    await expect(action).rejects.toThrow('refused')
    expect(activate).toHaveBeenCalledOnce()
    await Promise.resolve()
    await Promise.resolve()
    expect(lifecycle.getSnapshot()).toMatchObject({ status: 'ready', restartRequested: false, activeActions: 0 })
  })
})

describe('the boot gates', () => {
  const at = (state: Partial<GateState>) => nextGate({ ...INITIAL_GATES, ...state })

  it('go splash → sign-in → boot → first launch → start page → the app, in that order', () => {
    expect(at({})).toBe('splash')
    expect(at({ authReady: true, authRequired: true })).toBe('sign-in')
    expect(at({ authReady: true, authRequired: true, signedIn: true })).toBe('boot')
    expect(at({ authReady: true, authRequired: true, signedIn: true, boot: 'running' })).toBe('boot')
    expect(at({ authReady: true, authRequired: true, signedIn: true, boot: 'done', firstLaunch: true })).toBe('first-launch')
    expect(at({ authReady: true, authRequired: true, signedIn: true, boot: 'done' })).toBe('start')
    expect(at({ authReady: true, authRequired: true, signedIn: true, boot: 'done', started: true })).toBe('ready')
  })

  it('skip sign-in with auth off, stop on a failed boot, and never reach the app before auth is ready', () => {
    expect(at({ authReady: true, signedIn: true, boot: 'done', started: true })).toBe('ready')
    expect(at({ authReady: true, authRequired: false, signedIn: false, boot: 'running' })).toBe('boot')
    expect(at({ authReady: true, signedIn: true, boot: 'failed' })).toBe('failed')
    expect(at({ authReady: false, signedIn: true, boot: 'done', started: true })).toBe('splash')
    // Signing out returns to the sign-in gate, whatever the boot did.
    expect(at({ authReady: true, authRequired: true, signedIn: false, boot: 'done', started: true })).toBe('sign-in')
  })
})

describe('the Warehouse', () => {
  const item = (id: string, shelf: string, grade: number | null, count: number, group?: string): ShelfItem => ({ id, name: id, shelf, grade, count, ...(group ? { group } : {}) })
  const ITEMS = [
    item('ore-1', 'materials', 1, 4, 'ores'), item('ore-3', 'materials', 3, 2, 'ores'), item('ingot-3', 'materials', 3, 0, 'ores'),
    item('wood-2', 'materials', 2, 7, 'woods'), item('gem-5', 'gems', 5, 1), item('speed', 'tickets', null, 9),
  ]

  it('offers grade chips for the grades a shelf holds', () => {
    expect(gradeChips(ITEMS, 'materials')).toEqual([1, 2, 3])
    expect(gradeChips(ITEMS, 'tickets')).toEqual([])
  })

  it('shows held items by grade, or the highest held in each family', () => {
    expect(shelfItems(ITEMS, 'materials').map((i) => i.id)).toEqual(['ore-1', 'ore-3', 'wood-2'])
    expect(shelfItems(ITEMS, 'materials', 3).map((i) => i.id)).toEqual(['ore-3'])
    expect(shelfItems(ITEMS, 'materials', 'highest').map((i) => i.id)).toEqual(['ore-3', 'wood-2'])
    expect(shelfItems(ITEMS, 'tickets', 'highest').map((i) => i.id)).toEqual(['speed'])
    expect(shelfTotal(ITEMS, 'materials')).toBe(13)
  })

  it('sells ×1, ×10 or All, never offering more than is held or the same size twice', () => {
    expect(sellOptions(25, 3)).toEqual([{ size: 1, qty: 1, total: 3 }, { size: 10, qty: 10, total: 30 }, { size: 'all', qty: 25, total: 75 }])
    expect(sellOptions(10, 3).map((o) => o.qty)).toEqual([1, 10])
    expect(sellOptions(4, 3).map((o) => o.qty)).toEqual([1, 4])
    expect(sellOptions(1, 3).map((o) => o.qty)).toEqual([1])
    expect(sellOptions(0, 3)).toEqual([])
  })
})

describe('the Exchange', () => {
  it('totals a purchase, says how many the balance buys and how much it is short', () => {
    expect(exchangeTotal(120, 5)).toBe(600)
    expect(affordable(500, 120)).toBe(4)
    expect(affordable(1_000_000, 1)).toBe(99)
    expect(affordable(10, 0, 50)).toBe(50)
    expect(shortBy(500, 600)).toBe(100)
    expect(shortBy(700, 600)).toBe(0)
  })

  it('reads a typed quantity from 1 to the most', () => {
    expect(['7', ' 12 ', '0', '100', '2.5', 'x', ''].map((text) => typedQuantity(text))).toEqual([7, 12, null, null, null, null, null])
  })
})
