import { logger } from '@ritchy/logger'
import type { NextFunction, Request, Response } from 'express'
import { validateApiKey } from '../services/api_keys'

export type ApiAuthRequest = Request & {
  apiAuth: {
    userId: string
    apiKeyId: string
  }
}

export const apiKeyAuth = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization

    if (!authHeader?.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_API_KEY',
          message: 'Missing or invalid Authorization header',
        },
      })
      return
    }

    const token = authHeader.substring(7)

    const result = await validateApiKey(token)

    if (!result.valid) {
      res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_API_KEY',
          message: result.error,
        },
      })
      return
    }
    // Attach auth info to request (validated above, so these are guaranteed)
    ;(req as ApiAuthRequest).apiAuth = {
      userId: result.userId ?? '',
      apiKeyId: result.apiKeyId ?? '',
    }

    // Log successful authentication
    logger.info({
      msg: 'API key authenticated',
      event: 'api_key_authenticated',
      metadata: {
        apiKeyId: result.apiKeyId,
        userId: result.userId,
      },
    })

    next()
  } catch (error) {
    logger.error({
      msg: 'API key authentication error',
      event: 'api_key_auth_error',
      metadata: { error },
    })

    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Authentication failed',
      },
    })
  }
}
