import { logger } from '@ritchy/logger'
import { and, eq } from 'drizzle-orm'
import { db } from '../../../db/db'
import { enrichmentEmail } from '../../../db/schema/enrichment'
import { verifyWithMillionVerifier } from '../../../external/million_verifier'
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
          eq(enrichmentEmail.enrichmentId, enrichmentId),
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

    const verificationResult = await verifyWithMillionVerifier(normalizedEmail)

    if (
      verificationResult.result !== 'ok' &&
      verificationResult.result !== 'unknown'
    ) {
      logger.warn({
        msg: `[Verify and Insert Enrichment Email] Email not safe to save : ${normalizedEmail} - ${verificationResult.result}`,
        event: 'email_not_safe_to_save',
        metadata: {
          userPlaceId,
          enrichmentId,
          email: normalizedEmail,
          verificationResult,
        },
      })
      return
    }

    await insertEnrichmentEmail(
      enrichmentId,
      source,
      verificationResult.email,
      verificationResult.quality,
      verificationResult.result,
      verificationResult.free,
      verificationResult.role,
    )
  } catch (error) {
    logger.error({
      msg: 'Failed to verify and insert enrichment email',
      event: 'failed_to_verify_and_insert_enrichment_email',
      metadata: { userPlaceId, enrichmentId, email, error },
    })
    return
  }
}
