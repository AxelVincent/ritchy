import { logger } from '@ritchy/logger'
import { and, eq } from 'drizzle-orm'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import { db } from '../../../db/db'
import { contact } from '../../../db/schema'
import type * as schema from '../../../db/schema'
import { getPlaceDetailsV1 } from '../../../external/google_maps/place_details_V1'

export const getOrCreatePrimaryContact = async (
  userPlaceId: string,
  tx?: PostgresJsDatabase<typeof schema>,
) => {
  const dbOrTx = tx ?? db
  logger.debug({
    msg: 'Getting or creating primary contact',
    event: 'getting_or_creating_primary_contact',
    metadata: { userPlaceId },
  })
  const place = await getPlaceDetailsV1({ userPlaceId }, tx)

  const [existingContact] = await dbOrTx
    .select()
    .from(contact)
    .where(
      and(eq(contact.userPlaceId, userPlaceId), eq(contact.isPrimary, true)),
    )
    .limit(1)

  if (existingContact) {
    logger.debug({
      msg: 'Primary contact already exists',
      event: 'primary_contact_already_exists',
      metadata: { userPlaceId, existingContact },
    })
    return existingContact
  }

  const [newContact] = await dbOrTx
    .insert(contact)
    .values({
      userPlaceId,
      firstName: '',
      lastName: place.name,
      isPrimary: true,
    })
    .returning()

  logger.debug({
    msg: 'Primary contact created',
    event: 'primary_contact_created',
    metadata: { userPlaceId, newContact },
  })

  return newContact
}
