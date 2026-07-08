import { beforeEach, describe, expect, it } from 'bun:test'
import { join } from 'node:path'
import { createDbClient } from '@wisp/db'
import { migrate } from 'drizzle-orm/bun-sqlite/migrator'
import { Elysia } from 'elysia'
import { errorHandlerPlugin } from '../../src/plugins/error-handler'
import { authRoutes } from '../../src/routes/auth.routes'
import { deployRoutes } from '../../src/routes/deploy.routes'

function createTestApp() {
  const db = createDbClient(':memory:')
  migrate(db, { migrationsFolder: join(import.meta.dir, '../../../../packages/db/migrations') })
  const dbPlugin = new Elysia({ name: 'db' }).decorate('db', db)

  return new Elysia().use(errorHandlerPlugin).use(dbPlugin).use(authRoutes).use(deployRoutes)
}

function extractSessionCookie(response: Response): string | undefined {
  const setCookie = response.headers.get('Set-Cookie')
  if (!setCookie) return undefined
  return setCookie.split(';')[0]
}

async function registerAndLogin(
  app: ReturnType<typeof createTestApp>,
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
  let app: ReturnType<typeof createTestApp>

  beforeEach(() => {
    app = createTestApp()
  })

  it('should have create endpoint shape', async () => {
    expect(deployRoutes).toBeDefined()
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
})
