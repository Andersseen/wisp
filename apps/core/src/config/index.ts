import { z } from 'zod'

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('3000'),
  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),
  DATABASE_URL: z.string().default('./sqlite.db'),
  VALKEY_URL: z.string().default('redis://localhost:6379'),
  DOCKER_SOCKET: z.string().default('/var/run/docker.sock'),
  WORK_DIR: z.string().default('./data/builds'),
  WISP_DOMAIN: z.string().default('localhost'),
  CADDY_ADMIN_URL: z.string().default('http://localhost:2019'),
  SESSION_SECRET: z.string().min(32),
  SESSION_COOKIE_NAME: z.string().default('sessionId'),
  SESSION_MAX_AGE_MS: z.coerce.number().default(7 * 24 * 60 * 60 * 1000),
})

const parsed = envSchema.safeParse(process.env)

if (!parsed.success) {
  const formatted = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('\n')
  throw new Error(`Invalid environment variables:\n${formatted}`)
}

export const config = parsed.data

export type Config = typeof config
