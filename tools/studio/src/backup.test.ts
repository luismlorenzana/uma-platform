import { expect, it } from 'vitest'
import { BackupQueue } from './backup.js'

it('serializes gate backups and recovers after failure without losing the local decision', async () => {
  let active = 0, peak = 0, calls = 0
  const queue = new BackupQueue(async () => {
    calls++; active++; peak = Math.max(peak, active)
    await Promise.resolve(); active--
    if (calls === 1) throw new Error('synthetic storage failure')
  })
  await queue.schedule(); expect(queue.status.state).toBe('failed')
  await Promise.all([queue.schedule(), queue.schedule()])
  expect(peak).toBe(1); expect(calls).toBe(3); expect(queue.status.state).toBe('complete')
})
