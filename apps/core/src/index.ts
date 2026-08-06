import { cors } from '@elysiajs/cors'
import { Elysia } from 'elysia'
import { config } from './config'
import { db, dbPlugin } from './plugins/db'
import { docker, dockerPlugin } from './plugins/docker'
import { errorHandlerPlugin } from './plugins/error-handler'
import { logger, loggerPlugin } from './plugins/logger'
import { redis, valkeyPlugin } from './plugins/valkey'
import { createBuildWorker } from './queue/build.worker'
import { authRoutes } from './routes/auth.routes'
import { deployRoutes } from './routes/deploy.routes'
import { healthRoutes } from './routes/health.routes'
import { webhookRoutes } from './routes/webhook.routes'
import { BuildService } from './services/deploy/build.service'

const buildService = new BuildService(docker, config.WORK_DIR)

const buildWorker = createBuildWorker(redis, buildService, db)

const app = new Elysia()
  .use(cors())
  .use(loggerPlugin)
  .use(errorHandlerPlugin)
  .use(dbPlugin)
  .use(valkeyPlugin)
  .use(dockerPlugin)
  .use(authRoutes)
  .use(deployRoutes)
  .use(webhookRoutes)
  .use(healthRoutes)
  .listen(config.PORT)

logger.info(`Wisp core running at ${app.server?.hostname}:${app.server?.port}`)

async function shutdown(signal: string) {
  logger.info({ signal }, 'shutting down')
  await buildWorker.close()
  await redis.quit()
  process.exit(0)
}

process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT', () => shutdown('SIGINT'))
