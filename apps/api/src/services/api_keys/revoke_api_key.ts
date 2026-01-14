import { and, eq } from 'drizzle-orm'
import { db } from '../../db/db'
import { apiKey } from '../../db/schema'

export type RevokeApiKeyResult = {
  success: boolean
  error?: string
}

export const revokeApiKey = async (
  apiKeyId: string,
  userId: string,
): Promise<RevokeApiKeyResult> => {
  const result = await db
    .update(apiKey)
    .set({
      isActive: false,
      revokedAt: new Date(),
    })
    .where(and(eq(apiKey.id, apiKeyId), eq(apiKey.userId, userId)))
    .returning({ id: apiKey.id })

  if (result.length === 0) {
    return {
      success: false,
      error: 'API key not found or already revoked',
    }
  }

  return { success: true }
}
