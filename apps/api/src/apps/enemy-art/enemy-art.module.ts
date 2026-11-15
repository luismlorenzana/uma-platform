// Uma Enemy Art's API (EA1, P183): the published enemy looks, game by game (`/api/enemy-art/games`), a summary for its
// tile, and their PNGs through its own pack route (`/api/enemy-art/content/<game>/images/…`, its allowlist), read from the
// app's own bucket (`enemy-art/`), or its local copy in dev (`content/published/enemy-art`).
import { resolve } from 'node:path'
import { PrivatePackModule, type FileSource } from '@luismlorenzana/uma-server/content'
import { Controller, Get, Inject, Module } from '@nestjs/common'
import { blobStore, type BlobStore } from '../../store/blob-store'
import { ENEMY_PACK_ALLOW, enemyGames } from './enemy-art.games'

/** What `pnpm art:push <universe> --enemies` publishes: `enemy-art/…` in the app's bucket, or its local copy in dev. */
const published = (): BlobStore => blobStore({ bucket: process.env.CONTENT_BUCKET, prefix: 'enemy-art/', dir: resolve(process.cwd(), process.env.ENEMY_ART_DIR ?? '../../content/published/enemy-art') })
const pack = (store: BlobStore): FileSource => ({ read: async (path) => (await store.read(path))?.bytes ?? null })
const PUBLISHED = Symbol('enemy-art-published')

@Controller('enemy-art')
class EnemyArtController {
  constructor(@Inject(PUBLISHED) private readonly published: BlobStore) {}

  /** Every published game's enemy looks, faction by faction. */
  @Get('games')
  games() { return enemyGames(this.published) }

  @Get('summary')
  async summary() {
    const games = await this.games().catch(() => [])
    const factions = games.reduce((n, g) => n + g.factions.length, 0), looks = games.reduce((n, g) => n + g.factions.reduce((m, f) => m + f.looks.length, 0), 0)
    return [
      { label: games.length === 1 ? 'game' : 'games', value: String(games.length) },
      { label: factions === 1 ? 'faction' : 'factions', value: String(factions) },
      { label: looks === 1 ? 'enemy look' : 'enemy looks', value: String(looks) },
    ]
  }
}

const store = published()

@Module({
  imports: [PrivatePackModule.forRoot({ route: 'enemy-art/content', source: pack(store), allow: [ENEMY_PACK_ALLOW] })],
  controllers: [EnemyArtController],
  providers: [{ provide: PUBLISHED, useValue: store }],
})
export class EnemyArtModule {}
