import { randomBytes } from 'node:crypto'
import { sessions, users } from '@wisp/db'
import { eq } from 'drizzle-orm'
import type { DatabaseClient } from '../../plugins/db'
import type { UserContext } from '../../types/user'

const SESSION_TOKEN_BYTES = 32

export class SessionService {
  constructor(private db: DatabaseClient) {}

  async createSession(userId: string, expiresAt: Date): Promise<string> {
    const id = randomBytes(SESSION_TOKEN_BYTES).toString('base64url')
    await this.db.insert(sessions).values({
      id,
      userId,
      expiresAt,
    })
    return id
  }

  async validateSession(token: string): Promise<UserContext | null> {
    const session = await this.db.select().from(sessions).where(eq(sessions.id, token)).get()

    if (!session) {
      return null
    }

    if (session.expiresAt.getTime() <= Date.now()) {
      await this.db.delete(sessions).where(eq(sessions.id, token))
      return null
    }

    const user = await this.db.select().from(users).where(eq(users.id, session.userId)).get()

    if (!user) {
      return null
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name ?? null,
      role: user.role ?? 'user',
    }
  }

  async invalidateSession(token: string): Promise<void> {
    await this.db.delete(sessions).where(eq(sessions.id, token))
  }
}
