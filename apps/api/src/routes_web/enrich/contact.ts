import { logger } from '@ritchy/logger'
import { eq } from 'drizzle-orm'
import type { Request, Response } from 'express'
import { z } from 'zod'
import { db } from '../../db/db'
import { contact } from '../../db/schema'
import { enqueueContactEnrichment } from '../../internal/bullmq/jobs/enrichment-contact/queue'
import { MAX_CONTACT_CREDITS } from '../../services/enrichment/constants'
import { getContactWithAccess } from '../../services/enrichment/queries/get_contact_with_access'
import { setContactEnrichmentStatus } from '../../services/enrichment/status_manager'
import { consumeCredits } from '../../services/payment/queries/consume_credits'

const EnrichContactBodySchema = z.object({
  contactId: z.string().uuid(),
})

export interface EnrichContactResponse {
  success: boolean
  message: string
  contactId?: string
  alreadyEnriched?: boolean
  credits: number
}

/**
 * Contact enrichment endpoint
 *
 * Enqueues a contact for enrichment (LinkedIn, Email, Phone).
 * Requires company enrichment to be completed first.
 *
 * Credits are charged per result:
 * - LinkedIn: 0.5 credits
 * - Email: 1 credit each
 * - Phone: 4 credits each
 *
 * We reserve MAX_CONTACT_CREDITS (5.5) upfront and refund/charge
 * the difference based on actual results.
 *
 * POST /enrich/contact
 * Body: { contactId: string }
 */
export const enrichContact = async (
  req: Request<
    Record<string, never>,
    EnrichContactResponse,
    { contactId: string }
  >,
  res: Response<EnrichContactResponse>,
): Promise<void> => {
  try {
    const { contactId } = EnrichContactBodySchema.parse(req.body)
    const userId = req.auth.userId

    logger.info({
      msg: 'Processing contact enrichment request',
      event: 'contact_enrichment_request',
      metadata: { userId, contactId },
    })

    // Get contact and verify user has access
    const contactData = await getContactWithAccess(contactId, userId)

    if (!contactData) {
      res.status(404).json({
        success: false,
        message: 'Contact not found or access denied',
        credits: 0,
      })
      return
    }

    // Check if already enriched
    if (contactData.enrichmentStatus === 'completed') {
      res.json({
        success: true,
        message: 'Contact already enriched',
        contactId,
        alreadyEnriched: true,
        credits: 0,
      })
      return
    }

    // Check if already in progress
    if (
      contactData.enrichmentStatus === 'queued' ||
      contactData.enrichmentStatus === 'processing'
    ) {
      res.json({
        success: true,
        message: 'Contact enrichment already in progress',
        contactId,
        alreadyEnriched: false,
        credits: 0,
      })
      return
    }

    // Check if company enrichment is done (new multi-worker status OR legacy success)
    const isCompanyEnriched =
      contactData.companyStatus === 'completed' ||
      contactData.legacySuccess === true
    if (!isCompanyEnriched) {
      res.status(400).json({
        success: false,
        message: 'Company enrichment must be completed first',
        credits: 0,
      })
      return
    }

    // Reserve credits upfront (will be refunded/charged based on results)
    await consumeCredits(userId, MAX_CONTACT_CREDITS)

    // Update contact status to queued
    await db
      .update(contact)
      .set({ enrichmentStatus: 'queued' })
      .where(eq(contact.id, contactId))

    // Update status and queue
    await setContactEnrichmentStatus(contactId, 'queued', 'Waiting to start', 0)

    await enqueueContactEnrichment({
      contactId,
      userPlaceId: contactData.userPlaceId,
      userId,
      reservedCredits: MAX_CONTACT_CREDITS,
    })

    logger.info({
      msg: 'Contact enrichment job enqueued',
      event: 'contact_enrichment_enqueued',
      metadata: {
        userId,
        contactId,
        userPlaceId: contactData.userPlaceId,
      },
    })

    res.json({
      success: true,
      message: 'Contact enrichment queued',
      contactId,
      alreadyEnriched: false,
      credits: MAX_CONTACT_CREDITS,
    })
  } catch (error) {
    logger.error({
      msg: 'Contact enrichment request failed',
      event: 'contact_enrichment_error',
      metadata: {
        error: error instanceof Error ? error.message : String(error),
        userId: req.auth.userId,
      },
    })

    res.status(500).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : 'Failed to enqueue contact enrichment',
      credits: 0,
    })
  }
}
