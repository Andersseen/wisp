import { Elysia } from 'elysia'
import { Redis } from 'ioredis'
import { config } from '../config'

export const redis = new Redis(config.VALKEY_URL)

export const valkeyPlugin = new Elysia({ name: 'valkey' }).decorate('redis', redis)
