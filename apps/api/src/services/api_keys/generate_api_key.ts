import crypto from 'node:crypto'
import { db } from '../../db/db'
import { apiKey } from '../../db/schema'
import { encryptApiKey } from './utils/encryption'

const API_KEY_PREFIX = 'rk_'

export type GenerateApiKeyResult = {
  id: string
  key: string // Full key (returned once on creation)
  name: string
}

export const generateApiKey = async (
  userId: string,
  name: string,
): Promise<GenerateApiKeyResult> => {
  // Generate 32 random bytes = 64 hex chars
  const randomBytes = crypto.randomBytes(32).toString('hex')

  // Create prefixed key: rk_<64 hex chars>
  const fullKey = `${API_KEY_PREFIX}${randomBytes}`

  // Hash for validation (fast lookup)
  const keyHash = crypto.createHash('sha256').update(fullKey).digest('hex')

  // Encrypt for storage (can be retrieved later)
  const encryptedKey = encryptApiKey(fullKey)

  // Store in database
  const [created] = await db
    .insert(apiKey)
    .values({
      userId,
      keyHash,
      encryptedKey,
      name,
    })
    .returning({ id: apiKey.id })

  return {
    id: created.id,
    key: fullKey,
    name,
  }
}
