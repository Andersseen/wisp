import { Elysia } from 'elysia'
import Dockerode from 'dockerode'
import { config } from '../config'

export const docker = new Dockerode({ socketPath: config.DOCKER_SOCKET })

export const dockerPlugin = new Elysia({ name: 'docker' }).decorate('docker', docker)
