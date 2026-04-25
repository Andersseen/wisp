import { Elysia, t } from 'elysia'

export const webhookRoutes = new Elysia({ prefix: '/webhooks' }).post(
  '/github',
  async ({ body }) => {
    // TODO: validate GitHub signature, trigger build
    return { received: true, repository: body.repository }
  },
  {
    body: t.Object({
      repository: t.String(),
      ref: t.String(),
    }),
  },
)
