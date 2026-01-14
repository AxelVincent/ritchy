import { logger } from '@ritchy/logger'
import type { Request, Response } from 'express'
import { listApiKeys } from '../../../services/api_keys'
import type { ListApiKeysApiResponse } from './contract'

export const listApiKeysHandler = async (
  req: Request,
  res: Response<ListApiKeysApiResponse>,
): Promise<void> => {
  try {
    const { userId } = req.auth

    const keys = await listApiKeys(userId)

    res.json({
      success: true,
      data: keys.map((key) => ({
        id: key.id,
        name: key.name,
        prefix: `${key.keyPrefix}...`,
        isActive: key.isActive,
        lastUsedAt: key.lastUsedAt?.toISOString() ?? null,
        createdAt: key.createdAt.toISOString(),
        revokedAt: key.revokedAt?.toISOString() ?? null,
      })),
    })
  } catch (error) {
    logger.error({
      msg: 'Failed to list API keys',
      event: 'api_key_list_error',
      metadata: { error },
    })

    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to list API keys',
      },
    })
  }
}
