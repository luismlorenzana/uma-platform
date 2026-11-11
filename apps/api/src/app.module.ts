import { resolve } from 'node:path'
import { AuthModule, authMode } from '@luismlorenzana/uma-server/auth'
import { ReleaseProxyModule } from '@luismlorenzana/uma-server/content'
import { Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { SUB_APP_MODULES } from './apps'
import { HealthController } from './health.controller'

// The Uma Platform app's API (P127, AP1–AP7), wired as uma-quest's at 47ca16d. Every route sits behind the shared owner
// guard (uma-platform P54): a Firebase ID token for the owner's email, or the fixed local user with AUTH_MODE=disabled.
// `@Public()` opens a route (only /api/health).
// Master data is this repo's private release, proxied to the signed-in owner at /api/master/…: MASTER_BUCKET in
// production, the local release folder (content/release) in dev.
// Each sub-app adds its own module under /api/<id>/… through the registry in ./apps (AP1).
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    AuthModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({ mode: authMode(config.get<string>('AUTH_MODE')), allowedEmail: config.get<string>('ALLOWED_EMAIL') ?? '' }),
    }),
    ReleaseProxyModule.forRoot({
      route: 'master',
      bucket: process.env.MASTER_BUCKET,
      dir: resolve(process.cwd(), process.env.MASTER_DIR ?? '../../content/release'),
    }),
    ...SUB_APP_MODULES,
  ],
  controllers: [HealthController],
})
export class AppModule {}
