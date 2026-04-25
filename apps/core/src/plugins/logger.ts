import { Elysia } from 'elysia'
import { config } from '../config'
import pino from 'pino'

export const logger = pino({
  level: config.LOG_LEVEL,
  transport:
    config.NODE_ENV === 'development'
      ? { target: 'pino-pretty', options: { colorize: true } }
      : undefined,
})

export const loggerPlugin = new Elysia({ name: 'logger' }).decorate('logger', logger)
