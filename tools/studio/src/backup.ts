/** Gate writes return immediately; backups run serially and expose their outcome. */
export class BackupQueue {
  private pending = Promise.resolve()
  readonly status: { state: 'idle' | 'queued' | 'running' | 'complete' | 'failed'; at: string | null } = { state: 'idle', at: null }
  constructor(private readonly run: () => Promise<void>) {}
  schedule(): Promise<void> {
    this.status.state = 'queued'
    this.pending = this.pending.then(async () => {
      this.status.state = 'running'
      try { await this.run(); this.status.state = 'complete' }
      catch { this.status.state = 'failed' }
      this.status.at = new Date().toISOString()
    })
    return this.pending
  }
}
