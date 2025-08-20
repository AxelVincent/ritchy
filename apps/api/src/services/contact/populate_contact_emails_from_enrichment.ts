import { logger } from '@ritchy/logger'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import type * as schema from '../../db/schema'
import { getEnrichmentEmails } from '../enrichment/queries/get_enrichment_emails'
import { insertContactEmails } from './queries/insert_contact_emails'

export const populateContactEmailsFromEnrichment = async (
  enrichmentId: string,
  contactId: string,
  tx?: PostgresJsDatabase<typeof schema>,
) => {
  logger.debug({
    msg: 'Populating email contacts',
    event: 'populating_email_contacts',
    metadata: { enrichmentId, contactId },
  })
  const emails = await getEnrichmentEmails(enrichmentId, tx)

  await insertContactEmails(
    contactId,
    emails.map((email) => email.email),
    tx,
  )

  logger.debug({
    msg: 'Email contacts populated',
    event: 'email_contacts_populated',
    metadata: { enrichmentId, contactId },
  })
}
