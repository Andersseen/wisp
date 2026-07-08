import { type Context, Elysia, t } from 'elysia'
import { config } from '../config'
import { authPlugin } from '../plugins/auth'
import { dbPlugin } from '../plugins/db'
import { loggerPlugin } from '../plugins/logger'
import { AuthService } from '../services/auth/auth.service'
import { SessionService } from '../services/auth/session.service'
import { UnauthorizedError } from '../types/error'

interface CookieOptions {
  path?: string
  maxAge?: number
  expires?: Date
  httpOnly?: boolean
  secure?: boolean
  sameSite?: 'Lax' | 'Strict' | 'None'
}

function serializeCookie(name: string, value: string, options: CookieOptions = {}): string {
  let cookie = `${name}=${value}`
  if (options.path) cookie += `; Path=${options.path}`
  if (options.maxAge !== undefined) cookie += `; Max-Age=${options.maxAge}`
  if (options.expires) cookie += `; Expires=${options.expires.toUTCString()}`
  if (options.httpOnly) cookie += '; HttpOnly'
  if (options.secure) cookie += '; Secure'
  if (options.sameSite) cookie += `; SameSite=${options.sameSite}`
  return cookie
}

function setSessionCookie(set: Context['set'], sessionId: string): void {
  const maxAgeSec = Math.floor(config.SESSION_MAX_AGE_MS / 1000)
  set.headers['Set-Cookie'] = serializeCookie(config.SESSION_COOKIE_NAME, sessionId, {
    path: '/',
    maxAge: maxAgeSec,
    httpOnly: true,
    sameSite: 'Lax',
    secure: config.NODE_ENV === 'production',
  })
}

function clearSessionCookie(set: Context['set']): void {
  set.headers['Set-Cookie'] = serializeCookie(config.SESSION_COOKIE_NAME, '', {
    path: '/',
    maxAge: 0,
    httpOnly: true,
    sameSite: 'Lax',
    secure: config.NODE_ENV === 'production',
  })
}

export const authRoutes = new Elysia({ prefix: '/auth' })
  .use(dbPlugin)
  .use(loggerPlugin)
  .use(authPlugin)
  .post(
    '/register',
    async ({ body, db, set }) => {
      const service = new AuthService(db)
      set.status = 201
      return service.register(body)
    },
    {
      body: t.Object({
        email: t.String({ format: 'email' }),
        password: t.String({ minLength: 8 }),
        name: t.Optional(t.String()),
      }),
    },
  )
  .post(
    '/login',
    async ({ body, db, set }) => {
      const authService = new AuthService(db)
      const user = await authService.login(body.email, body.password)
      const sessionService = new SessionService(db)
      const expiresAt = new Date(Date.now() + config.SESSION_MAX_AGE_MS)
      const sessionId = await sessionService.createSession(user.id, expiresAt)
      setSessionCookie(set, sessionId)
      return user
    },
    {
      body: t.Object({
        email: t.String({ format: 'email' }),
        password: t.String(),
      }),
    },
  )
  .post('/logout', async ({ user, sessionId, db, set }) => {
    if (!user || !sessionId) {
      throw new UnauthorizedError()
    }
    const sessionService = new SessionService(db)
    await sessionService.invalidateSession(sessionId)
    clearSessionCookie(set)
    return { ok: true }
  })
  .get('/me', async ({ user }) => {
    if (!user) {
      throw new UnauthorizedError()
    }
    return user
  })
