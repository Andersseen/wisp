import { z } from 'zod'
import { databaseConfigSchema } from './database'
import { valkeyConfigSchema } from './valkey'
import { dockerConfigSchema } from './docker'

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('3000'),
  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),
  DATABASE_URL: z.string().default('./sqlite.db'),
  VALKEY_URL: z.string().default('redis://localhost:6379'),
  DOCKER_SOCKET: z.string().default('/var/run/docker.sock'),
  SESSION_SECRET: z.string().min(32),
})

const parsed = envSchema.safeParse(process.env)

if (!parsed.success) {
  const formatted = parsed.error.issues
    .map((i) => `${i.path.join('.')}: ${i.message}`)
    .join('\n')
  throw new Error(`Invalid environment variables:\n${formatted}`)
}

export const config = {
  ...parsed.data,
  ...databaseConfigSchema.parse({}),
  ...valkeyConfigSchema.parse({}),
  ...dockerConfigSchema.parse({}),
}

export type Config = typeof config
