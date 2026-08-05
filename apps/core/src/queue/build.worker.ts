import { jobs, services } from '@wisp/db'
import { Worker } from 'bullmq'
import { eq } from 'drizzle-orm'
import type { Redis } from 'ioredis'
import type { DatabaseClient } from '../plugins/db'
import { BuildService } from '../services/deploy/build.service'
import type { QueueService } from '../services/queue/queue.service'
import { generateId } from '../utils/id'

export function createBuildWorker(
  redis: Redis,
  db: DatabaseClient,
  queueService: QueueService,
): Worker {
  const buildService = new BuildService()

  return new Worker(
    'build',
    async (job) => {
      const { serviceId, slug, gitUrl, branch, jobId } = job.data as {
        serviceId: string
        slug: string
        gitUrl: string
        branch: string
        jobId: string
      }

      await db.update(jobs).set({ status: 'running' }).where(eq(jobs.id, jobId))
      await db.update(services).set({ status: 'building' }).where(eq(services.id, serviceId))

      const result = await buildService.build({ serviceId, slug, gitUrl, branch, jobId })

      await db
        .update(jobs)
        .set({ status: result.success ? 'success' : 'failed', logOutput: result.log })
        .where(eq(jobs.id, jobId))

      if (!result.success) {
        await db.update(services).set({ status: 'error' }).where(eq(services.id, serviceId))
        return result
      }

      const port = await buildService.detectImagePort(slug, jobId)
      await db.update(services).set({ port }).where(eq(services.id, serviceId))

      const deployJobId = generateId(15)
      await db.insert(jobs).values({
        id: deployJobId,
        type: 'deploy',
        status: 'pending',
        serviceId,
      })
      await queueService.addDeployJob({ serviceId, slug, jobId: deployJobId, port })

      return result
    },
    { connection: redis },
  )
}
