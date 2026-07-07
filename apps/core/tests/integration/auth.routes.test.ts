import { describe, expect, it } from 'bun:test'

// Integration tests should spin up the Elysia app and make HTTP requests.
// For now, we verify the app module imports correctly.

describe('Auth Routes', () => {
  it('should have register endpoint shape', async () => {
    const { authRoutes } = await import('../../src/routes/auth.routes')
    expect(authRoutes).toBeDefined()
  })
})
