import { logger } from '@ritchy/logger'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import type * as schema from '../../db/schema'
import { getEnrichmentPhones } from '../enrichment/queries/get_enrichment_phones'
import { insertContactPhones } from './queries/insert_contact_phones'

export const populateContactPhonesFromEnrichment = async (
  enrichmentId: string,
  contactId: string,
  tx?: PostgresJsDatabase<typeof schema>,
) => {
  logger.debug({
    msg: 'Populating contact phones from enrichment',
    event: 'populating_contact_phones_from_enrichment',
    metadata: { enrichmentId, contactId },
  })
  const phones = await getEnrichmentPhones(enrichmentId, tx)

  await insertContactPhones(
    contactId,
    phones.map((phone) => ({
      phone: phone.phone,
      type: phone.type,
    })),
    tx,
  )
}
