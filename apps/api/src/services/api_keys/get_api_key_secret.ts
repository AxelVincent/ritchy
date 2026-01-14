import { and, eq } from 'drizzle-orm'
import { db } from '../../db/db'
import { apiKey } from '../../db/schema'
import { decryptApiKey } from './utils/encryption'

export type GetApiKeySecretResult =
  | { success: true; key: string }
  | { success: false; error: string }

/**
 * Get the decrypted API key for a given key ID
 * Only returns the key if it belongs to the user and is active
 */
export const getApiKeySecret = async (
  userId: string,
  keyId: string,
): Promise<GetApiKeySecretResult> => {
  // Fetch the key record
  const [keyRecord] = await db
    .select({
      encryptedKey: apiKey.encryptedKey,
      isActive: apiKey.isActive,
    })
    .from(apiKey)
    .where(and(eq(apiKey.id, keyId), eq(apiKey.userId, userId)))
    .limit(1)

  if (!keyRecord) {
    return { success: false, error: 'API key not found' }
  }

  if (!keyRecord.isActive) {
    return { success: false, error: 'API key has been revoked' }
  }

  try {
    const decryptedKey = decryptApiKey(keyRecord.encryptedKey)
    return { success: true, key: decryptedKey }
  } catch {
    return { success: false, error: 'Failed to decrypt API key' }
  }
}
