import { resolve } from 'node:path'
import { Controller, Get, Header, Inject, Module, NotFoundException, Query } from '@nestjs/common'
import { blobStore } from '../../store/blob-store'
import { StorageService } from './storage.service'

const REPORT = Symbol('storage-report')
@Controller('storage')
class StorageController {
  constructor(@Inject(REPORT) private readonly service: StorageService) {}
  @Get('report')
  @Header('Cache-Control', 'private, no-cache')
  async report(@Query('refresh') refresh?: string) {
    const report = await this.service.report(refresh === '1')
    if (!report) throw new NotFoundException('No storage report has been collected yet')
    return report
  }
  @Get('summary')
  @Header('Cache-Control', 'private, no-cache')
  async summary() {
    const report = await this.service.report()
    return report ? [{ label: 'GiB stored', value: ((report.totals.liveBytes + report.totals.noncurrentBytes + report.totals.softDeletedBytes) / 1024 ** 3).toFixed(2) },
      { label: 'buckets', value: String(report.buckets.length) }] : [{ label: 'report', value: 'pending' }]
  }
}
@Module({
  controllers: [StorageController],
  providers: [{ provide: REPORT, useFactory: () => new StorageService(blobStore({ bucket: process.env.CONTENT_BUCKET, prefix: 'reports/storage/',
    dir: resolve(process.cwd(), process.env.STORAGE_REPORT_DIR ?? '../../content/reports/storage') })) }],
})
export class StorageModule {}
