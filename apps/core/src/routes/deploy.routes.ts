import { Elysia, t } from 'elysia'
import { DeployService } from '../services/deploy/deploy.service'
import { dbPlugin } from '../plugins/db'
import { authPlugin } from '../plugins/auth'

export const deployRoutes = new Elysia({ prefix: '/deploy' })
  .use(dbPlugin)
  .use(authPlugin)
  .post(
    '/',
    async ({ body, db, user }) => {
      if (!user) {
        throw new Error('UNAUTHORIZED')
      }
      const service = new DeployService(db)
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
      throw new Error('UNAUTHORIZED')
    }
    const service = new DeployService(db)
    return service.listByUser(user.id)
  })
  .get('/:id', async ({ params, db }) => {
    const service = new DeployService(db)
    return service.getById(params.id)
  })
