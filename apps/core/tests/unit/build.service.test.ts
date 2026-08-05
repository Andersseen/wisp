import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type Dockerode from 'dockerode'
import { BuildService } from '../../src/services/deploy/build.service'

function createMockDocker(
  onBuildFinished: (err: Error | null, output: Array<{ stream?: string; error?: string }>) => void,
): Dockerode {
  const buildImage = mock((stream: NodeJS.ReadableStream) => {
    stream.resume()
    return Promise.resolve({
      pipe: () => undefined,
      on: () => undefined,
    } as unknown as NodeJS.ReadableStream)
  })

  const getImage = mock(() => ({
    tag: mock(() => Promise.resolve()),
  }))

  const followProgress = mock(
    (
      _stream: NodeJS.ReadableStream,
      onFinished: (err: Error | null, output: unknown[]) => void,
    ) => {
      onFinished(null, [])
    },
  )

  const docker = {
    buildImage,
    getImage,
    modem: { followProgress },
  } as unknown as Dockerode

  followProgress.mockImplementation(
    (
      _stream: NodeJS.ReadableStream,
      onFinished: (_err: Error | null, output: unknown[]) => void,
      onProgress?: (event: { stream?: string; error?: string }) => void,
    ) => {
      const output: Array<{ stream?: string; error?: string }> = []
      onBuildFinished(null, output)
      for (const event of output) {
        onProgress?.(event)
      }
      onFinished(null, output)
    },
  )

  return docker
}

describe('BuildService', () => {
  let workDirBase: string

  beforeEach(async () => {
    workDirBase = await mkdtemp(join(tmpdir(), 'wisp-build-test-'))
  })

  afterEach(async () => {
    try {
      await rm(workDirBase, { recursive: true, force: true })
    } catch {
      // directory may already be cleaned by BuildService
    }
  })

  it('builds successfully when git clone and docker build pass', async () => {
    const docker = createMockDocker((_err, output) => {
      output.push({ stream: 'Successfully built image\n' })
    })
    const exec = mock(async () => ({ exitCode: 0, stdout: 'cloned', stderr: '' }))

    const service = new BuildService({ docker, exec, workDirBase })
    await mkdir(join(workDirBase, 'test', 'job_123'), { recursive: true })
    await writeFile(join(workDirBase, 'test', 'job_123', 'Dockerfile'), 'FROM scratch')

    const result = await service.build({
      serviceId: 'svc_123',
      slug: 'test',
      gitUrl: 'https://github.com/example/repo.git',
      branch: 'main',
      jobId: 'job_123',
    })

    expect(result.success).toBe(true)
    expect(result.log).toContain('Successfully built image')
    expect(exec).toHaveBeenCalled()
  })

  it('fails when git clone fails', async () => {
    const docker = createMockDocker((_err, output) => {
      output.push({ stream: 'Successfully built image\n' })
    })
    const exec = mock(async () => ({ exitCode: 128, stdout: '', stderr: 'fatal: not found' }))

    const service = new BuildService({ docker, exec, workDirBase })
    const result = await service.build({
      serviceId: 'svc_123',
      slug: 'test',
      gitUrl: 'https://github.com/example/repo.git',
      branch: 'main',
      jobId: 'job_123',
    })

    expect(result.success).toBe(false)
    expect(result.log).toContain('fatal: not found')
    expect(docker.buildImage).not.toHaveBeenCalled()
  })

  it('fails when Dockerfile is missing', async () => {
    const docker = createMockDocker((_err, output) => {
      output.push({ stream: 'Successfully built image\n' })
    })
    const exec = mock(async () => ({ exitCode: 0, stdout: 'cloned', stderr: '' }))

    const service = new BuildService({ docker, exec, workDirBase })
    const result = await service.build({
      serviceId: 'svc_123',
      slug: 'test',
      gitUrl: 'https://github.com/example/repo.git',
      branch: 'main',
      jobId: 'job_123',
    })

    expect(result.success).toBe(false)
    expect(result.log).toContain('Dockerfile not found')
    expect(docker.buildImage).not.toHaveBeenCalled()
  })

  it('fails when docker build reports an error', async () => {
    const docker = createMockDocker((_err, output) => {
      output.push({ error: 'no such file or directory' })
    })
    const exec = mock(async () => ({ exitCode: 0, stdout: 'cloned', stderr: '' }))

    const service = new BuildService({ docker, exec, workDirBase })
    await mkdir(join(workDirBase, 'test', 'job_123'), { recursive: true })
    await writeFile(join(workDirBase, 'test', 'job_123', 'Dockerfile'), 'FROM scratch')

    const result = await service.build({
      serviceId: 'svc_123',
      slug: 'test',
      gitUrl: 'https://github.com/example/repo.git',
      branch: 'main',
      jobId: 'job_123',
    })

    expect(result.success).toBe(false)
    expect(result.log).toContain('no such file or directory')
  })
})
