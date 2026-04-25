import { z } from 'zod'

export const databaseConfigSchema = z.object({
  databaseUrl: z.string().default('./sqlite.db'),
})

export type DatabaseConfig = z.infer<typeof databaseConfigSchema>
