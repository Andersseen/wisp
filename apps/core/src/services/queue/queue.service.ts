import { Queue } from 'bullmq'
import type { Redis } from 'ioredis'

export interface BuildJobData {
  serviceId: string
  slug: string
  gitUrl: string
  branch: string
  jobId: string
}

export interface DeployJobData {
  serviceId: string
  slug: string
  jobId: string
  port?: number
}

export class QueueService {
  private buildQueue: Queue
  private deployQueue: Queue

  constructor(redis: Redis) {
    this.buildQueue = new Queue('build', { connection: redis })
    this.deployQueue = new Queue('deploy', { connection: redis })
  }

  async addBuildJob(data: BuildJobData): Promise<void> {
    await this.buildQueue.add('build', data)
  }

  async addDeployJob(data: DeployJobData): Promise<void> {
    await this.deployQueue.add('deploy', data, { jobId: data.jobId })
  }
}
