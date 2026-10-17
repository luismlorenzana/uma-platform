// `AuthModule.forRoot(options)`: the guard on every route (`@Public()` opts out), with the options the API passes in.
// `forRootAsync` reads them from the API's `ConfigService`. The module is global, so `@UseGuards(AuthGuard)` also
// works in any module while an API moves over.
import { Module, type DynamicModule, type InjectionToken, type ModuleMetadata, type OptionalFactoryDependency, type Provider } from '@nestjs/common'
import { APP_GUARD } from '@nestjs/core'
import { AuthGuard } from './auth.guard.js'
import { firebaseVerifier } from './firebase.js'
import { AUTH_OPTIONS, TOKEN_VERIFIER, type AuthOptions } from './options.js'

export interface AuthModuleExtras {
  /** Put the guard on every route (default). `false` leaves it to `@UseGuards(AuthGuard)`. */
  readonly global?: boolean
}

export interface AuthModuleAsyncOptions extends AuthModuleExtras {
  readonly imports?: ModuleMetadata['imports']
  readonly inject?: (InjectionToken | OptionalFactoryDependency)[]
  readonly useFactory: (...args: never[]) => AuthOptions | Promise<AuthOptions>
}

const verifier: Provider = {
  provide: TOKEN_VERIFIER,
  inject: [AUTH_OPTIONS],
  useFactory: (options: AuthOptions) => options.verifyIdToken ?? firebaseVerifier(options.projectId),
}

@Module({})
export class AuthModule {
  static forRoot(options: AuthOptions & AuthModuleExtras): DynamicModule {
    return AuthModule.build([{ provide: AUTH_OPTIONS, useValue: options }], [], options.global)
  }

  static forRootAsync(options: AuthModuleAsyncOptions): DynamicModule {
    const provider: Provider = { provide: AUTH_OPTIONS, inject: options.inject ?? [], useFactory: options.useFactory as (...args: unknown[]) => AuthOptions }
    return AuthModule.build([provider], options.imports ?? [], options.global)
  }

  private static build(providers: Provider[], imports: NonNullable<ModuleMetadata['imports']>, global = true): DynamicModule {
    return {
      module: AuthModule,
      global: true,
      imports,
      providers: [...providers, verifier, AuthGuard, ...(global ? [{ provide: APP_GUARD, useExisting: AuthGuard }] : [])],
      exports: [AUTH_OPTIONS, TOKEN_VERIFIER, AuthGuard],
    }
  }
}
