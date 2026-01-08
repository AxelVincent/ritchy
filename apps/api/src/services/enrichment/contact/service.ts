import { logger } from '@ritchy/logger'
import type { ContactEnrichmentResponse } from '@ritchy/types'
import { UnrecoverableError } from 'bullmq'
import { eq } from 'drizzle-orm'
import { db } from '../../../db/db'
import { contact, enrichmentCompanyOfficer } from '../../../db/schema'
import { startEnrichmentTracking } from '../../../metrics/enrichment'
import { insertContactEmails } from '../../contact/queries/insert_contact_emails'
import { insertContactLinkedin } from '../../contact/queries/insert_contact_linkedin'
import { insertContactPhones } from '../../contact/queries/insert_contact_phones'
import {
  INSUFFICIENT_CREDITS_ERROR,
  USER_CREDITS_NOT_FOUND_ERROR,
  consumeCredits,
} from '../../payment/queries/consume_credits'
import { refundCredits } from '../../payment/queries/refund_credits'
import { calculateContactCredits } from '../shared/config/calculate_contact_credits'
import { MAX_CONTACT_CREDITS } from '../shared/config/constants'
import { setContactEnrichmentStatus } from '../shared/status/status_manager'
import { getEnrichmentCompanyOfficerEmails } from './queries/get_enrichment_company_officer_emails'
import { getEnrichmentCompanyOfficerPhones } from './queries/get_enrichment_company_officer_phones'
import { getFullContactEnrichmentData } from './queries/get_full_contact_enrichment_data'
import { getOfficerServiceContext } from './queries/get_officer_service_context'
import { runEmailWaterfallWithData } from './waterfalls/email'
import { runLinkedInWaterfall } from './waterfalls/linkedin'
import { runPhoneWaterfall } from './waterfalls/phone'

interface ContactEnrichmentParams {
  contactId: string
  userPlaceId: string
  userId: string
}

/**
 * Contact enrichment service
 *
 * This service handles the enrichment of a single contact.
 * It runs the LinkedIn, Email, and Phone waterfalls to find contact information.
 *
 * The contact must be linked to an enrichment_company_officer record.
 * The waterfalls use the officer context to find contact details.
 *
 * Called by the contact enrichment worker after company enrichment is complete.
 *
 * Flow:
 * 1. Fetch contact and associated officer context
 * 2. Run LinkedIn waterfall → enrichment_company_officer_linkedin + contact.linkedinUrl
 * 3. Run Email waterfall → enrichment_company_officer_email + contact_email
 * 4. Run Phone waterfall → enrichment_company_officer_phone + contact_phone
 * 5. Update contact enrichment status
 *
 * Returns rich data including all enrichment results for external API use.
 * Idempotent - returns cached data if already enriched.
 */
