import { logger } from '@ritchy/logger'
import { eq } from 'drizzle-orm'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import { db } from '../../../../db/db'
import { contact } from '../../../../db/schema'
import type * as schema from '../../../../db/schema'
import { getManualContactEnrichmentContext } from '../queries/get_manual_contact_enrichment_context'
import { runContactEmailWaterfall } from '../waterfalls/email/contact_email_waterfall'
import { runContactLinkedInWaterfall } from '../waterfalls/linkedin/contact_linkedin_waterfall'
import { runContactPhoneWaterfall } from '../waterfalls/phone/contact_phone_waterfall'

interface EnrichManualContactParams {
  contactId: string
  tx?: PostgresJsDatabase<typeof schema>
}

interface EnrichManualContactResult {
  success: boolean
  contactId: string
  linkedinFound: boolean
  emailsFound: number
  phonesFound: number
}

/**
 * Enriches a manual (user-created) contact.
 * Stores data directly in contact_* tables.
 * No population step needed (unlike officer contacts).
 */
export const enrichManualContact = async ({
  contactId,
  tx,
}: EnrichManualContactParams): Promise<EnrichManualContactResult> => {
  const database = tx ?? db

  logger.info({
    msg: '[enrich_manual_contact] Starting manual contact enrichment',
    event: 'manual_contact_enrichment_start',
    metadata: { contactId },
  })

  // Get manual contact context
  const context = await getManualContactEnrichmentContext(contactId, tx)
  if (!context) {
    throw new Error('Contact not found or is an officer contact')
  }

  // Check if already enriched
  if (context.contact.enrichmentStatus === 'completed') {
    logger.info({
      msg: '[enrich_manual_contact] Contact already enriched',
      event: 'manual_contact_already_enriched',
      metadata: { contactId },
    })

    return {
      success: true,
      contactId,
      linkedinFound: false,
      emailsFound: 0,
      phonesFound: 0,
    }
  }

  // Mark as processing
  await database
    .update(contact)
    .set({ enrichmentStatus: 'processing', updatedAt: new Date() })
    .where(eq(contact.id, contactId))

  const person = {
    firstName: context.contact.firstName,
    lastName: context.contact.lastName,
  }

  let linkedinFound = false
  let emailsFound = 0
  let phonesFound = 0

  try {
    // 1. LinkedIn enrichment → contact_linkedin (skips if linkedinUrl provided)
    const linkedinResult = await runContactLinkedInWaterfall(
      {
        contactId,
        existingLinkedinUrl: context.contact.linkedinUrl,
        person,
        place: context.place,
      },
      60,
      tx,
    )
    linkedinFound = linkedinResult.status === 'success'

    logger.info({
      msg: '[enrich_manual_contact] LinkedIn waterfall completed',
      event: 'manual_linkedin_waterfall_complete',
      metadata: {
        contactId,
        success: linkedinFound,
        status: linkedinResult.status,
      },
    })

    // 2. Email enrichment → contact_email
    const emailResult = await runContactEmailWaterfall(
      {
        contactId,
        person,
        website: context.place.website,
      },
      tx,
    )
    emailsFound =
      emailResult.status === 'success' && emailResult.data
        ? emailResult.data.length
        : 0

    logger.info({
      msg: '[enrich_manual_contact] Email waterfall completed',
      event: 'manual_email_waterfall_complete',
      metadata: {
        contactId,
        success: emailResult.status === 'success',
        emailsFound,
      },
    })

    // 3. Phone enrichment → contact_phone
    const phoneResult = await runContactPhoneWaterfall({
      contactId,
      person,
    })
    phonesFound = phoneResult.phonesFound

    logger.info({
      msg: '[enrich_manual_contact] Phone waterfall completed',
      event: 'manual_phone_waterfall_complete',
      metadata: {
        contactId,
        success: phoneResult.success,
        phonesFound,
      },
    })

    // Mark as completed
    await database
      .update(contact)
      .set({
        enrichmentStatus: 'completed',
        enrichedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(contact.id, contactId))

    logger.info({
      msg: '[enrich_manual_contact] Manual contact enrichment completed',
      event: 'manual_contact_enrichment_complete',
      metadata: {
        contactId,
        linkedinFound,
        emailsFound,
        phonesFound,
      },
    })

    return {
      success: true,
      contactId,
      linkedinFound,
      emailsFound,
      phonesFound,
    }
  } catch (error) {
    // Mark as failed
    await database
      .update(contact)
      .set({ enrichmentStatus: 'failed', updatedAt: new Date() })
      .where(eq(contact.id, contactId))

    logger.error({
      msg: '[enrich_manual_contact] Manual contact enrichment failed',
      event: 'manual_contact_enrichment_failed',
      metadata: {
        contactId,
        error: error instanceof Error ? error.message : String(error),
      },
    })

    throw error
  }
}
