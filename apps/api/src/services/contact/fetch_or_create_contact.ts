import { logger } from '@ritchy/logger'
import { and, eq } from 'drizzle-orm'
import { db } from '../../db/db'
import { contact } from '../../db/schema'
import { getEnrichmentByUserPlaceId } from '../enrichment/queries/get_enrichment_by_user_place_id'
import { populateContactFromEnrichment } from './populate_contact_from_enrichment'
import { getOrCreatePrimaryContact } from './queries/insert_primary_contact'

const fetchOrCreateContact = async (userPlaceId: string, userId: string) => {
  logger.info({
    msg: 'Fetching or creating contact',
    event: 'fetch_or_create_contact',
    metadata: { userPlaceId, userId },
  })
  const [existingPrimaryContact] = await db
    .select()
    .from(contact)
    .where(
      and(
        eq(contact.userPlaceId, userPlaceId),
        eq(contact.userPlaceId, userId),
        eq(contact.isPrimary, true),
      ),
    )

  if (!existingPrimaryContact) {
    const enrichment = await getEnrichmentByUserPlaceId(userPlaceId)

    if (!enrichment) {
      const newContact = await getOrCreatePrimaryContact(userPlaceId)
      logger.info({
        msg: 'No enrichment found, creating new contact',
        event: 'no_enrichment_found',
        metadata: { userPlaceId, userId },
      })
      return newContact
    }

    const newContact = await populateContactFromEnrichment({
      enrichmentId: enrichment.enrichment.id,
      userPlaceId,
    })

    logger.info({
      msg: 'Enrichment found, populating contact',
      event: 'enrichment_found',
      metadata: { userPlaceId, userId, newContact },
    })

    return newContact
  }

  logger.info({
    msg: 'Contact already exists',
    event: 'contact_already_exists',
    metadata: { userPlaceId, userId, existingPrimaryContact },
  })
  return existingPrimaryContact
}

export const fetchOrCreateContacts = async (
  placeIds: string[],
  userId: string,
) =>
  Promise.all(
    placeIds.map(
      async (placeId) => await fetchOrCreateContact(placeId, userId),
    ),
  )
