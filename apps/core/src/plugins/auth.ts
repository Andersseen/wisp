import { Elysia } from 'elysia'
import type { UserContext } from '../types/user'

export const authPlugin = new Elysia({ name: 'auth' }).derive(
  { as: 'scoped' },
  async ({ headers }): Promise<{ user: UserContext | null }> => {
    const sessionId = headers.authorization?.replace('Bearer ', '')
    if (!sessionId) {
      return { user: null }
    }
    // TODO: integrate Lucia session validation
    return { user: null }
  },
)
