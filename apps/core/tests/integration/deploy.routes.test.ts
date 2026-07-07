import { describe, expect, it } from 'bun:test'
import { Elysia } from 'elysia'

describe('Deploy Routes', () => {
  it('should have create endpoint shape', async () => {
    const { deployRoutes } = await import('../../src/routes/deploy.routes')
    expect(deployRoutes).toBeDefined()
  })

  it('rejects unauthenticated POST /deploy with 401', async () => {
    const { deployRoutes } = await import('../../src/routes/deploy.routes')
    const { errorHandlerPlugin } = await import('../../src/plugins/error-handler')
    const app = new Elysia().use(errorHandlerPlugin).use(deployRoutes)

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
    const { deployRoutes } = await import('../../src/routes/deploy.routes')
    const { errorHandlerPlugin } = await import('../../src/plugins/error-handler')
    const app = new Elysia().use(errorHandlerPlugin).use(deployRoutes)

    const response = await app.handle(new Request('http://localhost/deploy'))

    expect(response.status).toBe(401)
  })
})
