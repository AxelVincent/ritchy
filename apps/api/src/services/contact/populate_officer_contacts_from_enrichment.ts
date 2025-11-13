import { logger } from '@ritchy/logger'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import type * as schema from '../../db/schema'
import { getEnrichmentCompany } from '../enrichment/queries/get_enrichment_company'
import { getEnrichmentCompanyOfficerEmails } from '../enrichment/queries/get_enrichment_company_officer_emails'
import { getEnrichmentCompanyOfficerPhones } from '../enrichment/queries/get_enrichment_company_officer_phones'
import { getEnrichmentCompanyOfficers } from '../enrichment/queries/get_enrichment_company_officers'
import { insertContact } from './queries/insert_contact'
import { insertContactEmails } from './queries/insert_contact_emails'
import { insertContactPhones } from './queries/insert_contact_phones'

export const populateOfficerContactsFromEnrichment = async (
  enrichmentId: string,
  userPlaceId: string,
  tx?: PostgresJsDatabase<typeof schema>,
) => {
  logger.debug({
    msg: 'Populating officer contacts from enrichment',
    event: 'populating_officer_contacts',
    metadata: { enrichmentId, userPlaceId },
  })

  // Get the enrichment company
  const company = await getEnrichmentCompany(enrichmentId)

  if (!company) {
    logger.debug({
      msg: 'No company found for enrichment',
      event: 'no_company_found_for_enrichment',
      metadata: { enrichmentId },
    })
    return []
  }

  // Get all officers for the company
  const officers = await getEnrichmentCompanyOfficers(company.id, tx)

  if (officers.length === 0) {
    logger.debug({
      msg: 'No officers found for company',
      event: 'no_officers_found_for_company',
      metadata: { companyId: company.id },
    })
    return []
  }

  const officerContacts = await Promise.all(
    officers
      .filter(
        (officer) =>
          (officer.first_name && officer.last_name) ||
          (officer.type === 'physical' &&
            (officer.first_name || officer.last_name)),
      )
      .map(async (officer) => {
        const contact = await insertContact(
          {
            type: 'physical',
            userPlaceId,
            officerId: officer.id,
            firstName: officer.first_name?.split(',')[0]?.trim() ?? null,
            lastName: officer.last_name,
            isPrimary: false,
          },
          tx,
        )

        logger.debug({
          msg: 'Officer contact created',
          event: 'officer_contact_created',
          metadata: {
            contactId: contact.id,
            officerId: officer.id,
            firstName: officer.first_name?.split(',')[0]?.trim() ?? null,
            lastName: officer.last_name,
          },
        })

        // Get and insert officer emails
        const officerEmails = await getEnrichmentCompanyOfficerEmails(
          officer.id,
          tx,
        )

        if (officerEmails.length > 0) {
          await insertContactEmails(
            officerEmails.map((email) => ({
              id: undefined as unknown as string, // Will be auto-generated
              contact_id: contact.id,
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

          logger.debug({
            msg: 'Officer contact emails added',
            event: 'officer_contact_emails_added',
            metadata: {
              contactId: contact.id,
              officerId: officer.id,
              emailCount: officerEmails.length,
            },
          })
        }

        // Get and insert officer phones
        const officerPhones = await getEnrichmentCompanyOfficerPhones(
          officer.id,
          tx,
        )

        if (officerPhones.length > 0) {
          await insertContactPhones(
            contact.id,
            officerPhones.map((phone) => ({
              phone: phone.phone,
              type: 'FIXED_LINE_OR_MOBILE' as const,
            })),
            tx,
          )

          logger.debug({
            msg: 'Officer contact phones added',
            event: 'officer_contact_phones_added',
            metadata: {
              contactId: contact.id,
              officerId: officer.id,
              phoneCount: officerPhones.length,
            },
          })
        }

        return contact
      }),
  )

  logger.info({
    msg: 'Officer contacts populated',
    event: 'officer_contacts_populated',
    metadata: {
      enrichmentId,
      userPlaceId,
      count: officerContacts.length,
    },
  })

  return officerContacts
}
