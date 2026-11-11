// Copied from uma-quest at 47ca16d.
import { Public } from '@luismlorenzana/uma-server/auth'
import { Controller, Get } from '@nestjs/common'

// Served at /api/health. Not /healthz: Cloud Run's front end reserves some paths ending in "z".
@Controller()
export class HealthController {
  @Public()
  @Get('health')
  health() {
    return { ok: true, build: process.env.BUILD_ID ?? 'local' }
  }
}
