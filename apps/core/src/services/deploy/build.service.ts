import { Buffer } from 'node:buffer'
import { access, mkdir, rm } from 'node:fs/promises'
import { join } from 'node:path'
import Dockerode from 'dockerode'
import { create as createTar } from 'tar'
import { config } from '../../config'
import type { BuildInput } from '../../types/deploy'

type ExecResult = { exitCode: number; stdout: string; stderr: string }
export type ExecFn = (
  command: string,
  args: string[],
  options?: { cwd?: string },
) => Promise<ExecResult>

export interface BuildServiceDependencies {
  docker: Dockerode
  exec: ExecFn
  workDirBase: string
}

async function streamToString(stream: ReadableStream<Uint8Array>): Promise<string> {
  const reader = stream.getReader()
  const chunks: Uint8Array[] = []

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    if (value) chunks.push(value)
  }

  return new TextDecoder().decode(Buffer.concat(chunks))
}

async function defaultExec(
  command: string,
  args: string[],
  options?: { cwd?: string },
): Promise<ExecResult> {
  const proc = Bun.spawn([command, ...args], {
    cwd: options?.cwd,
    stdout: 'pipe',
    stderr: 'pipe',
  })

  const [stdoutBuffer, stderrBuffer] = await Promise.all([
    streamToString(proc.stdout),
    streamToString(proc.stderr),
  ])
  const exitCode = await proc.exited

  return {
    exitCode,
    stdout: stdoutBuffer,
    stderr: stderrBuffer,
  }
}

interface BuildStreamEvent {
  stream?: string
  error?: string
  errorDetail?: { message?: string }
  status?: string
}

export class BuildService {
  private readonly docker: Dockerode
  private readonly exec: ExecFn
  private readonly workDirBase: string

  constructor(deps?: Partial<BuildServiceDependencies>) {
    this.docker = deps?.docker ?? new Dockerode({ socketPath: config.DOCKER_SOCKET })
    this.exec = deps?.exec ?? defaultExec
    this.workDirBase = deps?.workDirBase ?? config.WORK_DIR
  }

  async build(input: BuildInput): Promise<{ success: boolean; log: string }> {
    const { slug, jobId, gitUrl, branch } = input
    const workDir = join(this.workDirBase, slug, jobId)
    const log: string[] = []

    try {
      await mkdir(workDir, { recursive: true })

      log.push(`[wisp] Cloning ${gitUrl} (branch: ${branch}) into ${workDir}\n`)
      const cloneResult = await this.exec('git', [
        'clone',
        '--depth',
        '1',
        '--branch',
        branch,
        gitUrl,
        workDir,
      ])
      log.push(cloneResult.stdout)
      if (cloneResult.stderr) log.push(cloneResult.stderr)

      if (cloneResult.exitCode !== 0) {
        return { success: false, log: log.join('') }
      }

      const dockerfilePath = join(workDir, 'Dockerfile')
      try {
        await access(dockerfilePath)
      } catch {
        return {
          success: false,
          log: `${log.join('')}\n[wisp] Dockerfile not found at repository root`,
        }
      }

      const imageTag = `wisp/${slug}:${jobId}`
      log.push(`\n[wisp] Building Docker image ${imageTag}\n`)

      const tarStream = createTar({ cwd: workDir, gzip: false }, ['.'])
      const buildStream = await this.docker.buildImage(
        tarStream as unknown as NodeJS.ReadableStream,
        { t: imageTag },
      )
      const buildResult = await this.followBuildStream(buildStream)
      log.push(buildResult.log)

      if (!buildResult.success) {
        return { success: false, log: log.join('') }
      }

      await this.docker.getImage(imageTag).tag({ repo: `wisp/${slug}`, tag: 'latest' })
      log.push(`\n[wisp] Tagged wisp/${slug}:latest\n`)

      return { success: true, log: log.join('') }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      return { success: false, log: `${log.join('')}\n[wisp] Build crashed: ${message}` }
    } finally {
      await rm(workDir, { recursive: true, force: true })
    }
  }

  private followBuildStream(
    stream: NodeJS.ReadableStream,
  ): Promise<{ success: boolean; log: string }> {
    return new Promise((resolve) => {
      const log: string[] = []

      this.docker.modem.followProgress(
        stream,
        (err: Error | null, output: BuildStreamEvent[]) => {
          if (err) {
            resolve({ success: false, log: `${log.join('')}\n${err.message}` })
            return
          }

          const errorEvent = output.find((event) => event.error || event.errorDetail?.message)
          if (errorEvent) {
            resolve({
              success: false,
              log: `${log.join('')}\n${errorEvent.error ?? errorEvent.errorDetail?.message ?? 'Docker build failed'}`,
            })
            return
          }

          resolve({ success: true, log: log.join('') })
        },
        (event: BuildStreamEvent) => {
          if (event.stream) log.push(event.stream)
          if (event.status) log.push(`${event.status}\n`)
          if (event.error) log.push(`${event.error}\n`)
        },
      )
    })
  }
}
