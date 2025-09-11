import { logger } from '@ritchy/logger'

import { db } from '../../db/db'
import { populateContactEmailsFromEnrichment } from './populate_contact_emails_from_enrichment'
import { populateContactPhonesFromEnrichment } from './populate_contact_phones_from_enrichment'
import { populateContactSocialMediasFromEnrichment } from './populate_contact_social_medias_from_enrichment'
import { getOrCreatePrimaryContact } from './queries/insert_primary_contact'

export const populateContactFromEnrichment = async ({
  enrichmentId,
  userPlaceId
}: {
  enrichmentId: string
  userPlaceId: string
}) => {
  try {
    const contact = await db.transaction(async (tx) => {
      const contact = await getOrCreatePrimaryContact(userPlaceId, tx)

      logger.info({
        msg: 'Populating enrichment contact data',
        event: 'populating_enrichment_contact_data',
        metadata: { contactId: contact.id, enrichmentId, userPlaceId }
      })

      await Promise.all([
        populateContactSocialMediasFromEnrichment(enrichmentId, contact.id, tx),
        populateContactEmailsFromEnrichment(enrichmentId, contact.id, tx),
        populateContactPhonesFromEnrichment(enrichmentId, contact.id, tx)
      ])

      return contact
    })

    logger.info({
      msg: 'Enrichment contact data populated',
      event: 'enrichment_contact_data_populated',
      metadata: { contactId: contact.id, enrichmentId, userPlaceId }
    })

    return contact
  } catch (error) {
    logger.error({
      msg: 'Failed to populate contact from enrichment',
      event: 'failed_to_populate_contact_from_enrichment',
      metadata: { enrichmentId, userPlaceId, error }
    })
    throw error
  }
}
