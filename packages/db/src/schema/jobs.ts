import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'
import { createInsertSchema, createSelectSchema } from 'drizzle-zod'
import { z } from 'zod'
import { services } from './services'

export const jobs = sqliteTable('jobs', {
  id: text('id').primaryKey(),
  type: text('type', { enum: ['build', 'deploy'] }).notNull(),
  status: text('status', { enum: ['pending', 'running', 'success', 'failed'] })
    .default('pending'),
  serviceId: text('service_id')
    .notNull()
    .references(() => services.id),
  logOutput: text('log_output'),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' })
    .$defaultFn(() => new Date()),
})

export const insertJobSchema = createInsertSchema(jobs).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
})

export const selectJobSchema = createSelectSchema(jobs)
export type InsertJob = z.infer<typeof insertJobSchema>
export type SelectJob = z.infer<typeof selectJobSchema>
