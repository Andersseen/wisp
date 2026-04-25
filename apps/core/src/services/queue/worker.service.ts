import { Worker } from 'bullmq'
import type { Redis } from 'ioredis'
import { BuildService } from '../deploy/build.service'

export class WorkerService {
  private buildWorker: Worker

  constructor(redis: Redis, private buildService: BuildService) {
    this.buildWorker = new Worker(
      'build',
      async (job) => {
        const { serviceId, gitUrl, branch } = job.data as {
          serviceId: string
          gitUrl: string
          branch: string
        }
        return this.buildService.build({ serviceId, gitUrl, branch })
      },
      { connection: redis },
    )
  }

  async close(): Promise<void> {
    await this.buildWorker.close()
  }
}
