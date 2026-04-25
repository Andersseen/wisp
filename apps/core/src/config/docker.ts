import { z } from 'zod'

export const dockerConfigSchema = z.object({
  dockerSocket: z.string().default('/var/run/docker.sock'),
})

export type DockerConfig = z.infer<typeof dockerConfigSchema>
