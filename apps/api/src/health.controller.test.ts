import { afterEach, describe, expect, it } from 'vitest'
import { HealthController } from './health.controller'

describe('health', () => {
  afterEach(() => { delete process.env.BUILD_ID })
  it('answers with the build', () => {
    process.env.BUILD_ID = 'abc123'
    expect(new HealthController().health()).toEqual({ ok: true, build: 'abc123' })
  })
  it('says local without a build id', () => expect(new HealthController().health().build).toBe('local'))
})
