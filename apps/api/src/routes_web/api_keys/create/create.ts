import { logger } from '@ritchy/logger'
import type { Request, Response } from 'express'
import { generateApiKey } from '../../../services/api_keys'
import type { CreateApiKeyApiResponse, CreateApiKeyRequest } from './contract'
import { CreateApiKeyRequestSchema } from './contract'

export const createApiKeyHandler = async (
  req: Request<
    Record<string, never>,
    CreateApiKeyApiResponse,
    CreateApiKeyRequest
  >,
  res: Response<CreateApiKeyApiResponse>,
): Promise<void> => {
  try {
    const { userId } = req.auth

    const parseResult = CreateApiKeyRequestSchema.safeParse(req.body)
    if (!parseResult.success) {
      res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: 'Invalid request body',
          details: parseResult.error.flatten(),
        },
      })
      return
    }

    const { name } = parseResult.data

    const result = await generateApiKey(userId, name)

    logger.info({
      msg: 'API key created',
      event: 'api_key_created',
      metadata: { userId, apiKeyId: result.id, name },
    })

    res.status(201).json({
      success: true,
      data: {
        id: result.id,
        key: result.key, // Full key shown only once
        name: result.name,
      },
    })
  } catch (error) {
    logger.error({
      msg: 'Failed to create API key',
      event: 'api_key_create_error',
      metadata: {
        error: error instanceof Error ? error.message : String(error),
      },
    })

    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to create API key',
      },
    })
  }
}
