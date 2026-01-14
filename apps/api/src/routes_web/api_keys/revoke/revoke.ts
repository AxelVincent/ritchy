import { logger } from '@ritchy/logger'
import type { Request, Response } from 'express'
import { revokeApiKey } from '../../../services/api_keys'
import type { RevokeApiKeyApiResponse } from './contract'
import { RevokeApiKeyParamsSchema } from './contract'

export const revokeApiKeyHandler = async (
  req: Request,
  res: Response<RevokeApiKeyApiResponse>,
): Promise<void> => {
  try {
    const { userId } = req.auth

    const parseResult = RevokeApiKeyParamsSchema.safeParse(req.params)
    if (!parseResult.success) {
      res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: 'Invalid API key ID',
          details: parseResult.error.flatten(),
        },
      })
      return
    }

    const { id } = parseResult.data

    const result = await revokeApiKey(id, userId)

    if (!result.success) {
      res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: result.error ?? 'API key not found',
        },
      })
      return
    }

    logger.info({
      msg: 'API key revoked',
      event: 'api_key_revoked',
      metadata: { userId, apiKeyId: id },
    })

    res.json({
      success: true,
      data: { id },
    })
  } catch (error) {
    logger.error({
      msg: 'Failed to revoke API key',
      event: 'api_key_revoke_error',
      metadata: { error },
    })

    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to revoke API key',
      },
    })
  }
}
