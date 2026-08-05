import { beforeEach, describe, expect, it, mock } from 'bun:test'
import { DeployService } from '../../src/services/deploy/deploy.service'
import type { QueueService } from '../../src/services/queue/queue.service'
import { createMockDb } from '../setup'

function createMockQueueService(): QueueService {
  return {
    addBuildJob: mock(() => Promise.resolve()),
  } as unknown as QueueService
}

describe('DeployService', () => {
  let service: DeployService
  let mockDb: ReturnType<typeof createMockDb>
  let mockQueueService: QueueService

  beforeEach(() => {
    mockDb = createMockDb()
    mockQueueService = createMockQueueService()
    service = new DeployService(mockDb, mockQueueService)
  })

  it('should create a service and enqueue a build job', async () => {
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
    expect(mockQueueService.addBuildJob).toHaveBeenCalled()
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
    expect(mockQueueService.addBuildJob).not.toHaveBeenCalled()
  })
})
