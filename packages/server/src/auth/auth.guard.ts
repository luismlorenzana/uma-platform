// The guard both game APIs ran, written once (uma-platform SD1): a Firebase ID token whose email is the owner's. A
// missing or invalid token is 401; a valid token for anyone else is 403. `mode: 'disabled'` lets every request in as
// `local-dev` without calling Firebase. `@Public()` routes skip it.
import { ForbiddenException, Inject, Injectable, UnauthorizedException, type CanActivate, type ExecutionContext } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { AuthSetupError } from './firebase.js'
import { AUTH_OPTIONS, TOKEN_VERIFIER, type AuthOptions, type VerifiedToken, type VerifyIdToken } from './options.js'
import { IS_PUBLIC } from './public.js'

export const LOCAL_DEV_UID = 'local-dev'

/** The request as the guard leaves it: `user` is set once it passes. */
export interface AuthedRequest {
  readonly headers: { readonly authorization?: string | undefined }
  user?: { readonly uid: string; readonly email?: string }
}

/** The token of an `Authorization: Bearer <token>` header, or null for anything else. */
export function bearerToken(header: string | undefined): string | null {
  const match = /^Bearer ([^\s]+)$/.exec(header ?? '')
  return match ? match[1]! : null
}

@Injectable()
export class AuthGuard implements CanActivate {
  // Explicit tokens rather than type metadata, so the guard also runs where decorators carry no types (Vitest).
  constructor(
    @Inject(Reflector) private readonly reflector: Reflector,
    @Inject(AUTH_OPTIONS) private readonly options: AuthOptions,
    @Inject(TOKEN_VERIFIER) private readonly verify: VerifyIdToken,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    if (this.reflector.getAllAndOverride<boolean | undefined>(IS_PUBLIC, [ctx.getHandler(), ctx.getClass()])) return true
    const req = ctx.switchToHttp().getRequest<AuthedRequest>()
    if (this.options.mode === 'disabled') {
      req.user = { uid: LOCAL_DEV_UID }
      return true
    }

    const token = bearerToken(req.headers.authorization)
    if (token === null) throw new UnauthorizedException('missing bearer token')

    let decoded: VerifiedToken
    try {
      decoded = await this.verify(token)
    } catch (err) {
      if (err instanceof AuthSetupError) throw err
      throw new UnauthorizedException('invalid token')
    }

    const allowed = this.options.allowedEmail.trim().toLowerCase()
    if (allowed === '' || decoded.email?.toLowerCase() !== allowed) throw new ForbiddenException('not authorized')

    req.user = decoded.email === undefined ? { uid: decoded.uid } : { uid: decoded.uid, email: decoded.email }
    return true
  }
}
