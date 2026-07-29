import { z } from 'zod'

export const buildInputSchema = z.object({
  serviceId: z.string(),
  gitUrl: z.string().url(),
  branch: z.string().default('main'),
})

export type BuildInput = z.infer<typeof buildInputSchema>
