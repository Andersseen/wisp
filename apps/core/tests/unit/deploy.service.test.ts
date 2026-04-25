import { describe, it, expect, beforeEach } from 'bun:test'
import { DeployService } from '../../src/services/deploy/deploy.service'
import { createMockDb } from '../setup'

describe('DeployService', () => {
  let service: DeployService
  let mockDb: ReturnType<typeof createMockDb>

  beforeEach(() => {
    mockDb = createMockDb()
    service = new DeployService(mockDb)
  })

  it('should create a service', async () => {
    // @ts-expect-error mock shape
    mockDb.select.mockReturnValue({
      from: () => ({ where: () => ({ get: () => null }) }),
    })
    // @ts-expect-error mock shape
    mockDb.insert.mockReturnValue({ values: () => Promise.resolve() })

    const result = await service.create({
      name: 'Test Service',
      slug: 'test-service',
      gitUrl: 'https://github.com/example/repo.git',
      branch: 'main',
      userId: 'user_123',
    })

    expect(result.id).toBeString()
  })

  it('should reject duplicate slug', async () => {
    // @ts-expect-error mock shape
    mockDb.select.mockReturnValue({
      from: () => ({
        where: () => ({ get: () => ({ id: '1', slug: 'test-service' }) }),
      }),
    })

    expect(
      service.create({
        name: 'Test',
        slug: 'test-service',
        gitUrl: 'https://github.com/example/repo.git',
        userId: 'user_123',
      }),
    ).rejects.toThrow('Service slug already exists')
  })
})
