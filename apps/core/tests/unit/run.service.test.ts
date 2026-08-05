import { beforeEach, describe, expect, it, mock } from 'bun:test'
import type Dockerode from 'dockerode'
import type { CaddyEngine } from '../../src/engine/caddy.engine'
import { RunService } from '../../src/services/deploy/run.service'

function createMockDocker(): Dockerode {
  const containers = new Map<string, Dockerode.Container>()

  const createContainer = mock(() =>
    Promise.resolve({ id: 'container-id', start: mock(() => Promise.resolve()) }),
  )
  const getContainer = mock((name: string) => {
    if (!containers.has(name)) {
      containers.set(name, {
        inspect: mock(() => Promise.resolve({ State: { Running: false }, Name: name })),
        start: mock(() => Promise.resolve()),
        stop: mock(() => Promise.resolve()),
        remove: mock(() => Promise.resolve()),
      } as unknown as Dockerode.Container)
    }
    return containers.get(name) as Dockerode.Container
  })
  const createNetwork = mock(() => Promise.resolve())
  const getImage = mock(() => ({
    inspect: mock(() =>
      Promise.resolve({
        Config: { ExposedPorts: { '8080/tcp': {} } },
      }),
    ),
  }))

  return {
    createContainer,
    getContainer,
    createNetwork,
    getImage,
  } as unknown as Dockerode
}

function createMockCaddy(): CaddyEngine {
  return {
    addRoute: mock(() => Promise.resolve()),
    removeRoute: mock(() => Promise.resolve()),
  } as unknown as CaddyEngine
}

describe('RunService', () => {
  let docker: Dockerode
  let caddy: CaddyEngine

  beforeEach(() => {
    docker = createMockDocker()
    caddy = createMockCaddy()
  })

  it('creates and starts a container with detected port', async () => {
    const service = new RunService({ docker, caddy, networkName: 'wisp-net' })
    const result = await service.start('demo')

    expect(result.port).toBe(8080)
    expect(docker.createContainer).toHaveBeenCalled()
    expect(caddy.addRoute).toHaveBeenCalledWith({ slug: 'demo', port: 8080 })
  })

  it('uses explicit port when provided', async () => {
    const service = new RunService({ docker, caddy, networkName: 'wisp-net' })
    const result = await service.start('demo', 4000)

    expect(result.port).toBe(4000)
    expect(caddy.addRoute).toHaveBeenCalledWith({ slug: 'demo', port: 4000 })
  })

  it('stops a running container', async () => {
    const service = new RunService({ docker, caddy, networkName: 'wisp-net' })
    await service.stop('demo')

    const container = docker.getContainer('wisp-demo')
    expect(container.stop).toHaveBeenCalled()
  })

  it('removes container and route', async () => {
    const service = new RunService({ docker, caddy, networkName: 'wisp-net' })
    await service.remove('demo')

    const container = docker.getContainer('wisp-demo')
    expect(container.stop).toHaveBeenCalled()
    expect(container.remove).toHaveBeenCalled()
    expect(caddy.removeRoute).toHaveBeenCalledWith('demo')
  })

  it('redeploy removes then starts', async () => {
    const service = new RunService({ docker, caddy, networkName: 'wisp-net' })
    const result = await service.redeploy('demo')

    expect(result.port).toBe(8080)
    expect(docker.createContainer).toHaveBeenCalled()
    expect(caddy.addRoute).toHaveBeenCalledWith({ slug: 'demo', port: 8080 })
  })
})
