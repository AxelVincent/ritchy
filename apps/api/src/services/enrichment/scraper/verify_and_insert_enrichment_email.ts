import { logger } from '@ritchy/logger'
import { and, eq } from 'drizzle-orm'
import { db } from '../../../db/db'
import { enrichmentEmail } from '../../../db/schema/enrichment'
import { verifyEmailForSaving } from '../../../external/million_verifier/email_verification'
import { insertEnrichmentEmail } from '../queries/insert_enrichment_email'

export const verifyAndInsertEnrichmentEmail = async (
  userPlaceId: string,
  enrichmentId: string,
  source: string,
  email: string,
): Promise<void> => {
  try {
    const normalizedEmail = email.toLowerCase().trim()
    const [existingEmail] = await db
      .select()
      .from(enrichmentEmail)
      .where(
        and(
          eq(enrichmentEmail.email, normalizedEmail),
          eq(enrichmentEmail.enrichment_id, enrichmentId),
        ),
      )
      .limit(1)

    if (existingEmail) {
      logger.debug({
        msg: `[Verify and Insert Enrichment Email] Email already exists and verified: ${normalizedEmail}`,
        event: 'email_already_exists',
        metadata: { userPlaceId, enrichmentId, email: normalizedEmail },
      })
      return
    }

    const verificationResult = await verifyEmailForSaving(
      normalizedEmail,
      'Verify and Insert Enrichment Email',
      false,
    )

    await insertEnrichmentEmail(
      enrichmentId,
      source,
      verificationResult.email,
      verificationResult.quality,
      verificationResult.result,
      verificationResult.free,
      verificationResult.role,
    )

    logger.debug({
      msg: `[Verify and Insert Enrichment Email] Email verified and inserted: ${verificationResult.email}`,
      event: 'enrichment_email_verified_and_inserted',
      metadata: { userPlaceId, enrichmentId, email: verificationResult.email },
    })
  } catch (error) {
    logger.error({
      msg: 'Failed to verify and insert enrichment email',
      event: 'failed_to_verify_and_insert_enrichment_email',
      metadata: { userPlaceId, enrichmentId, email, error },
    })
    return
  }
}
