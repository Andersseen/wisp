import { Elysia, t } from 'elysia'
import { authPlugin } from '../plugins/auth'
import { dbPlugin } from '../plugins/db'
import { logger } from '../plugins/logger'
import { valkeyPlugin } from '../plugins/valkey'
import { DeployService } from '../services/deploy/deploy.service'
import { QueueService } from '../services/queue/queue.service'
import { ForbiddenError, UnauthorizedError } from '../types/error'

export const deployRoutes = new Elysia({ prefix: '/deploy' })
  .use(dbPlugin)
  .use(valkeyPlugin)
  .use(authPlugin)
  .post(
    '/',
    async ({ body, db, redis, user }) => {
      if (!user) {
        throw new UnauthorizedError()
      }
      let queueService: QueueService | undefined
      try {
        queueService = new QueueService(redis)
      } catch (err) {
        logger.warn({ err }, 'failed to create queue service, continuing without queue')
      }
      const service = new DeployService(db, queueService)
      return service.create({ ...body, userId: user.id })
    },
    {
      body: t.Object({
        name: t.String({ minLength: 1, maxLength: 100 }),
        slug: t.String({ minLength: 1, maxLength: 100, pattern: '^[a-z0-9-]+$' }),
        gitUrl: t.String({ format: 'uri' }),
        branch: t.Optional(t.String({ default: 'main' })),
      }),
    },
  )
  .get('/', async ({ db, user }) => {
    if (!user) {
      throw new UnauthorizedError()
    }
    const service = new DeployService(db)
    return service.listByUser(user.id)
  })
  .get('/:id', async ({ params, db, user }) => {
    if (!user) {
      throw new UnauthorizedError()
    }
    const service = new DeployService(db)
    const deployment = await service.getById(params.id)
    if (deployment.userId !== user.id) {
      throw new ForbiddenError('Service does not belong to user')
    }
    return deployment
  })
  .get('/:id/jobs', async ({ params, db, user }) => {
    if (!user) {
      throw new UnauthorizedError()
    }
    const service = new DeployService(db)
    const deployment = await service.getById(params.id)
    if (deployment.userId !== user.id) {
      throw new ForbiddenError('Service does not belong to user')
    }
    return service.getJobsByServiceId(params.id)
  })
