// The Ranker's routes (RK1), under /api/ranker, behind the owner guard like every route.
import { BadRequestException, Body, ConflictException, Controller, Get, HttpCode, Inject, NotFoundException, Param, Post, Put } from '@nestjs/common'
import { boardOf, BOARDS, pools, rankedIdentities, type BoardId } from '@uma-platform/tiers'
import { CatalogService } from './catalog.service'
import { RankerConflict, RankerInvalid, RankerStore } from './ranker.store'

export const RANKER_STORE = Symbol('ranker-store')
export const RANKER_CATALOG = Symbol('ranker-catalog')

async function guarded<T>(work: () => Promise<T>): Promise<T> {
  try { return await work() } catch (error) {
    if (error instanceof RankerConflict) throw new ConflictException({ error: error.message, current: error.current })
    if (error instanceof RankerInvalid) throw new BadRequestException({ error: error.message })
    throw error
  }
}

@Controller('ranker')
export class RankerController {
  constructor(@Inject(RANKER_STORE) private readonly store: RankerStore, @Inject(RANKER_CATALOG) private readonly catalogs: CatalogService) {}

  /** Everything the pages draw: the catalog, every board, the profiles, the imports. */
  @Get()
  async all() {
    const [loaded, states, profiles] = await Promise.all([this.catalogs.get(), this.store.boards(), this.store.profiles()])
    return { release: loaded.catalog.release, builtAt: loaded.builtAt, catalog: loaded.catalog, states, profiles: profiles.profiles, imports: loaded.imports }
  }

  /** A few numbers for the home tile (AP4). */
  @Get('summary')
  async summary() {
    const [loaded, states, { profiles }] = await Promise.all([this.catalogs.get(), this.store.boards(), this.store.profiles()])
    const all = pools(loaded.catalog, states, profiles), ranked = all.umas.filter((m) => states.umas.entries.some((e) => e.id === m.id && e.tier)).length
    const identities = rankedIdentities(loaded.catalog, states, profiles), inBatches = identities.filter((i) => i.tier).length
    return [
      { label: `of ${all.umas.length} outfits ranked`, value: String(ranked) },
      { label: 'Umas in the 10 batches', value: String(inBatches) },
      { label: 'boards', value: String(BOARDS.length) },
    ]
  }

  @Get('plan')
  async plan() {
    return this.store.writePlan((await this.catalogs.get()).catalog)
  }

  @Put('boards/:board')
  async saveBoard(@Param('board') board: string, @Body() body: unknown) {
    if (!boardOf(board)) throw new NotFoundException({ error: 'No such board' })
    return guarded(async () => {
      const { catalog } = await this.catalogs.get()
      const saved = await this.store.saveBoard(board as BoardId, body, catalog)
      await this.store.writePlan(catalog)
      return saved
    })
  }

  @Put('profiles')
  async saveProfiles(@Body() body: unknown) {
    return guarded(async () => {
      const { catalog } = await this.catalogs.get()
      const saved = await this.store.saveProfiles(body, catalog)
      await this.store.writePlan(catalog)
      return saved
    })
  }

  /** Rebuilds the catalog after `pnpm ranker:push` uploads new imports or the release moves. */
  @Post('reload')
  @HttpCode(200)
  async reload() {
    const loaded = await this.catalogs.reload()
    return { release: loaded.catalog.release, builtAt: loaded.builtAt, umas: loaded.catalog.umas.length, enemies: loaded.catalog.enemies.length }
  }
}
