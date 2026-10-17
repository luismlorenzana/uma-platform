// The signed-in owner's uid, as a route parameter: `get(@CurrentUid() uid: string)`.
import { createParamDecorator, UnauthorizedException, type ExecutionContext } from '@nestjs/common'
import type { AuthedRequest } from './auth.guard.js'

/** The uid `AuthGuard` set (`local-dev` in local mode). A route the guard didn't run on has none: 401. */
export const CurrentUid = createParamDecorator((_data: unknown, ctx: ExecutionContext): string => {
  const req = ctx.switchToHttp().getRequest<AuthedRequest>()
  if (!req.user) throw new UnauthorizedException('no user on request')
  return req.user.uid
})
