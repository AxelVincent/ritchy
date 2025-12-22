import { logger } from '@ritchy/logger'
import { and, eq, inArray } from 'drizzle-orm'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import { db } from '../../db/db'
import {
  contact,
  enrichmentCompany,
  enrichmentCompanyOfficer,
} from '../../db/schema'
import type * as schema from '../../db/schema'

interface CreateContactsFromOfficersParams {
  enrichmentId: string
  userPlaceId: string
  tx?: PostgresJsDatabase<typeof schema>
}

export interface OfficerContact {
  contactId: string
  officerId: string
  companyId: string
  firstName: string | null
  lastName: string | null
  isNew: boolean
}

/**
 * Creates contacts from enrichment officers.
 * Called after company enrichment, before officer contact enrichment.
 * Returns both newly created and existing contacts for the officers.
 */
export const createContactsFromOfficers = async ({
  enrichmentId,
  userPlaceId,
  tx,
}: CreateContactsFromOfficersParams): Promise<OfficerContact[]> => {
  const database = tx ?? db

  logger.info({
    msg: '[create_contacts_from_officers] Starting contact creation from officers',
    event: 'create_contacts_from_officers_start',
    metadata: { enrichmentId, userPlaceId },
  })

  // Get company for this enrichment
  const [company] = await database
    .select({ id: enrichmentCompany.id })
    .from(enrichmentCompany)
    .where(eq(enrichmentCompany.enrichment_id, enrichmentId))
    .limit(1)

  if (!company) {
    logger.debug({
      msg: '[create_contacts_from_officers] No company found for enrichment',
      event: 'no_company_for_enrichment',
      metadata: { enrichmentId },
    })
    return []
  }

  // Get all physical person officers
  const officers = await database
    .select({
      id: enrichmentCompanyOfficer.id,
      first_name: enrichmentCompanyOfficer.first_name,
      last_name: enrichmentCompanyOfficer.last_name,
      type: enrichmentCompanyOfficer.type,
    })
    .from(enrichmentCompanyOfficer)
    .where(eq(enrichmentCompanyOfficer.company_id, company.id))

  const physicalOfficers = officers.filter((o) => o.type === 'physical')

  if (physicalOfficers.length === 0) {
    logger.debug({
      msg: '[create_contacts_from_officers] No physical officers found',
      event: 'no_physical_officers',
      metadata: { enrichmentId, companyId: company.id },
    })
    return []
  }

  // Check which officers already have contacts
  const officerIds = physicalOfficers.map((o) => o.id)
  const existingContacts = await database
    .select({
      id: contact.id,
      officerId: contact.officerId,
      firstName: contact.firstName,
      lastName: contact.lastName,
    })
    .from(contact)
    .where(
      and(
        eq(contact.userPlaceId, userPlaceId),
        inArray(contact.officerId, officerIds),
      ),
    )

  const existingOfficerIds = new Set(
    existingContacts.map((c) => c.officerId).filter(Boolean),
  )

  // Create contacts for officers that don't have one
  const officersToCreate = physicalOfficers.filter(
    (o) => !existingOfficerIds.has(o.id),
  )

  const createdContacts: OfficerContact[] = []

  for (const officer of officersToCreate) {
    // Clean first name (remove comma-separated aliases)
    const firstName = officer.first_name?.split(',')[0]?.trim() ?? null

    const [newContact] = await database
      .insert(contact)
      .values({
        userPlaceId,
        officerId: officer.id,
        firstName,
        lastName: officer.last_name,
        type: 'physical',
        isPrimary: false,
        enrichmentStatus: 'idle',
      })
      .returning({ id: contact.id })

    createdContacts.push({
      contactId: newContact.id,
      officerId: officer.id,
      companyId: company.id,
      firstName,
      lastName: officer.last_name,
      isNew: true,
    })

    logger.debug({
      msg: '[create_contacts_from_officers] Created contact for officer',
      event: 'officer_contact_created',
      metadata: {
        contactId: newContact.id,
        officerId: officer.id,
        firstName,
        lastName: officer.last_name,
      },
    })
  }

  // Include existing contacts in result (they may need re-enrichment)
  const existingWithData: OfficerContact[] = existingContacts
    .filter((c) => c.officerId)
    .map((c) => ({
      contactId: c.id,
      officerId: c.officerId as string,
      companyId: company.id,
      firstName: c.firstName,
      lastName: c.lastName,
      isNew: false,
    }))

  const allContacts = [...createdContacts, ...existingWithData]

  logger.info({
    msg: '[create_contacts_from_officers] Contact creation from officers completed',
    event: 'create_contacts_from_officers_complete',
    metadata: {
      enrichmentId,
      userPlaceId,
      companyId: company.id,
      totalOfficers: physicalOfficers.length,
      newContacts: createdContacts.length,
      existingContacts: existingWithData.length,
    },
  })

  return allContacts
}
