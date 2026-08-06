import { beforeEach, describe, expect, it, mock } from 'bun:test'
import { BuildService } from '../../src/services/deploy/build.service'

describe('BuildService', () => {
  let service: BuildService
  let mockDocker: { buildImage: ReturnType<typeof mock>; getImage: ReturnType<typeof mock> }

  beforeEach(() => {
    mockDocker = {
      buildImage: mock(() => Promise.resolve({})),
      getImage: mock(() => ({
        tag: mock(() => Promise.resolve()),
      })),
    }
    service = new BuildService(mockDocker as never, '/tmp/wisp-test-builds')
  })

  it('should return failure when git clone fails', async () => {
    const result = await service.build({
      serviceId: 'svc_123',
      slug: 'test-app',
      gitUrl: 'https://github.com/nonexistent/repo-that-does-not-exist.git',
      branch: 'main',
      jobId: 'job_123',
    })

    expect(result.success).toBe(false)
    expect(result.log).toContain('[git clone]')
  })

  it('should return failure when Dockerfile is missing', async () => {
    const result = await service.build({
      serviceId: 'svc_123',
      slug: 'test-app',
      gitUrl: 'https://github.com/octocat/Hello-World.git',
      branch: 'master',
      jobId: 'job_123',
    })

    expect(result.success).toBe(false)
    expect(result.log).toContain('No Dockerfile found')
  })
})
