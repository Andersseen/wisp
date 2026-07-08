import { Elysia } from 'elysia'
import { config } from '../config'
import { SessionService } from '../services/auth/session.service'
import type { UserContext } from '../types/user'
import { dbPlugin } from './db'

function parseSessionCookie(header: string | undefined, name: string): string | undefined {
  if (!header) return undefined
  for (const part of header.split(';')) {
    const [key, ...rest] = part.trim().split('=')
    if (key === name) return rest.join('=')
  }
  return undefined
}

export const authPlugin = new Elysia({ name: 'auth' })
  .use(dbPlugin)
  .derive(
    { as: 'scoped' },
    async ({ headers, db }): Promise<{ user: UserContext | null; sessionId: string | null }> => {
      const sessionId = parseSessionCookie(headers.cookie, config.SESSION_COOKIE_NAME)
      if (!sessionId) {
        return { user: null, sessionId: null }
      }

      const sessionService = new SessionService(db)
      const user = await sessionService.validateSession(sessionId)
      return { user, sessionId }
    },
  )
