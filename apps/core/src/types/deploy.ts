import { z } from 'zod'

export const buildInputSchema = z.object({
  serviceId: z.string(),
  slug: z.string(),
  gitUrl: z.string().url(),
  branch: z.string().default('main'),
  jobId: z.string(),
})

export type BuildInput = z.infer<typeof buildInputSchema>
