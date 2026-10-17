// Routes that skip the guard: `/api/health`, and the push scheduler's tick, which has its own OIDC guard.
import { SetMetadata } from '@nestjs/common'

export const IS_PUBLIC = 'uma-server:public'

/** Lets a route, or every route of a controller, in without a token. */
export const Public = (): MethodDecorator & ClassDecorator => SetMetadata(IS_PUBLIC, true)
