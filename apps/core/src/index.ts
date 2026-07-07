import { cors } from '@elysiajs/cors'
import { Elysia } from 'elysia'
import { config } from './config'
import { dbPlugin } from './plugins/db'
import { dockerPlugin } from './plugins/docker'
import { errorHandlerPlugin } from './plugins/error-handler'
import { logger, loggerPlugin } from './plugins/logger'
import { valkeyPlugin } from './plugins/valkey'
import { authRoutes } from './routes/auth.routes'
import { deployRoutes } from './routes/deploy.routes'
import { healthRoutes } from './routes/health.routes'
import { webhookRoutes } from './routes/webhook.routes'

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
