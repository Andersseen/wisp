import { Database } from 'bun:sqlite'
import { drizzle } from 'drizzle-orm/bun-sqlite'
import * as schema from './schema'

export type DatabaseClient = ReturnType<typeof createDbClient>

export function createDbClient(url?: string) {
  const sqlite = new Database(url ?? process.env.DATABASE_URL ?? './sqlite.db')
  // SQLite disables FK enforcement per connection by default; without this the
  // declared ON DELETE CASCADE clauses never fire.
  sqlite.run('PRAGMA foreign_keys = ON')
  return drizzle(sqlite, { schema })
}
