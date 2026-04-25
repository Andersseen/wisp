import { Worker } from 'bullmq'
import type { Redis } from 'ioredis'

export function createDeployWorker(redis: Redis): Worker {
  return new Worker(
    'deploy',
    async (job) => {
      const { serviceId } = job.data as { serviceId: string }
      // TODO: implement deploy logic
      return { deployed: serviceId }
    },
    { connection: redis },
  )
}
