import { beforeEach, describe, expect, it, mock } from 'bun:test'
import { join } from 'node:path'
import { createDbClient, jobs, services } from '@wisp/db'
import { eq } from 'drizzle-orm'
import { migrate } from 'drizzle-orm/bun-sqlite/migrator'
import { Elysia } from 'elysia'
import { errorHandlerPlugin } from '../../src/plugins/error-handler'
import { authRoutes } from '../../src/routes/auth.routes'
import { createDeployRoutes } from '../../src/routes/deploy.routes'
import type { RunService } from '../../src/services/deploy/run.service'
import type { QueueService } from '../../src/services/queue/queue.service'

function createMockQueuePlugin() {
  const queueService: QueueService = {
    addBuildJob: mock(() => Promise.resolve()),
    addDeployJob: mock(() => Promise.resolve()),
  } as unknown as QueueService

  return {
    plugin: new Elysia({ name: 'queue' }).decorate('queueService', queueService),
    queueService,
  }
}

function createMockRunService(): RunService {
  return {
    start: mock(() => Promise.resolve({ port: 3000 })),
    stop: mock(() => Promise.resolve()),
    remove: mock(() => Promise.resolve()),
    redeploy: mock(() => Promise.resolve({ port: 3000 })),
  } as unknown as RunService
}

function createTestApp() {
  const db = createDbClient(':memory:')
  migrate(db, { migrationsFolder: join(import.meta.dir, '../../../../packages/db/migrations') })
  const dbPlugin = new Elysia({ name: 'db' }).decorate('db', db)
  const { plugin: mockQueuePlugin, queueService } = createMockQueuePlugin()
  const runService = createMockRunService()

  return {
    app: new Elysia()
      .use(errorHandlerPlugin)
      .use(dbPlugin)
      .use(mockQueuePlugin)
      .use(authRoutes)
      .use(createDeployRoutes(queueService, runService)),
    db,
    queueService,
    runService,
  }
}

function extractSessionCookie(response: Response): string | undefined {
  const setCookie = response.headers.get('Set-Cookie')
  if (!setCookie) return undefined
  return setCookie.split(';')[0]
}

