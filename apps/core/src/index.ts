import { Elysia } from 'elysia'
import { cors } from '@elysiajs/cors'
import { dbPlugin } from './plugins/db'
import { valkeyPlugin } from './plugins/valkey'
import { dockerPlugin } from './plugins/docker'
import { loggerPlugin, logger } from './plugins/logger'
import { errorHandlerPlugin } from './plugins/error-handler'
import { authRoutes } from './routes/auth.routes'
import { deployRoutes } from './routes/deploy.routes'
import { webhookRoutes } from './routes/webhook.routes'
import { healthRoutes } from './routes/health.routes'
import { config } from './config'

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