export const contactEnrichmentService = async ({
  contactId,
  userPlaceId,
  userId,
}: ContactEnrichmentParams): Promise<ContactEnrichmentResponse> => {
  const startTime = Date.now()

  logger.info({
    msg: 'Starting contact enrichment service',
    event: 'contact_enrichment_service_start',
    metadata: { contactId, userPlaceId, userId },
  })

  // Initialize tracker for contact enrichment
  const enrichmentTracker = startEnrichmentTracking('contact', false)

  // Reserve credits upfront (will be refunded/charged based on actual results)
  const reservedCredits = MAX_CONTACT_CREDITS
  await consumeCredits(userId, reservedCredits)

  try {
    // Step 1: Fetch contact and get officer context (0-10%)
    await setContactEnrichmentStatus(
      contactId,
      'processing',
      'Loading contact information',
      5,
    )

    // Get the contact to find the associated officer
    const [contactRecord] = await db
      .select({
        id: contact.id,
        officerId: contact.officerId,
        enrichmentStatus: contact.enrichmentStatus,
      })
      .from(contact)
      .where(eq(contact.id, contactId))
      .limit(1)

    if (!contactRecord) {
      throw new Error(`Contact ${contactId} not found`)
    }

    if (!contactRecord.officerId) {
      throw new Error(`Contact ${contactId} has no associated officer`)
    }

    // Check if already enriched
    if (contactRecord.enrichmentStatus === 'completed') {
      logger.info({
        msg: 'Contact already enriched, returning cached data',
        event: 'contact_already_enriched',
        metadata: { contactId },
      })

      // Refund all reserved credits since no enrichment was done
      if (reservedCredits > 0) {
        await refundCredits(userId, reservedCredits)
      }

      await setContactEnrichmentStatus(
        contactId,
        'completed',
        'Contact already enriched',
        100,
      )

      // Mark as success (cached) since we're returning early
      enrichmentTracker.markSuccess()

      const data = await getFullContactEnrichmentData(
        contactRecord.officerId,
        contactId,
      )
      return {
        success: true,
        alreadyEnriched: true,
        data,
      }
    }

    const officerId = contactRecord.officerId

    // Get officer context for waterfalls
    const context = await getOfficerServiceContext(officerId)

    if (!context) {
      throw new Error(`Officer ${officerId} not found or missing context`)
    }

    // Mark as processing in database
    await db
      .update(contact)
      .set({ enrichmentStatus: 'processing' })
      .where(eq(contact.id, contactId))

    await db
      .update(enrichmentCompanyOfficer)
      .set({ enrichmentStatus: 'processing' })
      .where(eq(enrichmentCompanyOfficer.id, officerId))

    let linkedinFound = false
    let emailsFound = 0
    let phonesFound = 0

    // Step 2: LinkedIn enrichment (10-40%)
    await setContactEnrichmentStatus(
      contactId,
      'processing',
      'Finding professional profile',
      15,
    )

    try {
      const linkedinResult = await enrichmentTracker.trackSubprocess(
        'linkedin_waterfall',
        async () =>
          runLinkedInWaterfall(
            {
              officerId,
              officer: context.officer,
              company: context.company,
              place: context.place,
              userPlaceId,
            },
            60, // confidence threshold
          ),
      )

      linkedinFound = linkedinResult.status === 'success'

      // Update contact's linkedinUrl and insert into contact_linkedin if found
      if (
        linkedinFound &&
        linkedinResult.status === 'success' &&
        linkedinResult.data
      ) {
        await db
          .update(contact)
          .set({ linkedinUrl: linkedinResult.data.profileUrl })
          .where(eq(contact.id, contactId))

        // Insert into contact_linkedin table
        await insertContactLinkedin({
          contactId,
          profileUrl: linkedinResult.data.profileUrl,
          confidence: linkedinResult.data.confidence,
          reasoning: linkedinResult.data.reasoning ?? null,
          source:
            linkedinResult.data.source ?? linkedinResult.provider ?? 'unknown',
        })
      }

      await setContactEnrichmentStatus(
        contactId,
        'processing',
        linkedinFound ? 'Professional profile found' : 'No profile found',
        40,
      )

      logger.info({
        msg: 'LinkedIn waterfall completed',
        event: 'contact_linkedin_complete',
        metadata: {
          contactId,
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
        event: 'contact_linkedin_failed',
        metadata: {
          contactId,
          officerId,
          error: error instanceof Error ? error.message : String(error),
        },
      })
    }

    // Step 3: Email enrichment (40-70%)
    await setContactEnrichmentStatus(
      contactId,
      'processing',
      'Searching for email addresses',
      45,
    )

    try {
      const emailResult = await enrichmentTracker.trackSubprocess(
        'email_waterfall',
        async () =>
          runEmailWaterfallWithData({
            officerId,
            officer: context.officer,
            website: context.place.website,
            userPlaceId,
          }),
      )

      emailsFound =
        emailResult.status === 'success' && emailResult.data
          ? emailResult.data.length
          : 0

      // Copy emails from enrichment_company_officer_email to contact_email
      if (emailsFound > 0) {
        const officerEmails = await getEnrichmentCompanyOfficerEmails(officerId)
        if (officerEmails.length > 0) {
          await insertContactEmails(
            officerEmails.map((email) => ({
              id: undefined as unknown as string, // Will be auto-generated
              contact_id: contactId,
              email: email.email,
              is_primary: false,
              is_verified: email.is_verified,
              source: email.source,
              quality: email.quality,
              result: email.result,
              role: email.role,
              free: email.free,
              created_at: new Date(),
              updated_at: new Date(),
            })),
          )
        }
      }

      await setContactEnrichmentStatus(
        contactId,
        'processing',
        emailsFound > 0
          ? `Found ${emailsFound} email${emailsFound > 1 ? 's' : ''}`
          : 'No emails found',
        70,
      )

      logger.info({
        msg: 'Email waterfall completed',
        event: 'contact_email_complete',
        metadata: {
          contactId,
          officerId,
          success: emailResult.status === 'success',
          emailsFound,
        },
      })
    } catch (error) {
      logger.warn({
        msg: 'Email waterfall failed, continuing with phone enrichment',
        event: 'contact_email_failed',
        metadata: {
          contactId,
          officerId,
          error: error instanceof Error ? error.message : String(error),
        },
      })
    }

    // Step 4: Phone enrichment (70-90%)
    await setContactEnrichmentStatus(
      contactId,
      'processing',
      'Looking up phone numbers',
      75,
    )

    try {
      const phoneResult = await enrichmentTracker.trackSubprocess(
        'phone_waterfall',
        async () => runPhoneWaterfall({ officerId, userPlaceId }),
      )

      phonesFound = phoneResult.phonesFound

      // Copy phones from enrichment_company_officer_phone to contact_phone
      if (phonesFound > 0) {
        const officerPhones = await getEnrichmentCompanyOfficerPhones(officerId)
        if (officerPhones.length > 0) {
          await insertContactPhones(
            contactId,
            officerPhones.map((phone) => ({
              phone: phone.phone,
              type: 'FIXED_LINE_OR_MOBILE' as const,
            })),
          )
        }
      }

      await setContactEnrichmentStatus(
        contactId,
        'processing',
        phonesFound > 0
          ? `Found ${phonesFound} phone${phonesFound > 1 ? 's' : ''}`
          : 'No phones found',
        90,
      )

      logger.info({
        msg: 'Phone waterfall completed',
        event: 'contact_phone_complete',
        metadata: {
          contactId,
          officerId,
          success: phoneResult.success,
          phonesFound,
        },
      })
    } catch (error) {
      logger.warn({
        msg: 'Phone waterfall failed',
        event: 'contact_phone_failed',
        metadata: {
          contactId,
          officerId,
          error: error instanceof Error ? error.message : String(error),
        },
      })
    }

    // Step 5: Finalize (90-100%)
    await setContactEnrichmentStatus(
      contactId,
      'processing',
      'Saving enrichment results',
      95,
    )

    // Calculate actual credits based on results
    const creditsBreakdown = calculateContactCredits({
      linkedinFound,
      emailsFound,
      phonesFound,
    })

    // Handle credit difference
    const creditDiff = reservedCredits - creditsBreakdown.total

    if (creditDiff > 0) {
      // Refund unused credits
      await refundCredits(userId, creditDiff)
      logger.info({
        msg: 'Refunding unused credits',
        event: 'contact_enrichment_credits_refunded',
        metadata: {
          contactId,
          reservedCredits,
          actualCredits: creditsBreakdown.total,
          refunded: creditDiff,
        },
      })
    } else if (creditDiff < 0) {
      // Charge additional credits (found more than expected)
      try {
        await consumeCredits(userId, Math.abs(creditDiff))
        logger.info({
          msg: 'Charging additional credits for extra results',
          event: 'contact_enrichment_credits_additional',
          metadata: {
            contactId,
            reservedCredits,
            actualCredits: creditsBreakdown.total,
            additionalCharged: Math.abs(creditDiff),
          },
        })
      } catch (error) {
        // User doesn't have enough credits for additional charge
        // Log warning but don't fail - they already got the data
        logger.warn({
          msg: 'Could not charge additional credits, user may have insufficient balance',
          event: 'contact_enrichment_credits_additional_failed',
          metadata: {
            contactId,
            reservedCredits,
            actualCredits: creditsBreakdown.total,
            additionalNeeded: Math.abs(creditDiff),
            error: error instanceof Error ? error.message : String(error),
          },
        })
      }
    }

    // Update contact record with completion status
    await db
      .update(contact)
      .set({
        enrichmentStatus: 'completed',
        enrichedAt: new Date(),
      })
      .where(eq(contact.id, contactId))

    // Update officer record with completion status
    await db
      .update(enrichmentCompanyOfficer)
      .set({
        enrichmentStatus: 'completed',
        enrichedAt: new Date(),
      })
      .where(eq(enrichmentCompanyOfficer.id, officerId))

    await setContactEnrichmentStatus(
      contactId,
      'completed',
      'Contact enrichment completed',
      100,
      undefined,
      {
        creditsUsed: creditsBreakdown.total,
        creditsBreakdown: {
          linkedin: creditsBreakdown.linkedin,
          emails: creditsBreakdown.emails,
          phones: creditsBreakdown.phones,
        },
      },
    )

    // Mark enrichment as successful for metrics
    enrichmentTracker.markSuccess()

    const duration = Date.now() - startTime

    logger.info({
      msg: `Contact enrichment completed in ${duration / 1000} seconds`,
      event: 'contact_enrichment_service_completed',
      metadata: {
        contactId,
        officerId,
        userPlaceId,
        duration,
        linkedinFound,
        emailsFound,
        phonesFound,
        creditsUsed: creditsBreakdown.total,
        creditsBreakdown,
      },
    })

    const data = await getFullContactEnrichmentData(officerId, contactId)
    if (data) {
      data.credits = {
        used: creditsBreakdown.total,
        breakdown: {
          linkedin: creditsBreakdown.linkedin,
          emails: creditsBreakdown.emails,
          phones: creditsBreakdown.phones,
        },
      }
    }
    return {
      success: true,
      alreadyEnriched: false,
      data,
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)

    await setContactEnrichmentStatus(
      contactId,
      'failed',
      errorMessage || 'Contact enrichment failed',
      100,
      errorMessage,
    )

    // Mark enrichment as failed for metrics
    enrichmentTracker.markFailure(error)

    // Update contact record with failed status
    await db
      .update(contact)
      .set({ enrichmentStatus: 'failed' })
      .where(eq(contact.id, contactId))

    logger.error({
      msg: 'Error in contact enrichment service',
      event: 'contact_enrichment_service_error',
      metadata: {
        contactId,
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
        event: 'contact_enrichment_no_credits',
        metadata: { userId },
      })
      throw new UnrecoverableError(errorMessage)
    }

    // Refund all reserved credits on failure
    if (reservedCredits > 0) {
      await refundCredits(userId, reservedCredits)
    }

    throw new UnrecoverableError(errorMessage)
  }
}
