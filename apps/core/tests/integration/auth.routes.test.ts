import { beforeEach, describe, expect, it } from 'bun:test'
import { join } from 'node:path'
import { createDbClient } from '@wisp/db'
import { migrate } from 'drizzle-orm/bun-sqlite/migrator'
import { Elysia } from 'elysia'
import { errorHandlerPlugin } from '../../src/plugins/error-handler'
import { authRoutes } from '../../src/routes/auth.routes'

function createTestApp() {
  const db = createDbClient(':memory:')
  migrate(db, { migrationsFolder: join(import.meta.dir, '../../../../packages/db/migrations') })
  const dbPlugin = new Elysia({ name: 'db' }).decorate('db', db)

  return new Elysia().use(errorHandlerPlugin).use(dbPlugin).use(authRoutes)
}

function extractSessionCookie(response: Response): string | undefined {
  const setCookie = response.headers.get('Set-Cookie')
  if (!setCookie) return undefined
  return setCookie.split(';')[0]
}

describe('Auth Routes', () => {
  let app: ReturnType<typeof createTestApp>

  beforeEach(() => {
    app = createTestApp()
  })

  it('registers a new user', async () => {
    const response = await app.handle(
      new Request('http://localhost/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test@wisp.sh',
          password: 'password123',
          name: 'Test User',
        }),
      }),
    )

    expect(response.status).toBe(201)
    const body = (await response.json()) as { email: string }
    expect(body.email).toBe('test@wisp.sh')
  })

  it('logs in and returns a session cookie', async () => {
    await app.handle(
      new Request('http://localhost/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test@wisp.sh',
          password: 'password123',
        }),
      }),
    )

    const response = await app.handle(
      new Request('http://localhost/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test@wisp.sh',
          password: 'password123',
        }),
      }),
    )

    expect(response.status).toBe(200)
    const cookie = extractSessionCookie(response)
    expect(cookie).toBeString()
    expect(cookie).toStartWith('sessionId=')
  })

  it('returns current user with valid session', async () => {
    await app.handle(
      new Request('http://localhost/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test@wisp.sh',
          password: 'password123',
        }),
      }),
    )

    const loginResponse = await app.handle(
      new Request('http://localhost/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test@wisp.sh',
          password: 'password123',
        }),
      }),
    )

    const cookie = extractSessionCookie(loginResponse)

    const meResponse = await app.handle(
      new Request('http://localhost/auth/me', {
        headers: { Cookie: cookie ?? '' },
      }),
    )

    expect(meResponse.status).toBe(200)
    const body = (await meResponse.json()) as { email: string }
    expect(body.email).toBe('test@wisp.sh')
  })

  it('rejects /me without session', async () => {
    const response = await app.handle(new Request('http://localhost/auth/me'))
    expect(response.status).toBe(401)
  })

  it('logs out and invalidates session', async () => {
    await app.handle(
      new Request('http://localhost/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test@wisp.sh',
          password: 'password123',
        }),
      }),
    )

    const loginResponse = await app.handle(
      new Request('http://localhost/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test@wisp.sh',
          password: 'password123',
        }),
      }),
    )

    const cookie = extractSessionCookie(loginResponse)

    const logoutResponse = await app.handle(
      new Request('http://localhost/auth/logout', {
        method: 'POST',
        headers: { Cookie: cookie ?? '' },
      }),
    )

    expect(logoutResponse.status).toBe(200)

    const meResponse = await app.handle(
      new Request('http://localhost/auth/me', {
        headers: { Cookie: cookie ?? '' },
      }),
    )

    expect(meResponse.status).toBe(401)
  })
})
