import { createDbClient } from '@wisp/db'
import { Elysia } from 'elysia'
import { config } from '../config'

export type DatabaseClient = ReturnType<typeof createDbClient>

export const db = createDbClient(config.DATABASE_URL)

export const dbPlugin = new Elysia({ name: 'db' }).decorate('db', db)
