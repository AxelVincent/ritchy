import crypto from 'node:crypto'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 16

/**
 * Get encryption key from environment
 * Must be 32 bytes (64 hex chars) for AES-256
 */
const getEncryptionKey = (): Buffer => {
  const key = process.env.API_KEY_ENCRYPTION_SECRET
  if (!key) {
    throw new Error('API_KEY_ENCRYPTION_SECRET environment variable is not set')
  }
  if (key.length !== 64) {
    throw new Error(
      'API_KEY_ENCRYPTION_SECRET must be 64 hex characters (32 bytes)',
    )
  }
  return Buffer.from(key, 'hex')
}

/**
 * Encrypt an API key for storage
 * Returns: iv:authTag:ciphertext (all hex encoded)
 */
export const encryptApiKey = (plainKey: string): string => {
  const key = getEncryptionKey()
  const iv = crypto.randomBytes(IV_LENGTH)

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv)
  let encrypted = cipher.update(plainKey, 'utf8', 'hex')
  encrypted += cipher.final('hex')

  const authTag = cipher.getAuthTag()

  // Format: iv:authTag:ciphertext
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`
}

/**
 * Decrypt an API key from storage
 */
export const decryptApiKey = (encryptedData: string): string => {
  const key = getEncryptionKey()

  const parts = encryptedData.split(':')
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted data format')
  }

  const [ivHex, authTagHex, ciphertext] = parts
  const iv = Buffer.from(ivHex, 'hex')
  const authTag = Buffer.from(authTagHex, 'hex')

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(authTag)

  let decrypted = decipher.update(ciphertext, 'hex', 'utf8')
  decrypted += decipher.final('utf8')

  return decrypted
}
