import { hashSync } from '@node-rs/argon2'
import { users } from '@wisp/db'
import { eq } from 'drizzle-orm'
import type { DatabaseClient } from '../../plugins/db'
import { ConflictError, UnauthorizedError } from '../../types/error'
import { generateId } from '../../utils/id'
import { PasswordService } from './password.service'

const DUMMY_HASH = hashSync('wisp-dummy-password')

export interface RegisterInput {
  email: string
  password: string
  name?: string
}

export class AuthService {
  private readonly passwordService = new PasswordService()

  constructor(private db: DatabaseClient) {}

  async register(data: RegisterInput): Promise<{ id: string; email: string }> {
    const existing = await this.db.select().from(users).where(eq(users.email, data.email)).get()

    if (existing) {
      throw new ConflictError('User already exists')
    }

    const id = generateId(15)
    const hashedPassword = await this.passwordService.hash(data.password)

    await this.db.insert(users).values({
      id,
      email: data.email,
      hashedPassword,
      name: data.name,
    })

    return { id, email: data.email }
  }

  async login(email: string, password: string): Promise<{ id: string; email: string }> {
    const user = await this.db.select().from(users).where(eq(users.email, email)).get()

    if (!user) {
      await this.passwordService.verify(DUMMY_HASH, password)
      throw new UnauthorizedError('Invalid credentials')
    }

    const valid = await this.passwordService.verify(user.hashedPassword, password)
    if (!valid) {
      throw new UnauthorizedError('Invalid credentials')
    }

    return { id: user.id, email: user.email }
  }
}
