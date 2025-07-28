import { logger } from '@ritchy/logger'
import { getEnrichmentPhones } from '../enrichment/queries/get_enrichment_phones'
import { insertContactPhones } from './queries/insert_contact_phones'

export const populateContactPhonesFromEnrichment = async (
  enrichmentId: string,
  contactId: string,
) => {
  logger.info({
    msg: 'Populating contact phones from enrichment',
    event: 'populating_contact_phones_from_enrichment',
    metadata: { enrichmentId, contactId },
  })
  const phones = await getEnrichmentPhones(enrichmentId)

  await insertContactPhones(
    contactId,
    phones.map((phone) => ({
      phone: phone.phone,
      type: phone.type,
    })),
  )
}
