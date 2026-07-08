import { z } from 'zod'

export const userRoleSchema = z.enum(['admin', 'user'])

export const userContextSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string().nullable(),
  role: userRoleSchema,
})

export type UserContext = z.infer<typeof userContextSchema>
