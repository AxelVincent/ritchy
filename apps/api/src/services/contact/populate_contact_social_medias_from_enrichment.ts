import { logger } from '@ritchy/logger'
import { getEnrichmentFacebooks } from '../enrichment/queries/get_enrichment_facebooks'
import { getEnrichmentInstagrams } from '../enrichment/queries/get_enrichment_instagrams'
import { getEnrichmentLinkedins } from '../enrichment/queries/get_enrichment_linkedins'
import { insertContactSocialMedia } from './queries/insert_contact_social_media'

export const populateContactSocialMediasFromEnrichment = async (
  enrichmentId: string,
  contactId: string,
) => {
  logger.info({
    msg: 'Populating social media contacts',
    event: 'populating_social_media_contacts',
    metadata: { enrichmentId, contactId },
  })
  const [facebooks, instagrams, linkedins] = await Promise.all([
    getEnrichmentFacebooks(enrichmentId),
    getEnrichmentInstagrams(enrichmentId),
    getEnrichmentLinkedins(enrichmentId),
  ])

  for (const facebook of facebooks) {
    await insertContactSocialMedia(contactId, facebook.url, 'FACEBOOK')
  }

  for (const instagram of instagrams) {
    await insertContactSocialMedia(contactId, instagram.url, 'INSTAGRAM')
  }

  for (const linkedin of linkedins) {
    await insertContactSocialMedia(contactId, linkedin.url, 'LINKEDIN')
  }

  logger.info({
    msg: 'Social media contacts populated',
    event: 'social_media_contacts_populated',
    metadata: { enrichmentId, contactId },
  })
}
