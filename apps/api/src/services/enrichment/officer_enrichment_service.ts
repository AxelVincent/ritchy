import { logger } from '@ritchy/logger'
import { UnrecoverableError } from 'bullmq'
import { eq } from 'drizzle-orm'
import { db } from '../../db/db'
import { enrichmentCompanyOfficer } from '../../db/schema'
import {
  INSUFFICIENT_CREDITS_ERROR,
  USER_CREDITS_NOT_FOUND_ERROR,
} from '../payment/queries/consume_credits'
import { refundCredits } from '../payment/queries/refund_credits'
import { OFFICER_CREDITS } from './constants'
import { runEmailWaterfallWithData } from './governmental_data/waterfalls/email_waterfall'
import { runLinkedInWaterfall } from './governmental_data/waterfalls/linkedin_waterfall'
import { runPhoneWaterfall } from './governmental_data/waterfalls/phone_waterfall'
import { getOfficerServiceContext } from './queries/get_officer_service_context'
import { setOfficerEnrichmentStatus } from './status_manager'

interface OfficerEnrichmentParams {
  officerId: string
  userPlaceId: string
  userId: string
}

interface OfficerEnrichmentResult {
  success: boolean
  officerId: string
  linkedinFound: boolean
  emailsFound: number
  phonesFound: number
}

/**
 * Officer enrichment service
 *
 * This service handles the enrichment of a single officer (contact).
 * It runs the LinkedIn, Email, and Phone waterfalls to find contact information.
 *
 * Called by the officer enrichment worker after company enrichment is complete.
 *
 * Flow:
 * 1. Fetch officer context (officer, company, place data)
 * 2. Run LinkedIn waterfall → enrichment_company_officer_linkedin
 * 3. Run Email waterfall → enrichment_company_officer_email
 * 4. Run Phone waterfall → enrichment_company_officer_phone
 * 5. Update officer enrichment status
 */
