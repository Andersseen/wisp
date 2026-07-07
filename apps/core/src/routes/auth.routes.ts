import { Elysia, t } from 'elysia'
import { dbPlugin } from '../plugins/db'
import { loggerPlugin } from '../plugins/logger'
import { AuthService } from '../services/auth/auth.service'

export const authRoutes = new Elysia({ prefix: '/auth' })
  .use(dbPlugin)
  .use(loggerPlugin)
  .post(
    '/register',
    async ({ body, db }) => {
      const service = new AuthService(db)
      return service.register(body)
    },
    {
      body: t.Object({
        email: t.String({ format: 'email' }),
        hashedPassword: t.String({ minLength: 8 }),
        name: t.Optional(t.String()),
      }),
    },
  )
  .post(
    '/login',
    async ({ body, db }) => {
      const service = new AuthService(db)
      return service.login(body.email, body.password)
    },
    {
      body: t.Object({
        email: t.String({ format: 'email' }),
        password: t.String(),
      }),
    },
  )
