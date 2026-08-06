import { Elysia } from 'elysia'
import { Redis } from 'ioredis'
import { config } from '../config'
import { logger } from './logger'

let redisInstance: Redis | null = null

export function getRedis(): Redis {
  if (!redisInstance) {
    redisInstance = new Redis(config.VALKEY_URL, {
      maxRetriesPerRequest: 3,
      retryStrategy(times) {
        if (times > 3) return null
        return Math.min(times * 100, 3000)
      },
    })
    redisInstance.on('error', (err) => {
      logger.warn({ err }, 'redis connection error')
    })
  }
  return redisInstance
}

export const redis = new Proxy({} as Redis, {
  get(_target, prop) {
    return Reflect.get(getRedis(), prop)
  },
})

export const valkeyPlugin = new Elysia({ name: 'valkey' }).decorate('redis', redis)
