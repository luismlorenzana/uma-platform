// Uma Character Art's API (CA1, CA2): the order (`/api/art/order`), the adult sets' source-art records (`/api/art/sources`),
// a summary for its tile, and uma-quest's adult key pack, read only (`/api/art/content/traveler-keys/…`, its allowlist; AP11).
import { resolve } from 'node:path'
import { BucketFileSource, DirectoryFileSource, DirectoryReleaseSource, fileSource, PrivatePackModule, type FileSource } from '@luismlorenzana/uma-server/content'
import { Controller, Get, Inject, Module } from '@nestjs/common'
import { ArtService } from './art.service'
import { sourceReleases } from './art.sources'

/** uma-quest's pack allowlist (its `PACK_ALLOW` at 47ca16d): the index and hash-named sets, pages and stills. */
export const KEY_PACK_ALLOW = ['traveler-keys/index.json', /traveler-keys\/(sets|pages|stills)\/[a-z0-9-]+\.[a-f0-9]{16}\.(json|webp)/]

const cwd = process.cwd()
const keys = (): FileSource => fileSource({ bucket: process.env.QUEST_CONTENT_BUCKET, dir: resolve(cwd, process.env.QUEST_CONTENT_DIR ?? '../../../uma-quest/content') }, (dir) => new DirectoryFileSource(dir))
/** The master bucket, whose `source-art/` holds the adult sets' releases; locally, `content/` (a mirror of their JSON files). */
const sources = (): FileSource => fileSource({ bucket: process.env.MASTER_BUCKET, dir: resolve(cwd, process.env.SOURCE_ART_DIR ?? '../../content') }, (dir) => new DirectoryFileSource(dir))
const release = (): FileSource => fileSource({ bucket: process.env.MASTER_BUCKET, dir: resolve(cwd, process.env.MASTER_DIR ?? '../../content/release') }, (dir) => new DirectoryReleaseSource(dir))
/** The Ranker's files: `ranker/…` in the app's bucket, or the local copy in dev. */
function ranker(): FileSource {
  if (process.env.CONTENT_BUCKET) { const bucket = new BucketFileSource(process.env.CONTENT_BUCKET); return { read: (p) => bucket.read(`ranker/${p}`) } }
  return new DirectoryFileSource(resolve(cwd, process.env.RANKER_DIR ?? '../../content/authoring/ranker'))
}
const ART = Symbol('art-service'), KEYS = Symbol('art-keys'), SOURCES = Symbol('art-sources')

@Controller('art')
class ArtController {
  constructor(@Inject(ART) private readonly art: ArtService, @Inject(KEYS) private readonly keys: FileSource, @Inject(SOURCES) private readonly sources: FileSource) {}

  @Get('order')
  order() { return this.art.order() }

  /** The adult sets' source-art releases, batch by batch (CA2). */
  @Get('sources')
  sourceReleases() { return sourceReleases(this.sources) }

  @Get('summary')
  async summary() {
    const [order, index] = await Promise.all([this.art.order(), this.keys.read('traveler-keys/index.json')])
    const sets = index ? Object.keys((JSON.parse(new TextDecoder().decode(index)) as { sets: Record<string, unknown> }).sets).length : 0
    const batched = order.outfits.filter((o) => o.tier && o.tier !== 'F').length
    return [
      { label: 'outfits', value: String(order.outfits.length) },
      { label: 'in a batch', value: String(batched) },
      { label: 'adult sets', value: String(sets) },
    ]
  }
}

@Module({
  imports: [PrivatePackModule.forRoot({ route: 'art/content', source: keys(), allow: KEY_PACK_ALLOW })],
  controllers: [ArtController],
  providers: [
    { provide: ART, useFactory: () => new ArtService(release(), ranker()) },
    { provide: KEYS, useFactory: keys },
    { provide: SOURCES, useFactory: sources },
  ],
})
export class ArtModule {}
