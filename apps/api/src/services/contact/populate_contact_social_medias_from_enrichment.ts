import { logger } from '@ritchy/logger'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import type * as schema from '../../db/schema'
import { getEnrichmentFacebooks } from '../enrichment/queries/get_enrichment_facebooks'
import { getEnrichmentInstagrams } from '../enrichment/queries/get_enrichment_instagrams'
import { getEnrichmentLinkedins } from '../enrichment/queries/get_enrichment_linkedins'
import { insertContactSocialMedia } from './queries/insert_contact_social_media'

export const populateContactSocialMediasFromEnrichment = async (
  enrichmentId: string,
  contactId: string,
  tx?: PostgresJsDatabase<typeof schema>,
) => {
  logger.debug({
    msg: 'Populating social media contacts',
    event: 'populating_social_media_contacts',
    metadata: { enrichmentId, contactId },
  })
  const [facebooks, instagrams, linkedins] = await Promise.all([
    getEnrichmentFacebooks(enrichmentId, tx),
    getEnrichmentInstagrams(enrichmentId, tx),
    getEnrichmentLinkedins(enrichmentId, tx),
  ])

  for (const facebook of facebooks) {
    await insertContactSocialMedia(contactId, facebook.url, 'FACEBOOK', tx)
  }

  for (const instagram of instagrams) {
    await insertContactSocialMedia(contactId, instagram.url, 'INSTAGRAM', tx)
  }

  for (const linkedin of linkedins) {
    await insertContactSocialMedia(contactId, linkedin.url, 'LINKEDIN', tx)
  }

  logger.debug({
    msg: 'Social media contacts populated',
    event: 'social_media_contacts_populated',
    metadata: { enrichmentId, contactId },
  })
}
