// Uma Ranker's API (RK1): its routes, its store and catalog, and its enemy art served from its own store as a private
// pack (`/api/ranker/content/assets/enemies/…`, hash-named files only).
import { resolve } from 'node:path'
import { DirectoryReleaseSource, fileSource, PrivatePackModule, type FileSource } from '@luismlorenzana/uma-server/content'
import { Module } from '@nestjs/common'
import { blobStore, type BlobStore } from './blob-store'
import { CatalogService, releaseSource } from './catalog.service'
import { RANKER_CATALOG, RANKER_STORE, RankerController } from './ranker.controller'
import { RankerStore } from './ranker.store'

/** The bucket in production; `content/authoring/ranker` in dev (RANKER_DIR). */
export const rankerBlobs = (): BlobStore =>
  blobStore({ bucket: process.env.CONTENT_BUCKET, dir: resolve(process.cwd(), process.env.RANKER_DIR ?? '../../content/authoring/ranker') })
const blobs = rankerBlobs()
const assets: FileSource = { read: async (path) => (await blobs.read(path))?.bytes ?? null }
const release = (): FileSource =>
  fileSource({ bucket: process.env.MASTER_BUCKET, dir: resolve(process.cwd(), process.env.MASTER_DIR ?? '../../content/release') }, (dir) => new DirectoryReleaseSource(dir))

@Module({
  imports: [PrivatePackModule.forRoot({ route: 'ranker/content', source: assets, allow: [/assets\/enemies\/[a-z0-9-]+-(face|art|splash)\.[a-f0-9]{8}\.webp/] })],
  controllers: [RankerController],
  providers: [
    { provide: RANKER_STORE, useFactory: () => new RankerStore(blobs) },
    { provide: RANKER_CATALOG, useFactory: () => new CatalogService(releaseSource(release()), blobs) },
  ],
})
export class RankerModule {}
