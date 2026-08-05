import { Queue } from 'bullmq'
import type { Redis } from 'ioredis'

export interface BuildJobData {
  serviceId: string
  slug: string
  gitUrl: string
  branch: string
  jobId: string
}

export class QueueService {
  private buildQueue: Queue

  constructor(redis: Redis) {
    this.buildQueue = new Queue('build', { connection: redis })
  }

  async addBuildJob(data: BuildJobData): Promise<void> {
    await this.buildQueue.add('build', data)
  }
}
