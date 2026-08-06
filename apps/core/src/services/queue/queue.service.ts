import { Queue } from 'bullmq'
import type { Redis } from 'ioredis'
import { logger } from '../../plugins/logger'

export class QueueService {
  private buildQueue: Queue

  constructor(redis: Redis) {
    this.buildQueue = new Queue('build', {
      connection: redis,
      defaultJobOptions: { removeOnComplete: true, removeOnFail: true },
    })
  }

  async addBuildJob(
    serviceId: string,
    slug: string,
    gitUrl: string,
    branch: string,
    jobId: string,
  ): Promise<string> {
    try {
      const job = await this.buildQueue.add('build', { serviceId, slug, gitUrl, branch, jobId })
      return job.id ?? ''
    } catch (err) {
      logger.error({ err, serviceId, jobId }, 'failed to enqueue build job')
      return ''
    }
  }
}
