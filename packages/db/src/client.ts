import { Database } from 'bun:sqlite'
import { drizzle } from 'drizzle-orm/bun-sqlite'
import * as schema from './schema'

export type DatabaseClient = ReturnType<typeof createDbClient>

export function createDbClient(url?: string) {
  const sqlite = new Database(url ?? process.env.DATABASE_URL ?? './sqlite.db')
  return drizzle(sqlite, { schema })
}
