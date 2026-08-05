import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'
import { createInsertSchema, createSelectSchema } from 'drizzle-zod'
import type { z } from 'zod'
import { users } from './users'

export const services = sqliteTable(
  'services',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    slug: text('slug').notNull().unique(),
    gitUrl: text('git_url').notNull(),
    branch: text('branch').default('main'),
    status: text('status', {
      enum: ['pending', 'building', 'running', 'stopped', 'error'],
    }).default('pending'),
    port: integer('port'),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
    updatedAt: integer('updated_at', { mode: 'timestamp' })
      .$defaultFn(() => new Date())
      .$onUpdateFn(() => new Date()),
  },
  (table) => [index('services_user_id_idx').on(table.userId)],
)

export const insertServiceSchema = createInsertSchema(services).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
})

export const selectServiceSchema = createSelectSchema(services)
export type InsertService = z.infer<typeof insertServiceSchema>
export type SelectService = z.infer<typeof selectServiceSchema>
