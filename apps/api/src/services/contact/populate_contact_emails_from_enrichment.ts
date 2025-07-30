import { logger } from '@ritchy/logger'
import { getEnrichmentEmails } from '../enrichment/queries/get_enrichment_emails'
import { insertContactEmails } from './queries/insert_contact_emails'

export const populateContactEmailsFromEnrichment = async (
  enrichmentId: string,
  contactId: string,
) => {
  logger.info({
    msg: 'Populating email contacts',
    event: 'populating_email_contacts',
    metadata: { enrichmentId, contactId },
  })
  const emails = await getEnrichmentEmails(enrichmentId)

  await insertContactEmails(
    contactId,
    emails.map((email) => email.email),
  )

  logger.info({
    msg: 'Email contacts populated',
    event: 'email_contacts_populated',
    metadata: { enrichmentId, contactId },
  })
}
