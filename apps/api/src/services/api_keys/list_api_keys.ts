import { desc, eq } from 'drizzle-orm'
import { db } from '../../db/db'
import { apiKey } from '../../db/schema'
import { decryptApiKey } from './utils/encryption'

export type ApiKeyListItem = {
  id: string
  name: string
  keyPrefix: string
  isActive: boolean
  lastUsedAt: Date | null
  createdAt: Date
  revokedAt: Date | null
}

export const listApiKeys = async (
  userId: string,
): Promise<ApiKeyListItem[]> => {
  const keys = await db
    .select({
      id: apiKey.id,
      name: apiKey.name,
      encryptedKey: apiKey.encryptedKey,
      isActive: apiKey.isActive,
      lastUsedAt: apiKey.lastUsedAt,
      createdAt: apiKey.createdAt,
      revokedAt: apiKey.revokedAt,
    })
    .from(apiKey)
    .where(eq(apiKey.userId, userId))
    .orderBy(desc(apiKey.createdAt))

  // Derive prefix from decrypted key
  return keys.map((key) => {
    const decryptedKey = decryptApiKey(key.encryptedKey)
    return {
      id: key.id,
      name: key.name,
      keyPrefix: `${decryptedKey.substring(0, 16)}...`,
      isActive: key.isActive,
      lastUsedAt: key.lastUsedAt,
      createdAt: key.createdAt,
      revokedAt: key.revokedAt,
    }
  })
}
