import type Dockerode from 'dockerode'
import type { ContainerCreateOptions } from 'dockerode'

export class DockerService {
  constructor(private docker: Dockerode) {}

  async listContainers(): Promise<Dockerode.ContainerInfo[]> {
    return this.docker.listContainers({ all: true })
  }

  async createContainer(options: ContainerCreateOptions): Promise<Dockerode.Container> {
    return this.docker.createContainer(options)
  }

  async pullImage(image: string): Promise<void> {
    const stream = await this.docker.pull(image)
    return new Promise((resolve, reject) => {
      this.docker.modem.followProgress(stream, (err) => {
        if (err) reject(err)
        else resolve()
      })
    })
  }
}
