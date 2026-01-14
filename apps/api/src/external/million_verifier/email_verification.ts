import { logger } from '@ritchy/logger'
import { verifyWithMillionVerifier } from '.'
import type { EmailQuality, EmailResult } from '../../shared'

export interface EmailVerificationResult {
  email: string
  quality: EmailQuality
  result: EmailResult
  free: boolean
  role: boolean
}

/**
 * Shared utility to verify an email with Million Verifier
 * Returns verification result if email is safe to save, throws if not
 * @param email - The email to verify
 * @param context - The context of the email verification
 * @param safeToSave - Whether the email is safe to save
 * @returns The verification result
 */
export const verifyEmailForSaving = async (
  email: string,
  context: string,
  safeToSave: boolean,
): Promise<EmailVerificationResult> => {
  const normalizedEmail = email.toLowerCase().trim()

  const verificationResult = await verifyWithMillionVerifier(normalizedEmail)

  if (
    !safeToSave &&
    verificationResult.result !== 'ok' &&
    verificationResult.result !== 'unknown'
  ) {
    logger.warn({
      msg: `[${context}] Email not safe to save: ${normalizedEmail} - ${verificationResult.result}`,
      event: 'email_not_safe_to_save',
      metadata: {
        email: normalizedEmail,
        verificationResult,
        context,
      },
    })
    throw new Error(`Email not safe to save: ${verificationResult.result}`)
  }

  return {
    email: verificationResult.email,
    quality: verificationResult.quality,
    result: verificationResult.result,
    free: verificationResult.free,
    role: verificationResult.role,
  }
}
