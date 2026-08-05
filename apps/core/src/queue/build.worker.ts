import { jobs, services } from '@wisp/db'
import { Worker } from 'bullmq'
import { eq } from 'drizzle-orm'
import type { Redis } from 'ioredis'
import type { DatabaseClient } from '../plugins/db'
import { BuildService } from '../services/deploy/build.service'

export function createBuildWorker(redis: Redis, db: DatabaseClient): Worker {
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
      }

      return result
    },
    { connection: redis },
  )
}
