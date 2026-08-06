import { services } from '@wisp/db'
import { Worker } from 'bullmq'
import { eq } from 'drizzle-orm'
import type { Redis } from 'ioredis'
import type { CaddyEngine } from '../engine/caddy.engine'
import type { ContainerEngine } from '../engine/container.engine'
import type { DatabaseClient } from '../plugins/db'
import { logger } from '../plugins/logger'

interface DeployJobData {
  serviceId: string
  slug: string
  port: number
  domain: string
}

export function createDeployWorker(
  redis: Redis,
  containerEngine: ContainerEngine,
  caddyEngine: CaddyEngine,
  db: DatabaseClient,
): Worker {
  return new Worker(
    'deploy',
    async (job) => {
      const { serviceId, slug, port, domain } = job.data as DeployJobData

      logger.info({ serviceId, slug, port, domain }, 'deploy job started')

      try {
        await containerEngine.runContainer(slug, port)

        const target = `wisp-${slug}:${port}`
        await caddyEngine.addRoute(domain, target)

        await db
          .update(services)
          .set({ status: 'running', port })
          .where(eq(services.id, serviceId))
          .run()

        logger.info({ serviceId, slug }, 'deploy job completed')

        return { success: true, serviceId }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        logger.error({ err, serviceId, slug }, 'deploy job failed')

        await db.update(services).set({ status: 'error' }).where(eq(services.id, serviceId)).run()

        return { success: false, serviceId, error: message }
      }
    },
    { connection: redis },
  )
}
