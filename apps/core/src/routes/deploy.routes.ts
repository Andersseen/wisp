import { Elysia, t } from 'elysia'
import { config } from '../config'
import { CaddyEngine } from '../engine/caddy.engine'
import { ContainerEngine } from '../engine/container.engine'
import { authPlugin } from '../plugins/auth'
import { dbPlugin } from '../plugins/db'
import { docker } from '../plugins/docker'
import { logger } from '../plugins/logger'
import { valkeyPlugin } from '../plugins/valkey'
import { DeployService } from '../services/deploy/deploy.service'
import { QueueService } from '../services/queue/queue.service'
import { ForbiddenError, UnauthorizedError } from '../types/error'

function buildDeployService(db: unknown, redis?: unknown, withEngines = false) {
  let queueService: QueueService | undefined
  try {
    if (redis) {
      queueService = new QueueService(redis as never)
    }
  } catch (err) {
    logger.warn({ err }, 'failed to create queue service')
  }

  if (withEngines) {
    const containerEngine = new ContainerEngine(docker, config.DOCKER_NETWORK)
    const caddyEngine = new CaddyEngine(config.CADDY_ADMIN_URL)
    return new DeployService(db as never, queueService, {
      containerEngine,
      caddyEngine,
      domain: config.WISP_DOMAIN,
    })
  }

  return new DeployService(db as never, queueService)
}

async function checkOwnership(service: DeployService, id: string, userId: string) {
  const deployment = await service.getById(id)
  if (deployment.userId !== userId) {
    throw new ForbiddenError('Service does not belong to user')
  }
  return deployment
}

export const deployRoutes = new Elysia({ prefix: '/deploy' })
  .use(dbPlugin)
  .use(valkeyPlugin)
  .use(authPlugin)
  .post(
    '/',
    async ({ body, db, redis, user }) => {
      if (!user) throw new UnauthorizedError()
      const service = buildDeployService(db, redis)
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
    if (!user) throw new UnauthorizedError()
    const service = buildDeployService(db)
    return service.listByUser(user.id)
  })
  .get('/:id', async ({ params, db, user }) => {
    if (!user) throw new UnauthorizedError()
    const service = buildDeployService(db)
    await checkOwnership(service, params.id, user.id)
    return service.getById(params.id)
  })
  .get('/:id/jobs', async ({ params, db, user }) => {
    if (!user) throw new UnauthorizedError()
    const service = buildDeployService(db)
    await checkOwnership(service, params.id, user.id)
    return service.getJobsByServiceId(params.id)
  })
  .post('/:id/stop', async ({ params, db, redis, user }) => {
    if (!user) throw new UnauthorizedError()
    const service = buildDeployService(db, redis, true)
    await checkOwnership(service, params.id, user.id)
    await service.stop(params.id)
    return { ok: true }
  })
  .post('/:id/start', async ({ params, db, redis, user }) => {
    if (!user) throw new UnauthorizedError()
    const service = buildDeployService(db, redis, true)
    await checkOwnership(service, params.id, user.id)
    await service.start(params.id)
    return { ok: true }
  })
  .delete('/:id', async ({ params, db, redis, user }) => {
    if (!user) throw new UnauthorizedError()
    const service = buildDeployService(db, redis, true)
    await checkOwnership(service, params.id, user.id)
    await service.delete(params.id)
    return { ok: true }
  })
  .post('/:id/redeploy', async ({ params, db, redis, user }) => {
    if (!user) throw new UnauthorizedError()
    const service = buildDeployService(db, redis)
    await checkOwnership(service, params.id, user.id)
    return service.redeploy(params.id)
  })
