import { mkdir, rm, stat } from 'node:fs/promises'
import { join } from 'node:path'
import type Dockerode from 'dockerode'
import { logger } from '../../plugins/logger'
import type { BuildInput, BuildResult } from '../../types/deploy'

export class BuildService {
  constructor(
    private docker: Dockerode,
    private workDir: string,
  ) {}

  async build(input: BuildInput): Promise<BuildResult> {
    const buildDir = join(this.workDir, input.slug, input.jobId)
    const logs: string[] = []

    try {
      await mkdir(buildDir, { recursive: true })
      logs.push(`[wisp] Created build directory: ${buildDir}`)

      logs.push(`[wisp] Cloning ${input.gitUrl} (branch: ${input.branch})...`)
      const cloneResult = await this.gitClone(input.gitUrl, input.branch, buildDir)
      logs.push(cloneResult.log)

      if (!cloneResult.success) {
        return { success: false, log: logs.join('\n') }
      }

      const dockerfilePath = join(buildDir, 'Dockerfile')
      let hasDockerfile = false
      try {
        await stat(dockerfilePath)
        hasDockerfile = true
      } catch {
        hasDockerfile = false
      }
      if (!hasDockerfile) {
        logs.push('[wisp] Error: No Dockerfile found in repository root')
        return { success: false, log: logs.join('\n') }
      }

      logs.push('[wisp] Building Docker image...')
      const imageTag = `wisp/${input.slug}:${input.jobId}`
      const latestTag = `wisp/${input.slug}:latest`

      const buildResult = await this.dockerBuild(buildDir, imageTag)
      logs.push(buildResult.log)

      if (!buildResult.success) {
        return { success: false, log: logs.join('\n') }
      }

      try {
        const image = this.docker.getImage(imageTag)
        await image.tag({ repo: `wisp/${input.slug}`, tag: 'latest' })
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        logs.push(`[wisp] Warning: failed to tag image as latest: ${message}`)
      }

      logs.push(`[wisp] Build successful: ${imageTag}, ${latestTag}`)
      return { success: true, log: logs.join('\n') }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      logs.push(`[wisp] Unexpected error: ${message}`)
      logger.error({ err, jobId: input.jobId }, 'build failed unexpectedly')
      return { success: false, log: logs.join('\n') }
    } finally {
      await rm(buildDir, { recursive: true, force: true }).catch((err) => {
        logger.warn({ err, buildDir }, 'failed to clean build directory')
      })
    }
  }

  private async gitClone(
    gitUrl: string,
    branch: string,
    dest: string,
  ): Promise<{ success: boolean; log: string }> {
    try {
      const proc = Bun.spawn(['git', 'clone', '--depth', '1', '--branch', branch, gitUrl, dest], {
        stdout: 'pipe',
        stderr: 'pipe',
      })

      const [stdout, stderr] = await Promise.all([
        new Response(proc.stdout).text(),
        new Response(proc.stderr).text(),
      ])

      const exitCode = await proc.exited

      if (exitCode !== 0) {
        return {
          success: false,
          log: `[git clone] Failed (exit ${exitCode}):\n${stderr || stdout}`,
        }
      }

      return { success: true, log: `[git clone] Success\n${stderr || stdout}` }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      return { success: false, log: `[git clone] Error: ${message}` }
    }
  }

  private async dockerBuild(
    contextDir: string,
    tag: string,
  ): Promise<{ success: boolean; log: string }> {
    try {
      const tarProc = Bun.spawn(['tar', '-cf', '-', '-C', contextDir, '.'], {
        stdout: 'pipe',
        stderr: 'pipe',
      })

      const tarStream = tarProc.stdout as unknown as NodeJS.ReadableStream

      const buildStream = await this.docker.buildImage(tarStream, { t: tag })

      const logs: string[] = []
      let hasError = false

      await new Promise<void>((resolve, reject) => {
        this.docker.modem.followProgress(
          buildStream,
          (err: Error | null) => {
            if (err) {
              reject(err)
            } else {
              resolve()
            }
          },
          (event: { stream?: string; error?: string }) => {
            if (event.stream) {
              logs.push(event.stream.trimEnd())
            }
            if (event.error) {
              logs.push(`[error] ${event.error}`)
              hasError = true
            }
          },
        )
      })

      await tarProc.exited

      if (hasError) {
        return { success: false, log: logs.join('\n') }
      }

      return { success: true, log: logs.join('\n') }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      return { success: false, log: `[docker build] Error: ${message}` }
    }
  }
}
