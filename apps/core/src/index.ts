import { cors } from '@elysiajs/cors'
import { Elysia } from 'elysia'
import { config } from './config'
import { db, dbPlugin } from './plugins/db'
import { dockerPlugin } from './plugins/docker'
import { errorHandlerPlugin } from './plugins/error-handler'
import { logger, loggerPlugin } from './plugins/logger'
import { queuePlugin, queueService } from './plugins/queue'
import { redis, valkeyPlugin } from './plugins/valkey'
import { createBuildWorker } from './queue/build.worker'
import { authRoutes } from './routes/auth.routes'
import { createDeployRoutes } from './routes/deploy.routes'
import { healthRoutes } from './routes/health.routes'
import { webhookRoutes } from './routes/webhook.routes'

const app = new Elysia()
  .use(cors())
  .use(loggerPlugin)
  .use(errorHandlerPlugin)
  .use(dbPlugin)
  .use(valkeyPlugin)
  .use(queuePlugin)
  .use(dockerPlugin)
  .use(authRoutes)
  .use(createDeployRoutes(queueService))
  .use(webhookRoutes)
  .use(healthRoutes)
  .listen(config.PORT)

const buildWorker = createBuildWorker(redis, db)

async function gracefulShutdown(signal: string): Promise<void> {
  logger.info({ signal }, 'shutting down gracefully')
  await buildWorker.close()
  await app.stop()
  process.exit(0)
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'))
process.on('SIGINT', () => gracefulShutdown('SIGINT'))

logger.info(`Wisp core running at ${app.server?.hostname}:${app.server?.port}`)
