import { Elysia } from 'elysia'
import { createDbClient } from '@wisp/db'
import { config } from '../config'

export type DatabaseClient = ReturnType<typeof createDbClient>

export const dbPlugin = new Elysia({ name: 'db' }).decorate(
  'db',
  createDbClient(config.DATABASE_URL),
)
