import { logger } from '@ritchy/logger'
import { eq } from 'drizzle-orm'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import { db } from '../../db/db'
import { contact } from '../../db/schema'
import type * as schema from '../../db/schema'
import { insertContactEmails } from '../contact/queries/insert_contact_emails'
import { insertContactLinkedin } from '../contact/queries/insert_contact_linkedin'
import { insertContactPhones } from '../contact/queries/insert_contact_phones'
import { runEmailWaterfallWithData } from './governmental_data/waterfalls/email_waterfall'
import { runLinkedInWaterfall } from './governmental_data/waterfalls/linkedin_waterfall'
import { runPhoneWaterfall } from './governmental_data/waterfalls/phone_waterfall'
import { getEnrichmentCompanyOfficerEmails } from './queries/get_enrichment_company_officer_emails'
import { getEnrichmentCompanyOfficerPhones } from './queries/get_enrichment_company_officer_phones'
import { getOfficersEnrichmentContext } from './queries/get_officers_enrichment_context'

interface EnrichOfficerContactParams {
  contactId: string
  officerId: string
  companyId: string
  tx?: PostgresJsDatabase<typeof schema>
}

interface EnrichOfficerContactResult {
  success: boolean
  contactId: string
  officerId: string
  linkedinFound: boolean
  emailsFound: number
  phonesFound: number
}

/**
 * Enriches an officer-based contact (Pappers).
 * Stores data in enrichment_company_officer_* tables and copies to contact_* tables.
 */
export const enrichOfficerContact = async ({
  contactId,
  officerId,
  companyId,
  tx,
}: EnrichOfficerContactParams): Promise<EnrichOfficerContactResult> => {
  const database = tx ?? db

  logger.info({
    msg: '[enrich_officer_contact] Starting officer contact enrichment',
    event: 'officer_contact_enrichment_start',
    metadata: { contactId, officerId, companyId },
  })

  // Get full context using existing optimized query
  const context = await getOfficersEnrichmentContext(companyId, tx)

  if (!context) {
    throw new Error(`No enrichment context found for company ${companyId}`)
  }

  // Find the specific officer in the context
  const officer = context.officers.find((o) => o.id === officerId)

  if (!officer) {
    throw new Error(`Officer ${officerId} not found in company ${companyId}`)
  }

  // Mark contact as processing
  await database
    .update(contact)
    .set({ enrichmentStatus: 'processing', updatedAt: new Date() })
    .where(eq(contact.id, contactId))

  let linkedinFound = false
  let emailsFound = 0
  let phonesFound = 0

  try {
    // 1. LinkedIn enrichment → enrichment_company_officer_linkedin + contact_linkedin
    const linkedinResult = await runLinkedInWaterfall(
      {
        officerId,
        officer,
        company: {
          ...context.company,
          activities: context.activities,
        },
        place: context.place,
        tx,
      },
      60,
    )
    linkedinFound = linkedinResult.status === 'success'

    // Copy LinkedIn to contact tables
    if (
      linkedinFound &&
      linkedinResult.status === 'success' &&
      linkedinResult.data
    ) {
      await database
        .update(contact)
        .set({ linkedinUrl: linkedinResult.data.profileUrl })
        .where(eq(contact.id, contactId))

      await insertContactLinkedin(
        {
          contactId,
          profileUrl: linkedinResult.data.profileUrl,
          confidence: linkedinResult.data.confidence,
          reasoning: linkedinResult.data.reasoning ?? null,
          source:
            linkedinResult.data.source ?? linkedinResult.provider ?? 'unknown',
        },
        tx,
      )
    }

    logger.info({
      msg: '[enrich_officer_contact] LinkedIn waterfall completed',
      event: 'officer_linkedin_waterfall_complete',
      metadata: {
        contactId,
        officerId,
        success: linkedinFound,
        status: linkedinResult.status,
      },
    })

    // 2. Email enrichment → enrichment_company_officer_email + contact_email
    const emailResult = await runEmailWaterfallWithData(
      {
        officerId,
        officer,
        website: context.place.website,
      },
      tx,
    )
    emailsFound =
      emailResult.status === 'success' && emailResult.data
        ? emailResult.data.length
        : 0

    // Copy emails to contact_email table
    if (emailsFound > 0) {
      const officerEmails = await getEnrichmentCompanyOfficerEmails(
        officerId,
        tx,
      )
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
          tx,
        )
      }
    }

    logger.info({
      msg: '[enrich_officer_contact] Email waterfall completed',
      event: 'officer_email_waterfall_complete',
      metadata: {
        contactId,
        officerId,
        success: emailResult.status === 'success',
        emailsFound,
      },
    })

    // 3. Phone enrichment → enrichment_company_officer_phone + contact_phone
    const phoneResult = await runPhoneWaterfall({ officerId }, tx)
    phonesFound = phoneResult.phonesFound

    // Copy phones to contact_phone table
    if (phonesFound > 0) {
      const officerPhones = await getEnrichmentCompanyOfficerPhones(
        officerId,
        tx,
      )
      if (officerPhones.length > 0) {
        await insertContactPhones(
          contactId,
          officerPhones.map((phone) => ({
            phone: phone.phone,
            type: 'FIXED_LINE_OR_MOBILE' as const,
          })),
          tx,
        )
      }
    }

    logger.info({
      msg: '[enrich_officer_contact] Phone waterfall completed',
      event: 'officer_phone_waterfall_complete',
      metadata: {
        contactId,
        officerId,
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
      msg: '[enrich_officer_contact] Officer contact enrichment completed',
      event: 'officer_contact_enrichment_complete',
      metadata: {
        contactId,
        officerId,
        linkedinFound,
        emailsFound,
        phonesFound,
      },
    })

    return {
      success: true,
      contactId,
      officerId,
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
      msg: '[enrich_officer_contact] Officer contact enrichment failed',
      event: 'officer_contact_enrichment_failed',
      metadata: {
        contactId,
        officerId,
        error: error instanceof Error ? error.message : String(error),
      },
    })

    throw error
  }
}
