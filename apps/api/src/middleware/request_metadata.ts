import { randomUUID } from 'node:crypto'
import { logger } from '@ritchy/logger'
import type { NextFunction, Request, Response } from 'express'

/**
 * Middleware that adds metadata to the request object
 * This metadata can be used for version history, logging, and tracking
 */
export const addRequestMetadata = (
  req: Request,
  _res: Response,
  next: NextFunction,
): void => {
  try {
    // Generate a unique request ID for tracking
    const requestId = randomUUID()
    const timestamp = new Date()

    // Add metadata to request object
    req.metadata = {
      ipAddress: req.ip ?? 'unknown',
      userAgent: req.headers['user-agent'] ?? 'unknown',
      requestId,
      timestamp,
    }

    // Only add request context, preserving any existing user context
    logger.runWithContext(
      {
        request: {
          id: req.metadata.requestId,
          ipAddress: req.metadata.ipAddress,
          userAgent: req.metadata.userAgent,
          timestamp: req.metadata.timestamp,
        },
      },
      () => next(),
    )
  } catch (error) {
    logger.error({
      msg: 'Failed to add request metadata',
      event: 'request_metadata_error',
      metadata: { error },
    })
    next(error)
  }
}
