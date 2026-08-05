import Dockerode from 'dockerode'
import { config } from '../../config'
import { CaddyEngine } from '../../engine/caddy.engine'

export interface RunServiceDependencies {
  docker: Dockerode
  caddy: CaddyEngine
  networkName: string
}

export class RunService {
  private readonly docker: Dockerode
  private readonly caddy: CaddyEngine
  private readonly networkName: string

  constructor(deps?: Partial<RunServiceDependencies>) {
    this.docker = deps?.docker ?? new Dockerode({ socketPath: config.DOCKER_SOCKET })
    this.caddy = deps?.caddy ?? new CaddyEngine()
    this.networkName = deps?.networkName ?? 'wisp-net'
  }

  async start(slug: string, port?: number): Promise<{ port: number }> {
    await this.ensureNetwork()

    const containerName = `wisp-${slug}`
    const imageName = `wisp/${slug}:latest`

    const existing = await this.getContainer(containerName)
    if (existing) {
      const info = await existing.inspect()
      if (info.State.Running) {
        return { port: port ?? (await this.resolvePort(slug, imageName, port)) }
      }
      await existing.remove({ force: true })
    }

    const resolvedPort = await this.resolvePort(slug, imageName, port)

    await this.docker.createContainer({
      name: containerName,
      Image: imageName,
      HostConfig: {
        NetworkMode: this.networkName,
        RestartPolicy: { Name: 'unless-stopped' },
      },
      Labels: { 'wisp.service': slug },
    })

    const container = this.docker.getContainer(containerName)
    await container.start()

    await this.caddy.addRoute({ slug, port: resolvedPort })

    return { port: resolvedPort }
  }

  async stop(slug: string): Promise<void> {
    const containerName = `wisp-${slug}`
    const container = await this.getContainer(containerName)
    if (container) {
      await container.stop().catch(() => undefined)
    }
  }

  async remove(slug: string): Promise<void> {
    const containerName = `wisp-${slug}`
    const container = await this.getContainer(containerName)
    if (container) {
      await container.stop().catch(() => undefined)
      await container.remove({ force: true }).catch(() => undefined)
    }
    await this.caddy.removeRoute(slug)
  }

  async redeploy(slug: string, port?: number): Promise<{ port: number }> {
    await this.remove(slug)
    return this.start(slug, port)
  }

  private async ensureNetwork(): Promise<void> {
    try {
      await this.docker.createNetwork({
        Name: this.networkName,
        Driver: 'bridge',
        CheckDuplicate: true,
      })
    } catch (err) {
      if (err instanceof Error && err.message.includes('already exists')) {
        return
      }
      throw err
    }
  }

  private async getContainer(name: string): Promise<Dockerode.Container | null> {
    try {
      const container = this.docker.getContainer(name)
      await container.inspect()
      return container
    } catch {
      return null
    }
  }

  private async resolvePort(
    _slug: string,
    imageName: string,
    explicitPort?: number,
  ): Promise<number> {
    if (explicitPort) return explicitPort

    try {
      const image = this.docker.getImage(imageName)
      const info = await image.inspect()
      const exposedPorts = info.Config?.ExposedPorts
      if (exposedPorts) {
        const ports = Object.keys(exposedPorts)
        if (ports.length > 0) {
          const first = ports[0]
          if (!first) return 3000
          const parsed = Number.parseInt(first.split('/')[0] ?? '', 10)
          if (!Number.isNaN(parsed)) return parsed
        }
      }
    } catch {
      // ignore and fallback
    }

    return 3000
  }
}
