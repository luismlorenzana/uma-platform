// The content routes both APIs serve (uma-platform SE2): uma-platform's master data release, and a game's private packs.
// Each `forRoot` makes its own controller at the game's route. Both sit behind SD1's `AuthGuard` on the controller
// itself, so a route can't go out unguarded: an API that hasn't imported `AuthModule` fails at start instead.
import { Controller, Get, Inject, Module, NotFoundException, Param, Res, UseGuards, type DynamicModule } from '@nestjs/common'
import { AuthGuard } from '../auth/auth.guard.js'
import { contentTypeFor, packCacheControl, releaseCacheControl, safePackPath, safeReleasePath, type PackAllow } from './paths.js'
import { DirectoryFileSource, DirectoryReleaseSource, fileSource, type FileSource } from './sources.js'

/** The bits of Express's response the routes use. */
interface FileResponse {
  setHeader(name: string, value: string): unknown
  end(body: Uint8Array): unknown
}

function send(res: FileResponse, path: string, bytes: Uint8Array, cacheControl: string): void {
  res.setHeader('Content-Type', contentTypeFor(path))
  res.setHeader('Cache-Control', cacheControl)
  res.setHeader('Content-Length', String(bytes.byteLength))
  res.end(bytes)
}

const joined = (raw: string | string[]): string => (Array.isArray(raw) ? raw.join('/') : raw)

export interface ReleaseProxyOptions {
  /** The route under the API's prefix (default `master`, so `/api/master/…`). */
  readonly route?: string
  /** The release bucket (production). */
  readonly bucket?: string
  /** uma-platform's local release folder (development), used when no bucket is named. */
  readonly dir?: string
  /** Replaces the bucket and the folder, for tests. */
  readonly source?: FileSource
}

@Module({})
export class ReleaseProxyModule {
  /** Serves `files/`, `manifests/` and `channels/` of uma-platform's master data release to the signed-in owner. */
  static forRoot(options: ReleaseProxyOptions): DynamicModule {
    const SOURCE = Symbol('uma-server:release-source')

    @UseGuards(AuthGuard)
    @Controller(options.route ?? 'master')
    class ReleaseController {
      constructor(@Inject(SOURCE) private readonly source: FileSource) {}

      @Get('*path')
      async read(@Param('path') raw: string | string[], @Res() res: FileResponse): Promise<void> {
        const path = safeReleasePath(joined(raw))
        const bytes = path === null ? null : await this.source.read(path)
        if (path === null || bytes === null) throw new NotFoundException('not found')
        send(res, path, bytes, releaseCacheControl(path))
      }
    }

    return {
      module: ReleaseProxyModule,
      controllers: [ReleaseController],
      providers: [{ provide: SOURCE, useFactory: () => options.source ?? fileSource(options, (dir) => new DirectoryReleaseSource(dir)) }],
    }
  }
}

export interface PrivatePackOptions {
  /** The route under the API's prefix (default `content`, so `/api/content/…`). */
  readonly route?: string
  /** The pack bucket (production). */
  readonly bucket?: string
  /** The game's local pack folder (development), used when no bucket is named. */
  readonly dir?: string
  /** What may be served: exact index files, and patterns for hash-named files. */
  readonly allow: PackAllow
  /** Replaces the bucket and the folder, for tests. */
  readonly source?: FileSource
}

@Module({})
export class PrivatePackModule {
  /** Serves a game's private pack (uma-rpg's enemies) to the signed-in owner: allowlisted files only. */
  static forRoot(options: PrivatePackOptions): DynamicModule {
    if (options.allow.length === 0) throw new Error('A private pack needs an allowlist')
    const SOURCE = Symbol('uma-server:pack-source')

    @UseGuards(AuthGuard)
    @Controller(options.route ?? 'content')
    class PackController {
      constructor(@Inject(SOURCE) private readonly source: FileSource) {}

      @Get('*path')
      async read(@Param('path') raw: string | string[], @Res() res: FileResponse): Promise<void> {
        const pack = safePackPath(joined(raw), options.allow)
        const bytes = pack === null ? null : await this.source.read(pack.path)
        if (pack === null || bytes === null) throw new NotFoundException('not found')
        send(res, pack.path, bytes, packCacheControl(pack))
      }
    }

    return {
      module: PrivatePackModule,
      controllers: [PackController],
      providers: [{ provide: SOURCE, useFactory: () => options.source ?? fileSource(options, (dir) => new DirectoryFileSource(dir)) }],
    }
  }
}
