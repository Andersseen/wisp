import { type AnyElysia, Elysia, t } from 'elysia'
import { authPlugin } from '../plugins/auth'
import { dbPlugin } from '../plugins/db'
import { DeployService } from '../services/deploy/deploy.service'
import type { QueueService } from '../services/queue/queue.service'
import { ForbiddenError, UnauthorizedError } from '../types/error'

export function createDeployRoutes(queueService: QueueService): AnyElysia {
  return new Elysia({ prefix: '/deploy' })
    .use(dbPlugin)
    .use(authPlugin)
    .post(
      '/',
      async ({ body, db, user }) => {
        if (!user) {
          throw new UnauthorizedError()
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
      const service = new DeployService(db, queueService)
      return service.listByUser(user.id)
    })
    .get('/:id', async ({ params, db, user }) => {
      if (!user) {
        throw new UnauthorizedError()
      }
      const service = new DeployService(db, queueService)
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
      const service = new DeployService(db, queueService)
      const deployment = await service.getById(params.id)
      if (deployment.userId !== user.id) {
        throw new ForbiddenError('Service does not belong to user')
      }
      const jobs = await service.listJobsByService(params.id)
      return { jobs }
    })
}
