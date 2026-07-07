import type Dockerode from 'dockerode'

export class DockerComposeEngine {
  constructor(private docker: Dockerode) {}

  async up(_projectName: string, _composePath: string): Promise<void> {
    // TODO: implement docker compose up orchestration
    throw new Error('Not implemented')
  }

  async down(_projectName: string): Promise<void> {
    // TODO: implement docker compose down orchestration
    throw new Error('Not implemented')
  }
}
