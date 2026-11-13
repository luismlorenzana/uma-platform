// Look's API (LK1, P161), under /api/look, behind the owner guard like every route: the look slice's packed kit and cast
// through a private pack route (`look/pack/` in the app's bucket, filled by `pnpm look:upload`; locally
// content/authoring/look/pack/), and the phone test's runs, each saved as one JSON file (`look/runs/`) for the review.
import { resolve } from 'node:path'
import { BucketFileSource, DirectoryFileSource, PrivatePackModule, type FileSource } from '@luismlorenzana/uma-server/content'
import { BadRequestException, Body, Controller, Get, Inject, Module, Post } from '@nestjs/common'
import { ABSENT, blobStore, type BlobStore } from '../../store/blob-store'
import { LOOK_PACK_ALLOW, parseRun, runName, type LookRun } from './look.runs'

const cwd = process.cwd()
function pack(): FileSource {
  if (process.env.CONTENT_BUCKET) { const bucket = new BucketFileSource(process.env.CONTENT_BUCKET); return { read: (p) => bucket.read(`look/pack/${p}`) } }
  return new DirectoryFileSource(resolve(cwd, process.env.LOOK_PACK_DIR ?? '../../content/authoring/look/pack'))
}
const runs = (): BlobStore => blobStore({ bucket: process.env.CONTENT_BUCKET, prefix: 'look/runs/', dir: resolve(cwd, process.env.LOOK_RUNS_DIR ?? '../../content/authoring/look/runs') })
const RUNS = Symbol('look-runs'), PACK = Symbol('look-pack')

@Controller('look')
class LookController {
  constructor(@Inject(RUNS) private readonly runs: BlobStore, @Inject(PACK) private readonly pack: FileSource) {}

  /** A few numbers for the tile (AP4). */
  @Get('summary')
  async summary() {
    const [names, index] = await Promise.all([this.runs.list(''), this.pack.read('index.json')])
    const kit = index ? (JSON.parse(new TextDecoder().decode(index)) as { kit?: { bytes?: number } }).kit?.bytes : undefined
    return [
      { label: 'phone runs', value: String(names.length) },
      { label: 'kit', value: kit ? `${(kit / 2 ** 20).toFixed(1)} MB` : '—' },
    ]
  }

  /** The runs so far, newest first: their names and numbers. */
  @Get('runs')
  async list() {
    const names = (await this.runs.list('')).sort().reverse().slice(0, 20)
    const out: (LookRun & { name: string })[] = []
    for (const name of names) {
      const blob = await this.runs.read(name)
      if (!blob) continue
      try { out.push({ name, ...parseRun(JSON.parse(new TextDecoder().decode(blob.bytes))) }) } catch { /* a file that isn't a run is skipped */ }
    }
    return out
  }

  /** One finished phone test. */
  @Post('runs')
  async save(@Body() body: unknown) {
    let run: LookRun
    try { run = parseRun(body) } catch (error) { throw new BadRequestException({ error: error instanceof Error ? error.message : String(error) }) }
    const name = runName(new Date(), Math.random())
    const saved = await this.runs.write(name, new TextEncoder().encode(`${JSON.stringify(run)}\n`), ABSENT)
    if (!saved) throw new BadRequestException({ error: 'A run with that name exists; send it again' })
    return { name }
  }
}

@Module({
  imports: [PrivatePackModule.forRoot({ route: 'look/content', source: pack(), allow: LOOK_PACK_ALLOW })],
  controllers: [LookController],
  providers: [{ provide: RUNS, useFactory: runs }, { provide: PACK, useFactory: pack }],
})
export class LookModule {}
