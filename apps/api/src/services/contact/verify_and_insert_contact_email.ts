import { logger } from '@ritchy/logger'
import { and, eq } from 'drizzle-orm'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import { db } from '../../db/db'
import type * as schema from '../../db/schema'
import { contactEmail } from '../../db/schema/contact'
import { verifyEmailForSaving } from '../../external/million_verifier/email_verification'
import type { Email } from '../../shared'
import { insertContactEmail } from './queries/insert_contact_email'

export const verifyAndInsertContactEmail = async (
  contactId: string,
  source: string,
  email: string,
  isPrimary = false,
  tx?: PostgresJsDatabase<typeof schema>,
): Promise<Email | null> => {
  try {
    const dbOrTx = tx ?? db
    const normalizedEmail = email.toLowerCase().trim()

    const [existingEmail] = await dbOrTx
      .select()
      .from(contactEmail)
      .where(
        and(
          eq(contactEmail.email, normalizedEmail),
          eq(contactEmail.contact_id, contactId),
        ),
      )
      .limit(1)

    if (existingEmail) {
      logger.debug({
        msg: `[Verify and Insert Contact Email] Email already exists: ${normalizedEmail}`,
        event: 'contact_email_already_exists',
        metadata: { contactId, email: normalizedEmail },
      })
      return {
        id: existingEmail.id,
        email: existingEmail.email,
        isPrimary: existingEmail.is_primary,
        contactId: existingEmail.contact_id,
        isVerified: existingEmail.is_verified,
        createdAt: existingEmail.created_at,
        updatedAt: existingEmail.updated_at,
        source: existingEmail.source,
        quality: existingEmail.quality,
        result: existingEmail.result,
        role: existingEmail.role,
        free: existingEmail.free,
      }
    }

    const verificationResult = await verifyEmailForSaving(
      normalizedEmail,
      'Verify and Insert Contact Email',
      true,
    )

    const contactEmailResult = await insertContactEmail(
      contactId,
      source,
      verificationResult.email,
      verificationResult.quality,
      verificationResult.result,
      verificationResult.free,
      verificationResult.role,
      isPrimary,
      tx,
    )

    logger.debug({
      msg: `[Verify and Insert Contact Email] Email verified and inserted: ${verificationResult.email}`,
      event: 'contact_email_verified_and_inserted',
      metadata: { contactId, email: verificationResult.email, isPrimary },
    })

    return contactEmailResult
  } catch (error) {
    logger.error({
      msg: 'Failed to verify and insert contact email',
      event: 'failed_to_verify_and_insert_contact_email',
      metadata: { contactId, email, error },
    })
    return null
  }
}
