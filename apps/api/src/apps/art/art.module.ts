// Character Art: Ranker order, published universe images and portrait recipes.
import { resolve } from 'node:path'
import { BucketFileSource, DirectoryFileSource, DirectoryReleaseSource, fileSource, PrivatePackModule, type FileSource } from '@luismlorenzana/uma-server/content'
import { Controller, Get, Header, Inject, Module, NotFoundException, Param, Query } from '@nestjs/common'
import { CatalogCache } from '../../store/catalog-cache'
import { blobStore, type BlobStore } from '../../store/blob-store'
import { ArtService } from './art.service'
import { PORTRAIT_PACK_ALLOW, portraitRecipe, PROFILE_PACK_ALLOW, UNIVERSE_PACK_ALLOW, universes, type Universe } from './art.universes'

export const ART_PACK_ALLOW = [UNIVERSE_PACK_ALLOW, PORTRAIT_PACK_ALLOW, PROFILE_PACK_ALLOW]

const cwd = process.cwd()
const release = (): FileSource => fileSource({ bucket: process.env.MASTER_BUCKET, dir: resolve(cwd, process.env.MASTER_DIR ?? '../../content/release') }, (dir) => new DirectoryReleaseSource(dir))
/** The Ranker's files: `ranker/…` in the app's bucket, or the local copy in dev. */
function ranker(): FileSource {
  if (process.env.CONTENT_BUCKET) { const bucket = new BucketFileSource(process.env.CONTENT_BUCKET); return { read: (p) => bucket.read(`ranker/${p}`) } }
  return new DirectoryFileSource(resolve(cwd, process.env.RANKER_DIR ?? '../../content/authoring/ranker'))
}
/** What `pnpm art:push` publishes: `art/…` in the app's bucket, or its local copy in dev (`content/published/art`). */
const published = (): BlobStore => blobStore({ bucket: process.env.CONTENT_BUCKET, prefix: 'art/', dir: resolve(cwd, process.env.ART_DIR ?? '../../../uma-art-authoring/content/published/art') })
/** The gallery serves published universe files from its own store. */
function pack(): FileSource {
  const own = published()
  return { read: async (path) => (await own.read(path))?.bytes ?? null }
}
const ART = Symbol('art-service'), PUBLISHED = Symbol('art-published')

@Controller('art')
class ArtController {
  private readonly catalog = new CatalogCache<Universe[]>()
  constructor(
    @Inject(ART) private readonly art: ArtService,
    @Inject(PUBLISHED) private readonly published: BlobStore,
  ) {}

  @Get('order')
  order() { return this.art.order() }

  /** The published universe looks, universe by universe, each tied to her character by name (CA4). */
  @Get('universes')
  @Header('Cache-Control', 'private, no-cache')
  universes(@Query('refresh') refresh?: string) {
    return this.catalog.get(async () => universes(this.published, await this.art.artIdentityByName()), refresh === '1')
  }

  /** A universe's dialogue portraits for a game to compose (CA5): every crop and face at its pack path, and every state. */
  @Get('portraits/:universe')
  async portraits(@Param('universe') universe: string) {
    const recipe = await portraitRecipe(this.published, universe, await this.art.artIdentityByName())
    if (!recipe) throw new NotFoundException(`No published dialogue portraits for ${universe}`)
    return recipe
  }

  @Get('summary')
  @Header('Cache-Control', 'private, no-cache')
  async summary() {
    const [order, worlds] = await Promise.all([this.art.order(), this.universes().catch(() => [])])
    const batched = order.outfits.filter((o) => o.tier && o.tier !== 'F').length
    return [
      { label: 'outfits', value: String(order.outfits.length) },
      { label: 'in a batch', value: String(batched) },
      { label: 'universe looks', value: String(worlds.reduce((n, u) => n + u.looks.length, 0)) },
    ]
  }
}

@Module({
  imports: [PrivatePackModule.forRoot({ route: 'art/content', source: pack(), allow: ART_PACK_ALLOW })],
  controllers: [ArtController],
  providers: [
    { provide: ART, useFactory: () => new ArtService(release(), ranker()) },
    { provide: PUBLISHED, useFactory: published },
  ],
})
export class ArtModule {}
