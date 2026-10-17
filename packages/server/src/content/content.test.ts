// The content routes: which paths they serve and how they cache (uma-rpg's tests, ported), the local folders, the
// bucket (mocked), and both routes over HTTP behind the guard. Invented files only.
import 'reflect-metadata'
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Module, type INestApplication } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AuthModule } from '../auth/index.js'
import {
  BucketFileSource, contentTypeFor, DirectoryFileSource, fileSource, DirectoryReleaseSource, isHashNamed, packCacheControl, PrivatePackModule, releaseCacheControl,
  ReleaseProxyModule, safePackPath, safeReleasePath, type FileSource,
} from './index.js'

const bucket = vi.hoisted(() => ({ files: new Map<string, Uint8Array>(), opened: [] as string[] }))
vi.mock('@google-cloud/storage', () => ({
  Storage: class {
    bucket(name: string) {
      bucket.opened.push(name)
      return {
        file: (path: string) => ({
          download: async () => {
            const bytes = bucket.files.get(path)
            if (!bytes) throw Object.assign(new Error('No such object'), { code: 404 })
            return [bytes]
          },
        }),
      }
    }
  },
}))

const ENEMIES = [/enemies\/[a-z0-9]+(-[a-z0-9]+)*-(face|art|splash)\.[a-f0-9]{8}\.webp/]
const PACK_ALLOW = ['enemies.json', ...ENEMIES]

describe('release paths', () => {
  it('allow only files, manifests and channels, with no traversal or hidden segments', () => {
    expect(safeReleasePath('channels/v1/latest.json')).toBe('channels/v1/latest.json')
    expect(safeReleasePath('/files/data/outfits.0123456789abcdef.json')).toBe('files/data/outfits.0123456789abcdef.json')
    for (const bad of ['files/../secrets.json', 'files/.hidden', 'content/overrides/x.json', 'files//double', '', 'manifest.json']) {
      expect(safeReleasePath(bad), bad).toBeNull()
    }
  })

  it('cache hash-named files for good and revalidate pointers', () => {
    expect(releaseCacheControl('files/art/a.0123456789abcdef.webp')).toContain('immutable')
    expect(releaseCacheControl('channels/v1/latest.json')).toBe('private, no-cache')
    expect(releaseCacheControl('manifests/v1/abcdef123456.json')).toBe('private, no-cache')
    expect([contentTypeFor('files/x.webp'), contentTypeFor('a.json'), contentTypeFor('a.ogg'), contentTypeFor('a.bin')])
      .toEqual(['image/webp', 'application/json', 'audio/ogg', 'application/octet-stream'])
  })
})

describe('private pack paths', () => {
  it('serve exact index files and hash-named files their patterns match, nothing else', () => {
    expect(safePackPath('enemies.json', PACK_ALLOW)).toEqual({ path: 'enemies.json', immutable: false })
    expect(safePackPath('/enemies/al-test-unit-art.3c29e295.webp', PACK_ALLOW)).toEqual({ path: 'enemies/al-test-unit-art.3c29e295.webp', immutable: true })
    for (const bad of ['cast.json', 'enemies/../save.json', 'enemies/al-x-art.webp', 'enemies/al-x-art.3c29e295.png', 'enemies/al-x-bust.3c29e295.webp',
      'enemies/AL-x-art.3c29e295.webp', 'enemies/sub/al-x-art.3c29e295.webp', 'enemies.json/../x', 'enemies/-art.3c29e295.webp', 'x/enemies.json']) {
      expect(safePackPath(bad, PACK_ALLOW), bad).toBeNull()
    }
    // A pattern that would match a file without its hash still refuses it.
    expect(safePackPath('packs/list.json', [/packs\/[a-z.]+/])).toBeNull()
    expect(safePackPath('packs/list.0a1b2c3d.json', [/packs\/[a-z0-9.]+/])).toMatchObject({ immutable: true })
    expect(isHashNamed('a.0a1b2c3d.webp')).toBe(true)
    expect(isHashNamed('a.webp')).toBe(false)
    expect(packCacheControl({ path: 'enemies.json', immutable: false })).toBe('private, no-cache')
  })
})

