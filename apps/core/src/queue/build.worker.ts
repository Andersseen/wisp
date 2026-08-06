import { jobs, services } from '@wisp/db'
import { Worker } from 'bullmq'
import { eq } from 'drizzle-orm'
import type { Redis } from 'ioredis'
import type { DatabaseClient } from '../plugins/db'
import { logger } from '../plugins/logger'
import type { BuildService } from '../services/deploy/build.service'

interface BuildJobData {
  serviceId: string
  slug: string
  gitUrl: string
  branch: string
  jobId: string
}

export function createBuildWorker(
  redis: Redis,
  buildService: BuildService,
  db: DatabaseClient,
): Worker {
  return new Worker(
    'build',
    async (job) => {
      const { serviceId, slug, gitUrl, branch, jobId } = job.data as BuildJobData

      logger.info({ jobId, serviceId, slug }, 'build job started')

      await db.update(jobs).set({ status: 'running' }).where(eq(jobs.id, jobId)).run()

      await db.update(services).set({ status: 'building' }).where(eq(services.id, serviceId)).run()

      const result = await buildService.build({ serviceId, slug, gitUrl, branch, jobId })

      await db
        .update(jobs)
        .set({
          status: result.success ? 'success' : 'failed',
          logOutput: result.log,
        })
        .where(eq(jobs.id, jobId))
        .run()

      await db
        .update(services)
        .set({ status: result.success ? 'building' : 'error' })
        .where(eq(services.id, serviceId))
        .run()

      logger.info({ jobId, success: result.success }, 'build job completed')

      return { success: result.success, jobId }
    },
    { connection: redis },
  )
}
