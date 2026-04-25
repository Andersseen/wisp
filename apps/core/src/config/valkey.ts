import { z } from 'zod'

export const valkeyConfigSchema = z.object({
  valkeyUrl: z.string().default('redis://localhost:6379'),
})

export type ValkeyConfig = z.infer<typeof valkeyConfigSchema>
