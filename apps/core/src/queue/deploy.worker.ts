import { jobs, services } from '@wisp/db'
import { Worker } from 'bullmq'
import { eq } from 'drizzle-orm'
import type { Redis } from 'ioredis'
import type { DatabaseClient } from '../plugins/db'
import { RunService } from '../services/deploy/run.service'

export function createDeployWorker(redis: Redis, db: DatabaseClient): Worker {
  const runService = new RunService()

  return new Worker(
    'deploy',
    async (job) => {
      const { serviceId, slug, jobId, port } = job.data as {
        serviceId: string
        slug: string
        jobId: string
        port?: number
      }

      await db.update(jobs).set({ status: 'running' }).where(eq(jobs.id, jobId))

      try {
        await runService.redeploy(slug, port)
        await db.update(jobs).set({ status: 'success' }).where(eq(jobs.id, jobId))
        await db.update(services).set({ status: 'running' }).where(eq(services.id, serviceId))
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        await db
          .update(jobs)
          .set({ status: 'failed', logOutput: message })
          .where(eq(jobs.id, jobId))
        await db.update(services).set({ status: 'error' }).where(eq(services.id, serviceId))
      }
    },
    { connection: redis },
  )
}
