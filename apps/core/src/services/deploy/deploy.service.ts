import { type InsertService, jobs, services } from '@wisp/db'
import { eq } from 'drizzle-orm'
import type { DatabaseClient } from '../../plugins/db'
import { ConflictError, NotFoundError } from '../../types/error'
import { generateId } from '../../utils/id'
import type { QueueService } from '../queue/queue.service'

export class DeployService {
  constructor(
    private db: DatabaseClient,
    private queueService: QueueService,
  ) {}

  async create(data: InsertService & { userId: string }): Promise<{ id: string }> {
    const existing = await this.db.select().from(services).where(eq(services.slug, data.slug)).get()

    if (existing) {
      throw new ConflictError('Service slug already exists')
    }

    const serviceId = generateId(15)
    const jobId = generateId(15)

    await this.db.insert(services).values({
      id: serviceId,
      name: data.name,
      slug: data.slug,
      gitUrl: data.gitUrl,
      branch: data.branch ?? 'main',
      userId: data.userId,
    })

    await this.db.insert(jobs).values({
      id: jobId,
      type: 'build',
      status: 'pending',
      serviceId,
    })

    await this.queueService.addBuildJob({
      serviceId,
      slug: data.slug,
      gitUrl: data.gitUrl,
      branch: data.branch ?? 'main',
      jobId,
    })

    return { id: serviceId }
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

  async listJobsByService(serviceId: string) {
    return this.db
      .select({
        id: jobs.id,
        type: jobs.type,
        status: jobs.status,
        logOutput: jobs.logOutput,
        createdAt: jobs.createdAt,
        updatedAt: jobs.updatedAt,
      })
      .from(jobs)
      .where(eq(jobs.serviceId, serviceId))
      .orderBy(jobs.createdAt)
      .all()
  }
}
