// The shared guard in a real Nest app over HTTP, with Firebase replaced: the owner's token passes and sets the uid,
// anyone else's is 403, no token or a malformed header is 401, local mode passes as `local-dev`, `@Public()` skips it,
// and `forRootAsync` reads the API's own config.
import 'reflect-metadata'
import { Controller, Get, Module, UseGuards, type INestApplication } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AuthGuard, AuthModule, AuthSetupError, authMode, bearerToken, CurrentUid, LOCAL_DEV_UID, Public, type AuthOptions, type VerifyIdToken } from './index.js'

const OWNER = 'owner@example.test'

/** Stands in for Firebase: `good-<uid>-<email>` is valid, anything else is rejected. */
const fakeFirebase: VerifyIdToken = async (token) => {
  const match = /^good-([^-]+)-(.+)$/.exec(token)
  if (!match) throw new Error('Decoding Firebase ID token failed')
  return { uid: match[1]!, email: match[2]! }
}

@Controller()
class RoutesController {
  @Get('me')
  me(@CurrentUid() uid: string) {
    return { uid }
  }

  @Public()
  @Get('health')
  health() {
    return { ok: true }
  }
}

@Public()
@Controller('open')
class OpenController {
  @Get()
  open() {
    return { open: true }
  }
}

@UseGuards(AuthGuard)
@Controller('guarded')
class GuardedController {
  @Get()
  guarded(@CurrentUid() uid: string) {
    return { uid }
  }
}

let app: INestApplication | undefined
afterEach(async () => {
  await app?.close()
  app = undefined
})

async function serve(auth: ReturnType<typeof AuthModule.forRoot>, controllers: unknown[] = [RoutesController, OpenController]) {
  @Module({ imports: [auth], controllers: controllers as never[] })
  class TestModule {}
  app = await NestFactory.create(TestModule, { logger: false })
  await app.listen(0, '127.0.0.1')
  const base = await app.getUrl()
  return async (path: string, authorization?: string) => {
    const res = await fetch(`${base}${path}`, authorization === undefined ? {} : { headers: { authorization } })
    return { status: res.status, body: (await res.json()) as Record<string, unknown> }
  }
}

const enabled = (extra: Partial<AuthOptions> = {}) => AuthModule.forRoot({ mode: 'enabled', allowedEmail: OWNER, verifyIdToken: fakeFirebase, ...extra })

describe('AuthModule.forRoot', () => {
  it("lets the owner's token in and sets her uid, whatever the email's case", async () => {
    const get = await serve(enabled())
    expect(await get('/me', `Bearer good-u1-${OWNER}`)).toEqual({ status: 200, body: { uid: 'u1' } })
    expect(await get('/me', 'Bearer good-u1-Owner@Example.TEST')).toEqual({ status: 200, body: { uid: 'u1' } })
  })

  it("refuses a valid token for anyone else with 403, and everyone when no email is allowed", async () => {
    const get = await serve(enabled())
    expect(await get('/me', 'Bearer good-u2-stranger@example.test')).toMatchObject({ status: 403, body: { message: 'not authorized' } })
    await app!.close()
    const none = await serve(enabled({ allowedEmail: '  ' }))
    expect((await none('/me', `Bearer good-u1-${OWNER}`)).status).toBe(403)
  })

  it('refuses a missing token, a malformed header and an invalid token with 401', async () => {
    const get = await serve(enabled())
    expect(await get('/me')).toMatchObject({ status: 401, body: { message: 'missing bearer token' } })
    for (const header of ['Basic abc', 'Bearer', 'Bearer ', 'bearer good-u1-x', 'Bearer a b']) {
      expect((await get('/me', header)).status, header).toBe(401)
    }
    expect(await get('/me', 'Bearer forged')).toMatchObject({ status: 401, body: { message: 'invalid token' } })
  })

  it('passes everything as local-dev in disabled mode, without calling Firebase', async () => {
    const verify = vi.fn(fakeFirebase)
    const get = await serve(AuthModule.forRoot({ mode: 'disabled', allowedEmail: '', verifyIdToken: verify }))
    expect(await get('/me')).toEqual({ status: 200, body: { uid: LOCAL_DEV_UID } })
    expect(await get('/me', 'Bearer forged')).toEqual({ status: 200, body: { uid: 'local-dev' } })
    expect(verify).not.toHaveBeenCalled()
  })

  it('skips @Public() routes and controllers', async () => {
    const verify = vi.fn(fakeFirebase)
    const get = await serve(enabled({ verifyIdToken: verify }))
    expect(await get('/health')).toEqual({ status: 200, body: { ok: true } })
    expect(await get('/open', 'Bearer forged')).toEqual({ status: 200, body: { open: true } })
    expect(verify).not.toHaveBeenCalled()
  })

  it('answers 500, not 401, when Firebase Admin cannot start', async () => {
    const get = await serve(enabled({ verifyIdToken: async () => { throw new AuthSetupError(new Error('no project')) } }))
    expect((await get('/me', 'Bearer anything')).status).toBe(500)
  })

  it('can leave the guard to @UseGuards(AuthGuard) with global: false', async () => {
    const get = await serve(AuthModule.forRoot({ mode: 'enabled', allowedEmail: OWNER, verifyIdToken: fakeFirebase, global: false }), [OpenController, GuardedController, RoutesController])
    expect((await get('/guarded')).status).toBe(401)
    expect(await get('/guarded', `Bearer good-u3-${OWNER}`)).toEqual({ status: 200, body: { uid: 'u3' } })
    // Unguarded routes have no user: CurrentUid refuses rather than inventing one.
    expect((await get('/me')).status).toBe(401)
  })
})

describe('AuthModule.forRootAsync', () => {
  it("builds the options from the API's own providers", async () => {
    const CONFIG = 'CONFIG'
    @Module({ providers: [{ provide: CONFIG, useValue: { AUTH_MODE: 'disabled' } }], exports: [CONFIG] })
    class ConfigModule {}
    const get = await serve(AuthModule.forRootAsync({
      imports: [ConfigModule],
      inject: [CONFIG],
      useFactory: (config: Record<string, string>) => ({ mode: authMode(config.AUTH_MODE), allowedEmail: OWNER }),
    }))
    expect(await get('/me')).toEqual({ status: 200, body: { uid: 'local-dev' } })
  })
})

describe('helpers', () => {
  it('read a bearer token and AUTH_MODE as both APIs set them', () => {
    expect([bearerToken('Bearer abc.def'), bearerToken('Bearer'), bearerToken(undefined), bearerToken('Token abc')]).toEqual(['abc.def', null, null, null])
    expect([authMode('disabled'), authMode(undefined), authMode('on'), authMode('DISABLED')]).toEqual(['disabled', 'enabled', 'enabled', 'enabled'])
  })
})
