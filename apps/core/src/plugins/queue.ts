import { Elysia } from 'elysia'
import { QueueService } from '../services/queue/queue.service'
import { redis } from './valkey'

export const queueService = new QueueService(redis)

export const queuePlugin = new Elysia({ name: 'queue' }).decorate('queueService', queueService)
