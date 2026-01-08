import { randomUUID } from 'node:crypto'
import { logger } from '@ritchy/logger'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import type * as schema from '../../db/schema'
import { getEnrichmentPhones } from '../enrichment/shared/queries/get_enrichment_phones'
import { getPlaceByUserPlaceId } from '../places/queries/get_place_by_user_place_id'
import { insertContactPhones } from './queries/insert_contact_phones'

export const populateContactPhonesFromEnrichment = async (
  enrichmentId: string,
  userPlaceId: string,
  contactId: string,
  tx?: PostgresJsDatabase<typeof schema>,
) => {
  logger.debug({
    msg: 'Populating contact phones from enrichment',
    event: 'populating_contact_phones_from_enrichment',
    metadata: { enrichmentId, contactId },
  })
  const phones = await getEnrichmentPhones(enrichmentId, tx)

  const place = await getPlaceByUserPlaceId(userPlaceId, tx)

  if (place.phone) {
    phones.push({
      phone: place.phone,
      type: 'FIXED_LINE_OR_MOBILE',
      enrichmentId,
      id: randomUUID(),
      createdAt: new Date(),
      updatedAt: new Date(),
      source: 'place',
    })
  }

  await insertContactPhones(
    contactId,
    phones.map((phone) => ({
      phone: phone.phone,
      type: phone.type,
    })),
    tx,
  )
}
