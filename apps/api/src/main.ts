// Copied from uma-quest at 47ca16d (apps/api/src/main.ts), with this app's dev origin (AP3).
import 'reflect-metadata'
import { NestFactory } from '@nestjs/core'
import { ConfigService } from '@nestjs/config'
import type { NestExpressApplication } from '@nestjs/platform-express'
import { AppModule } from './app.module'

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule)
  const config = app.get(ConfigService)
  // Production is same-origin (Hosting rewrites /api/** to Cloud Run); dev goes through Vite's proxy.
  const origin = config.get<string>('ALLOWED_ORIGIN') ?? 'http://localhost:5204'
  app.enableCors({ origin: origin.split(',').map((o) => o.trim()), credentials: false })
  app.useBodyParser('json', { limit: '1mb' })
  app.setGlobalPrefix('api')
  const port = Number(config.get('PORT') ?? 8080)
  await app.listen(port, '0.0.0.0')
  // eslint-disable-next-line no-console
  console.log(`[api] :${port} auth=${config.get('AUTH_MODE') ?? 'on'}`)
}

void bootstrap()
