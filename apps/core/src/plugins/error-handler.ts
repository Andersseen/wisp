import { Elysia } from 'elysia'
import { AppError } from '../types/error'
import { logger } from './logger'

export const errorHandlerPlugin = new Elysia({ name: 'error-handler' }).onError(
  ({ code, error, set }) => {
    if (error instanceof AppError) {
      set.status = error.status
      logger.warn({ err: error, code: error.code }, 'Application error')
      return { success: false, code: error.code, message: error.message }
    }

    if (code === 'VALIDATION') {
      set.status = 400
      logger.warn({ err: error }, 'Validation error')
      return { success: false, code: 'VALIDATION_ERROR', message: error.message }
    }

    set.status = 500
    logger.error({ err: error }, 'Unhandled error')
    return { success: false, code: 'INTERNAL_ERROR', message: 'Internal server error' }
  },
)
