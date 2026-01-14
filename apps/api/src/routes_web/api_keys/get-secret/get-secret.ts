import { logger } from '@ritchy/logger'
import type { Request, Response } from 'express'
import { getApiKeySecret } from '../../../services/api_keys'
import type { GetApiKeySecretApiResponse } from './contract'

/**
 * Get the decrypted API key secret
 * GET /web/api-keys/:id/secret
 */
export const getApiKeySecretHandler = async (
  req: Request<{ id: string }>,
  res: Response<GetApiKeySecretApiResponse>,
): Promise<void> => {
  try {
    const userId = req.auth.userId
    const keyId = req.params.id

    const result = await getApiKeySecret(userId, keyId)

    if (!result.success) {
      res.status(404).json({
        success: false,
        error: result.error,
      })
      return
    }

    logger.info({
      msg: 'API key secret retrieved',
      event: 'api_key_secret_retrieved',
      metadata: { userId, keyId },
    })

    res.json({
      success: true,
      data: {
        key: result.key,
      },
    })
  } catch (error) {
    logger.error({
      msg: 'Failed to get API key secret',
      event: 'api_key_secret_error',
      metadata: {
        error: error instanceof Error ? error.message : String(error),
        userId: req.auth.userId,
        keyId: req.params.id,
      },
    })

    res.status(500).json({
      success: false,
      error: 'Failed to retrieve API key',
    })
  }
}
