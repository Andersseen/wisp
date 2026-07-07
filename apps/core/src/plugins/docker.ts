import Dockerode from 'dockerode'
import { Elysia } from 'elysia'
import { config } from '../config'

export const docker = new Dockerode({ socketPath: config.DOCKER_SOCKET })

export const dockerPlugin = new Elysia({ name: 'docker' }).decorate('docker', docker)
