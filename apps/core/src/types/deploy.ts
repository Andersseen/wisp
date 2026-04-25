import { z } from 'zod'

export const jobTypeSchema = z.enum(['build', 'deploy'])
export const jobStatusSchema = z.enum(['pending', 'running', 'success', 'failed'])

export const buildInputSchema = z.object({
  serviceId: z.string(),
  gitUrl: z.string().url(),
  branch: z.string().default('main'),
})

export type BuildInput = z.infer<typeof buildInputSchema>
