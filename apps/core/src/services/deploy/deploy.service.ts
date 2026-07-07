import { type InsertService, services } from '@wisp/db'
import { eq } from 'drizzle-orm'
import { generateId } from 'lucia'
import type { DatabaseClient } from '../../plugins/db'
import { ConflictError, NotFoundError } from '../../types/error'

export class DeployService {
  constructor(private db: DatabaseClient) {}

  async create(data: InsertService & { userId: string }): Promise<{ id: string }> {
    const existing = await this.db.select().from(services).where(eq(services.slug, data.slug)).get()

    if (existing) {
      throw new ConflictError('Service slug already exists')
    }

    const id = generateId(15)
    await this.db.insert(services).values({
      id,
      name: data.name,
      slug: data.slug,
      gitUrl: data.gitUrl,
      branch: data.branch ?? 'main',
      userId: data.userId,
    })

    return { id }
  }

  async listByUser(userId: string) {
    return this.db.select().from(services).where(eq(services.userId, userId)).all()
  }

  async getById(id: string) {
    const service = await this.db.select().from(services).where(eq(services.id, id)).get()

    if (!service) {
      throw new NotFoundError('Service')
    }

    return service
  }
}
