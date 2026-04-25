import { Worker } from 'bullmq'
import type { Redis } from 'ioredis'
import { BuildService } from '../services/deploy/build.service'

export function createBuildWorker(redis: Redis): Worker {
  const buildService = new BuildService()

  return new Worker(
    'build',
    async (job) => {
      const { serviceId, gitUrl, branch } = job.data as {
        serviceId: string
        gitUrl: string
        branch: string
      }
      return buildService.build({ serviceId, gitUrl, branch })
    },
    { connection: redis },
  )
}
