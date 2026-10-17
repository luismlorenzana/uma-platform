// The default Firebase check: firebase-admin loads on the first token, once, reuses an app the API already started,
// and a failure to start is a setup error, never a bad token. Vitest hoists the mocks above the imports.
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthSetupError, firebaseVerifier } from './firebase.js'

const admin = vi.hoisted(() => ({
  apps: [] as object[],
  initializeApp: vi.fn((options?: object) => ({ options })),
  verifyIdToken: vi.fn(async (token: string) => {
    if (token !== 'good') throw new Error('Decoding Firebase ID token failed')
    return { uid: 'u1', email: 'owner@example.test' }
  }),
  getAuth: vi.fn(),
}))
vi.mock('firebase-admin/app', () => ({ getApps: () => admin.apps, initializeApp: admin.initializeApp }))
vi.mock('firebase-admin/auth', () => ({ getAuth: (app: object) => { admin.getAuth(app); return { verifyIdToken: admin.verifyIdToken } } }))

beforeEach(() => {
  admin.apps = []
  vi.clearAllMocks()
})

describe('firebaseVerifier', () => {
  it('starts Firebase Admin on the first token only, with the project when given', async () => {
    const verify = firebaseVerifier('uma-test')
    expect(admin.initializeApp).not.toHaveBeenCalled()
    expect(await verify('good')).toEqual({ uid: 'u1', email: 'owner@example.test' })
    await expect(verify('bad')).rejects.toThrow(/Decoding/)
    expect(admin.initializeApp).toHaveBeenCalledTimes(1)
    expect(admin.initializeApp).toHaveBeenCalledWith({ projectId: 'uma-test' })
  })

  it('reuses an app the API already started', async () => {
    const existing = { name: '[DEFAULT]' }
    admin.apps = [existing]
    await firebaseVerifier()('good')
    expect(admin.initializeApp).not.toHaveBeenCalled()
    expect(admin.getAuth).toHaveBeenCalledWith(existing)
  })

  it('reports a failure to start as a setup error, and tries again next time', async () => {
    admin.initializeApp.mockImplementationOnce(() => { throw new Error('no credentials') })
    const verify = firebaseVerifier()
    await expect(verify('good')).rejects.toBeInstanceOf(AuthSetupError)
    expect(await verify('good')).toMatchObject({ uid: 'u1' })
  })
})
