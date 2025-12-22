import { logger } from '@ritchy/logger'
import { eq } from 'drizzle-orm'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import { db } from '../../db/db'
import { contact } from '../../db/schema'
import type * as schema from '../../db/schema'
import { enrichManualContact } from './enrich_manual_contact'
import { enrichOfficerContact } from './enrich_officer_contact'

interface EnrichContactParams {
  contactId: string
  tx?: PostgresJsDatabase<typeof schema>
}

interface EnrichContactResult {
  success: boolean
  contactId: string
  linkedinFound: boolean
  emailsFound: number
  phonesFound: number
  type: 'officer' | 'manual'
}

/**
 * Unified entry point for contact enrichment.
 * Routes to appropriate flow based on contact type (officer vs manual).
 */
export const enrichContact = async ({
  contactId,
  tx,
}: EnrichContactParams): Promise<EnrichContactResult> => {
  const database = tx ?? db

  logger.info({
    msg: '[enrich_contact] Starting contact enrichment',
    event: 'contact_enrichment_start',
    metadata: { contactId },
  })

  // Check if contact has officerId
  const [contactRow] = await database
    .select({
      officerId: contact.officerId,
      userPlaceId: contact.userPlaceId,
    })
    .from(contact)
    .where(eq(contact.id, contactId))
    .limit(1)

  if (!contactRow) {
    throw new Error('Contact not found')
  }

  if (contactRow.officerId) {
    // Officer contact → use officer flow
    logger.info({
      msg: '[enrich_contact] Routing to officer enrichment flow',
      event: 'contact_enrichment_route_officer',
      metadata: { contactId, officerId: contactRow.officerId },
    })

    // For officer contacts, we need to get the company ID
    const companyId = await getCompanyIdForOfficer(contactRow.officerId, tx)

    if (!companyId) {
      throw new Error(`Company not found for officer ${contactRow.officerId}`)
    }

    const result = await enrichOfficerContact({
      contactId,
      officerId: contactRow.officerId,
      companyId,
      tx,
    })

    return { ...result, type: 'officer' }
  }

  // Manual contact → use manual flow
  logger.info({
    msg: '[enrich_contact] Routing to manual enrichment flow',
    event: 'contact_enrichment_route_manual',
    metadata: { contactId },
  })

  const result = await enrichManualContact({ contactId, tx })
  return { ...result, type: 'manual' }
}

/**
 * Get company ID for an officer
 */
const getCompanyIdForOfficer = async (
  officerId: string,
  tx?: PostgresJsDatabase<typeof schema>,
): Promise<string | null> => {
  const database = tx ?? db

  const { enrichmentCompanyOfficer } = await import('../../db/schema')

  const [officer] = await database
    .select({ companyId: enrichmentCompanyOfficer.company_id })
    .from(enrichmentCompanyOfficer)
    .where(eq(enrichmentCompanyOfficer.id, officerId))
    .limit(1)

  return officer?.companyId ?? null
}