async function registerAndLogin(
  app: ReturnType<typeof createTestApp>['app'],
  email: string,
  password: string,
): Promise<string> {
  await app.handle(
    new Request('http://localhost/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    }),
  )

  const loginResponse = await app.handle(
    new Request('http://localhost/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    }),
  )

  const cookie = extractSessionCookie(loginResponse)
  if (!cookie) throw new Error('Expected session cookie')
  return cookie
}

describe('Deploy Routes', () => {
  let app: ReturnType<typeof createTestApp>['app']
  let db: ReturnType<typeof createTestApp>['db']
  let queueService: ReturnType<typeof createTestApp>['queueService']
  let runService: ReturnType<typeof createTestApp>['runService']

  beforeEach(() => {
    const testApp = createTestApp()
    app = testApp.app
    db = testApp.db
    queueService = testApp.queueService
    runService = testApp.runService
  })

  it('should have create endpoint shape', async () => {
    expect(createDeployRoutes).toBeDefined()
  })

  it('rejects unauthenticated POST /deploy with 401', async () => {
    const response = await app.handle(
      new Request('http://localhost/deploy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Test',
          slug: 'test',
          gitUrl: 'https://github.com/example/repo.git',
        }),
      }),
    )

    expect(response.status).toBe(401)
  })

  it('rejects unauthenticated GET /deploy with 401', async () => {
    const response = await app.handle(new Request('http://localhost/deploy'))
    expect(response.status).toBe(401)
  })

  it('rejects unauthenticated GET /deploy/:id with 401', async () => {
    const response = await app.handle(new Request('http://localhost/deploy/1'))
    expect(response.status).toBe(401)
  })

  it('creates a service when authenticated', async () => {
    const cookie = await registerAndLogin(app, 'owner@wisp.sh', 'password123')

    const response = await app.handle(
      new Request('http://localhost/deploy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: cookie },
        body: JSON.stringify({
          name: 'Test',
          slug: 'test',
          gitUrl: 'https://github.com/example/repo.git',
        }),
      }),
    )

    expect(response.status).toBe(200)
    const body = (await response.json()) as { id: string }
    expect(body.id).toBeString()
  })

  it('creates a pending build job when a service is created', async () => {
    const cookie = await registerAndLogin(app, 'owner@wisp.sh', 'password123')

    const response = await app.handle(
      new Request('http://localhost/deploy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: cookie },
        body: JSON.stringify({
          name: 'Test',
          slug: 'test',
          gitUrl: 'https://github.com/example/repo.git',
        }),
      }),
    )

    expect(response.status).toBe(200)
    const { id: serviceId } = (await response.json()) as { id: string }

    const job = await db.select().from(jobs).where(eq(jobs.serviceId, serviceId)).get()
    expect(job).toBeDefined()
    expect(job?.type).toBe('build')
    expect(job?.status).toBe('pending')
  })

  it('returns 403 when accessing another users service', async () => {
    const ownerCookie = await registerAndLogin(app, 'owner@wisp.sh', 'password123')

    const createResponse = await app.handle(
      new Request('http://localhost/deploy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: ownerCookie },
        body: JSON.stringify({
          name: 'Test',
          slug: 'test',
          gitUrl: 'https://github.com/example/repo.git',
        }),
      }),
    )

    const { id } = (await createResponse.json()) as { id: string }

    const attackerCookie = await registerAndLogin(app, 'attacker@wisp.sh', 'password123')

    const response = await app.handle(
      new Request(`http://localhost/deploy/${id}`, {
        headers: { Cookie: attackerCookie },
      }),
    )

    expect(response.status).toBe(403)
  })

  it('lists jobs for an owned service', async () => {
    const cookie = await registerAndLogin(app, 'owner@wisp.sh', 'password123')

    const createResponse = await app.handle(
      new Request('http://localhost/deploy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: cookie },
        body: JSON.stringify({
          name: 'Test',
          slug: 'test',
          gitUrl: 'https://github.com/example/repo.git',
        }),
      }),
    )

    const { id } = (await createResponse.json()) as { id: string }

    const response = await app.handle(
      new Request(`http://localhost/deploy/${id}/jobs`, {
        headers: { Cookie: cookie },
      }),
    )

    expect(response.status).toBe(200)
    const body = (await response.json()) as { jobs: Array<{ type: string; status: string }> }
    expect(body.jobs).toHaveLength(1)
    expect(body.jobs[0]?.type).toBe('build')
    expect(body.jobs[0]?.status).toBe('pending')
  })

  it('rejects listing jobs for a service owned by another user', async () => {
    const ownerCookie = await registerAndLogin(app, 'owner@wisp.sh', 'password123')

    const createResponse = await app.handle(
      new Request('http://localhost/deploy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: ownerCookie },
        body: JSON.stringify({
          name: 'Test',
          slug: 'test',
          gitUrl: 'https://github.com/example/repo.git',
        }),
      }),
    )

    const { id } = (await createResponse.json()) as { id: string }

    const attackerCookie = await registerAndLogin(app, 'attacker@wisp.sh', 'password123')

    const response = await app.handle(
      new Request(`http://localhost/deploy/${id}/jobs`, {
        headers: { Cookie: attackerCookie },
      }),
    )

    expect(response.status).toBe(403)
  })

  it('starts a stopped service and enqueues a deploy job', async () => {
    const cookie = await registerAndLogin(app, 'owner@wisp.sh', 'password123')

    const createResponse = await app.handle(
      new Request('http://localhost/deploy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: cookie },
        body: JSON.stringify({
          name: 'Test',
          slug: 'test',
          gitUrl: 'https://github.com/example/repo.git',
        }),
      }),
    )
    const { id } = (await createResponse.json()) as { id: string }
    await db.update(services).set({ status: 'stopped' }).where(eq(services.id, id))

    const response = await app.handle(
      new Request(`http://localhost/deploy/${id}/start`, {
        method: 'POST',
        headers: { Cookie: cookie },
      }),
    )

    expect(response.status).toBe(200)
    const body = (await response.json()) as { started: boolean }
    expect(body.started).toBe(true)
    expect(queueService.addDeployJob).toHaveBeenCalled()
  })

  it('rejects start for an already running service', async () => {
    const cookie = await registerAndLogin(app, 'owner@wisp.sh', 'password123')

    const createResponse = await app.handle(
      new Request('http://localhost/deploy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: cookie },
        body: JSON.stringify({
          name: 'Test',
          slug: 'test',
          gitUrl: 'https://github.com/example/repo.git',
        }),
      }),
    )
    const { id } = (await createResponse.json()) as { id: string }
    await db.update(services).set({ status: 'running' }).where(eq(services.id, id))

    const response = await app.handle(
      new Request(`http://localhost/deploy/${id}/start`, {
        method: 'POST',
        headers: { Cookie: cookie },
      }),
    )

    expect(response.status).toBe(409)
  })

  it('stops a running service', async () => {
    const cookie = await registerAndLogin(app, 'owner@wisp.sh', 'password123')

    const createResponse = await app.handle(
      new Request('http://localhost/deploy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: cookie },
        body: JSON.stringify({
          name: 'Test',
          slug: 'test',
          gitUrl: 'https://github.com/example/repo.git',
        }),
      }),
    )
    const { id } = (await createResponse.json()) as { id: string }
    await db.update(services).set({ status: 'running' }).where(eq(services.id, id))

    const response = await app.handle(
      new Request(`http://localhost/deploy/${id}/stop`, {
        method: 'POST',
        headers: { Cookie: cookie },
      }),
    )

    expect(response.status).toBe(200)
    const body = (await response.json()) as { stopped: boolean }
    expect(body.stopped).toBe(true)
    expect(runService.stop).toHaveBeenCalled()
  })

  it('deletes a service and its container', async () => {
    const cookie = await registerAndLogin(app, 'owner@wisp.sh', 'password123')

    const createResponse = await app.handle(
      new Request('http://localhost/deploy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: cookie },
        body: JSON.stringify({
          name: 'Test',
          slug: 'test',
          gitUrl: 'https://github.com/example/repo.git',
        }),
      }),
    )
    const { id } = (await createResponse.json()) as { id: string }

    const response = await app.handle(
      new Request(`http://localhost/deploy/${id}`, {
        method: 'DELETE',
        headers: { Cookie: cookie },
      }),
    )

    expect(response.status).toBe(200)
    const body = (await response.json()) as { deleted: boolean }
    expect(body.deleted).toBe(true)
    expect(runService.remove).toHaveBeenCalled()

    const service = await db.select().from(services).where(eq(services.id, id)).get()
    expect(service).toBeUndefined()
  })

  it('rejects start/stop/delete for a service owned by another user', async () => {
    const ownerCookie = await registerAndLogin(app, 'owner@wisp.sh', 'password123')

    const createResponse = await app.handle(
      new Request('http://localhost/deploy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: ownerCookie },
        body: JSON.stringify({
          name: 'Test',
          slug: 'test',
          gitUrl: 'https://github.com/example/repo.git',
        }),
      }),
    )
    const { id } = (await createResponse.json()) as { id: string }

    const attackerCookie = await registerAndLogin(app, 'attacker@wisp.sh', 'password123')

    const startResponse = await app.handle(
      new Request(`http://localhost/deploy/${id}/start`, {
        method: 'POST',
        headers: { Cookie: attackerCookie },
      }),
    )
    const stopResponse = await app.handle(
      new Request(`http://localhost/deploy/${id}/stop`, {
        method: 'POST',
        headers: { Cookie: attackerCookie },
      }),
    )
    const deleteResponse = await app.handle(
      new Request(`http://localhost/deploy/${id}`, {
        method: 'DELETE',
        headers: { Cookie: attackerCookie },
      }),
    )

    expect(startResponse.status).toBe(403)
    expect(stopResponse.status).toBe(403)
    expect(deleteResponse.status).toBe(403)
  })
})
