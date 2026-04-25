import { describe, it, expect, beforeEach } from 'bun:test'
import { AuthService } from '../../src/services/auth/auth.service'
import { createMockDb } from '../setup'

describe('AuthService', () => {
  let service: AuthService
  let mockDb: ReturnType<typeof createMockDb>

  beforeEach(() => {
    mockDb = createMockDb()
    service = new AuthService(mockDb)
  })

  it('should register new user', async () => {
    // @ts-expect-error mock shape
    mockDb.select.mockReturnValue({
      from: () => ({ where: () => ({ get: () => null }) }),
    })
    // @ts-expect-error mock shape
    mockDb.insert.mockReturnValue({ values: () => Promise.resolve() })

    const result = await service.register({
      email: 'test@wisp.sh',
      hashedPassword: 'plain-for-test',
      name: 'Test',
    })

    expect(result.id).toBeString()
    expect(result.email).toBe('test@wisp.sh')
  })

  it('should reject duplicate email', async () => {
    // @ts-expect-error mock shape
    mockDb.select.mockReturnValue({
      from: () => ({
        where: () => ({ get: () => ({ id: '1', email: 'test@wisp.sh' }) }),
      }),
    })

    expect(
      service.register({ email: 'test@wisp.sh', hashedPassword: 'x', name: 'x' }),
    ).rejects.toThrow('User already exists')
  })
})
