import crypto from 'node:crypto'
import { logger } from '@ritchy/logger'
import { and, eq } from 'drizzle-orm'
import { db } from '../../db/db'
import { apiKey } from '../../db/schema'

export type ValidateApiKeyResult = {
  valid: boolean
  userId?: string
  apiKeyId?: string
  error?: string
}

export const validateApiKey = async (
  token: string,
): Promise<ValidateApiKeyResult> => {
  // Validate key format (only live keys supported)
  if (!token.startsWith('rk_')) {
    return {
      valid: false,
      error: 'Invalid API key format. Keys must start with rk_',
    }
  }

  // Hash the provided key
  const keyHash = crypto.createHash('sha256').update(token).digest('hex')

  // Look up key
  const [keyRecord] = await db
    .select({
      id: apiKey.id,
      userId: apiKey.userId,
      isActive: apiKey.isActive,
    })
    .from(apiKey)
    .where(and(eq(apiKey.keyHash, keyHash), eq(apiKey.isActive, true)))
    .limit(1)

  if (!keyRecord) {
    return {
      valid: false,
      error: 'Invalid or revoked API key',
    }
  }

  // Update last used timestamp (fire and forget)
  db.update(apiKey)
    .set({ lastUsedAt: new Date() })
    .where(eq(apiKey.id, keyRecord.id))
    .catch((err) => {
      logger.warn({
        msg: 'Failed to update API key last used',
        event: 'api_key_last_used_update_failed',
        metadata: { apiKeyId: keyRecord.id, error: err },
      })
    })

  return {
    valid: true,
    userId: keyRecord.userId,
    apiKeyId: keyRecord.id,
  }
}
