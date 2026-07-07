import { z } from 'zod'

export const serviceStatusSchema = z.enum(['pending', 'building', 'running', 'stopped', 'error'])

export const deployInputSchema = z.object({
  name: z.string().min(1).max(100),
  slug: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-z0-9-]+$/),
  gitUrl: z.string().url(),
  branch: z.string().default('main'),
})

export type DeployInput = z.infer<typeof deployInputSchema>