describe('sources', () => {
  it('serve a local release folder like the bucket', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'uma-server-release-'))
    await mkdir(join(dir, 'data'), { recursive: true })
    await writeFile(join(dir, 'manifest.json'), JSON.stringify({ schemaMajor: 1, version: 'abcdef123456', createdAt: '2026-10-10T00:00:00.000Z' }))
    await writeFile(join(dir, 'data', 'x.json'), '{"ok":true}')
    const source = new DirectoryReleaseSource(dir)
    const text = async (path: string) => new TextDecoder().decode((await source.read(path)) ?? new Uint8Array())
    expect(JSON.parse(await text('channels/v1/latest.json'))).toMatchObject({ version: 'abcdef123456', manifest: 'manifests/v1/abcdef123456.json', channel: 'latest' })
    expect(await source.read('manifests/v1/abcdef123456.json')).not.toBeNull()
    expect(await text('files/data/x.json')).toBe('{"ok":true}')
    expect(await source.read('files/data/missing.json')).toBeNull()
    expect(await source.read('files/data')).toBeNull()
    expect(await new DirectoryReleaseSource(join(dir, 'nowhere')).read('channels/v1/latest.json')).toBeNull()
  })

  it('never read outside a folder', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'uma-server-pack-'))
    await writeFile(join(dir, 'enemies.json'), '[]')
    const source = new DirectoryFileSource(dir)
    expect(await source.read('enemies.json')).not.toBeNull()
    expect(await source.read('../enemies.json')).toBeNull()
  })

  it('read the bucket, loading the storage client once, with a missing object as null', async () => {
    bucket.files.set('files/data/x.json', new TextEncoder().encode('{}'))
    const source = new BucketFileSource('uma-test-bucket')
    expect(new TextDecoder().decode((await source.read('files/data/x.json'))!)).toBe('{}')
    expect(await source.read('files/data/missing.json')).toBeNull()
    expect(bucket.opened).toEqual(['uma-test-bucket'])
  })
})

describe('the routes', () => {
  let app: INestApplication | undefined
  afterEach(async () => {
    await app?.close()
    app = undefined
  })

  const memory = (files: Record<string, string>): FileSource => ({
    read: async (path) => (path in files ? new TextEncoder().encode(files[path]) : null),
  })

  async function serve() {
    @Module({
      imports: [
        AuthModule.forRoot({ mode: 'enabled', allowedEmail: 'owner@example.test', verifyIdToken: async (token) => ({ uid: 'u1', email: token }) }),
        ReleaseProxyModule.forRoot({ source: memory({ 'channels/v1/latest.json': '{"version":"x"}', 'files/art/a.0123456789abcdef.webp': 'RIFF' }) }),
        PrivatePackModule.forRoot({ allow: PACK_ALLOW, source: memory({ 'enemies.json': '[]', 'enemies/al-test-art.3c29e295.webp': 'RIFF', 'enemies/al-test-art.webp': 'RIFF' }) }),
      ],
    })
    class TestModule {}
    app = await NestFactory.create(TestModule, { logger: false })
    await app.listen(0, '127.0.0.1')
    const base = await app.getUrl()
    return async (path: string, token: string | null = 'owner@example.test') => {
      const res = await fetch(`${base}${path}`, token === null ? {} : { headers: { authorization: `Bearer ${token}` } })
      return { status: res.status, type: res.headers.get('content-type'), cache: res.headers.get('cache-control'), body: await res.text() }
    }
  }

  it('serve the release and the pack to the owner, with their types and caching', async () => {
    const get = await serve()
    expect(await get('/master/channels/v1/latest.json')).toMatchObject({ status: 200, type: 'application/json', cache: 'private, no-cache', body: '{"version":"x"}' })
    expect(await get('/master/files/art/a.0123456789abcdef.webp')).toMatchObject({ status: 200, type: 'image/webp', cache: 'private, max-age=31536000, immutable' })
    expect(await get('/content/enemies.json')).toMatchObject({ status: 200, cache: 'private, no-cache', body: '[]' })
    expect(await get('/content/enemies/al-test-art.3c29e295.webp')).toMatchObject({ status: 200, cache: 'private, max-age=31536000, immutable' })
  })

  it('answer 404 for anything outside the release or the allowlist, or missing, and 401/403 before that', async () => {
    const get = await serve()
    for (const path of ['/master/content/overrides/x.json', '/master/files/art/missing.0123456789abcdef.webp', '/content/enemies/al-test-art.webp', '/content/cast.json']) {
      expect((await get(path)).status, path).toBe(404)
    }
    expect((await get('/content/enemies.json', null)).status).toBe(401)
    expect((await get('/master/channels/v1/latest.json', 'stranger@example.test')).status).toBe(403)
  })

  it('refuse to start without a source or an allowlist', () => {
    expect(() => PrivatePackModule.forRoot({ allow: [] })).toThrow(/allowlist/)
    expect(() => fileSource({}, (dir) => new DirectoryFileSource(dir))).toThrow(/bucket or a local folder/)
  })
})
