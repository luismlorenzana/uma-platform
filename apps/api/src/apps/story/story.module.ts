// Uma Story's API (US1, P141), under /api/story, behind the owner guard like every route: the home's numbers, the cast
// by batch, each book's drafts and check report, one draft's text, and the owner's verdicts (its only write).
// A book is `story/<book>/` in the app's bucket; run locally it is the writer's own drafts folder, read in place (AP61):
// STORY_CAST_DIR, STORY_QUEST_DIR and STORY_FARM_DIR, defaulting to this repo's authoring folder and the two games'.
import { resolve } from 'node:path'
import { BucketFileSource, DirectoryFileSource } from '@luismlorenzana/uma-server/content'
import { BadRequestException, Body, ConflictException, Controller, Get, Inject, Module, NotFoundException, Param, Put, Query } from '@nestjs/common'
import { blobStore, type BlobStore } from '../../store/blob-store'
import { BOOK_TITLES, BOOKS, isBook, StoryInvalid, type Book } from './story.model'
import { StoryConflict, StoryMissing, StoryStore, type RankerFiles } from './story.store'

const cwd = process.cwd()
const FOLDERS: Record<Book, { env: string; fallback: string }> = {
  cast: { env: 'STORY_CAST_DIR', fallback: '../../content/authoring/story/cast' },
  quest: { env: 'STORY_QUEST_DIR', fallback: '../../../uma-quest/content/stories' },
  farm: { env: 'STORY_FARM_DIR', fallback: '../../../uma-farm/content/story' },
}
export const storyBlobs = (book: Book): BlobStore =>
  blobStore({ bucket: process.env.CONTENT_BUCKET, prefix: `story/${book}/`, dir: resolve(cwd, process.env[FOLDERS[book].env] ?? FOLDERS[book].fallback) })
/** The Ranker's files: `ranker/…` in the app's bucket, or its local copy in dev. */
function ranker(): RankerFiles {
  if (process.env.CONTENT_BUCKET) { const bucket = new BucketFileSource(process.env.CONTENT_BUCKET); return { read: (p) => bucket.read(`ranker/${p}`) } }
  return new DirectoryFileSource(resolve(cwd, process.env.RANKER_DIR ?? '../../content/authoring/ranker'))
}

const STORY = Symbol('story-store')

async function guarded<T>(work: () => Promise<T>): Promise<T> {
  try { return await work() } catch (error) {
    if (error instanceof StoryInvalid) throw new BadRequestException({ error: error.message })
    if (error instanceof StoryMissing) throw new NotFoundException({ error: error.message })
    if (error instanceof StoryConflict) throw new ConflictException({ error: error.message })
    throw error
  }
}
const bookOf = (value: string): Book => {
  if (!isBook(value)) throw new NotFoundException({ error: 'No such book' })
  return value
}

@Controller('story')
export class StoryController {
  constructor(@Inject(STORY) private readonly store: StoryStore) {}

  /** The home: each book's numbers. */
  @Get()
  async home() {
    const [books, cast] = await Promise.all([this.store.summaries(), this.store.castSize()])
    return { cast, books }
  }

  /** A few numbers for the tile (AP4). */
  @Get('summary')
  async summary() {
    const [books, cast] = await Promise.all([this.store.summaries(), this.store.castSize()])
    return [
      { label: 'Umas in the cast', value: cast === null ? '—' : String(cast) },
      ...books.filter((b) => b.book !== 'cast').map((b) => ({ label: `${BOOK_TITLES[b.book]} drafts`, value: String(b.files) })),
    ]
  }

  /** The Ranker's Umas by batch, and which books hold each. */
  @Get('cast')
  cast() { return guarded(() => this.store.cast()) }

  @Get(':book/index')
  index(@Param('book') book: string) { const b = bookOf(book); return guarded(() => this.store.view(b)) }

  /** One draft's text: `?path=bundles/9000001.json`. */
  @Get(':book/file')
  file(@Param('book') book: string, @Query('path') path: unknown) {
    const b = bookOf(book)
    return guarded(() => this.store.file(b, typeof path === 'string' ? path : ''))
  }

  /** One item's verdict: `{ item, status, note }`. Answers with every verdict of the book. */
  @Put(':book/reviews')
  saveVerdict(@Param('book') book: string, @Body() body: unknown) { const b = bookOf(book); return guarded(() => this.store.saveVerdict(b, body)) }
}

@Module({
  controllers: [StoryController],
  providers: [{ provide: STORY, useFactory: () => new StoryStore(Object.fromEntries(BOOKS.map((b) => [b, storyBlobs(b)])) as Record<Book, BlobStore>, ranker()) }],
})
export class StoryModule {}
