import { jobs, services } from '@wisp/db'
import { Worker } from 'bullmq'
import { eq } from 'drizzle-orm'
import type { Redis } from 'ioredis'
import type { ContainerEngine } from '../engine/container.engine'
import type { DatabaseClient } from '../plugins/db'
import { logger } from '../plugins/logger'
import type { BuildService } from '../services/deploy/build.service'
import type { QueueService } from '../services/queue/queue.service'

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
  queueService: QueueService,
  containerEngine: ContainerEngine,
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

      if (result.success) {
        const port = await containerEngine.getImagePort(slug)
        if (port) {
          void queueService.addDeployJob(serviceId, slug, port)
          logger.info({ jobId, serviceId, port }, 'deploy job enqueued')
        } else {
          logger.warn({ jobId, serviceId, slug }, 'no port detected from image, skipping deploy')
        }
      }

      return { success: result.success, jobId }
    },
    { connection: redis },
  )
}
