import type Dockerode from 'dockerode'
import { logger } from '../plugins/logger'

export class ContainerEngine {
  constructor(
    private docker: Dockerode,
    private network: string,
  ) {}

  async ensureNetwork(): Promise<void> {
    try {
      const networks = await this.docker.listNetworks({ filters: { name: [this.network] } })
      const exists = networks.some((n) => n.Name === this.network)

      if (!exists) {
        await this.docker.createNetwork({ Name: this.network, Driver: 'bridge' })
        logger.info({ network: this.network }, 'docker network created')
      }
    } catch (err) {
      logger.warn({ err, network: this.network }, 'failed to ensure docker network')
    }
  }

  async runContainer(slug: string, port: number): Promise<string> {
    const containerName = `wisp-${slug}`
    const image = `wisp/${slug}:latest`

    await this.removeContainer(slug).catch(() => {})

    const container = await this.docker.createContainer({
      name: containerName,
      Image: image,
      HostConfig: {
        RestartPolicy: { Name: 'unless-stopped' },
        PortBindings: {
          [`${port}/tcp`]: [{ HostPort: '0' }],
        },
      },
      ExposedPorts: {
        [`${port}/tcp`]: {},
      },
      NetworkingConfig: {
        EndpointsConfig: {
          [this.network]: {},
        },
      },
    })

    await container.start()

    const info = await container.inspect()
    logger.info({ slug, containerId: info.Id, port }, 'container started')

    return info.Id
  }

  async stopContainer(slug: string): Promise<void> {
    const containerName = `wisp-${slug}`

    try {
      const container = this.docker.getContainer(containerName)
      await container.stop()
      logger.info({ slug }, 'container stopped')
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      if (message.includes('no such container') || message.includes('404')) {
        logger.info({ slug }, 'container not found, nothing to stop')
        return
      }
      throw err
    }
  }

  async startContainer(slug: string): Promise<void> {
    const containerName = `wisp-${slug}`
    const container = this.docker.getContainer(containerName)
    await container.start()
    logger.info({ slug }, 'container started')
  }

  async removeContainer(slug: string): Promise<void> {
    const containerName = `wisp-${slug}`

    try {
      const container = this.docker.getContainer(containerName)
      await container.remove({ force: true })
      logger.info({ slug }, 'container removed')
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      if (message.includes('no such container') || message.includes('404')) {
        return
      }
      throw err
    }
  }

  async getImagePort(slug: string): Promise<number | null> {
    const image = `wisp/${slug}:latest`

    try {
      const imageInfo = await this.docker.getImage(image).inspect()
      const exposedPorts = imageInfo.Config?.ExposedPorts ?? {}
      const firstPort = Object.keys(exposedPorts)[0]

      if (firstPort) {
        const portStr = firstPort.split('/')[0]
        if (!portStr) return null
        const port = Number.parseInt(portStr, 10)
        return Number.isNaN(port) ? null : port
      }

      return null
    } catch {
      return null
    }
  }

  async getLogs(slug: string, lines: number): Promise<string> {
    const containerName = `wisp-${slug}`

    try {
      const container = this.docker.getContainer(containerName)
      const logs = await container.logs({
        stdout: true,
        stderr: true,
        tail: lines,
        follow: false,
      })

      return logs.toString('utf-8')
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      if (message.includes('no such container') || message.includes('404')) {
        return ''
      }
      throw err
    }
  }
}
