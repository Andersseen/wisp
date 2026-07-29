import { Elysia } from 'elysia'
import { Redis } from 'ioredis'
import { config } from '../config'
import { logger } from './logger'

export const redis = new Redis(config.VALKEY_URL)

redis.on('error', (err) => {
  logger.warn({ err }, 'redis connection error')
})

export const valkeyPlugin = new Elysia({ name: 'valkey' }).decorate('redis', redis)
