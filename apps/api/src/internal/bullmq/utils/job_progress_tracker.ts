import { logger } from '@ritchy/logger'

export class JobProgressTracker {
  private progress = new Map<
    string,
    { startTime: number; lastUpdate: number }
  >()

  startTracking(jobId: string) {
    const now = Date.now()
    this.progress.set(jobId, { startTime: now, lastUpdate: now })
  }

  updateProgress(jobId: string, stage: string) {
    const progress = this.progress.get(jobId)
    if (progress) {
      progress.lastUpdate = Date.now()
      logger.debug({
        msg: `Job ${jobId} progress: ${stage}`,
        event: 'job_progress_update',
        metadata: {
          jobId,
          stage,
          elapsedSeconds: Math.floor((Date.now() - progress.startTime) / 1000),
        },
      })
    }
  }

  getElapsedTime(jobId: string): number {
    const progress = this.progress.get(jobId)
    return progress ? Date.now() - progress.startTime : 0
  }

  cleanup(jobId: string) {
    this.progress.delete(jobId)
  }
}

export const jobTracker = new JobProgressTracker()