export const officerEnrichmentService = async ({
  officerId,
  userPlaceId,
  userId,
}: OfficerEnrichmentParams): Promise<OfficerEnrichmentResult> => {
  const startTime = Date.now()

  logger.info({
    msg: 'Starting officer enrichment service',
    event: 'officer_enrichment_service_start',
    metadata: { officerId, userPlaceId, userId },
  })

  try {
    // Step 1: Fetch officer context (0-10%)
    await setOfficerEnrichmentStatus(
      officerId,
      'processing',
      'Loading officer information',
      5,
    )

    const context = await getOfficerServiceContext(officerId)

    if (!context) {
      throw new Error(`Officer ${officerId} not found or missing context`)
    }

    // Check if already enriched
    const [existingOfficer] = await db
      .select({ enrichmentStatus: enrichmentCompanyOfficer.enrichmentStatus })
      .from(enrichmentCompanyOfficer)
      .where(eq(enrichmentCompanyOfficer.id, officerId))
      .limit(1)

    if (existingOfficer?.enrichmentStatus === 'completed') {
      logger.info({
        msg: 'Officer already enriched, skipping',
        event: 'officer_already_enriched',
        metadata: { officerId },
      })

      await setOfficerEnrichmentStatus(
        officerId,
        'completed',
        'Officer already enriched',
        100,
      )

      return {
        success: true,
        officerId,
        linkedinFound: false,
        emailsFound: 0,
        phonesFound: 0,
      }
    }

    // Mark as processing in database
    await db
      .update(enrichmentCompanyOfficer)
      .set({ enrichmentStatus: 'processing' })
      .where(eq(enrichmentCompanyOfficer.id, officerId))

    let linkedinFound = false
    let emailsFound = 0
    let phonesFound = 0

    // Step 2: LinkedIn enrichment (10-40%)
    await setOfficerEnrichmentStatus(
      officerId,
      'processing',
      'Finding professional profile',
      15,
    )

    try {
      const linkedinResult = await runLinkedInWaterfall(
        {
          officerId,
          officer: context.officer,
          company: context.company,
          place: context.place,
          userPlaceId,
        },
        60, // confidence threshold
      )

      linkedinFound = linkedinResult.status === 'success'

      await setOfficerEnrichmentStatus(
        officerId,
        'processing',
        linkedinFound ? 'Professional profile found' : 'No profile found',
        40,
      )

      logger.info({
        msg: 'LinkedIn waterfall completed',
        event: 'officer_linkedin_complete',
        metadata: {
          officerId,
          success: linkedinFound,
          status: linkedinResult.status,
          provider:
            linkedinResult.status === 'success'
              ? linkedinResult.provider
              : null,
        },
      })
    } catch (error) {
      logger.warn({
        msg: 'LinkedIn waterfall failed, continuing with other enrichments',
        event: 'officer_linkedin_failed',
        metadata: {
          officerId,
          error: error instanceof Error ? error.message : String(error),
        },
      })
    }

    // Step 3: Email enrichment (40-70%)
    await setOfficerEnrichmentStatus(
      officerId,
      'processing',
      'Searching for email addresses',
      45,
    )

    try {
      const emailResult = await runEmailWaterfallWithData({
        officerId,
        officer: context.officer,
        website: context.place.website,
        userPlaceId,
      })

      emailsFound =
        emailResult.status === 'success' && emailResult.data
          ? emailResult.data.length
          : 0

      await setOfficerEnrichmentStatus(
        officerId,
        'processing',
        emailsFound > 0
          ? `Found ${emailsFound} email${emailsFound > 1 ? 's' : ''}`
          : 'No emails found',
        70,
      )

      logger.info({
        msg: 'Email waterfall completed',
        event: 'officer_email_complete',
        metadata: {
          officerId,
          success: emailResult.status === 'success',
          emailsFound,
        },
      })
    } catch (error) {
      logger.warn({
        msg: 'Email waterfall failed, continuing with phone enrichment',
        event: 'officer_email_failed',
        metadata: {
          officerId,
          error: error instanceof Error ? error.message : String(error),
        },
      })
    }

    // Step 4: Phone enrichment (70-90%)
    await setOfficerEnrichmentStatus(
      officerId,
      'processing',
      'Looking up phone numbers',
      75,
    )

    try {
      const phoneResult = await runPhoneWaterfall({ officerId, userPlaceId })

      phonesFound = phoneResult.phonesFound

      await setOfficerEnrichmentStatus(
        officerId,
        'processing',
        phonesFound > 0
          ? `Found ${phonesFound} phone${phonesFound > 1 ? 's' : ''}`
          : 'No phones found',
        90,
      )

      logger.info({
        msg: 'Phone waterfall completed',
        event: 'officer_phone_complete',
        metadata: {
          officerId,
          success: phoneResult.success,
          phonesFound,
        },
      })
    } catch (error) {
      logger.warn({
        msg: 'Phone waterfall failed',
        event: 'officer_phone_failed',
        metadata: {
          officerId,
          error: error instanceof Error ? error.message : String(error),
        },
      })
    }

    // Step 5: Finalize (90-100%)
    await setOfficerEnrichmentStatus(
      officerId,
      'processing',
      'Saving enrichment results',
      95,
    )

    // Update officer record with completion status
    await db
      .update(enrichmentCompanyOfficer)
      .set({
        enrichmentStatus: 'completed',
        enrichedAt: new Date(),
      })
      .where(eq(enrichmentCompanyOfficer.id, officerId))

    await setOfficerEnrichmentStatus(
      officerId,
      'completed',
      'Officer enrichment completed',
      100,
    )

    const duration = Date.now() - startTime

    logger.info({
      msg: `Officer enrichment completed in ${duration / 1000} seconds`,
      event: 'officer_enrichment_service_completed',
      metadata: {
        officerId,
        userPlaceId,
        duration,
        linkedinFound,
        emailsFound,
        phonesFound,
      },
    })

    return {
      success: true,
      officerId,
      linkedinFound,
      emailsFound,
      phonesFound,
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)

    await setOfficerEnrichmentStatus(
      officerId,
      'failed',
      errorMessage || 'Officer enrichment failed',
      100,
      errorMessage,
    )

    // Update officer record with failed status
    await db
      .update(enrichmentCompanyOfficer)
      .set({ enrichmentStatus: 'failed' })
      .where(eq(enrichmentCompanyOfficer.id, officerId))

    logger.error({
      msg: 'Error in officer enrichment service',
      event: 'officer_enrichment_service_error',
      metadata: {
        officerId,
        userPlaceId,
        error:
          error instanceof Error
            ? {
                name: error.name,
                message: error.message,
                stack:
                  process.env.NODE_ENV === 'development'
                    ? error.stack
                    : undefined,
              }
            : error,
        timestamp: new Date().toISOString(),
      },
    })

    // If error is due to credit issues, don't refund
    if (
      error instanceof Error &&
      (error.message === INSUFFICIENT_CREDITS_ERROR ||
        error.message === USER_CREDITS_NOT_FOUND_ERROR)
    ) {
      logger.info({
        msg: 'No enrichment credits available',
        event: 'officer_enrichment_no_credits',
        metadata: { userId },
      })
      throw new UnrecoverableError(errorMessage)
    }

    // Refund credits on failure
    await refundCredits(userId, OFFICER_CREDITS)

    throw new UnrecoverableError(errorMessage)
  }
}
