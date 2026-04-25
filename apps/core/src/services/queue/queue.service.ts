import { Queue } from 'bullmq'
import type { Redis } from 'ioredis'

export class QueueService {
  private buildQueue: Queue

  constructor(redis: Redis) {
    this.buildQueue = new Queue('build', { connection: redis })
  }

  async addBuildJob(serviceId: string, gitUrl: string, branch: string): Promise<string> {
    const job = await this.buildQueue.add('build', { serviceId, gitUrl, branch })
    return job.id ?? ''
  }
}
