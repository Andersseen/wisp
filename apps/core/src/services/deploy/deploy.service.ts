import { type InsertService, jobs, services } from '@wisp/db'
import { desc, eq } from 'drizzle-orm'
import type { CaddyEngine } from '../../engine/caddy.engine'
import type { ContainerEngine } from '../../engine/container.engine'
import type { DatabaseClient } from '../../plugins/db'
import { ConflictError, NotFoundError, ValidationError } from '../../types/error'
import { generateId } from '../../utils/id'
import type { QueueService } from '../queue/queue.service'

export class DeployService {
  constructor(
    private db: DatabaseClient,
    private queueService?: QueueService,
    private engines?: {
      containerEngine?: ContainerEngine
      caddyEngine?: CaddyEngine
      domain?: string
    },
  ) {}

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

    const jobId = generateId(15)
    await this.db.insert(jobs).values({
      id: jobId,
      type: 'build',
      status: 'pending',
      serviceId: id,
    })

    if (this.queueService) {
      void this.queueService.addBuildJob(id, data.slug, data.gitUrl, data.branch ?? 'main', jobId)
    }

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

  async getJobsByServiceId(serviceId: string) {
    return this.db
      .select()
      .from(jobs)
      .where(eq(jobs.serviceId, serviceId))
      .orderBy(desc(jobs.createdAt))
      .all()
  }

  async stop(id: string): Promise<void> {
    const service = await this.getById(id)

    if (!this.engines?.containerEngine || !this.engines?.caddyEngine) {
      throw new ValidationError('Container/Caddy engines not configured')
    }

    await this.engines.containerEngine.stopContainer(service.slug)

    const domain = `${service.slug}.${this.engines.domain ?? 'localhost'}`
    await this.engines.caddyEngine.removeRoute(domain)

    await this.db.update(services).set({ status: 'stopped' }).where(eq(services.id, id)).run()
  }

  async start(id: string): Promise<void> {
    const service = await this.getById(id)

    if (!this.engines?.containerEngine || !this.engines?.caddyEngine) {
      throw new ValidationError('Container/Caddy engines not configured')
    }

    if (!service.port) {
      throw new ValidationError('Service has no port configured')
    }

    await this.engines.containerEngine.startContainer(service.slug)

    const domain = `${service.slug}.${this.engines.domain ?? 'localhost'}`
    const target = `wisp-${service.slug}:${service.port}`
    await this.engines.caddyEngine.addRoute(domain, target)

    await this.db.update(services).set({ status: 'running' }).where(eq(services.id, id)).run()
  }

  async delete(id: string): Promise<void> {
    const service = await this.getById(id)

    if (this.engines?.containerEngine) {
      await this.engines.containerEngine.removeContainer(service.slug).catch(() => {})
    }

    if (this.engines?.caddyEngine) {
      const domain = `${service.slug}.${this.engines.domain ?? 'localhost'}`
      await this.engines.caddyEngine.removeRoute(domain).catch(() => {})
    }

    await this.db.delete(jobs).where(eq(jobs.serviceId, id)).run()
    await this.db.delete(services).where(eq(services.id, id)).run()
  }

  async redeploy(id: string): Promise<{ jobId: string }> {
    const service = await this.getById(id)

    const jobId = generateId(15)
    await this.db.insert(jobs).values({
      id: jobId,
      type: 'build',
      status: 'pending',
      serviceId: id,
    })

    if (this.queueService) {
      void this.queueService.addBuildJob(
        id,
        service.slug,
        service.gitUrl,
        service.branch ?? 'main',
        jobId,
      )
    }

    return { jobId }
  }

  async getContainerLogs(id: string, lines: number): Promise<string> {
    const service = await this.getById(id)

    if (!this.engines?.containerEngine) {
      throw new ValidationError('Container engine not configured')
    }

    return this.engines.containerEngine.getLogs(service.slug, lines)
  }
}
